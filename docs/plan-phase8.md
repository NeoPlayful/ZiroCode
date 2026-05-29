# Phase 8: 数据采集与日志分析系统

> **周期：1 周** | **目标：构建完整的数据采集、聚合、分析体系**
> 数据模型 → 采集增强 → 聚合任务 → 分析API → 前端展示

## 状态概览

**状态：规划中** | **完成度：0% (0/10)**

**前置条件**：Phase 7 已完成

### 任务分布

- 🔲 Week 1: 数据采集与分析系统 - 0% (0/10 任务)

## 版本
- v0.1.18

## 目标

在现有 `ApiUsageLog` 基础上构建完整的数据采集、聚合、分析体系，为运营监控和业务决策提供数据支撑。

> **与 Phase 3 分析功能的关系：** Phase 3 实现了用户视角的使用统计（`/api/analytics/overview`），Phase 8 构建管理员视角的运营分析系统（`/api/admin/analytics/*`），两个体系独立共存，Phase 8 提供更细粒度的聚合数据和全量日志查询能力。

---

## 一、数据模型层 — Schema 扩展

### 1.1 ApiUsageLog 补充字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `latencyMs` | Int? | `null` | 响应耗时（毫秒） |
| `clientIp` | String? | `null` | 客户端 IP |
| `cost` | Float? | `null` | 渠道调用成本（用于成本分析） |
| `routePath` | String? | `null` | 路由路径（如 `/codex/v1`） |

### 1.2 新增 ApiUsageHourly 聚合表

```prisma
model ApiUsageHourly {
  id            String   @id @default(cuid())
  timeBucket    DateTime   // 小时级时间桶，如 2026-05-29 14:00:00
  model         String
  channelId     String?
  routePath     String?
  requestCount  Int       @default(0)
  successCount  Int       @default(0)
  errorCount    Int       @default(0)
  totalTokens   BigInt    @default(0)
  totalLatency  BigInt    @default(0)
  totalQuota    BigInt    @default(0)

  @@unique([timeBucket, model, channelId, routePath])
  @@index([timeBucket])
  @@index([channelId])
  @@index([model])
}
```

### 1.3 新增 ApiUsageDaily 聚合表

```prisma
model ApiUsageDaily {
  id            String   @id @default(cuid())
  date          DateTime   // 天级，如 2026-05-29 00:00:00
  model         String
  channelId     String?
  routePath     String?
  requestCount  Int       @default(0)
  successCount  Int       @default(0)
  errorCount    Int       @default(0)
  totalTokens   BigInt    @default(0)
  totalLatency  BigInt    @default(0)
  totalQuota    BigInt    @default(0)

  @@unique([date, model, channelId, routePath])
  @@index([date])
  @@index([channelId])
}
```

### 1.4 新增 HealthCheckLog 审计表

HealthCheckLog 记录渠道健康状态变更历史，用于排查渠道稳定性问题。

```prisma
model HealthCheckLog {
  id            String   @id @default(cuid())
  channelId     String
  channelName   String
  previousStatus String
  newStatus     String
  message       String?
  checkedAt     DateTime @default(now())

  @@index([channelId])
  @@index([checkedAt])
}
```

### 1.5 数据库迁移

- [ ] 执行 `prisma db push` 生成新表和字段

---

## 二、后端 API 层 — 分析接口

### 2.1 新增路由文件 `routes/analytics.ts`

所有接口均需管理员权限（复用 Phase 3 的 `requireAdmin` 中间件）。

| 方法 | 路径 | 用途 |
|------|------|------|
| `GET` | `/api/admin/analytics/overview` | 今日概览（请求量、Token、活跃用户、错误率） |
| `GET` | `/api/admin/analytics/trends` | 趋势图数据（按小时/天，支持时间范围） |
| `GET` | `/api/admin/analytics/models` | 模型维度排名 |
| `GET` | `/api/admin/analytics/channels` | 渠道维度报表（请求量、成功率、延迟） |
| `GET` | `/api/admin/analytics/top-users` | 消耗 Top N 用户 |
| `GET` | `/api/admin/analytics/errors` | 错误分布分析 |
| `GET` | `/api/admin/analytics/requests` | 请求日志明细查询（分页、筛选） |

