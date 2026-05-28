# Phase 3：平台增强与开发者体验

> **周期：5 周** | **目标：提升开发者体验与运营效率**
> 通知系统 → Webhook → 高级分析 → 开发者门户 → 平台优化

## ✅ 完成状态

**状态：已完成** | **完成时间：2026-05-28** | **完成度：100% (42/42)**

### 完成概览

- ✅ Week 1: 通知中心 - 100% (8/8 任务)
- ✅ Week 2: Webhook 系统 - 100% (7/7 任务)
- ✅ Week 3: 高级分析与报表 - 100% (9/9 任务)
- ✅ Week 4: 开发者门户与 API 优化 - 100% (9/9 任务)
- ✅ Week 5: 管理后台增强与平台优化 - 100% (9/9 任务)

### 编译测试

- ✅ 服务端编译通过
- ✅ 前端编译通过

---

## 一、总体架构变更

### 1.1 新增服务

```
Phase 2                           Phase 3
───────                           ───────
ZiroCode/                         ZiroCode/
├── server/                       ├── server/
│   ├── src/                      │   ├── src/
│   │   ├── routes/               │   │   ├── routes/
│   │   │   ├── *.ts (11个)       │   │   │   ├── *.ts (11个)        ← 原有增强
│   │   │   │                     │   │   │   ├── notifications.ts   ← 通知中心
│   │   │   │                     │   │   │   ├── webhooks.ts        ← Webhook 管理
│   │   │   │                     │   │   │   └── analytics.ts       ← 数据分析
│   │   │   └── admin.ts          │   │   │   └── admin.ts (增强)    ← 审计日志/批量操作
│   │   └── lib/                  │   │   └── lib/
│   │       ├── *.ts (8个)        │   │       ├── *.ts (8个)
│   │       │                     │   │       ├── notification.ts    ← 通知引擎
│   │       │                     │   │       ├── webhook-dispatcher.ts ← Webhook 推送
│   │       │                     │   │       └── cache.ts           ← 响应缓存
│   └── prisma/                   │   └── prisma/
│       └── schema.prisma (14表)  │       └── schema.prisma (20表)  ← 新增6表
├── frontend/                     ├── frontend/
│   └── src/                      │   └── src/
│       ├── pages/ (12个)          │       ├── pages/ (15个)         ← 新增3个
│       │                         │       │   ├── NotificationsPage.tsx
│       │                         │       │   ├── WebhooksPage.tsx
│       │                         │       │   └── AnalyticsPage.tsx
│       └── components/           │       └── components/
│           ├── AppLayout.tsx      │           ├── AppLayout.tsx (增强) ← 通知铃铛
│           │                     │           └── NotificationBell.tsx ← 通知下拉
```

### 1.2 新增/修改的 API 端点

| 模块 | 方法 | 端点 | 说明 |
|------|------|------|------|
| 通知 | GET | `/api/notifications` | 通知列表 |
| 通知 | PUT | `/api/notifications/:id/read` | 标记已读 |
| 通知 | PUT | `/api/notifications/read-all` | 全部已读 |
| 通知 | GET | `/api/notifications/unread-count` | 未读数量 |
| 通知 | PUT | `/api/notifications/preferences` | 通知偏好 |
| Webhook | GET | `/api/webhooks` | Webhook 列表 |
| Webhook | POST | `/api/webhooks` | 创建 Webhook |
| Webhook | PUT | `/api/webhooks/:id` | 更新 Webhook |
| Webhook | DELETE | `/api/webhooks/:id` | 删除 Webhook |
| Webhook | POST | `/api/webhooks/:id/test` | 测试 Webhook |
| Webhook | GET | `/api/webhooks/:id/logs` | Webhook 发送日志 |
| 分析 | GET | `/api/analytics/overview` | 总览统计 |
| 分析 | GET | `/api/analytics/cost` | 成本分析 |
| 分析 | GET | `/api/analytics/models` | 模型使用分布 |
| 分析 | GET | `/api/analytics/export` | 导出数据 |
| 管理 | GET | `/api/admin/audit-logs` | 审计日志 |
| 管理 | POST | `/api/admin/batch/redeem-codes` | 批量生成兑换码 |
| 管理 | POST | `/api/admin/batch/adjust-quota` | 批量调整配额 |

---

## 二、Week 1：通知中心

