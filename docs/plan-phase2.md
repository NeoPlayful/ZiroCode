# Phase 2：功能增强与商业化开发计划

> **周期：5-6 周** | **目标：完善商业化能力，提升平台完整性**
> 支付集成 → 推荐系统 → 工单/公告 → 多渠道路由 → 流式响应 → 邮件服务 → 管理后台

---

**状态：已完成** | **完成时间：2026-05-28** | **完成度：85% (33/39 任务)**

### 完成概况

| 模块 | 状态 | 说明 |
|------|------|------|
| 多渠道路由 + 流式响应 | ✅ 100% | Phase 3 中完成 |
| 工单系统 | ✅ 100% | 后端 API + 前端对接 |
| 公告系统 | ✅ 100% | 后端 API + 前端对接 |
| 推荐系统 | ✅ 100% | 后端 + 前端对接 |
| 邮件服务 | ✅ 100% | 密码重置 + 通知邮件 |
| 管理后台增强 | ✅ 100% | 工单/公告管理 |
| Stripe 支付 | ⏳ 0% | 延后实施 |
| 定价页面 | ⏳ 0% | 延后实施 |

### 编译测试

- ✅ 服务端编译通过
- ✅ 前端编译通过

## 📌 修订说明

**v1.1 变更（2026-05-27）：**
- ✅ 修正周期为 5-6 周（原 4 周工作量不足）
- ✅ 修正时间线冲突，消除任务重叠
- ✅ 补充密码重置 Token 数据模型
- ✅ 补充推荐奖励触发逻辑（Stripe 支付 → 推荐奖励）
- ✅ 补充提现审批功能（管理后台）
- ✅ 新增数据表：7 张（SubscriptionPlan、Referral、WithdrawalRequest、Ticket、TicketReply、Announcement、AnnouncementRead）
- ✅ Stripe 支付取代手动兑换码为主流充值方式

---

## 一、总体架构变更

### 1.1 新增服务

```
Phase 1                           Phase 2
───────                           ───────
ZiroCode/                         ZiroCode/
├── server/                       ├── server/
│   ├── src/                      │   ├── src/
│   │   ├── routes/               │   │   ├── routes/
│   │   │   ├── *.ts (6个)        │   │   │   ├── *.ts (6个)        ← 原有增强
│   │   │   │                     │   │   │   ├── payments.ts       ← Stripe 支付
│   │   │   │                     │   │   │   ├── referral.ts       ← 推荐系统
│   │   │   │                     │   │   │   ├── tickets.ts        ← 工单系统
│   │   │   │                     │   │   │   ├── announcements.ts  ← 公告系统
│   │   │   │                     │   │   │   └── admin.ts          ← 管理后台
│   │   │   └── v1.ts             │   │   │   └── v1.ts (SSE增强)   ← 流式响应
│   │   └── lib/                  │   │   └── lib/
│   │       ├── *.ts (4个)        │   │       ├── *.ts (4个)
│   │       │                     │   │       ├── stripe.ts         ← Stripe 客户端
│   │       │                     │   │       ├── email.ts          ← 邮件服务
│   │       │                     │   │       └── router.ts         ← 渠道路由
│   └── prisma/                   │   └── prisma/
│       └── schema.prisma (7表)   │       └── schema.prisma (14表)  ← 新增7表
├── frontend/                     ├── frontend/
│   └── src/                      │   └── src/
│       ├── pages/ (6个)          │       ├── pages/ (9个)          ← 新增3个
│       │                         │       │   ├── PricingPage.tsx   ← 定价页
│       │                         │       │   ├── TicketsPage.tsx   ← 工单页
│       │                         │       │   └── AdminPage.tsx     ← 管理后台
│       └── components/           │       └── components/ (新增)
│           └── *.tsx (2个)       │           ├── AdminLayout.tsx
│                                 │           └── TicketForm.tsx
```

### 1.2 新增/修改的 API 端点