> **缓存策略：** 概览/趋势/排名接口数据变更频率低，可复用 Phase 3 的缓存模块，缓存 TTL 设为 30-60 秒，减少重复聚合查询。

### 2.2 接口设计说明

#### `GET /api/admin/analytics/trends`

参数：
- `period`: `24h` / `7d` / `30d`
- `granularity`: `hour` / `day`
- `metric`: `requests` / `tokens` / `latency`

返回：
```json
{
  "points": [
    { "time": "2026-05-29 14:00", "value": 128 },
    ...
  ]
}
```

#### `GET /api/admin/analytics/models`

参数：
- `from` / `to`: 时间范围
- `orderBy`: `requests` / `tokens`（默认 tokens）
- `limit`: 返回条数

#### `GET /api/admin/analytics/channels`

参数：
- `from` / `to`: 时间范围

返回每个渠道的请求数、成功率、平均延迟、总 Token 消耗。

#### `GET /api/admin/analytics/requests`

参数：
- `page` / `pageSize`: 分页
- `userId` / `model` / `channelId` / `statusCode`: 筛选
- `from` / `to`: 时间范围

---

## 三、数据采集层 — 日志记录增强

### 3.1 采集点改造

在 `v1.ts` 和 `gateway.ts` 的请求处理流程中补充：

| 采集项 | 获取方式 | 说明 |
|--------|----------|------|
| `latencyMs` | `responseTime - requestTime` | 必填 |
| `clientIp` | `req.ip` | 必填 |
| `routePath` | 当前匹配的路由路径（gateway 模式） | 必填 |
| `cost` | 根据渠道配置和 Token 数估算 | 暂不实施，字段预留 |

> **今日概览数据延迟说明：** 聚合任务每小时执行一次，当前小时的数据尚未聚合到 `ApiUsageHourly`。今日概览的 KPI 需直接从 `ApiUsageLog` 实时查询（增加时间索引覆盖）。聚合完成后，历史查询走聚合表，实时数据走原始日志。

### 3.2 新增 `lib/aggregator.ts` 聚合任务

定时聚合逻辑（每小时执行一次）：

- [ ] 扫描上一小时内 `ApiUsageLog` 记录
- [ ] 按 `timeBucket` + `model` + `channelId` + `routePath` 分组
- [ ] 汇总 `requestCount`、`successCount`、`errorCount`、`totalTokens`、`totalLatency`
- [ ] Upsert 写入 `ApiUsageHourly`
- [ ] 每天 00:05 执行天级聚合：`ApiUsageHourly` → `ApiUsageDaily`
- [ ] 聚合完成后可清理过期的 `ApiUsageLog`（如保留 30 天）

### 3.3 健康检查审计

- [ ] 每次健康检查状态变化时写入 `HealthCheckLog`
- [ ] 记录状态变更历史，便于排查

---

## 四、前端展示层 — Analytics 页面

### 4.1 新增 `frontend/src/components/admin/AdminAnalytics.tsx`

页面结构：