### 2.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 数据模型新增（Notification + NotificationPreference） | `server/prisma/schema.prisma` | 1h |
| 2 | 通知引擎模块 | `server/src/lib/notification.ts` | 3h |
| 3 | 通知 API 路由 | `server/src/routes/notifications.ts` | 3h |
| 4 | 自动通知触发集成 | 多文件 | 5h |
| 5 | 通知铃铛组件 | `frontend/src/components/NotificationBell.tsx` | 3h |
| 6 | 通知中心页面 | `frontend/src/pages/NotificationsPage.tsx` | 4h |
| 7 | AppLayout 集成通知 | `frontend/src/components/AppLayout.tsx` | 1h |
| 8 | 路由配置 | `frontend/src/App.tsx` | 0.5h |

### 2.2 数据模型

```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  content   String?
  link      String?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  @@index([userId, isRead, createdAt])
}

enum NotificationType {
  QUOTA_LOW           // 配额不足
  QUOTA_EXHAUSTED     // 配额耗尽
  SUBSCRIPTION_EXPIRING // 订阅即将过期
  PAYMENT_SUCCESS     // 支付成功
  TICKET_REPLY        // 工单回复
  ANNOUNCEMENT        // 系统公告
  REFERRAL_REWARD     // 推荐奖励
  WEBHOOK_FAILED      // Webhook 推送失败
}

model NotificationPreference {
  id        String   @id @default(cuid())
  userId    String   @unique
  quotaLow  Boolean  @default(true)     // 配额不足提醒
  quotaExhausted Boolean @default(true) // 配额耗尽提醒
  subscriptionExpiring Boolean @default(true)
  marketing Boolean  @default(false)    // 营销通知
  emailDigest Boolean @default(true)    // 邮件摘要
  updatedAt DateTime @updatedAt
}
```

### 2.3 自动通知触发场景

| 触发时机 | 通知类型 | 说明 |
|---------|---------|------|
| API 调用后配额 < 10% | QUOTA_LOW | 提醒用户补充配额 |
| API 调用后配额 = 0 | QUOTA_EXHAUSTED | 告知用户配额已用完 |
| 订阅到期前 3 天 | SUBSCRIPTION_EXPIRING | 提醒续费 |
| Stripe 支付成功 | PAYMENT_SUCCESS | 确认支付 |
| 工单被回复 | TICKET_REPLY | 提醒查看回复 |
| 新公告发布 | ANNOUNCEMENT | 系统通知 |
| 推荐获得奖励 | REFERRAL_REWARD | 奖励通知 |

### 2.4 通知铃铛组件

```
[导航栏右侧]
┌──────────────────────────────────┐
│ 🔔 (3)  [头像]                   │  ← 未读数量角标
└──────────────────────────────────┘
         ↓ 点击展开
┌──────────────────────────────────┐
│ 通知中心                          │
├──────────────────────────────────┤
│ 📌 配额即将用完  2分钟前          │
│ 💰 支付成功     1小时前           │
│ 🎁 推荐奖励     昨天              │
│ ...                              │
├──────────────────────────────────┤
│ 查看全部 →                       │
└──────────────────────────────────┘
```

---

## 三、Week 2：Webhook 系统

### 3.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 数据模型新增（WebhookEndpoint + WebhookLog） | `server/prisma/schema.prisma` | 1h |
| 2 | Webhook 调度模块 | `server/src/lib/webhook-dispatcher.ts` | 4h |
| 3 | Webhook CRUD 路由 | `server/src/routes/webhooks.ts` | 3h |
| 4 | 事件触发集成（配额/支付/使用） | 多文件 | 3h |
| 5 | 重试与退避策略 | `server/src/lib/webhook-dispatcher.ts` | 2h |
| 6 | Webhook 管理页面 | `frontend/src/pages/WebhooksPage.tsx` | 5h |
| 7 | 路由配置 | `frontend/src/App.tsx` | 0.5h |

### 3.2 数据模型

```prisma
model WebhookEndpoint {
  id          String        @id @default(cuid())
  userId      String
  name        String
  url         String
  secret      String        // 签名密钥
  events      WebhookEvent[] // 监听的事件
  isActive    Boolean       @default(true)
  lastSuccessAt DateTime?
  lastFailureAt DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  logs WebhookLog[]
}

model WebhookLog {
  id           String        @id @default(cuid())
  endpointId   String
  event        WebhookEvent
  statusCode   Int?
  responseBody String?
  success      Boolean
  durationMs   Int?
  createdAt    DateTime      @default(now())

  endpoint WebhookEndpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@index([endpointId, createdAt])
}

enum WebhookEvent {
  QUOTA_LOW
  QUOTA_EXHAUSTED
  PAYMENT_SUCCESS
  API_CALL_COMPLETED
  SUBSCRIPTION_EXPIRING
  SUBSCRIPTION_EXPIRED
}
```