| 模块 | 方法 | 端点 | 说明 |
|------|------|------|------|
| 支付 | POST | `/api/payments/create-checkout` | 创建 Stripe Checkout 会话 |
| 支付 | POST | `/api/payments/webhook` | Stripe Webhook（无需认证） |
| 支付 | GET | `/api/payments/history` | 支付历史 |
| 推荐 | GET | `/api/referral/stats` | 推荐统计 |
| 推荐 | POST | `/api/referral/claim` | 领取奖励 |
| 工单 | GET | `/api/tickets` | 工单列表 |
| 工单 | POST | `/api/tickets` | 创建工单 |
| 工单 | GET | `/api/tickets/:id` | 工单详情 |
| 工单 | POST | `/api/tickets/:id/reply` | 回复工单 |
| 公告 | GET | `/api/announcements` | 公告列表 |
| 公告 | PUT | `/api/announcements/:id/read` | 标记已读 |
| 邮件 | POST | `/api/auth/forgot-password` | 发送重置邮件 |
| 邮件 | POST | `/api/auth/reset-password` | 重置密码 |
| 管理 | GET | `/api/admin/users` | 用户管理 |
| 管理 | PUT | `/api/admin/users/:id` | 修改用户 |
| 管理 | GET | `/api/admin/subscriptions` | 订阅管理 |
| 管理 | POST | `/api/admin/redeem-codes` | 生成兑换码 |
| 管理 | GET | `/api/admin/stats` | 平台统计 |
| 管理 | GET | `/api/admin/channels` | 渠道管理 |
| 管理 | POST | `/api/admin/channels` | 新增渠道 |
| 管理 | PUT | `/api/admin/channels/:id` | 编辑渠道 |
| 管理 | GET | `/api/admin/withdrawals` | 提现申请列表 |
| 管理 | PUT | `/api/admin/withdrawals/:id/approve` | 批准提现 |
| 管理 | PUT | `/api/admin/withdrawals/:id/reject` | 拒绝提现 |
| 网关 | POST | `/api/v1/chat/completions` | ← 增加 SSE 流式支持 |

---

## 二、Week 1：Stripe 支付集成

### 2.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 安装 Stripe 依赖 | `server/package.json` | 0.5h |
| 2 | 创建 Stripe 工具模块 | `server/src/lib/stripe.ts` | 2h |
| 3 | 创建支付路由 | `server/src/routes/payments.ts` | 4h |
| 4 | 添加 Webhook 端点（无需认证） | `server/src/routes/payments.ts` | 2h |
| 5 | 新增 SubscriptionPlan 数据 | `server/prisma/schema.prisma` | 1h |
| 6 | 前端定价页 | `frontend/src/pages/PricingPage.tsx` | 4h |
| 7 | 路由配置 | `frontend/src/App.tsx` | 0.5h |

### 2.2 Stripe 工具模块

```typescript
// server/src/lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
export const PRICE_IDS = {
  pay_as_you_go: process.env.STRIPE_PRICE_PAYG,
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  permanent: process.env.STRIPE_PRICE_PERMANENT,
};
```

### 2.3 环境变量新增

```env
STRIPE_SECRET_KEY="sk_live_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
STRIPE_PRICE_PAYG="price_payg_xxx"
STRIPE_PRICE_MONTHLY="price_monthly_xxx"
STRIPE_PRICE_PERMANENT="price_permanent_xxx"
```

### 2.4 数据模型新增

```prisma
model SubscriptionPlan {
  id          String   @id @default(cuid())
  name        String   @unique
  type        SubscriptionType
  price       Decimal  @db.Decimal(10, 2)
  quotaAmount BigInt
  durationDays Int?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}
```

### 2.5 支付流程

```
用户选择套餐 → Stripe Checkout → 用户付款
                                     ↓
                          Stripe Webhook → 验证签名
                                     ↓
                         创建 Subscription + Transaction
                                     ↓
                         检查用户是否有推荐人（Referral表）
                                     ↓
                         触发推荐奖励计算（更新 totalReward）
                                     ↓
                        前端轮询/跳转 → 完成
```

**推荐奖励触发规则：**
- Stripe 支付成功后，根据购买金额计算推荐人奖励
- 奖励比例：一级推荐人获得消费金额的 10%（可配置）
- 奖励以配额形式发放（1元 = 1亿配额）

---

## 三、Week 2：推荐系统完整实现

