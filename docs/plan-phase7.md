# Phase 7: 渠道管理功能完善

## 版本
- v0.1.16

## 目标

将渠道管理从基础 CRUD 升级为完整的健康监控 + 负载均衡管理体系，补全数据模型、后端 API、前端交互、路由集成四大层面的缺失功能。

---

## 一、数据模型层 — Prisma Schema 扩展

### 1.1 ModelChannel 新增字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `weight` | Int | `1` | 加权轮询权重，用于负载均衡模式 |
| `healthStatus` | HealthStatus | `UNKNOWN` | 健康状态枚举 |
| `lastHealthCheckAt` | DateTime? | `null` | 最后一次健康检查时间 |
| `updatedAt` | DateTime | `now()` | 记录更新时间 |

### 1.2 新增 HealthStatus 枚举

```prisma
enum HealthStatus {
  HEALTHY
  UNHEALTHY
  UNKNOWN
}
```

### 1.3 ApiRoute 模型关联修正

确保 `ApiRoute` 的 `primaryChannel` / `backupChannel` 关系引用能正确关联到 `modelChannel`。

### 1.4 数据库迁移

执行 `prisma db push` 或生成迁移文件，同步 schema 变更。

---

## 二、后端 API 层 — 接口完善

### 2.1 新增接口

| 方法 | 路径 | 用途 |
|------|------|------|
| `DELETE` | `/api/admin/channels/:id` | 删除渠道，检查是否被 Route 引用 |
| `GET` | `/api/admin/channels/:id` | 获取单个渠道详情（含健康信息和引用的 Route 列表） |

### 2.2 修复现有接口

#### `GET /api/admin/channels`

- [ ] 支持分页参数 `page` / `pageSize`
- [ ] 支持搜索参数 `search`（模糊匹配 name/displayName/baseUrl）
- [ ] 支持状态过滤 `statusFilter`（all / active / inactive）
- [ ] 返回每个 Channel 被哪些 Route 引用（`routeRefs: [{ id, path, displayName, mode }]`）
- [ ] 返回 `healthStatus`、`lastHealthCheckAt`、`weight` 字段

#### `POST /api/admin/channels`

- [ ] 新增 `weight` 字段接收和存储
- [ ] name 唯一性冲突时返回友好错误信息
- [ ] 服务端校验必填项和格式

#### `PUT /api/admin/channels/:id`

- [ ] 允许更新 `name` 字段
- [ ] 空字符串 `displayName` 应能清除（使用 `!== undefined` 代替 `if()`）
- [ ] 支持 `weight` 字段更新
- [ ] apiKey 增强：空字符串 = 不修改（区别于清空）
- [ ] 返回完整 Channel 信息（含 healthStatus）

#### `POST /api/admin/channels/:id/test`

- [ ] 返回详细错误信息（超时、HTTP 状态码、错误消息）
- [ ] 测试完成后更新数据库中的 `healthStatus` 和 `lastHealthCheckAt`
- [ ] 适配不同 Provider 的健康检查路径（如 OpenAI `/models` vs Claude `/v1/models`）

---

## 三、业务逻辑层 — 健康与转发机制

### 3.1 `lib/router.ts` 健康检查机制

#### checkChannelHealth 改进

- [ ] 根据不同 Channel 的 baseUrl 自动适配健康检查路径
- [ ] 测试完成后自动写入 `healthStatus` 和 `lastHealthCheckAt`
- [ ] 返回详细错误信息（包含 HTTP 状态码、错误描述）

#### 新增定时健康巡检

- [ ] 后台定时任务（如每 5 分钟）对所有活跃 Channel 做健康检查
- [ ] 更新 healthStatus
- [ ] 状态变化时记录审计日志

#### 新增自动故障检测

- [ ] 转发过程中连续 N 次失败（5xx/超时）→ 自动标记为 UNHEALTHY
- [ ] UNHEALTHY 的 Channel 在 Route 匹配和负载均衡中被排除
- [ ] 冷却期（如 60 秒）后自动恢复为 UNKNOWN，等待下次健康检查

