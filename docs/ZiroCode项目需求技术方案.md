# ZiroCode AI 服务中转平台 — 需求与技术方案

> 更新日期：2026-05-27 | 版本：v0.1.0

---

## 一、项目概述

ZiroCode 是一个 AI 服务中转平台，为用户提供 API Key 管理、配额控制、订阅兑换等功能，兼容 OpenAI API 格式。

### 核心业务闭环

```
用户注册 → 兑换订阅 → 创建 API Key → 调用网关 → 扣减配额 → 查看仪表板
```

---

## 二、架构设计

### 2.1 整体架构（单端口一体化）

```
┌─────────────────────────────────────────────────┐
│                  Next.js 16                      │
│              http://host:3000                    │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ 前端页面  │  │ 业务 API │  │ 模型 API 网关  │  │
│  │          │  │          │  │               │  │
│  │ /dashboard│  │ /api/auth│  │ /v1/chat/     │  │
│  │ /keys     │  │ /api/keys│  │   completions │  │
│  │ /subscript│  │ /api/sub │  │ /v1/models    │  │
│  │ /usage    │  │ /api/user│  │               │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                         │                        │
└─────────────────────────┼────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
        ┌─────▼─────┐          ┌──────▼──────┐
        │ PostgreSQL │          │    Redis    │
        │   (数据)   │          │  (限流缓存)  │
        └───────────┘          └─────────────┘
```

**关键设计决策：**
1. **前后端同端口**：前端页面、业务 API、模型 API 统一通过 3000 端口对外服务
2. **不拆分独立服务**：Next.js API Routes 满足 MVP 阶段流量需求
3. **未来可拆分**：QPS > 1000 时再拆分独立网关服务

### 2.2 目录结构

```
ZiroCode/
├── docker-compose.yml         # PostgreSQL 16 + Redis 7
├── .env.example               # 环境变量模板
├── docs/                      # 项目文档
└── src/web/                   # Next.js 应用
    ├── app/
    │   ├── (auth)/            # 认证页面组
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── (dashboard)/       # 仪表板页面组
    │   │   ├── dashboard/page.tsx   # 仪表板首页
    │   │   ├── keys/page.tsx        # API Key 管理
    │   │   ├── subscription/page.tsx # 订阅管理
    │   │   └── usage/page.tsx       # 使用统计
    │   └── api/               # API 路由
    │       ├── auth/          # 认证接口
    │       ├── keys/          # Key 管理接口
    │       ├── subscriptions/ # 订阅接口
    │       ├── user/          # 用户数据接口
    │       └── v1/            # AI 网关接口
    ├── lib/                   # 共享逻辑
    │   ├── auth.ts            # JWT + httpOnly cookie
    │   ├── db.ts              # Prisma 单例
    │   ├── quota.ts           # 配额计算 + 限流
    │   └── api-utils.ts       # 认证中间件 + 错误格式
    ├── prisma/
    │   ├── schema.prisma      # 7 张表数据模型
    │   └── seed.ts            # 种子数据
    └── components/            # UI 组件
```

---

## 三、技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 框架 | Next.js 16 | App Router + Turbopack |
| 语言 | TypeScript 6.x | 全栈类型安全 |
| 样式 | Tailwind CSS 4 | Utility-first |
| 状态管理 | TanStack Query | 服务端数据缓存 |
| 图标 | Heroicons | 统一图标库 |
| ORM | Prisma 5.22 | PostgreSQL ORM |
| 数据库 | PostgreSQL 16 | 主存储 |
| 缓存/限流 | Redis 7 + ioredis | 限流计数器 |
| 认证 | 自研 JWT + jose | httpOnly cookie |
| 密码 | bcryptjs | 加密存储 |
| UI 组件 | shadcn/ui + Base UI | 基础组件库 |
| 图表 | echarts-for-react | 统计图表 |

---

## 四、数据模型

### 4.1 核心表（7张）

| 表名 | 说明 | 状态 |
|------|------|------|
| User | 用户表（含角色 USER/ADMIN） | ✅ |
| ApiKey | API 密钥表（sk-xxx 格式） | ✅ |
| Subscription | 订阅表（按量/月卡/永久） | ✅ |
| RedeemCode | 兑换码表 | ✅ |
| Transaction | 交易记录表 | ✅ |
| ApiUsageLog | API 使用日志 | ✅ |
| ModelChannel | 模型渠道表 | ✅ |

### 4.2 配额规则

- **优先级**：优先消耗月卡额度 → 按量额度
- **月卡重置**：每日 8:00 自动重置
- **计费单位**：1 token = 1 配额

---

## 五、API 接口

所有接口统一通过 `http://host:3000` 访问，无需独立端口。

### 5.1 认证模块

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户 |

### 5.2 用户模块

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/user/dashboard` | 仪表板数据 |
| GET | `/api/user/quota` | 配额详情 |
| GET | `/api/user/usage` | 使用统计 |

### 5.3 API Key 管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/keys` | 密钥列表 |
| POST | `/api/keys` | 创建密钥 |
| DELETE | `/api/keys/[id]` | 删除密钥 |

### 5.4 订阅管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/subscriptions` | 订阅列表 |
| POST | `/api/subscriptions/redeem` | 兑换码兑换 |

### 5.5 AI 网关（OpenAI 兼容）

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/chat/completions` | 聊天补全 |
| GET | `/api/v1/models` | 模型列表 |

### 5.6 系统

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |

---

## 六、前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录页 | 邮箱密码登录 |
| `/register` | 注册页 | 新用户注册 |
| `/dashboard` | 仪表板 | 配额概览 + 订阅状态 |
| `/keys` | API 密钥管理 | 创建/删除/复制密钥 |
| `/subscription` | 订阅管理 | 兑换码 + 订阅信息 |
| `/usage` | 使用统计 | 调用量 + 图表展示 |

### 状态处理

所有页面覆盖：
- **加载态**：骨架屏
- **空状态**：引导提示
- **错误态**：错误提示 + 重试按钮

---

## 七、部署

### 7.1 开发环境

```bash
# 1. 启动数据库
docker compose up -d

# 2. 初始化数据库
cd src/web
pnpm prisma db push
pnpm prisma db seed

# 3. 启动开发服务器
pnpm dev
```

### 7.2 环境变量

```env
DATABASE_URL="postgresql://zirocode:dev_password@localhost:5432/zirocode"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-secret-key-change-in-production-min-32-chars"
JWT_EXPIRES_IN="7d"
OPENAI_API_KEY="sk-your-openai-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 八、Phase 2 计划（延后功能）

- Stripe 支付集成
- 推荐系统完整实现
- 工单系统
- 公告系统
- 多渠道智能路由
- 流式响应（SSE）
- 邮件服务（密码重置）
- 管理后台