### 3.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 数据模型新增（Referral + Withdrawal） | `server/prisma/schema.prisma` | 1h |
| 2 | User 表增加 referralCode | `server/prisma/schema.prisma` | 0.5h |
| 3 | 注册时生成邀请码 | `server/src/routes/auth.ts` | 1h |
| 4 | 注册时记录推荐关系 | `server/src/routes/auth.ts` | 2h |
| 5 | 推荐统计路由 | `server/src/routes/referral.ts` | 3h |
| 6 | 奖励计算逻辑 | `server/src/lib/referral.ts` | 2h |
| 7 | Stripe 支付触发推荐奖励 | `server/src/routes/payments.ts` | 2h |
| 8 | 兑换码消费触发推荐奖励 | `server/src/routes/subscriptions.ts` | 1h |
| 9 | 领取奖励路由 | `server/src/routes/referral.ts` | 2h |
| 10 | 推荐规则配置化 | `server/src/lib/referral.ts` | 1h |
| 11 | 前端真实数据对接 | `frontend/src/components/ReferralSection.tsx` | 3h |

### 3.2 新增数据表

```prisma
// 推荐关系表
model Referral {
  id           String   @id @default(cuid())
  referrerId   String   // 推荐人
  referredId   String   @unique // 被推荐人
  tier         Int      @default(1) // 层级（预留多级）
  totalReward  BigInt   @default(0) // 累计奖励（配额）
  claimedReward BigInt  @default(0) // 已领取
  createdAt    DateTime @default(now())

  referrer User @relation("referrer", fields: [referrerId], references: [id])
  referred User @relation("referred", fields: [referredId], references: [id])

  @@index([referrerId])
}

// 提现申请表
model WithdrawalRequest {
  id         String            @id @default(cuid())
  userId     String
  amount     Decimal           @db.Decimal(10, 2)
  status     WithdrawalStatus  @default(PENDING)
  createdAt  DateTime          @default(now())
  processedAt DateTime?
  remark     String?

  user User @relation(fields: [userId], references: [id])

  @@index([userId, status])
}

enum WithdrawalStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### 3.3 奖励规则

```
// 奖励规则（可配置化）
{
  rewardPerUnit: 1,          // 每 1 亿配额 = 1 元
  minWithdrawal: 10,          // 最低提现 10 元
  tierRates: [1.0, 0.1],     // 一级 100%, 二级 10%
  antiFraud: {
    sameIpLimit: 3,           // 同一 IP 最多关联 3 人
    minDaysBetween: 1,        // 推荐间隔至少 1 天
  }
}
```

---

## 四、Week 3：工单系统

### 4.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 数据模型新增（Ticket + TicketReply） | `server/prisma/schema.prisma` | 1h |
| 2 | 工单 CRUD 路由 | `server/src/routes/tickets.ts` | 4h |
| 3 | 工单列表页 | `frontend/src/pages/TicketsPage.tsx` | 4h |
| 4 | 工单详情/回复页 | `frontend/src/pages/TicketDetailPage.tsx` | 3h |
| 5 | 路由配置 | `frontend/src/App.tsx` | 0.5h |

### 4.2 数据模型

```prisma
model Ticket {
  id        String    @id @default(cuid())
  userId    String
  title     String
  content   String
  status    TicketStatus @default(OPEN)
  priority  TicketPriority @default(NORMAL)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user  User          @relation(fields: [userId], references: [id])
  replies TicketReply[]

  @@index([userId, status])
}

model TicketReply {
  id        String   @id @default(cuid())
  ticketId  String
  userId    String
  content   String
  isStaff   Boolean  @default(false)
  createdAt DateTime @default(now())

  ticket Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id])
}

enum TicketStatus { OPEN, IN_PROGRESS, RESOLVED, CLOSED }
enum TicketPriority { LOW, NORMAL, HIGH, URGENT }
```

---

## 五、Week 3：公告系统

### 5.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 数据模型新增 | `server/prisma/schema.prisma` | 0.5h |
| 2 | 公告路由 | `server/src/routes/announcements.ts` | 2h |
| 3 | 仪表板集成公告 | `frontend/src/pages/DashboardPage.tsx` | 2h |
| 4 | 公告已读状态 | `server/prisma/schema.prisma` | 0.5h |

### 5.2 数据模型

```prisma
model Announcement {
  id        String   @id @default(cuid())
  title     String
  content   String
  priority  Int      @default(0)
  isPinned  Boolean  @default(false)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  readBy AnnouncementRead[]
}

