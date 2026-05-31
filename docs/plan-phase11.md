# 第十一阶段开发计划 — 渠道模型重定向与网络代理

## 背景

当前渠道管理功能支持设置渠道的基础信息（名称、URL、API Key、模型列表、优先级、权重、超时等），但缺乏两个重要能力：

1. **模型重定向** — 用户请求模型 A 时，渠道可以改写为模型 B 再发往上游。例如渠道 A 只有 `gpt-4o-mini` 权限，用户请求 `gpt-4o` 时自动降级。
2. **网络代理** — 部分渠道需要通过 SOCKS5 代理访问（如绕过网络限制），当前所有请求都直连，不支持代理。

## 状态概览

**状态：规划中** | **完成度：0% (0/8)**

**前置条件：** Phase 10 已完成（深色模式样式系统完善）

### 任务分布

- 🔲 Step 1: 数据库变更 - 0%
- 🔲 Step 2: 后端 admin.ts 接口扩展 - 0%
- 🔲 Step 3: 后端 router.ts 模型重定向 - 0%
- 🔲 Step 4: 后端 router.ts 网络代理 - 0%
- 🔲 Step 5: 健康检查代理支持 - 0%
- 🔲 Step 6: 前端 AdminChannels.tsx UI - 0%
- 🔲 Step 7: 国际化 admin.json - 0%
- 🔲 Step 8: 测试验证 - 0%

## 版本
- v0.1.21

## 目标

1. 每个渠道可配置模型重定向规则（源模型 → 目标模型）
2. 每个渠道可配置 SOCKS5 代理地址
3. 模型重定向只改写发送给上游的 `body.model`，不影响计费和日志
4. 代理支持普通请求和 SSE 流式请求，健康检查同步支持代理

## 技术方案

### 1. 数据库 — ModelChannel 新增字段

在 `schema.prisma` 的 `ModelChannel` 模型中添加两个字段：

```prisma
modelRedirect Json?   // 模型重定向映射，格式: { "gpt-4o": "gpt-4o-mini" }
proxyUrl      String  @default("")  // SOCKS5 代理地址，空=直连
```

`modelRedirect` 用 `@default("{}")` 确保为空时存空对象而非 null。

### 2. 后端 — router.ts 模型重定向

在 `routeToUpstream()` 和 `routeToUpstreamStreaming()` 中，在发送请求前解析 body：

```typescript
// 模型重定向
let requestBody = options.body;
if (channel.modelRedirect && requestBody) {
  try {
    const parsed = JSON.parse(requestBody);
    // Prisma Json? 类型返回 PrismaJsonValue，需断言为 Record 类型
    const redirectMap = channel.modelRedirect as Record<string, string> | null;
    if (redirectMap && parsed.model && redirectMap[parsed.model]) {
      parsed.model = redirectMap[parsed.model];
      requestBody = JSON.stringify(parsed);
    }
  } catch {}
}
```

> **空对象处理：** `modelRedirect` 可能存在 `null`（旧数据）或 `{}`（新建默认值）两种情况。`{}` 在 JS 中为 truthy，但 `redirectMap["anyModel"]` 返回 `undefined`，因此 `if` 条件会自动跳过无匹配项。建议额外检查 `redirectMap && Object.keys(redirectMap).length > 0` 以避免不必要的 JSON.parse。

注意点：
- gateway.ts 中计费和日志用的 `body?.model` 是**原始模型名**，不受影响
- 重定向后的 body 只在 router 内部使用
- 只在明确有匹配映射时才改写，不匹配时不动

### 3. 后端 — router.ts 网络代理

引入 `socks-proxy-agent` 包，创建 SOCKS5 代理 Agent：

```typescript
import { SocksProxyAgent } from 'socks-proxy-agent';

// agent 缓存，相同 proxyUrl 复用
const proxyAgentCache = new Map<string, SocksProxyAgent>();

function getProxyAgent(proxyUrl: string): SocksProxyAgent | undefined {
  if (!proxyUrl) return undefined;
  if (!proxyAgentCache.has(proxyUrl)) {
    proxyAgentCache.set(proxyUrl, new SocksProxyAgent(proxyUrl));
  }
  return proxyAgentCache.get(proxyUrl);
}
```

