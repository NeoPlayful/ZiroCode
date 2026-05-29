# Phase 9: 计费系统升级 — Token 拆分与成本核算

> **周期：1 周** | **目标：完善 Token 拆分记录、修复成本计算、增强聚合与分析能力**
> 成本计算 → 聚合表扩展 → 管理后台增强 → 计费报表

## 状态概览

**状态：已完成** | **完成度：100% (15/15)**

**前置条件**：Phase 8 已完成

### 任务分布

- ✅ Week 1: 计费系统升级 - 100% (15/15 任务)

## 版本
- v0.1.19

## 目标

在 Phase 7 已实现的 Token 拆分录入和前端展示基础上，修复遗留问题（`cost: 0` 写死、`cacheCreationTokens` 无来源），扩展聚合表以支持按 input/output/cache 维度分析，增加管理后台 Token 拆分展示，并构建计费报表能力。

---

## 一、数据库变更 — Schema 迁移

### 1.0 ModelChannel 增加定价字段

**现状：** 成本计算需要 `inputPrice`、`outputPrice`、`cacheWritePrice`、`cacheReadPrice` 价格数据，但目前没有任何地方存储这些价格。

**方案：** 在 `ModelChannel` 表新增定价字段，价格由管理员在渠道编辑中配置。

**数据库变更：**
```prisma
model ModelChannel {
  // 现有字段...
  inputPrice        Decimal  @default("0")  // 每百万 token 输入价格（USD）
  outputPrice       Decimal  @default("0")  // 每百万 token 输出价格（USD）
  cacheWritePrice   Decimal  @default("0")  // 每百万 token 缓存写入价格（USD）
  cacheReadPrice    Decimal  @default("0")  // 每百万 token 缓存读取价格（USD）
}
```

**涉及文件：**
- [x] `server/prisma/schema.prisma` — ModelChannel 增加 4 个定价字段
- [x] `server/src/routes/admin.ts` — 渠道创建/编辑 API（第 246/280 行）增加价格字段输入
- [x] `frontend/src/components/admin/AdminChannels.tsx` — 创建/编辑表单增加价格输入框
- [x] 执行 `prisma db push`

### 1.1 `ApiUsageLog.cost` 类型变更

**现状：** `cost` 字段为 `Float?`，浮点类型在高精度金额计算中会累积误差。

**方案：** 改为 `Decimal(12, 6)`，保留 6 位小数。

```prisma
model ApiUsageLog {
  // ...
  cost         Decimal? @db.Decimal(12, 6)
  // ...
}
```

> **数据安全：** 当前所有记录的 `cost` 均为 `0`，变更不会造成数据丢失。

- [x] `server/prisma/schema.prisma` — 修改 `cost` 类型为 `Decimal(12, 6)`
- [x] 执行 `prisma db push`

---

## 二、后端修复 — 成本计算落地

### 2.1 修复 `cost: 0` 写死问题

**现状：** `gateway.ts:27` 中 `logUsage()` 创建记录时 `cost: 0`，实际成本从未入库。

**改动：** 在 `logUsage()` 调用前从 `ModelChannel` 表读取该渠道的定价，计算实际成本（USD），传入 `cost` 参数。注意 Prisma Decimal 类型读取后需通过 `Number()` 转为浮点参与计算。

计算公式（价格从数据库读取，非硬编码）：
```
cost = (inputTokens / 1_000_000 × channel.inputPrice)
     + (outputTokens / 1_000_000 × channel.outputPrice)
     + (cacheCreationTokens / 1_000_000 × channel.cacheWritePrice)
     + (cacheReadTokens / 1_000_000 × channel.cacheReadPrice)
```

> **前置依赖：** 必须先完成 1.0 和 1.1 的 Schema 迁移，否则 `ModelChannel` 没有价格字段。

> **历史数据回溯：** 本次修复只影响新写入的日志。已存在的 `ApiUsageLog.cost = 0` 记录可选择编写批量更新脚本（非必须，不影响后续计费报表的准确性）。

