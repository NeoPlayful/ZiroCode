# Phase 1：MVP 最小可行产品开发计划（修订版）

> **周期：3 周** | **目标：核心闭环可运行**  
> 用户注册 → 兑换订阅 → 创建API Key → 调用网关 → 扣减配额 → 查看仪表板

---

## 📌 修订说明

**与原计划的主要差异：**
- ❌ 删除独立 Fastify 网关服务（改用 Next.js API Routes）
- ❌ 删除 Stripe 支付（Phase 2 实现）
- ❌ 删除推荐系统完整实现（Phase 2 实现）
- ❌ 删除工单系统、公告系统（Phase 3 实现）
- ❌ 删除多渠道智能路由（先固定单渠道）
- ✅ 添加 API 使用日志表（UsageLog）
- ✅ 明确认证方案（自研 JWT + httpOnly cookie）
- ✅ 添加测试策略
- ✅ 添加环境变量清单
- ✅ 简化数据模型

**核心原则：** 只做能跑通业务闭环的最小功能集

---

## 一、架构决策

### 1.1 技术架构（简化版）

```
ZiroCode/
├── src/web/                    # Next.js 16 (前端 + 后端统一)
│   ├── app/                    # App Router
│   │   ├── (auth)/            # 认证页面组
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/       # 仪表板页面组（根路由 /）
│   │   │   ├── page.tsx       # 仪表板首页（已接入真实数据）
│   │   │   ├── keys/page.tsx  # API Key 管理
│   │   │   ├── subscription/page.tsx # 订阅管理
│   │   │   └── usage/page.tsx # 使用统计
│   │   └── api/               # API Routes (11个端点)
│   ├── lib/                   # 共享逻辑
│   │   ├── auth.ts            # JWT + httpOnly cookie
│   │   ├── db.ts              # Prisma client 单例
│   │   ├── quota.ts           # 配额计算 + API Key 生成 + 限流
│   │   └── api-utils.ts       # 认证中间件 + 统一错误格式
│   ├── prisma/
│   │   ├── schema.prisma      # 7张表完整数据模型
│   │   └── seed.ts            # 种子数据
│   └── components/            # UI 组件
├── docker-compose.yml         # PostgreSQL 16 + Redis 7
└── .env.example               # 环境变量模板
```

**关键决策：**
1. **不拆分独立 server**：Next.js API Routes 足够处理 MVP 阶段流量
2. **AI 网关在 Next.js 内**：`/api/v1/chat/completions` 作为代理端点
3. **后期可拆分**：当 QPS > 1000 时再考虑独立网关服务

### 1.2 认证方案

**选择：自研 JWT + httpOnly Cookie**

**理由：**
- Auth.js 对于简单邮箱密码登录过于重量级
- 自研方案更灵活，便于后期扩展

**实现：**
- 使用 `jose` 库生成/验证 JWT
- Token 存储在 httpOnly cookie（防 XSS）
- 过期时间：7 天（access token）

### 1.3 环境变量清单

```bash
# .env.example

# Database
DATABASE_URL="postgresql://zirocode:dev_password@localhost:5432/zirocode"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key-min-32-chars-change-in-production"
JWT_EXPIRES_IN="7d"

# AI Channels (MVP 只配置一个)
OPENAI_API_KEY="sk-xxx"
OPENAI_BASE_URL="https://api.openai.com/v1"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Admin (用于创建兑换码)
ADMIN_EMAIL="admin@zirocode.com"
ADMIN_PASSWORD="admin123"
```

### 1.4 项目基础设施

**docker-compose.yml**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: zirocode
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: zirocode
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**启动命令：**
```bash
# 1. 启动数据库
docker compose up -d

# 2. 安装依赖
cd src/web
pnpm install

# 3. 新增依赖
pnpm add jose bcryptjs ioredis @prisma/client
pnpm add -D @types/bcryptjs prisma

# 4. 初始化数据库
pnpm prisma migrate dev --name init
pnpm prisma db seed

# 5. 启动开发服务器
pnpm dev
```

