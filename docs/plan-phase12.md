# 第十二阶段开发计划 — GEOIP 请求来源地域识别

## 背景

当前系统已在 `ApiUsageLog` 中记录了每次请求的 `clientIp` 字段，并在数据分析页的请求日志表中展示。但这些 IP 地址只是原始字符串，无法直观了解请求来源的地理分布。

接入 GEOIP 后，可以在数据分析页增加地域分布图表，帮助运营人员了解流量来自哪些国家/地区，辅助安全分析和渠道配置决策。

## 状态概览

**状态：规划中** | **完成度：0% (0/6)**

**前置条件：** Phase 11 已完成（渠道模型重定向与网络代理）

### 任务分布

- 🔲 Step 1: 后端 GEOIP 库引入 + 查询服务层 - 0%
- 🔲 Step 2: 数据库迁移 — ApiUsageLog 添加 country 字段 - 0%
- 🔲 Step 3: 后端 app.ts 启动时初始化 GEOIP - 0%
- 🔲 Step 4: 网关 gateway.ts 写入 GEOIP 信息 - 0%
- 🔲 Step 5: 后端 API — 地域分布统计接口 - 0%
- 🔲 Step 6: 前端 AdminAnalytics 地域分布图表 - 0%
- 🔲 Step 7: 国际化 admin.json 补充 - 0%

## 版本
- v0.1.31

## 目标

1. 在数据分析页新增"请求来源地域分布"图表（饼图/柱状图）
2. 地域解析到国家/地区级别
3. 请求日志表新增"地域"列，展示国旗 emoji + 国家代码
4. 对无法解析的 IP 归为"未知"
5. 使用用户提供的 `GeoLite2-City.mmdb` 文件作为数据源

## 技术方案

### 1. 数据存储

在 `ApiUsageLog` 模型新增一个字段：

```prisma
country String?  // ISO 3166-1 alpha-2 国家代码，如 "CN", "US", "JP"
```

不存储城市/ISP 等细节信息，保持粒度在国别级别。原因：
- 用户群体大概率走代理/VPN，城市级精度无意义
- country 字段足够做分布统计和基础安全分析
- 减少存储开销

### 2. GEOIP 库选择 — @maxmind/geoip2-node

使用 `@maxmind/geoip2-node` npm 包，原因：
- MaxMind 官方维护的 Node.js 库
- 原生支持 `.mmdb` 格式
- 异步 API，加载数据库到内存后查询速度快
- 支持国家（Country）、城市（City）、ASN 等所有 MaxMind 数据类型

#### .mmdb 文件存放位置

`GeoLite2-City.mmdb` 文件放在 `server/data/` 目录下，通过环境变量 `GEOIP_DB_PATH` 可自定义路径，默认指向 `data/GeoLite2-City.mmdb`。

#### Reader 初始化

在应用启动时加载 .mmdb 文件，保持 Reader 单例：

```typescript
import { Reader } from '@maxmind/geoip2-node';
import path from 'path';

let reader: Reader | null = null;

export async function initGeoIP(dbPath?: string) {
  const resolvedPath = dbPath || path.join(process.cwd(), 'data', 'GeoLite2-City.mmdb');
  try {
    reader = await Reader.open(resolvedPath);
    console.log(`GEOIP database loaded: ${resolvedPath}`);
  } catch (err) {
    console.warn('GEOIP database not available, geo lookup disabled:', err);
    reader = null;
  }
}
```

#### 查询接口

```typescript
export function lookupCountry(ip: string): string | null {
  if (!reader) return null;
  if (isPrivateIP(ip)) return null;
  try {
    const response = reader.city(ip);
    return response.country?.isoCode ?? null;
  } catch {
    return null;
  }
}

// 私有 IP 检测
const PRIVATE_RANGES = [/^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^127\./, /^::1$/];
function isPrivateIP(ip: string): boolean {
  return PRIVATE_RANGES.some(re => re.test(ip));
}
```

注意：`reader.city(ip)` 是**同步调用**，数据已加载到内存，不会产生异步延迟。

### 3. 后端 — GEOIP 服务层

新建 `server/src/lib/geoip.ts`，封装 GEOIP 查询逻辑：

- `initGeoIP(dbPath?)` — 初始化 Reader（在 app.ts 启动时调用）
- `lookupCountry(ip: string): string | null` — 输入 IP，返回 ISO 国家代码
- `isPrivateIP(ip: string): boolean` — 私有 IP 前缀检测（`10.`, `172.16-31.`, `192.168.`, `127.`, `::1`）
- 所有函数内部 `try-catch` 保证查询失败不影响主流程

### 4. 后端 — 网关集成

在 `gateway.ts` 的 `logUsage()` 调用前，增加一步：

```typescript
const country = lookupCountry(clientIp);
```

然后在 `logUsage()` 的 Prisma create 中包含 `country` 字段。