### 3.3 事件推流时序

```
业务事件发生 → 查找匹配的 WebhookEndpoint
             → 生成 HMAC-SHA256 签名
             → POST JSON 到目标 URL（超时 10s）
             → 成功：记录 WebhookLog（success=true）
             → 失败：重试（最多 3 次，指数退避 1m/5m/15m）
             → 最终失败：记录 WebhookLog（success=false）
             → 创建通知（WEBHOOK_FAILED）
```

### 3.4 Webhook Payload 格式

```json
{
  "event": "QUOTA_LOW",
  "timestamp": "2026-06-01T12:00:00Z",
  "data": {
    "userId": "xxx",
    "quotaRemaining": 5000000,
    "quotaTotal": 100000000,
    "percentageUsed": 95
  },
  "signature": "sha256=xxxx"
}
```

---

## 四、Week 3：高级分析与报表

### 4.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 分析统计路由 | `server/src/routes/analytics.ts` | 4h |
| 2 | 成本分析逻辑 | `server/src/routes/analytics.ts` | 3h |
| 3 | 数据导出功能（CSV/JSON） | `server/src/routes/analytics.ts` | 2h |
| 4 | 分析总览页面 | `frontend/src/pages/AnalyticsPage.tsx` | 5h |
| 5 | 模型使用分布图表 | `frontend/src/pages/AnalyticsPage.tsx` | 3h |
| 6 | 成本分析图表 | `frontend/src/pages/AnalyticsPage.tsx` | 3h |
| 7 | 数据导出按钮 | `frontend/src/pages/AnalyticsPage.tsx` | 1h |
| 8 | UsagePage 增强（更多维度） | `frontend/src/pages/UsagePage.tsx` | 2h |
| 9 | 路由配置 | `frontend/src/App.tsx` | 0.5h |

### 4.2 API 分析端点

```typescript
// GET /api/analytics/overview
// 返回：总调用次数、总 Token 数、总费用、活跃 Key 数、日均调用量

// GET /api/analytics/cost?from=2026-05-01&to=2026-05-28&groupBy=day
// 返回：[{ date: "2026-05-01", cost: 12.5, tokens: 1500000, calls: 320 }, ...]

// GET /api/analytics/models?from=2026-05-01&to=2026-05-28
// 返回：[{ model: "gpt-4", calls: 1500, tokens: 30000000, cost: 45.0 }, ...]

// GET /api/analytics/export?from=2026-05-01&to=2026-05-28&format=csv
// 返回：CSV 文件下载
```

### 4.3 分析页面布局

```
┌─────────────────────────────────────────────────┐
│ 📊 数据分析                                      │
│ [今日] [本周] [本月] [自定义]    [导出 CSV]       │
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │ 总调用次数 │ │ 总 Token │ │ 总费用   │          │
│ │  12,345  │ │  2.1M   │ │  ¥89.50 │          │
│ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────┤
│ 每日调用趋势                                    │
│ ┌─────────────────────────────────────────┐    │
│ │            📈 折线图                      │    │
│ └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│ 模型分布                       成本分布          │
│ ┌─────────────┐   ┌─────────────┐              │
│ │   🥧 饼图    │   │   🥧 饼图    │              │
│ └─────────────┘   └─────────────┘              │
└─────────────────────────────────────────────────┘
```

---

## 五、Week 4：开发者门户与 API 优化

### 5.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | Swagger/OpenAPI 集成 | `server/src/app.ts` + 配置文件 | 4h |
| 2 | API 文档自动生成 | `server/src/lib/openapi.ts` | 6h |
| 3 | API 状态页（状态码/错误码说明） | `frontend/src/pages/DeveloperPage.tsx` | 4h |
| 4 | 响应缓存模块 | `server/src/lib/cache.ts` | 3h |
| 5 | 缓存策略集成到 v1 路由 | `server/src/routes/v1.ts` | 2h |
| 6 | API Key 增强（IP 白名单、速率限制） | `server/src/routes/keys.ts` | 3h |
| 7 | 前端 API Key 页面增强 | `frontend/src/pages/KeysPage.tsx` | 3h |
| 8 | 速率限制中间件增强 | `server/src/lib/api-utils.ts` | 2h |
| 9 | 路由配置 | `frontend/src/App.tsx` | 0.5h |