---

## 二、数据模型设计（简化版）

### 2.1 核心表定义

**prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 用户表
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  avatar       String?
  role         Role     @default(USER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  apiKeys       ApiKey[]
  subscriptions Subscription[]
  transactions  Transaction[]
  usageLogs     ApiUsageLog[]

  @@index([email])
}

enum Role {
  USER
  ADMIN
}

// API 密钥表
model ApiKey {
  id          String    @id @default(cuid())
  userId      String
  key         String    @unique  // sk-xxx 格式
  name        String
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  usageLogs ApiUsageLog[]

  @@index([userId])
  @@index([key])
}

// 订阅表
model Subscription {
  id               String           @id @default(cuid())
  userId           String
  type             SubscriptionType
  quotaTotal       BigInt           // 总配额（按量）
  quotaUsed        BigInt           @default(0)
  quotaMonthly     BigInt?          // 月卡配额
  quotaMonthlyUsed BigInt           @default(0)
  startsAt         DateTime
  expiresAt        DateTime?
  isActive         Boolean          @default(true)
  lastResetAt      DateTime?        // 月卡上次重置时间
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@index([userId])
  @@index([isActive])
}

enum SubscriptionType {
  PAY_AS_YOU_GO  // 按量
  MONTHLY        // 月卡
  PERMANENT      // 永久
}

// 兑换码表
model RedeemCode {
  id          String    @id @default(cuid())
  code        String    @unique
  quotaAmount BigInt    // 兑换后获得的配额
  type        SubscriptionType
  maxUses     Int       @default(1)
  usedCount   Int       @default(0)
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())

  transactions Transaction[]

  @@index([code])
  @@index([isActive])
}

// 交易记录表
model Transaction {
  id             String          @id @default(cuid())
  userId         String
  type           TransactionType
  amount         Decimal         @db.Decimal(10, 2)
  quotaAmount    BigInt?         // 涉及的配额数量
  description    String
  subscriptionId String?
  redeemCodeId   String?
  status         TransactionStatus @default(SUCCEEDED)
  createdAt      DateTime        @default(now())

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription? @relation(fields: [subscriptionId], references: [id])
  redeemCode   RedeemCode?   @relation(fields: [redeemCodeId], references: [id])

  @@index([userId])
  @@index([createdAt])
}

enum TransactionType {
  REDEEM         // 兑换码兑换
  ADMIN_ADJUST   // 管理员调整
}

enum TransactionStatus {
  PENDING
  SUCCEEDED
  FAILED
}

// API 使用日志表（新增）
model ApiUsageLog {
  id           String   @id @default(cuid())
  userId       String
  apiKeyId     String
  model        String   // 使用的模型
  tokensUsed   Int      // 消耗的 token 数
  quotaUsed    BigInt   // 扣减的配额
  statusCode   Int      // HTTP 状态码
  error        String?  // 错误信息
  requestTime  DateTime @default(now())
  responseTime DateTime

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  apiKey ApiKey @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)

  @@index([userId, requestTime])
  @@index([apiKeyId])
}