考虑到：
- `reader.city(ip)` 是**同步内存查询**，单次 <1ms，对网关延迟影响可忽略
- 放在请求结束后写入日志时执行（`logUsage()` 中），不阻塞响应
- 使用 `??` 确保空 IP 不会报错

### 5. 后端 — 应用启动初始化

在 `server/src/app.ts` 中，在服务启动前调用 `initGeoIP()`。

```typescript
import { initGeoIP } from './lib/geoip.js';

// 在 app.ready() 或 listen 之前
await initGeoIP(process.env.GEOIP_DB_PATH);
```

### 6. 后端 — 地域分布统计接口

新增 `/api/admin/analytics/geo` 接口：

```typescript
// GET /api/admin/analytics/geo?from=&to=
// 返回:
{
  distribution: [
    { country: "CN", requests: 12345, tokens: 678900 },
    { country: "US", requests: 8901, tokens: 456700 },
    { country: "JP", requests: 2345, tokens: 123400 },
    { country: null, requests: 567, tokens: 8900 },   // 无法解析
  ]
}
```

查询逻辑：
- 对 `ApiUsageLog` 做 `groupBy` by `country`
- 统计请求数和 token 消耗量
- 支持 `from`/`to` 时间范围过滤
- 按请求数降序排列
- 限制返回 Top 20

> **缓存策略：** 此接口数据变更频率低，建议复用 Phase 4 的 `cacheGet`/`cacheSet` 模块，缓存 TTL 60s，减少重复聚合查询。

### 7. 前端 — AdminAnalytics 地域分布图表

在已有的图表区域（趋势图下方，模型排行和渠道报表下方）新增一个卡片区块：

数据分析页布局：
```
[KPI 行: 4列]
[趋势图: 全宽]
[模型排行: 1/2] [渠道报表: 1/2]
[地域分布: 全宽]  ← 新增（在渠道报表下方）
[请求日志: 全宽]
```

**地域分布卡片**：
- 标题："请求来源分布"
- 指标切换按钮：请求数 / Token 消耗
- ECharts 饼图，高度 260px
- Top 10 国家分布 + "其他" + "未知"
- 每项显示国家代码（"CN"）+ 请求数 + 百分比
- 图例显示国旗 emoji（如 `🇨🇳 CN`）
- 如果所有 `country` 均为 null，显示"暂无地域数据"

### 8. 前端 — 请求日志增加地域列

在请求日志表的 **IP 列右侧** 新增一列"地域"：

- 显示 `flagEmoji(country) + country`（如 `🇨🇳 CN`）
- 无法解析的显示 `—` 
- 宽度紧凑（`w-16` 左右）

国旗 emoji helper（无外部依赖，纯 Unicode）：

```typescript
function flagEmoji(countryCode: string): string {
  if (!countryCode) return '';
  const codePoints = countryCode.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}
```

### 9. 国际化

在 admin.json 的 `analytics` 段落中补充翻译 key：

| Key | zh-CN | en-US |
|-----|-------|-------|
| `geo.title` | 请求来源分布 | Request Origin |
| `geo.country` | 国家/地区 | Country |
| `geo.requests` | 请求数 | Requests |
| `geo.tokens` | Token 消耗 | Tokens |
| `geo.unknown` | 未知 | Unknown |
| `geo.other` | 其他 | Other |
| `geo.noData` | 暂无地域数据 | No geo data |

## 实施步骤

### Step 1: 后端 GEOIP 库引入 + 查询服务层

- 文件：`server/package.json` → 添加 `@maxmind/geoip2-node` 依赖
- 文件：`server/data/` → 创建目录，放置 `GeoLite2-City.mmdb` 文件
- 文件：`server/.gitignore` → 添加 `data/*.mmdb` 避免 Git 仓库膨胀
- 文件：`server/.env` → 可选添加 `GEOIP_DB_PATH` 环境变量
- 文件：`server/src/lib/geoip.ts` → **新建**
  - `import { Reader } from '@maxmind/geoip2-node'`
  - `initGeoIP(dbPath?)` — 初始化 Reader 单例
  - `lookupCountry(ip: string): string | null` 函数
  - `isPrivateIP(ip: string): boolean` 辅助函数
  - try-catch 保证安全

### Step 2: 数据库迁移 — ApiUsageLog 添加 country 字段

- 文件：`server/prisma/schema.prisma`
- `model ApiUsageLog` 添加 `country String?`
- 执行 `npx prisma db push && npx prisma generate`

### Step 3: 后端 app.ts 启动时初始化 GEOIP

- 文件：`server/src/app.ts`
- 引入 `initGeoIP`，在服务启动前调用
- 打印 GEOIP 加载状态（成功/失败）

### Step 4: 网关 gateway.ts 写入 GEOIP 信息

- 文件：`server/src/routes/gateway.ts`
- 导入 `lookupCountry` 函数
- 在 `logUsage()` 调用前解析 country
- `logUsage()` 参数列表增加 `country`，写入 Prisma create