model AnnouncementRead {
  id             String @id @default(cuid())
  userId         String
  announcementId String
  readAt         DateTime @default(now())

  announcement Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id])

  @@unique([userId, announcementId])
}
```

---

## 六、Week 4：多渠道智能路由 + 流式响应

### 6.1 多渠道路由

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 渠道健康检查模块 | `server/src/lib/router.ts` | 3h |
| 2 | 渠道故障转移逻辑 | `server/src/lib/router.ts` | 2h |
| 3 | 管理后台渠道管理 | `server/src/routes/admin.ts` | 2h |

**路由策略：**
```
请求到达 → 按 priority 排序渠道列表
         → 跳过 isActive=false 的渠道
         → 健康检查（上次成功时间）
         → 选择最优渠道转发
         → 失败时自动切换到下一个
         → 记录渠道使用日志
```

### 6.2 流式响应（SSE）

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 后端 SSE 输出 | `server/src/routes/v1.ts` | 4h |
| 2 | 客户端 fetch 适配（新建） | `frontend/src/lib/api.ts` | 2h |
| 3 | 模型调用测试 | - | 1h |

**兼容方案：**
```
请求头 stream: true → SSE 流式返回
请求头 stream: false → 普通 JSON（默认）
```

---

## 七、Week 5：邮件服务 + 密码重置

### 7.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | User 表新增密码重置字段 | `server/prisma/schema.prisma` | 0.5h |
| 2 | 邮件发送模块 | `server/src/lib/email.ts` | 3h |
| 3 | 忘记密码路由 | `server/src/routes/auth.ts` | 2h |
| 4 | 重置密码路由 | `server/src/routes/auth.ts` | 2h |
| 5 | 忘记密码页面 | `frontend/src/pages/ForgotPasswordPage.tsx` | 2h |
| 6 | 重置密码页面 | `frontend/src/pages/ResetPasswordPage.tsx` | 2h |
| 7 | 路由配置 | `frontend/src/App.tsx` | 0.5h |

### 7.2 数据模型新增

```prisma
model User {
  // 现有字段...
  resetPasswordToken   String?   @unique
  resetPasswordExpires DateTime?
}
```

### 7.3 邮件配置

```env
SMTP_HOST="smtp.resend.com"
SMTP_PORT=465
SMTP_USER="..."
SMTP_PASS="..."
EMAIL_FROM="noreply@zirocode.com"
```

### 7.4 密码重置流程

```
用户请求重置 → 生成 token（15 分钟过期）
             → 发送邮件（含重置链接）
             → 用户点击链接 → 验证 token
             → 输入新密码 → 更新 → 跳转登录
```

---

## 八、Week 6：管理后台

### 8.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 管理后台路由（Admin 角色中间件） | `server/src/lib/api-utils.ts` | 1h |
| 2 | 用户管理 API | `server/src/routes/admin.ts` | 3h |
| 3 | 订阅管理 API | `server/src/routes/admin.ts` | 2h |
| 4 | 兑换码管理 API | `server/src/routes/admin.ts` | 2h |
| 5 | 渠道管理 API | `server/src/routes/admin.ts` | 2h |
| 6 | 提现审批 API | `server/src/routes/admin.ts` | 2h |
| 7 | 管理仪表板页 | `frontend/src/pages/AdminPage.tsx` | 4h |
| 8 | 用户管理页面 | `frontend/src/pages/AdminUsersPage.tsx` | 4h |
| 9 | 订阅管理页面 | `frontend/src/pages/AdminSubscriptionsPage.tsx` | 3h |
| 10 | 兑换码管理页面 | `frontend/src/pages/AdminRedeemCodesPage.tsx` | 4h |
| 11 | 渠道管理页面 | `frontend/src/pages/AdminChannelsPage.tsx` | 4h |
| 12 | 提现审批页面 | `frontend/src/pages/AdminWithdrawalsPage.tsx` | 4h |
| 13 | 管理布局组件 | `frontend/src/components/AdminLayout.tsx` | 2h |
| 14 | 路由配置 | `frontend/src/App.tsx` | 0.5h |

### 8.2 管理后台路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/admin` | 管理仪表板 | 平台概览统计 |
| `/admin/users` | 用户管理 | 列表/搜索/编辑/禁用 |
| `/admin/subscriptions` | 订阅管理 | 查看所有订阅 |
| `/admin/redeem-codes` | 兑换码管理 | 生成/禁用 |
| `/admin/channels` | 渠道管理 | 新增/编辑/测试 |
| `/admin/withdrawals` | 提现审批 | 审批/拒绝提现申请 |

### 8.3 Admin 角色中间件