// 模型渠道表（简化版）
model ModelChannel {
  id          String   @id @default(cuid())
  name        String   @unique  // 渠道标识 (openai, anthropic)
  displayName String   // 显示名称
  baseUrl     String   // API 基础 URL
  apiKey      String   // 渠道 API Key
  models      String[] // 支持的模型列表
  isActive    Boolean  @default(true)
  priority    Int      @default(0)
  createdAt   DateTime @default(now())

  @@index([isActive, priority])
}
```

### 2.2 核心业务规则

- **配额优先级**：优先消耗月卡额度（每日/每月重置），耗完后消耗按量额度
- **月卡重置**：每天早上 8:00 自动重置 `quotaMonthlyUsed` 为 0（通过 cron job）
- **API Key 鉴权**：`Authorization: Bearer sk-xxx`，网关层校验
- **API Key 格式**：`sk-` + 32位随机字符串
- **兑换码格式**：8-16位大写字母+数字

### 2.3 种子数据脚本

**prisma/seed.ts**
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 创建管理员
  await prisma.user.upsert({
    where: { email: 'admin@zirocode.com' },
    update: {},
    create: {
      email: 'admin@zirocode.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  // 创建测试用户
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('test123', 10),
      name: 'Test User',
      role: 'USER',
    },
  });

  // 创建测试兑换码
  await prisma.redeemCode.upsert({
    where: { code: 'TEST1000' },
    update: {},
    create: {
      code: 'TEST1000',
      quotaAmount: BigInt(100000000), // 1亿配额
      type: 'PAY_AS_YOU_GO',
      maxUses: 10,
    },
  });

  // 创建模型渠道
  await prisma.modelChannel.upsert({
    where: { name: 'openai' },
    update: {},
    create: {
      name: 'openai',
      displayName: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
      models: ['gpt-4', 'gpt-3.5-turbo'],
      isActive: true,
      priority: 1,
    },
  });

  console.log('✅ Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**package.json 添加：**
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## 三、后端 API 开发（精简版）

### 3.1 API 优先级说明

**P0 = 必须实现（核心闭环）**  
**P1 = 重要但可延后**  
**P2 = Phase 2 实现**

### 3.2 认证模块

| 优先级 | 方法 | 端点 | 说明 |
|--------|------|------|------|
| **P0** | POST | `/api/auth/register` | 用户注册 |
| **P0** | POST | `/api/auth/login` | 用户登录 |
| **P0** | POST | `/api/auth/logout` | 用户登出 |
| **P0** | GET | `/api/auth/me` | 获取当前用户 |

### 3.3 用户模块

| 优先级 | 方法 | 端点 | 说明 |
|--------|------|------|------|
| **P0** | GET | `/api/user/dashboard` | 仪表板数据 |
| **P0** | GET | `/api/user/quota` | 配额详情 |
| P1 | GET | `/api/user/profile` | 用户资料 |
| P1 | PUT | `/api/user/profile` | 更新资料 |

### 3.4 API Key 管理

| 优先级 | 方法 | 端点 | 说明 |
|--------|------|------|------|
| **P0** | GET | `/api/keys` | 密钥列表 |
| **P0** | POST | `/api/keys` | 创建密钥 |
| **P0** | DELETE | `/api/keys/:id` | 删除密钥 |
| P1 | PUT | `/api/keys/:id` | 更新密钥 |

### 3.5 订阅管理

| 优先级 | 方法 | 端点 | 说明 |
|--------|------|------|------|
| **P0** | GET | `/api/subscriptions` | 订阅列表 |
| **P0** | POST | `/api/subscriptions/redeem` | 兑换码兑换 |
| P2 | GET | `/api/subscriptions/plans` | 套餐列表 |

### 3.6 AI 网关（简化版）

| 优先级 | 方法 | 端点 | 说明 |
|--------|------|------|------|
| **P0** | POST | `/api/v1/chat/completions` | OpenAI 兼容接口 |
| **P0** | GET | `/api/v1/models` | 模型列表 |

**网关实现要点：**
```typescript
// app/api/v1/chat/completions/route.ts
export async function POST(req: Request) {
  // 1. 验证 API Key
  const apiKey = req.headers.get('authorization')?.replace('Bearer ', '');
  const key = await validateApiKey(apiKey);
  if (!key) return unauthorized();

  // 2. 检查配额
  const quota = await getUserQuota(key.userId);
  if (quota.remaining <= 0) return insufficientQuota();

  // 3. 转发到上游（固定 OpenAI）
  const body = await req.json();
  const channel = await getActiveChannel('openai');
  const upstreamResponse = await fetch(`${channel.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${channel.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  // 4. 计算用量并扣减配额
  const responseData = await upstreamResponse.json();
  const tokensUsed = responseData.usage?.total_tokens || 0;
  const quotaUsed = BigInt(tokensUsed); // 1 token = 1 配额
  await deductQuota(key.userId, quotaUsed);

  // 5. 记录日志
  await logApiUsage({
    userId: key.userId,
    apiKeyId: key.id,
    model: body.model,
    tokensUsed,
    quotaUsed,
    statusCode: upstreamResponse.status,
  });

  return Response.json(responseData);
}
```

### 3.7 系统接口

| 优先级 | 方法 | 端点 | 说明 |
|--------|------|------|------|
| **P0** | GET | `/api/health` | 健康检查 |
| P1 | GET | `/api/models` | 模型渠道列表 |

---

## 四、前端开发

### 4.1 认证页面

**页面路由：**
- `/login` - 登录页
- `/register` - 注册页

**实现要点：**
- 使用 React Hook Form + Zod 校验
- 登录成功后跳转到 `/dashboard`
- 错误提示友好展示

### 4.2 仪表板改造

**当前问题：** `app/(dashboard)/page.tsx` 数据全部硬编码

**改造步骤：**
1. 使用 TanStack Query 获取数据
2. 添加加载态、错误态、空状态
3. 数据驱动渲染

```typescript
// app/dashboard/page.tsx
'use client';
import { useQuery } from '@tanstack/react-query';

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/user/dashboard').then(r => r.json()),
  });

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data.subscriptions.active) return <EmptyState />;

  return <div>{/* 使用 data 渲染 */}</div>;
}
```

### 4.3 API Key 管理页面

**页面路由：** `/keys`

**功能：**
- 密钥列表（表格展示）
- 创建密钥（弹窗）
- 删除密钥（确认弹窗）
- 复制密钥（只显示一次完整密钥）

### 4.4 订阅管理页面

**页面路由：** `/subscription`

**功能：**
- 当前订阅状态
- 配额进度条
- 兑换码输入框

### 4.5 使用统计页面

**页面路由：** `/usage`

**功能：**
- 时间范围选择（最近7天/30天）
- 折线图（echarts）
- 数据表格

### 4.6 状态处理清单

**前端通用：**
- [ ] **加载态**：每个数据驱动组件都有骨架屏
- [ ] **空状态**：列表无数据时显示引导文案
- [ ] **错误态**：API 请求失败时显示错误提示 + 重试按钮
- [ ] **边界态**：超长文本截断、数值溢出处理

---

## 五、测试策略（最小化）

### 5.1 测试范围

**MVP 阶段只做关键路径测试：**

**后端集成测试（必须）：**
- [ ] 认证流程：注册 → 登录 → 获取用户信息
- [ ] API Key：创建 → 验证 → 删除
- [ ] 兑换流程：兑换码 → 创建订阅 → 配额增加
- [ ] 网关代理：API Key 验证 → 配额扣减 → 日志记录

**前端 E2E 测试（可选）：**
- [ ] 用户注册登录流程
- [ ] 创建 API Key 并复制

### 5.2 测试工具

```bash
# 安装测试依赖
pnpm add -D vitest @vitejs/plugin-react
```

**vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
```

### 5.3 测试示例

```typescript
// __tests__/api/auth.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('Auth API', () => {
  it('should register a new user', async () => {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123',
        name: 'Test User',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe('test@example.com');
  });
});
```

---

## 六、开发节奏建议

### 6.1 三周时间线

| 周次 | 重点任务 | 交付物 |
|------|----------|--------|
| **第1周** | 基础设施 + 认证 + 数据库 | Docker 环境运行，数据库迁移完成，注册/登录可用 |
| **第2周** | 核心业务 API + 前端对接 | API Key CRUD、订阅兑换、仪表板显示真实数据 |
| **第3周** | AI 网关 + 测试 + 收尾 | 网关代理可用，配额扣减正常，所有 P0 功能完成 |

### 6.2 每周详细任务

**Week 1：基础设施**
- [ ] Day 1-2：Docker Compose + Prisma Schema + 迁移
- [ ] Day 3-4：认证 API（注册/登录/登出）+ JWT 中间件
- [ ] Day 5：认证页面（登录/注册）+ 路由保护

**Week 2：核心业务**
- [ ] Day 1-2：API Key CRUD + 生成逻辑
- [ ] Day 3：订阅兑换 API + 配额计算
- [ ] Day 4-5：仪表板改造 + API Key 管理页面

**Week 3：网关与收尾**
- [ ] Day 1-2：AI 网关代理 + 配额扣减
- [ ] Day 3：使用日志记录 + 统计页面
- [ ] Day 4：集成测试 + Bug 修复
- [ ] Day 5：文档完善 + 部署准备

### 6.3 并行开发策略

- 前端可以先用 mock 数据开发 UI
- 后端 API 完成后切换真实数据
- 网关可以最后集成

---

## 七、验收标准

### 7.1 功能验收

**核心闭环可运行：**
- [ ] 用户可以注册并登录
- [ ] 登录后可以看到仪表板（显示真实配额数据）
- [ ] 用户可以创建/删除 API Key
- [ ] 用户可以使用兑换码兑换订阅
- [ ] 兑换后配额正确增加
- [ ] 使用 API Key 调用 `/api/v1/chat/completions` 成功
- [ ] 调用后配额正确扣减
- [ ] 使用统计页面显示调用记录

### 7.2 质量验收

- [ ] 所有 P0 API 端点有集成测试
- [ ] 前端所有页面覆盖加载态、空状态、错误态
- [ ] API 错误响应格式统一
- [ ] 密码使用 bcrypt 加密存储
- [ ] JWT 使用 httpOnly cookie
- [ ] API Key 格式正确（sk-xxx）

### 7.3 部署验收

- [ ] Docker Compose 一键启动开发环境
- [ ] 环境变量配置完整（.env.example）
- [ ] 数据库迁移脚本可正常运行
- [ ] Seed 数据可正常创建

---

## 八、Phase 2 延后功能

**以下功能明确延后到 Phase 2：**
- ❌ Stripe 支付集成
- ❌ 推荐系统完整实现
- ❌ 工单系统
- ❌ 公告系统
- ❌ 多渠道智能路由
- ❌ 流式响应（SSE）
- ❌ 邮件服务（密码重置）
- ❌ 管理后台

**Phase 2 预计时间：2 周**

---

## 九、风险与应对

### 9.1 主要风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 时间估算不准 | 延期 | 每周 review，及时调整优先级 |
| 技术难点卡住 | 进度受阻 | 提前调研关键技术点（JWT、Prisma） |
| 需求变更 | 范围蔓延 | 严格遵守 P0/P1/P2 优先级 |
| 测试不充分 | 质量问题 | 至少完成核心路径集成测试 |

### 9.2 关键决策点

**第1周结束时：**
- 认证系统是否可用？
- 数据库设计是否合理？

**第2周结束时：**
- 核心业务 API 是否完成？
- 前端是否接入真实数据？

**第3周结束时：**
- 网关是否可用？
- 所有 P0 功能是否完成？

---

## 十、总结

**修订后的 Phase 1 计划特点：**
1. ✅ **范围明确**：只做核心闭环，删除 50% 非必要功能
2. ✅ **架构简化**：不拆分独立服务，全部在 Next.js 内实现
3. ✅ **时间现实**：3 周而非 2-3 周，留有 buffer
4. ✅ **优先级清晰**：P0/P1/P2 明确标注
5. ✅ **可验收**：每周有明确交付物

**预期成果：**
- 一个可运行的 MVP 产品
- 用户可以完整体验核心功能
- 为 Phase 2 打下坚实基础