> **⚠️ 重要：** `SocksProxyAgent` 继承自 `http.Agent`，与 undici `Dispatcher` 接口不兼容，**无法**通过 `fetch()` 的 `dispatcher` 选项使用。有代理的请求需改用 Node.js `http`/`https` 模块：

```typescript
import http from 'http';
import https from 'https';

// 有代理时改用 http/https 模块发起请求
async function proxyFetch(url: string, options: any, proxyUrl: string): Promise<{ response: Response; body: NodeJS.ReadableStream }> {
  const agent = getProxyAgent(proxyUrl);
  const urlObj = new URL(url);
  const mod = urlObj.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = mod.request(url, {
      agent,
      method: options.method || 'GET',
      headers: options.headers,
      signal: options.signal,
    }, (res) => {
      resolve({ response: res as unknown as Response, body: res });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}
```

代理请求走 `proxyFetch()`，无代理请求保持原 `fetch()`：

```typescript
let response: Response;
let responseBody: NodeJS.ReadableStream | undefined;

if (channel.proxyUrl) {
  const result = await proxyFetch(url, fetchOptions, channel.proxyUrl);
  response = result.response;
  responseBody = result.body;
} else {
  response = await fetch(url, fetchOptions);
}

// 在无代理的 SSE 流式场景中，仍用 response.body?.getReader()
// 在有代理的场景中，responseBody 本身是 ReadableStream
```

### 4. 后端 — 健康检查同步代理支持

`checkChannelHealth()` 目前用独立 fetch 逻辑（`AbortSignal.timeout(10000)`），需要读取渠道的 `proxyUrl` 并注入代理 agent。

### 5. 后端 — admin.ts 接口扩展

渠道创建（POST）和更新（PUT）接口增加 `modelRedirect` 和 `proxyUrl` 字段处理：

- POST `/api/admin/channels`：接收 `modelRedirect`（JSON object）和 `proxyUrl`（string）
- PUT `/api/admin/channels/:id`：接收 `modelRedirect`（JSON object）和 `proxyUrl`（string）
- GET `/api/admin/channels` 和 GET `/api/admin/channels/:id`：返回字段中包含 `modelRedirect` 和 `proxyUrl`

### 6. 前端 — AdminChannels.tsx UI

#### 创建/编辑弹窗新增两个配置区块

**模型重定向区域**（在模型列表下方）：
- 标题："模型重定向" + 小字说明（"将用户请求的模型重定向到其他模型"）
- 动态行列表，每行包含：
  - 源模型输入框（下拉或文本，预填可选值列表）
  - 箭头图标 `→`
  - 目标模型输入框（下拉或文本）
  - 删除行按钮（×）
- "添加规则"按钮，追加空行
- 提交时序列化为 `{ "源模型": "目标模型" }` 格式

**代理设置区域**（在超时设置下方）：
- 标签："代理地址"
- 输入框 placeholder: `socks5://127.0.0.1:1080`
- 小字提示："留空则为直连"

#### 渠道卡片展示增强

- meta 行显示重定向数：`重定向: N 条`
- meta 行显示代理状态：`代理: socks5://...`（截断显示或 tooltip）或 `直连`

### 7. 国际化 — admin.json

补充中英文翻译 key：

```
channels.modelRedirect        = 模型重定向 / Model Redirect
channels.modelRedirectDesc    = 将用户请求的模型重定向到其他模型
channels.sourceModel          = 源模型 / Source Model
channels.targetModel          = 目标模型 / Target Model
channels.addRule              = 添加规则 / Add Rule
channels.proxyUrl             = 代理地址 / Proxy Address
channels.proxyUrlPlaceholder  = socks5://127.0.0.1:1080
channels.proxyHint            = 留空则为直连 / Leave empty for direct connection
channels.redirectCount        = 重定向: {{count}} 条 / {{count}} redirect rules
channels.proxyStatus          = 代理 / Proxy
channels.directConnect        = 直连 / Direct
```