### Step 5: 后端 API — 地域分布统计接口

- 文件：`server/src/routes/admin.ts`
- 新增 `GET /api/admin/analytics/geo` 路由
- groupBy country，统计请求数和 token 消耗

### Step 6: 前端 AdminAnalytics 地域分布图表

- 文件：`frontend/src/components/admin/AdminAnalytics.tsx`
- 在渠道报表下方插入地域分布卡片
- 使用 `ReactEChartsCore` 渲染饼图
- 国旗 emoji helper 函数
- 指标切换（请求数 / Token）
- 请求日志表增加"地域"列

### Step 7: 国际化 admin.json 补充

- 文件：`frontend/src/i18n/locales/zh-CN/admin.json`
- 文件：`frontend/src/i18n/locales/en-US/admin.json`
- `analytics.geo.*` 系列 key

## 文件清单

| 文件 | 改动 |
|------|------|
| `server/package.json` | 添加 `@maxmind/geoip2-node` 依赖 |
| `server/data/GeoLite2-City.mmdb` | **新增** — GEOIP 数据库文件（用户提供） |
| `server/src/lib/geoip.ts` | **新建** — GEOIP 查询封装（init + lookup + isPrivateIP） |
| `server/.gitignore` | 添加 `data/*.mmdb` 排除数据库文件 |
| `server/src/app.ts` | 启动时调用 `initGeoIP()` |
| `server/prisma/schema.prisma` | `ApiUsageLog` 添加 `country String?` |
| `server/src/routes/gateway.ts` | 请求写入时解析 country 并传参 |
| `server/src/routes/admin.ts` | 新增 `GET /api/admin/analytics/geo` |
| `frontend/src/components/admin/AdminAnalytics.tsx` | 地域分布图表 + 日志表地域列 |
| `frontend/src/i18n/locales/zh-CN/admin.json` | 中文本地化 |
| `frontend/src/i18n/locales/en-US/admin.json` | 英文本地化 |

## 验证标准

1. ✅ 服务启动时正确加载 `GeoLite2-City.mmdb`，控制台打印加载状态
2. ✅ 请求写入后 `ApiUsageLog.country` 字段正确填充（如 CN/US/JP）
3. ✅ 私有 IP 和无法解析的 IP 写入 null
4. ✅ `GEOIP_DB_PATH` 环境变量可自定义数据库路径
5. ✅ 数据分析页展示地域分布饼图，Top N 国家清晰可见
6. ✅ 饼图支持切换指标（请求数 / Token）
7. ✅ 请求日志表 IP 旁显示国旗 emoji + 国家代码
8. ✅ 全部数据为 null 时显示"暂无地域数据"
9. ✅ 网关响应时间无明显增加（GEOIP 查询 <1ms）
10. ✅ 中英文翻译完整

## 注意事项

1. **隐私考量**：仅存储国家代码，不存储完整 IP 的 GEOIP 明细。`clientIp` 本身已记录，country 字段是衍生数据，不增加额外隐私风险。
2. **精度局限**：用户使用代理/VPN 时地理信息无意义。这是预期内的。
3. **数据库更新**：`GeoLite2-City.mmdb` 需要定期更新。MaxMind 每月更新免费数据库。可以通过环境变量 `GEOIP_DB_PATH` 指向新版文件，重启服务即可生效（无需停服，配合 graceful restart）。
4. **性能**：`reader.city(ip)` 是同步调用、内存查询，平均耗时 <0.5ms。且查询发生在**请求完成后**（日志写入阶段），不阻塞响应。
5. **IPv6 支持**：`@maxmind/geoip2-node` 原生支持 IPv6，无需额外处理。
6. **地区显示**：国旗 emoji 通过 Unicode Regional Indicator Symbols 实现，所有现代浏览器/操作系统均支持。
7. **文件分发**：`.mmdb` 文件属于数据文件而非代码，建议加入 `.gitignore` 或通过 CI/CD 单独部署，避免 Git 仓库体积膨胀。可以在 `server/.gitignore` 中添加 `data/*.mmdb`。

## 工作量估算

| 模块 | 任务 | 预估工时 |
|------|------|---------|
| GEOIP 服务层 | @maxmind/geoip2-node 引入 + geoip.ts 封装 + app.ts 初始化 | 1.5h |
| 数据库 | Schema 添加字段 + prisma push + generate | 0.5h |
| 网关集成 | gateway.ts 写入 country | 1h |
| 统计 API | admin.ts GEOIP 分布接口 | 1.5h |
| 前端图表 | ECharts 饼图 + 地域列 + flag emoji | 3h |
| 国际化 | admin.json 补充 | 0.5h |

**总计：约 8 小时**

## 时间线

```
Day 1:    GEOIP 服务层 + 数据库 + 网关集成
Day 1-2:  统计 API + 前端图表 + 国际化
Day 2:    集成测试 + Bug 修复
```

**总计：2 天，约 8 小时工作量**