### 3.2 `lib/router.ts` 转发逻辑

#### routeToUpstream 改进

- [ ] 转发时过滤掉 UNHEALTHY 的 Channel
- [ ] 记录本次请求使用的 Channel ID（返回给调用方用于日志）

#### 新增 getChannelForRequest 函数

- [ ] 单一模式：按 activeChannel 选择
- [ ] 负载均衡模式：从健康 Channel 池中按轮询/加权策略选择

### 3.3 `routes/v1.ts` 用量追踪

- [ ] `ApiUsageLog` 新增 `channelId` 字段（可选）
- [ ] 每次请求记录实际转发的 Channel ID
- [ ] 为按 Channel 维度统计调用量、成功率、成本奠定基础

---

## 四、前端展示层 — AdminChannels 重写

### 4.1 页面结构

参考 Phase 6 设计的 KeysPage 风格（SaaS 卡片风格），替换当前的表格布局。

```
┌─ 渠道管理 ───────────────────────────────────── [+ 新增渠道] ─┐
│                                                                │
│  KPI 行：总渠道数 | 启用渠道 | 健康率 | 总模型数                │
│                                                                │
│  ┌─ 筛选栏 ──────────────────────────────────────────────┐    │
│  │  [搜索框]  [状态筛选项]  [健康状态筛选项]                │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌─ Card ───────────────────────────────────────────────┐    │
│  │  OpenAI           [活跃] [健康 ✓]  [禁用] [测试] [删] │    │
│  │  Base URL: https://api.openai.com/v1                  │    │
│  │  优先级: 0  |  权重: 1  |  模型: gpt-4o, gpt-4-turbo │    │
│  │  最后检查: 2分钟前  |  被引用: 3 个路由               │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 CRUD 操作完善

| 操作 | 实现方式 |
|------|----------|
| **新增** | 表单增加 weight 字段，保持创建逻辑 |
| **编辑** | 点击编辑按钮 → 弹出编辑弹窗/内联表单，回显现有数据（API Key 除外，提示"留空则不修改"） |
| **删除** | 点击删除 → 确认弹窗 → 如果被 Route 引用则显示警告"该渠道被 N 个路由引用，删除后将影响这些路由" |
| **启用/禁用** | 表格行内切换开关，立即生效 |

### 4.3 测试交互改进

- [ ] 点击测试 → 按钮显示 loading spinner
- [ ] 成功后：按钮变为绿色对勾图标，2 秒后恢复
- [ ] 失败后：按钮变为红色叉号图标，2 秒后恢复
- [ ] 首次测试后显示"上次检查: X分钟前"

### 4.4 表单补充

| 字段 | 要求 |
|------|------|
| name | 创建时必填，编辑时可修改 |
| weight | 新增输入框，默认值 1，tooltip 说明"用于加权轮询" |
| apiKey | 创建时必填，编辑时留空则不修改，增加提示文字 |
| models | 编辑时可增删改，显示逗号分隔列表 |

### 4.5 表格/卡片列补充

| 信息项 | 展示方式 |
|--------|----------|
| 健康状态 | 彩色圆点 + 文字：绿色(HEALTHY) / 红色(UNHEALTHY) / 灰色(UNKNOWN) |
| 权重 | 数字显示 |
| 最后检查时间 | 相对时间（"2分钟前"），hover 显示精确时间 |
| 被路由引用 | 数字标签，hover 显示引用的路由路径列表 |
| 模型列表 | 点击展开/折叠展示具体模型名 |

### 4.6 KPI 卡片改进

- [ ] 新增"健康率"卡片：健康渠道数 / 总渠道数 × 100%
- [ ] 替换硬编码趋势值为真实计算值：如活跃渠道数的周环比变化

---

## 五、国际化层 — 翻译补充

### zh-CN / en-US `admin.json` 补充

**channels 节新增 keys：**

| Key | zh-CN | en-US |
|-----|-------|-------|
| `kpi.healthRate` | 健康率 | Health Rate |
| `form.editTitle` | 编辑渠道 | Edit Channel |
| `form.save` | 保存 | Save |
| `form.saving` | 保存中... | Saving... |
| `form.weight` | 权重 | Weight |
| `form.weightPlaceholder` | 权重值（默认 1） | Weight (default 1) |
| `form.apiKeyHint` | 留空则不修改 | Leave empty to keep current |
| `healthLabel` | 健康状态 | Health |
| `healthStatus.healthy` | 健康 | Healthy |
| `healthStatus.unhealthy` | 异常 | Unhealthy |
| `healthStatus.unknown` | 未知 | Unknown |
| `deleteButton` | 删除 | Delete |
| `deleteConfirm` | 确定删除此渠道？ | Delete this channel? |
| `deleteConfirmWithRefs` | 该渠道被 {{count}} 个路由引用，删除后将影响这些路由 | This channel is used by {{count}} routes, deletion will affect them |
| `enableButton` | 启用 | Enable |
| `disableButton` | 禁用 | Disable |
| `testing` | 测试中... | Testing... |
| `testResult.healthy` | 连接正常 | Connection OK |
| `testResult.unhealthy` | 连接失败: {{error}} | Connection failed: {{error}} |
| `lastCheckAt` | 上次检查 | Last check |
| `routeRefs` | 被引用 | Used by |
| `routeRefsCount` | {{count}} 个路由 | {{count}} routes |
| `empty` | 无匹配渠道 | No matching channels |
| `weight` | 权重 | Weight |
| `batch.enable` | 批量启用 | Batch Enable |
| `batch.disable` | 批量禁用 | Batch Disable |
| `batch.delete` | 批量删除 | Batch Delete |

---

## 六、集成层 — Route 关联

### 6.1 引用预警

- [ ] 删除 Channel 时检查是否被 Route 引用，引用数 > 0 则弹窗警告
- [ ] 禁用 Channel 时检查是否正被 Route 作为主要 Channel 使用

### 6.2 信息展示

- [ ] Channel 列表项中显示"被 N 个路由引用"
- [ ] 点击引用数可展开查看具体的路由路径和模式

### 6.3 级联状态同步

- [ ] Route 关联的 primaryChannel 被禁用时，Route 状态标记为受影响（不影响运行，但展示警告）
- [ ] backupChannel 被禁用时同理

---

## 七、文件清单

### 修改的文件 (7)

| 文件 | 改动内容 |
|------|----------|
| `server/prisma/schema.prisma` | ModelChannel 追加 weight/healthStatus/lastHealthCheckAt/updatedAt，新增 HealthStatus 枚举 |
| `server/src/routes/admin.ts` | Channel CRUD 完善（删除接口、编辑 name/weight、分页搜索、返回 route 引用） |
| `server/src/lib/router.ts` | checkChannelHealth 改进、自动故障检测、冷却恢复、均衡分发 |
| `server/src/routes/v1.ts` | 用量日志记录 channelId |
| `frontend/src/components/admin/AdminChannels.tsx` | 前端完全重写（卡片风格、CRUD 完善、健康显示、路由关联） |
| `frontend/src/i18n/locales/zh-CN/admin.json` | channels 节补充翻译 |
| `frontend/src/i18n/locales/en-US/admin.json` | channels 节补充翻译 |

### 新增的文件 (0)

所有改动均在现有文件内完成，不新增文件。

---

## 八、测试要点

| 测试项 | 验证内容 |
|--------|----------|
| 创建 Channel | 包含 weight 字段，name 唯一性校验 |
| 编辑 Channel | 修改 name/weight/displayName，API Key 留空不修改 |
| 删除 Channel | 引用预警弹窗，确认后删除 |
| 健康测试 | 测试后 healthStatus 更新，测试结果显示在 UI 上 |
| 健康筛选 | 按状态/健康/搜索词过滤结果 |
| 路由引用 | Channel 列表显示引用数，hover 可查看详情 |
| 自动故障检测 | 转发连续失败后 Channel 标记 UNHEALTHY |
| 冷却恢复 | UNHEALTHY 冷却后自动恢复 |
| 翻译切换 | 中英文切换后所有新增文字正确显示 |