## 实施步骤

### Step 1: 数据库变更

- 文件：`server/prisma/schema.prisma`
- 在 `ModelChannel` 模型添加 `modelRedirect`（Json?）和 `proxyUrl`（String @default("")）
- 执行 `npx prisma db push && npx prisma generate` 同步数据库并重新生成 Prisma Client 类型

### Step 2: 后端 — admin.ts 接口扩展

- 文件：`server/src/routes/admin.ts`
- POST 创建渠道：接收 `modelRedirect` 和 `proxyUrl`
- PUT 更新渠道：接收 `modelRedirect` 和 `proxyUrl`
- 确保查询接口返回这两个字段（Prisma 默认会返回 Json 和 String 字段）

### Step 3: 后端 — router.ts 模型重定向

- 文件：`server/src/lib/router.ts`
- 在 `routeToUpstream()` 的发送前加入 body 解析和 model 改写逻辑
- 在 `routeToUpstreamStreaming()` 的发送前加入同样的逻辑
- `RouteResult` 的 channel 类型中不包含 `modelRedirect`，但这两个字段不需要在返回值中暴露给上层（gateway.ts 不需要知道），直接在 router 内部的 channel 变量上访问即可（`getAvailableChannels()` 已返回全量数据）
- 注意只改写发送给上游的 body，不影响函数签名和返回值中的 model 信息

### Step 4: 后端 — router.ts 网络代理

- 文件：`server/package.json` → 添加 `socks-proxy-agent` 依赖
- 文件：`server/src/lib/router.ts`
- 导入 `SocksProxyAgent` 以及 `http`、`https` 原生模块
- 实现 `getProxyAgent()` 函数和缓存
- 实现 `proxyFetch()` 辅助函数，对代理请求使用 `http/https.request()` + `SocksProxyAgent`
- 在 `routeToUpstream()` 中根据 `channel.proxyUrl` 决定使用 `fetch()` 还是 `proxyFetch()`
- 在 `routeToUpstreamStreaming()` 中同样根据 `channel.proxyUrl` 决定请求方式

> **SSE 流式与代理的兼容性：** 使用 `http.request()` 时，响应对象（`IncomingMessage`）本身是一个 `Readable` 流。流式 SSE 解析可直接监听 `data` 事件，或用 `for await (const chunk of res)` 替代 `response.body?.getReader()` 模式。  

### Step 5: 健康检查代理支持

- 文件：`server/src/lib/router.ts`
- `checkChannelHealth()` 中读取渠道的 `proxyUrl`，有代理时使用 `http/https.request()` + `SocksProxyAgent` 替代 `fetch()`
- 保持 AbortSignal.timeout(10000) 的超时语义 — 在 `http.request()` 中通过 `req.setTimeout()` 实现
- 无代理时保持原有 fetch 逻辑不变

### Step 6: 前端 — AdminChannels.tsx UI

- 文件：`frontend/src/components/admin/AdminChannels.tsx`
- 创建弹窗：在模型列表下方添加模型重定向配置区域
- 编辑弹窗：同样添加模型重定向配置区域
- 创建弹窗：在超时时间下方添加代理地址输入框
- 编辑弹窗：同样添加代理地址输入框
- 渠道卡片：在 meta 行增加重定向数和代理状态展示
- 提交数据时包含 `modelRedirect` 和 `proxyUrl` 字段

### Step 7: 国际化

- 文件：`frontend/src/i18n/locales/zh-CN/admin.json`
- 文件：`frontend/src/i18n/locales/en-US/admin.json`
- 补充模型重定向和代理相关的翻译 key

### Step 8: 测试验证