```typescript
// api-utils.ts 新增
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const user = await requireAuth(req, reply);
  if (!user) return null;
  if (user.role !== 'ADMIN') {
    reply.status(403).send({ error: { code: 'FORBIDDEN', message: '需要管理员权限' } });
    return null;
  }
  return user;
}
```

---

## 九、数据模型总变更（新增7张表）

| 表名 | 说明 | 状态 |
|------|------|------|
| SubscriptionPlan | 订阅套餐定价 | 新增 |
| Referral | 推荐关系 | 新增 |
| WithdrawalRequest | 提现申请 | 新增 |
| Ticket | 工单 | 新增 |
| TicketReply | 工单回复 | 新增 |
| Announcement | 公告 | 新增 |
| AnnouncementRead | 公告已读记录 | 新增 |
| User.referralCode | User 表新增字段（邀请码） | 修改 |
| User.resetPasswordToken | User 表新增字段（重置 Token） | 修改 |
| User.resetPasswordExpires | User 表新增字段（Token 过期时间） | 修改 |

---

## 十、前端页面总变更（新增7个页面）

| 路由 | 页面 | 说明 |
|------|------|------|
| `/pricing` | 定价页 | 套餐展示 + Stripe Checkout |
| `/tickets` | 工单列表 | 我的工单 |
| `/tickets/:id` | 工单详情 | 查看/回复 |
| `/forgot-password` | 忘记密码 | 邮箱输入 |
| `/reset-password` | 重置密码 | 新密码设置 |
| `/admin` | 管理后台 | 仪表板/用户/订阅/兑换码/渠道/提现 |
| `/admin/withdrawals` | 提现审批 | 审批/拒绝提现申请 |

### 状态处理约定

所有新页面覆盖：
- **加载态**：骨架屏或加载指示器
- **空状态**：引导提示 + 操作按钮
- **错误态**：错误提示 + 重试按钮
- **边界态**：超长文本截断、数值格式化

---

## 十一、环境变量新增

```env
# Stripe
STRIPE_SECRET_KEY="sk_live_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
STRIPE_PRICE_PAYG="price_xxx"
STRIPE_PRICE_MONTHLY="price_xxx"
STRIPE_PRICE_PERMANENT="price_xxx"

# SMTP
SMTP_HOST="smtp.resend.com"
SMTP_PORT=465
SMTP_USER="..."
SMTP_PASS="..."
EMAIL_FROM="noreply@zirocode.com"

# 推荐配置
REFERRAL_REWARD_PER_UNIT=1         # 每亿配额奖励 1 元
REFERRAL_MIN_WITHDRAWAL=10         # 最低提现 10 元
REFERRAL_TIER_RATES="1.0,0.1"     # 一级 100%, 二级 10%
```

---

## 十二、时间线

```
Week 1 (Day 1-5): Stripe 支付集成
Week 2 (Day 6-10): 推荐系统完整实现
Week 3 (Day 11-15): 工单系统 + 公告系统
Week 4 (Day 16-20): 多渠道路由 + 流式响应
Week 5 (Day 21-25): 邮件服务 + 密码重置
Week 6 (Day 26-32): 管理后台（用户/订阅/兑换码/渠道/提现）
Day 33-35: 集成测试 + Bug 修复 + 收尾
```

**总计：5 周 + 3 天，约 200 小时工作量**

---

## 十三、预发顺序（按优先级）

```
优先级 P0（必须）：
├── 流式响应（SSE）← 用户体验关键
├── 管理后台（兑换码生成 + 渠道管理）← 运营必需
├── 邮件服务（密码重置）← 用户自助必需

优先级 P1（重要）：
├── Stripe 支付 ← 商业化核心
├── 推荐系统 ← 增长引擎

优先级 P2（增强）：
├── 多渠道路由 ← 可用性提升
├── 工单系统 ← 客服支持
├── 公告系统 ← 运营通知
```

---

## 十四、测试要点

| 模块 | 关键测试点 |
|------|-----------|
| Stripe 支付 | Checkout 创建 → Webhook 接收 → 订阅创建 |
| 推荐系统 | 注册带参 → 奖励计算 → 提现流程 |
| 工单 | 创建 → 回复 → 状态变更 → 权限控制 |
| 流式响应 | SSE 格式 → 中断恢复 → 配额扣减 |
| 密码重置 | Token 生成 → 邮件发送 → 过期验证 |
| 管理后台 | 角色权限 → CRUD 操作 → 数据正确性 |