- [x] `server/src/routes/gateway.ts` — Stream 路径（第 121-166 行）在流结束后计算 cost 并传入 `logUsage()`
- [x] `server/src/routes/gateway.ts` — JSON 路径（第 170-197 行）在 `responseData` 解析后计算 cost 并传入
- [x] `server/src/routes/gateway.ts` — `logUsage()` 函数签名增加 `cost` 参数，写入数据库

### 2.2 解决 `cacheCreationTokens` 数据来源

**现状：** 上游 API 响应中通常没有 cache creation tokens 字段，目前硬编码为 0。

**方案：** 保留当前逻辑（`cacheCreationTokens = 0`），但为未来扩展预留。
- 从 `ModelChannel` 表读取定价时，若 `cacheWritePrice` 或 `cacheReadPrice` 为 0，则跳过该项计算
- 如果上游支持（如 Anthropic API 的 `cache_creation_input_tokens`），可增加提取逻辑

- [x] Stream 路径：检查上游是否返回 `usage.cache_creation_input_tokens`，如有则提取
- [x] JSON 路径：同上，增加兼容性提取

---

## 三、聚合表扩展 — Token 拆分

### 3.1 `ApiUsageHourly` 增加拆分字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `totalInputTokens` | BigInt | `0` | 输入 Token 总量 |
| `totalOutputTokens` | BigInt | `0` | 输出 Token 总量 |
| `totalCacheReadTokens` | BigInt | `0` | 缓存读取 Token 总量 |
| `totalCacheWriteTokens` | BigInt | `0` | 缓存创建 Token 总量 |

### 3.2 `ApiUsageDaily` 增加拆分字段

同上四个字段。

### 3.3 聚合逻辑更新

- [x] `server/src/lib/aggregator.ts` — `aggregateHourly()` 分组聚合时增加 input/output/cache 拆分
- [x] `server/src/lib/aggregator.ts` — `aggregateDaily()` 同理
- [x] `server/prisma/schema.prisma` — ApiUsageHourly / ApiUsageDaily 增加新字段
- [x] 执行 `prisma db push`

> **历史数据回溯：** Phase 8 已写入的聚合数据缺失 Token 拆分字段。新增字段后旧行值为 0，不影响新数据。可编写一次性的 backfill 脚本从 `ApiUsageLog` 重新聚合最近 7 天的数据（非必须，建议但延后）。

---

## 四、管理后台分析增强

### 4.1 趋势图支持 Token 拆分维度

管理后台 `GET /api/admin/analytics/trends`（`admin.ts` 第 727 行）的 `metric` 参数扩展：

| 新增 metric | 含义 | 数据来源 |
|-------------|------|----------|
| `input_tokens` | 输入 Token | `inputTokens` 求和 |
| `output_tokens` | 输出 Token | `outputTokens` 求和 |
| `cache_read_tokens` | 缓存读取 | `cacheReadTokens` 求和 |
| `cost` | 估算成本 | 根据 Token 拆分 + 模型价格计算 |

- [x] `server/src/routes/admin.ts` — trends 端点扩展 metric 支持

### 4.2 模型排名增加成本列

- [x] `server/src/routes/admin.ts` — models 端点（第 803 行）增加 `cost` 字段，根据 token 拆分 + 模型单价计算估算成本

### 4.3 Top 用户增加消耗分布

- [x] `server/src/routes/admin.ts` — top-users 端点（第 881 行）增加 input/output/cache 分布字段

### 4.4 前端 Analytics 页面增强

- [x] `frontend/src/components/admin/AdminAnalytics.tsx` — 趋势图增加 metric 切换选项（输入 Token、输出 Token、缓存读取、估算成本）
- [x] `frontend/src/components/admin/AdminAnalytics.tsx` — 模型排行增加"估算成本"列
- [x] `frontend/src/components/admin/AdminAnalytics.tsx` — Top 用户列表增加消耗分布可视化

---

## 五、计费报表 API

### 5.1 新增 `/api/admin/billing/report`

按时间段汇总计费数据：