1. 创建一个渠道，配置模型重定向 `{ "gpt-4o": "gpt-4o-mini" }`
2. 使用该渠道发送请求，model = "gpt-4o"
3. 确认上游收到的 model 是 "gpt-4o-mini"
4. 确认计费和日志记录的是原始 model "gpt-4o"
5. 配置 SOCKS5 代理地址，确认请求通过代理发出
6. 创建无代理的渠道，确认仍直连
7. 健康检查在代理渠道上正常工作
8. 流式请求在代理渠道上正常工作

## 文件清单

| 文件 | 改动 |
|------|------|
| `server/package.json` | 添加 `socks-proxy-agent` 依赖 |
| `server/prisma/schema.prisma` | `ModelChannel` 添加 `modelRedirect Json?` 和 `proxyUrl String @default("")` |
| `server/src/routes/admin.ts` | POST/PUT 渠道接口增加 `modelRedirect`、`proxyUrl` 字段 |
| `server/src/lib/router.ts` | 模型重定向改写 + SOCKS5 代理注入 + 健康检查代理支持 |
| `frontend/src/components/admin/AdminChannels.tsx` | 重定向配置 UI + 代理配置 UI + 卡片展示增强 |
| `frontend/src/i18n/locales/zh-CN/admin.json` | 中文本地化 |
| `frontend/src/i18n/locales/en-US/admin.json` | 英文本地化 |

## 验证标准

1. ✅ 渠道创建/编辑可配置模型重定向规则
2. ✅ 请求到上游时 model 字段被正确改写
3. ✅ 计费和日志使用原始模型名
4. ✅ 渠道创建/编辑可配置 SOCKS5 代理地址
5. ✅ 普通 JSON 请求通过代理发出
6. ✅ SSE 流式请求通过代理发出
7. ✅ 健康检查对有代理的渠道正常工作
8. ✅ 无代理的渠道仍直连，不受影响
9. ✅ 前端展示重定向规则数和代理状态
10. ✅ 中英文翻译完整

## 注意事项

1. **安全性**：代理地址可能包含认证信息（`socks5://user:pass@host:port`）。建议前端展示时遮掩密码部分（将 `socks5://user:****@host:port` 显示），且后端 admin API 返回时同样遮掩。存储层面目前暂保持原样，后续可考虑将 credential 拆分到独立字段。
2. **性能**：`SocksProxyAgent` 实例会维护连接池，相同 proxyUrl 的渠道共享 agent，减少资源开销。
3. **兼容性**：老数据升级后 `modelRedirect` 为 null，代码中需做空值判断。`proxyUrl` 默认空字符串，不影响直连逻辑。
4. **熔断影响**：如果渠道走代理但代理不可用，熔断机制（连续失败 3 次标记 UNHEALTHY）会正常触发，与直连渠道行为一致。

## 工作量估算

| 模块 | 任务 | 预估工时 |
|------|------|---------|
| 数据库 | Schema 添加字段 + prisma push + generate | 1h |
| 后端 API | admin.ts 渠道接口扩展 modelRedirect/proxyUrl | 2h |
| 模型重定向 | router.ts body 改写逻辑 + TypeScript 类型处理 | 3h |
| 网络代理 | socks-proxy-agent + proxyFetch 辅助函数 + 请求改造 | 6h |
| 健康检查 | checkChannelHealth 代理支持 | 2h |
| 前端 UI | AdminChannels 重定向配置 + 代理配置 + 卡片展示 | 8h |
| 国际化 | admin.json 中英文补充 | 1h |
| 测试 | 重定向验证 + 代理验证 + 流式兼容 + 降级测试 | 3h |

**总计：约 26 小时**

## 时间线

```
Day 1:     数据库变更 + admin.ts 接口扩展
Day 1-2:   模型重定向逻辑（router.ts model 改写）
Day 2-3:   网络代理（socks-proxy-agent + proxyFetch + 请求改造）
Day 3:     健康检查代理支持
Day 3-5:   前端 AdminChannels UI（重定向配置 + 代理配置 + 卡片展示）
Day 6:     国际化补充 + 集成测试 + Bug 修复
```

**总计：1 周，约 26 小时工作量**