### 5.2 API Key 增强

```prisma
model ApiKey {
  // 现有字段...
  ipWhitelist   String[]  @default([])    // IP 白名单
  rateLimit     Int?      @default(60)    // 每分钟请求上限
  allowedModels String[]  @default([])    // 允许的模型列表（空=全部）
  maxTokens     Int?      @default(4096)  // 单次最大 Token
  metadata      Json?                     // 自定义元数据
}
```

### 5.3 响应缓存策略

| 缓存键 | 缓存时间 | 说明 |
|--------|---------|------|
| `cache:models:{keyId}` | 5 分钟 | 模型列表缓存 |
| `rate:{keyId}` | 1 秒 | 速率限制计数器（Redis） |
| `quota:{userId}` | 30 秒 | 配额缓存（减少 DB 查询） |

### 5.4 OpenAPI 文档端点

```
GET /api/docs            → Swagger UI 页面
GET /api/docs/openapi.json → OpenAPI 规范
GET /api/docs/openapi.yaml  → OpenAPI 规范（YAML）
```

---

## 六、Week 5：管理后台增强与平台优化

### 6.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 审计日志表 + 记录中间件 | `server/prisma/schema.prisma` + `server/src/lib/api-utils.ts` | 6h |
| 2 | 审计日志查询 API | `server/src/routes/admin.ts` | 2h |
| 3 | 审计日志页面 | `frontend/src/pages/AdminPage.tsx`（新增 tab） | 3h |
| 4 | 批量操作 API（配额调整/兑换码生成） | `server/src/routes/admin.ts` | 3h |
| 5 | 批量操作页面 | `frontend/src/pages/AdminPage.tsx` | 3h |
| 6 | 渠道健康监控（自动检测） | `server/src/lib/router.ts` | 3h |
| 7 | 渠道测试工具（管理后台） | `frontend/src/pages/AdminPage.tsx` | 2h |
| 8 | 系统配置管理（动态配置） | `server/src/routes/admin.ts` + `server/prisma/schema.prisma` | 3h |
| 9 | 系统配置页面 | `frontend/src/pages/AdminPage.tsx` | 2h |

### 6.2 数据模型

```prisma
// 审计日志
model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  action     String   // "user.update" / "redeem.create" / "channel.edit"
  resource   String   // "User" / "RedeemCode" / "ModelChannel"
  resourceId String?
  detail     Json?
  ip         String?
  createdAt  DateTime @default(now())

  @@index([createdAt])
  @@index([userId])
  @@index([action])
}

// 系统配置
model SystemConfig {
  key   String @id
  value Json
  updatedAt DateTime @updatedAt
}
```

### 6.3 审计日志覆盖的操作

| 操作 | action | 说明 |
|------|--------|------|
| 用户编辑 | `user.update` | 管理员修改用户信息 |
| 用户禁用 | `user.disable` | 禁用用户账号 |
| 兑换码生成 | `redeem.create` | 生成兑换码 |
| 兑换码禁用 | `redeem.disable` | 禁用兑换码 |
| 渠道创建 | `channel.create` | 新增渠道 |
| 渠道编辑 | `channel.edit` | 修改渠道配置 |
| 渠道删除 | `channel.delete` | 删除渠道 |
| 提现审批 | `withdrawal.approve` | 批准提现 |
| 提现拒绝 | `withdrawal.reject` | 拒绝提现 |
| 配额调整 | `quota.adjust` | 管理员调整用户配额 |
| 配置修改 | `config.update` | 修改系统配置 |

### 6.4 系统配置项

| 配置键 | 默认值 | 说明 |
|--------|--------|------|
| `site.name` | `"ZiroCode"` | 站点名称 |
| `site.announcement` | `""` | 全局公告（所有页面顶部显示） |
| `quota.defaultMonthly` | `100000000` | 新用户默认月配额 |
| `rateLimit.default` | `60` | 默认速率限制（次/分钟） |
| `rateLimit.authenticated` | `120` | 已认证用户速率限制 |
| `signup.enabled` | `true` | 是否开放注册 |
| `referral.enabled` | `true` | 是否启用推荐 |