**参数：**
- `from` / `to`: 时间范围（必填）
- `userId`?: 按用户筛选
- `model`?: 按模型筛选
- `granularity`: `daily` / `monthly`

**返回：**
```json
{
  "summary": {
    "totalCost": 12.34,
    "totalTokens": 1000000,
    "totalInputTokens": 600000,
    "totalOutputTokens": 400000,
    "totalCacheReadTokens": 50000,
    "totalCacheWriteTokens": 10000,
    "totalQuota": 12340000
  },
  "breakdown": [
    {
      "period": "2026-05-29",
      "cost": 6.17,
      "tokens": 500000,
      "inputTokens": 300000,
      "outputTokens": 200000,
      "quota": 6170000
    }
  ]
}
```

### 5.2 新增 `/api/admin/billing/user-report/:userId`

查看指定用户的计费明细：

**参数：**
- `from` / `to`: 时间范围
- `page` / `pageSize`: 分页

**返回：**
```json
{
  "user": { "id": "...", "name": "...", "email": "..." },
  "summary": {
    "totalCost": 12.34,
    "totalQuota": 12340000,
    "totalRequests": 156,
    "periodFrom": "2026-05-01",
    "periodTo": "2026-05-29"
  },
  "logs": [
    {
      "time": "2026-05-29T14:30:00Z",
      "model": "gpt-4o",
      "inputTokens": 500,
      "outputTokens": 200,
      "cacheReadTokens": 0,
      "cacheWriteTokens": 0,
      "cost": 0.00325,
      "quotaUsed": 3250
    }
  ]
}
```

### 5.3 新增 `/api/user/billing`（用户自查询）

用户自己查看历史消费：

- [x] 返回该用户的所有使用记录，带 cost 字段
- [x] 支持按模型、时间范围筛选
- [x] 支持分页

> **索引：** `ApiUsageLog` 已有 `@@index([userId, requestTime])`（schema 第 346 行），可复用，无需新增索引。

### 5.4 前端计费报表面板

- [x] 新增 `frontend/src/components/admin/AdminBillingReport.tsx` — 计费报表前端面板
- [x] `frontend/src/components/admin/AdminSidebar.tsx` — 新增"计费报表"菜单项
- [x] `frontend/src/pages/AdminPage.tsx` — 注册 billing report 页签

---

## 六、数据保留与清理策略

### 5.1 聚合表数据保留

| 数据表 | 保留期限 | 说明 |
|--------|----------|------|
| `ApiUsageLog` | 30 天 | 不变，原始日志 |
| `ApiUsageHourly` | 90 天 | 不变，小时级聚合 |
| `ApiUsageDaily` | 永久 | 不变，天级聚合 |

新增：
- 聚合完成后，原始 `ApiUsageLog` 中的 Token 拆分数据已汇总到小时/天级表，即使清理也不影响历史分析。

---

## 七、国际化

### 7.1 zh-CN / en-US `admin.json` 新增

| Key | zh-CN | en-US |
|-----|-------|-------|
| `analytics.metric.inputTokens` | 输入 Token | Input Tokens |
| `analytics.metric.outputTokens` | 输出 Token | Output Tokens |
| `analytics.metric.cacheRead` | 缓存读取 | Cache Read |
| `analytics.metric.cost` | 估算成本 | Est. Cost |
| `analytics.models.cost` | 费用(USD) | Cost(USD) |
| `billing.title` | 计费报表 | Billing Report |
| `billing.totalCost` | 总费用 | Total Cost |
| `billing.period` | 统计周期 | Period |
| `billing.modelBreakdown` | 模型费用分布 | Model Cost Breakdown |

### 7.2 zh-CN / en-US `usage.json` 补充

| Key | zh-CN | en-US |
|-----|-------|-------|
| `billing.totalCost` | 总费用(USD) | Total Cost (USD) |

---

## 八、文件清单

### 修改的文件 (14)