```
┌─ 数据分析 ───────────────────────────────────────────────────┐
│                                                               │
│  ┌─ KPI 行（今日概览）────────────────────────────────────┐  │
│  │  今日请求  |  消耗 Token  |  活跃用户  |  错误率       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ 趋势图 ──────────────────────────────────────────────┐  │
│  │  [24h/7d/30d] [请求量/Token/延迟]                      │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │           折线图区域 (ECharts)                  │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ 双栏布局 ───────────────────────────────────────────┐  │
│  │  ┌─ 模型排行 ────┐  ┌─ 渠道报表 ────────┐           │  │
│  │  │  1. gpt-4o   │  │  Channel-A 98%   │           │  │
│  │  │  2. claude   │  │  Channel-B 85%   │           │  │
│  │  │  3. ...      │  │  ...             │           │  │
│  │  └──────────────┘  └──────────────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ 请求日志明细（可展开）──────────────────────────────┐  │
│  │  时间 | 用户 | 模型 | 渠道 | Token | 耗时 | 状态    │  │
│  │  [筛选] [分页]                                      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 KPI 概览行

| 指标 | 数据来源 | 展示方式 |
|------|----------|----------|
| 今日请求数 | `ApiUsageHourly` 今日总和 | 数字 + 较昨日变化率 |
| 消耗 Token | 同上 | 数字 + 变化率 |
| 活跃用户 | 今日去重 userId 数 | 数字 |
| 错误率 | 今日错误数 / 总请求数 | 百分比 + 颜色标识 |

### 4.3 趋势图

- 使用 ECharts 折线图（项目中已有 `echarts` / `echarts-for-react`）
- 时间范围切换：24h / 7d / 30d
- 指标切换：请求量 / Token 消耗 / 平均延迟
- 鼠标悬停显示具体数值

### 4.4 模型排行

- 柱状图或排行列表
- 展示各模型总请求量和 Token 消耗
- 点击可查看该模型的详细趋势

### 4.5 渠道报表

- 表格形式展示：
  - 渠道名称 + 健康状态圆点
  - 请求数 / 成功率 / 平均延迟 / 总 Token
  - 成功率用进度条颜色标识（绿 > 95%，黄 > 80%，红 < 80%）

### 4.6 请求日志明细

- 可展开/收起的面板
- 表格列：时间、用户 ID、模型、渠道、Token、耗时、状态码、错误信息
- 筛选条件：时间范围、模型、渠道、状态码
- 分页显示

### 4.7 侧边栏

在 `AdminSidebar.tsx` 新增菜单项：

| 图标 | 标签（zh-CN） | 标签（en-US） |
|------|------|------|
| ChartBarSquareIcon | 数据分析 | Analytics |

---

## 五、后端聚合定时任务

### 5.1 聚合调度器

在 `src/lib/scheduler.ts` 中新增：

- [ ] `aggregateHourly()`: 每小时执行（cron: `0 * * * *`）
- [ ] `aggregateDaily()`: 每天 00:05 执行（cron: `5 0 * * *`）
- [ ] `cleanExpiredLogs()`: 每天 01:00 执行，清理 30 天前的 ApiUsageLog

### 5.2 数据保留策略

| 数据表 | 保留期限 | 说明 |
|--------|----------|------|
| `ApiUsageLog` | 30 天 | 原始日志，保留用于实时查询和审计 |
| `ApiUsageHourly` | 90 天 | 小时级聚合，用于近期趋势分析 |
| `ApiUsageDaily` | 永久 | 天级聚合，长期趋势和报表的基础 |
| `HealthCheckLog` | 30 天 | 渠道状态变更记录 |

### 5.3 启动与注册

- [ ] 在 `app.ts` 启动时注册调度器
- [ ] 聚合失败时记录错误日志但不影响主服务

---

## 六、国际化 — 翻译补充

> **依赖说明：** 本节依赖 Phase 6 的 i18n 框架（react-i18next + 翻译文件结构）。若 Phase 8 在 Phase 6 之前执行，需先将 i18n 框架搭建完成，或在 Phase 8 中附带 i18n 基础配置。

### zh-CN / en-US `admin.json` 新增

**routes 节新增 kpi keys：**
| Key | zh-CN | en-US |
|-----|-------|-------|
| `kpi.totalRoutes` | 总路由数 | Total Routes |
| `kpi.activeRoutes` | 启用路由 | Active Routes |
| `kpi.singleMode` | 单一模式 | Single Mode |
| `kpi.withBackup` | 有备用渠道 | With Backup |

**analytics 节：**
| Key | zh-CN | en-US |
|-----|-------|-------|
| `title` | 数据分析 | Analytics |
| `overview` | 今日概览 | Today's Overview |
| `requests` | 请求量 | Requests |
| `tokens` | Token 消耗 | Token Usage |
| `activeUsers` | 活跃用户 | Active Users |
| `errorRate` | 错误率 | Error Rate |
| `trend` | 趋势 | Trend |
| `models` | 模型排行 | Model Rankings |
| `channels` | 渠道报表 | Channel Report |
| `log` | 请求日志 | Request Log |
| `period.24h` | 24小时 | 24 Hours |
| `period.7d` | 7天 | 7 Days |
| `period.30d` | 30天 | 30 Days |
| `metric.requests` | 请求量 | Requests |
| `metric.tokens` | Token | Tokens |
| `metric.latency` | 延迟 | Latency |

---

## 七、文件清单

### 修改的文件 (10)

| 文件 | 改动内容 |
|------|----------|
| `server/prisma/schema.prisma` | ApiUsageLog 追加字段，新增 ApiUsageHourly、ApiUsageDaily、HealthCheckLog 模型 |
| `server/src/routes/v1.ts` | 补充 latencyMs、clientIp、routePath 采集 |
| `server/src/routes/gateway.ts` | 补充 latencyMs、clientIp、routePath 采集 |
| `server/src/lib/aggregator.ts` | 新建聚合任务（小时级、天级） |
| `server/src/lib/scheduler.ts` | 新增定时调度器 |
| `server/src/app.ts` | 注册 analytics 路由和调度器 |
| `frontend/src/components/admin/AdminAnalytics.tsx` | 新建分析页面 |
| `frontend/src/components/admin/AdminSidebar.tsx` | 新增数据分析菜单 |
| `frontend/src/pages/AdminPage.tsx` | 注册 analytics 页签 |
| `frontend/src/i18n/locales/*/admin.json` | 补充 analytics 翻译 |

### 新增的文件 (3)

| 文件 | 说明 |
|------|------|
| `server/src/routes/analytics.ts` | 分析 API 路由 |
| `server/src/lib/aggregator.ts` | 数据聚合逻辑 |
| `frontend/src/components/admin/AdminAnalytics.tsx` | 分析面板前端 |

---

## 八、测试要点

| 测试项 | 验证内容 |
|--------|----------|
| 日志记录增强 | 每次请求正确记录 latencyMs、clientIp、routePath |
| 小时级聚合 | 执行聚合后 ApiUsageHourly 数据正确 |
| 天级聚合 | 执行后 ApiUsageDaily 数据正确 |
| 概览接口 | 返回今日请求量、Token、活跃用户、错误率正确 |
| 趋势接口 | 不同 period 和 granularity 返回正确的时间序列 |
| 模型排名 | 按 Token/请求数排序正确 |
| 渠道报表 | 成功率、平均延迟计算正确 |
| 请求日志明细 | 分页、筛选（时间/模型/渠道/状态码）正常 |
| 定时调度 | 聚合任务按 cron 表达式正常触发 |
| 旧日志清理 | 超过保留期限的 ApiUsageLog 被删除 |
| 中英文切换 | 所有新增翻译正确显示 |

---

## 九、工作量估算

| 模块 | 任务 | 预估工时 |
|------|------|---------|
| 数据模型 | Schema 扩展 + 迁移 | 2h |
| 采集增强 | v1.ts + gateway.ts 改造 | 4h |
| 聚合模块 | aggregator.ts（小时/天级聚合 + 清理） | 6h |
| 分析 API | analytics.ts 7个端点 + 缓存 | 8h |
| 定时调度 | scheduler.ts 注册 | 2h |
| 前端展示 | AdminAnalytics.tsx + 侧边栏 + 路由 | 10h |
| 国际化翻译 | admin.json 补充中英文 | 1h |
| 测试 | 集成测试 + 边界测试 | 4h |

**总计：约 37 小时（1 周）**

---

## 十、时间线

```
Day 1-2:   数据模型 + 采集增强（ApiUsageLog 补充字段 + v1.ts/gateway.ts 改造）
Day 3-4:   聚合模块 + 定时调度（aggregator.ts + scheduler.ts）
Day 4-5:   分析 API（analytics.ts 7个端点 + 缓存集成）
Day 5-6:   前端展示（AdminAnalytics.tsx 完整页面）
Day 7:     国际化补充 + 集成测试 + Bug 修复
```

**总计：1 周，约 37 小时工作量**