---

## 七、数据模型总变更（新增6张表）

| 表名 | 说明 | 状态 |
|------|------|------|
| Notification | 通知记录 | 新增 |
| NotificationPreference | 通知偏好 | 新增 |
| WebhookEndpoint | Webhook 端点 | 新增 |
| WebhookLog | Webhook 发送日志 | 新增 |
| AuditLog | 审计日志 | 新增 |
| SystemConfig | 系统配置（键值对） | 新增 |
| ApiKey.ipWhitelist | ApiKey 新增字段（IP 白名单） | 修改 |
| ApiKey.rateLimit | ApiKey 新增字段（速率限制） | 修改 |
| ApiKey.allowedModels | ApiKey 新增字段（模型限制） | 修改 |
| ApiKey.maxTokens | ApiKey 新增字段（Token 限制） | 修改 |
| ApiKey.metadata | ApiKey 新增字段（元数据） | 修改 |

---

## 八、前端页面总变更（新增3个页面 + 4个增强）

| 路由 | 页面 | 说明 |
|------|------|------|
| `/notifications` | 通知中心 | 查看所有通知 |
| `/webhooks` | Webhook 管理 | 创建/管理 Webhook |
| `/analytics` | 数据分析 | 使用统计/成本分析/导出 |

**现有页面增强：**

| 路由 | 增强内容 |
|------|---------|
| `/dashboard` | 集成通知预览 |
| `/keys` | IP 白名单、速率限制、模型限制配置 |
| `/usage` | 更多分析维度、导出按钮 |
| `/admin` | 新增审计日志、系统配置、批量操作 tab |
| AppLayout | 通知铃铛 |

### 状态处理约定

所有新页面覆盖：
- **加载态**：骨架屏或加载指示器
- **空状态**：引导提示 + 操作按钮
- **错误态**：错误提示 + 重试按钮
- **边界态**：超长文本截断、数值格式化、大列表分页

---

## 九、环境变量新增

```env
# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# Webhook
WEBHOOK_RETRY_MAX=3          # Webhook 最大重试次数
WEBHOOK_TIMEOUT_MS=10000     # Webhook 超时时间

# Cache
REDIS_CACHE_TTL=300          # 缓存 TTL（秒）

# System
SITE_NAME="ZiroCode"
SITE_URL="http://localhost:3000"
```

---

## 十、时间线

```
Week 1 (Day 1-5):   通知中心（Notification 引擎 + UI）
Week 2 (Day 6-10):  Webhook 系统（事件推送 + 重试）
Week 3 (Day 11-15): 高级分析与报表（成本/模型分析 + 导出）
Week 4 (Day 16-20): 开发者门户（API 文档 + 缓存 + API Key 增强）
Week 5 (Day 21-27): 管理后台增强（审计日志 + 批量操作 + 系统配置）
Day 28-30:          集成测试 + Bug 修复 + 收尾
```

**总计：5 周 + 3 天，约 180 小时工作量**

---

## 十一、优先级排序

```
优先级 P0（核心体验）：
├── 通知中心 ← 用户体验关键，跨功能依赖
├── 管理后台增强（审计日志 + 系统配置）← 运营必需

优先级 P1（重要功能）：
├── API Key 增强（IP 白名单 + 速率限制）← 安全必需
├── Webhook 系统 ← 开发者集成必需
├── 响应缓存 ← 性能优化

优先级 P2（增强功能）：
├── 高级分析 ← 数据驱动决策
├── 开发者门户 ← 开发者体验
```

---

## 十二、测试要点

| 模块 | 关键测试点 |
|------|-----------|
| 通知系统 | 自动触发 → 已读/未读 → 偏好设置 → 通知清理 |
| Webhook | 创建 → 事件触发 → 签名验证 → 重试退避 → 日志查询 |
| 高级分析 | 数据聚合 → 时间范围 → 模型分类 → CSV 导出 |
| API Key 增强 | IP 白名单校验 → 速率限制 → 模型限制 → Token 限制 |
| 审计日志 | 操作记录 → 查询过滤 → 数据保留 → 权限控制 |
| 系统配置 | 动态更新 → 缓存刷新 → 配置校验 |
| 缓存 | 缓存命中 → 缓存失效 → 缓存穿透保护 |