| 文件 | 改动内容 |
|------|----------|
| `server/prisma/schema.prisma` | ModelChannel 增加定价字段；ApiUsageHourly/Daily 增加 Token 拆分字段 |
| `server/src/routes/gateway.ts` | 修复 cost:0，从 ModelChannel 读取价格计算实际成本 |
| `server/src/routes/admin.ts` | 渠道编辑 API（第 246/280 行）增加价格字段；trends/models/top-users（第 727/803/881 行）增加 Token 拆分和成本维度 |
| `server/src/routes/user.ts` | 新增 `/api/user/billing` 端点 |
| `server/src/lib/aggregator.ts` | 聚合逻辑增加 input/output/cache 拆分求和 |
| `server/src/app.ts` | 注册 billing 路由 |
| `frontend/src/components/admin/AdminAnalytics.tsx` | 趋势图/模型排行/用户分布增强 |
| `frontend/src/components/admin/AdminChannels.tsx` | 创建/编辑表单增加价格输入框 |
| `frontend/src/components/admin/AdminSidebar.tsx` | 新增"计费报表"菜单项 |
| `frontend/src/pages/AdminPage.tsx` | 注册 billing report 页签 |
| `frontend/src/i18n/locales/zh-CN/admin.json` | 补充计费相关翻译 |
| `frontend/src/i18n/locales/en-US/admin.json` | 补充计费相关翻译 |
| `frontend/src/i18n/locales/zh-CN/usage.json` | 补充计费翻译 |
| `frontend/src/i18n/locales/en-US/usage.json` | 补充计费翻译 |

### 新增的文件 (2)

| 文件 | 说明 |
|------|------|
| `server/src/routes/billing.ts` | 计费报表 API（admin + user） |
| `frontend/src/components/admin/AdminBillingReport.tsx` | 计费报表前端面板 |

---

## 九、测试要点

| 测试项 | 验证内容 |
|--------|----------|
| `cost` 入库 | 每次请求后 `ApiUsageLog.cost` 不再为 0，值符合预期 |
| 聚合 Token 拆分 | 小时/天级聚合后，input/output/cache 拆分字段正确汇总 |
| 趋势图拆分 | 选择不同 metric（input/output/cache/cost）时图表数据正确 |
| 模型排名成本 | 按估算成本排序正确，与手动计算一致 |
| 计费报表 | 报表汇总数据与原始日志逐条加总一致 |
| 用户自查询 | 用户可查看自己的历史消费（含 cost） |
| 数据库迁移 | `prisma db push` 后新字段可用，无数据丢失 |

---

## 十、工作量估算

| 模块 | 任务 | 预估工时 |
|------|------|---------|
| 模型定价 | ModelChannel 增加价格字段 + 管理后台编辑 | 4h |
| 成本计算修复 | gateway.ts 从数据库读取价格并计算 cost | 3h |
| 聚合表扩展 | schema 加字段 + aggregator 逻辑更新 | 4h |
| 管理后台增强 | analytics.ts trends/models/top-users 扩展 | 4h |
| 计费报表 API | billing.ts + user billing + 路由注册 | 6h |
| 前端展示增强 | AdminAnalytics 扩展 + AdminBillingReport + 渠道价格编辑 | 10h |
| 国际化翻译 | admin.json + usage.json 补充 | 1h |
| 测试 | 成本验证 + 聚合验证 + 报表验证 | 3h |

**总计：约 35 小时（1 周）**

---

## 十一、时间线

```
Day 1:     模型定价（ModelChannel 加字段 + 管理后台价格编辑）
Day 1-2:   成本计算修复（gateway.ts 从数据库读取价格并计算 cost）
Day 2-3:   聚合表扩展（schema + aggregator）+ 管理后台分析增强（analytics.ts）
Day 3-4:   计费报表 API（billing.ts 新增 + 路由注册）
Day 4-5:   前端增强（AdminAnalytics + AdminBillingReport + 渠道价格编辑）
Day 5-6:   用户自查询 API + 前端展示
Day 7:     国际化补充 + 集成测试 + Bug 修复
```

**总计：1 周，约 35 小时工作量**
