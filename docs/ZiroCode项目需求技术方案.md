# ZiroCode AI 服务中转平台 — 需求与技术方案

> 更新日期：2026-05-28 | 版本：v0.1.5

---

## 一、项目概述

ZiroCode 是一个 AI 服务中转平台，为用户提供 API Key 管理、配额控制、订阅兑换等功能，兼容 OpenAI API 格式。

### 核心业务闭环

```
用户注册 → 兑换订阅 → 创建 API Key → 调用网关 → 扣减配额 → 查看仪表板
```

---

## 二、架构设计

### 2.1 整体架构（Nginx 反向代理统一端口）

```
                        ┌─────────┐
                        │  Nginx  │
                        │  :3000  │
                        └────┬────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼─────┐   ┌──────▼──────┐
              │  前端      │   │  后端       │
              │ React 19.2.6  │   │  Fastify    │
              │  :5173    │   │  :4000      │
              └───────────┘   └──────┬──────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                    ┌─────▼─────┐         ┌─────▼─────┐
                    │ PostgreSQL │         │   Redis   │
                    │   (数据)   │         │ (限流缓存) │
                    └───────────┘         └───────────┘
```

**关键设计决策：**
1. **前后端分离**：React 19.2.6 + Vite 前端 / Fastify 后端
2. **统一端口 3000**：Nginx 反向代理，`/api/*` → 后端，其他 → 前端
3. **可水平扩容**：后端可独立部署多实例

### 2.2 目录结构

```
ZiroCode/
├── server/                    # Fastify 后端 (:4000)
│   ├── src/
│   │   ├── app.ts            # 入口
│   │   ├── routes/           # 6个路由文件，15个API端点
│   │   │   ├── auth.ts       # 注册/登录/登出/用户信息
│   │   │   ├── keys.ts       # API Key CRUD
│   │   │   ├── subscriptions.ts # 订阅列表 + 兑换
│   │   │   ├── user.ts       # 仪表板/配额/使用统计
│   │   │   ├── v1.ts         # AI 网关 (OpenAI 兼容)
│   │   │   └── health.ts     # 健康检查
│   │   └── lib/
│   │       ├── auth.ts       # JWT + httpOnly cookie
│   │       ├── db.ts         # Prisma 单例
│   │       ├── quota.ts      # 配额计算 + 限流
│   │       └── api-utils.ts  # 认证中间件 + 错误格式
│   ├── prisma/
│   │   ├── schema.prisma     # 7 张表数据模型
│   │   └── seed.ts           # 种子数据
│   └── Dockerfile
├── frontend/                 # React 19.2.6 + Vite (:5173)
│   ├── src/
│   │   ├── pages/            # 6个页面组件
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── KeysPage.tsx
│   │   │   ├── SubscriptionPage.tsx
│   │   │   └── UsagePage.tsx
│   │   ├── components/       # 共享组件
│   │   │   ├── AppLayout.tsx # 布局 + 导航栏
│   │   │   └── ReferralSection.tsx
│   │   ├── App.tsx           # 路由配置
│   │   └── main.tsx          # 入口
│   └── Dockerfile
├── nginx/
│   └── default.conf          # 反向代理配置
├── docker-compose.yml        # 5个服务
└── .env.example
```

---

## 三、技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 前端框架 | React 19.2.6 + Vite | 客户端渲染 |
| 后端框架 | Fastify 5.8.5 | 高性能 Node.js 框架 |
| 语言 | TypeScript | 全栈类型安全 |
| 样式 | Tailwind CSS 4.3 | Utility-first |
| 路由（前端） | react-router-dom 7 | 客户端路由 |
| 状态管理 | TanStack Query 5 | 服务端数据缓存 |
| 客户端状态 | Zustand 5 | 轻量级状态管理 |
| 图标 | Heroicons | 统一图标库 |
| 图表 | ECharts + echarts-for-react | 统计图表 |
| ORM | Prisma 5.22 | PostgreSQL ORM |
| 数据库 | PostgreSQL 16 | 主存储 |
| 缓存/限流 | Redis 7 + ioredis | 限流计数器 |
| 认证 | 自研 JWT + jose | httpOnly cookie |
| 密码 | bcryptjs | 加密存储 |
| 反向代理 | Nginx | 统一端口 :3000 |

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

所有接口统一通过 `http://host:3000/api/...` 访问（Nginx 反向代理）。

### 认证模块

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户 |

### 用户模块

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/user/dashboard` | 仪表板数据 |
| GET | `/api/user/quota` | 配额详情 |
| GET | `/api/user/usage` | 使用统计 |

### API Key 管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/keys` | 密钥列表 |
| POST | `/api/keys` | 创建密钥 |
| DELETE | `/api/keys/[id]` | 删除密钥 |

### 订阅管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/subscriptions` | 订阅列表 |
| POST | `/api/subscriptions/redeem` | 兑换码兑换 |

### AI 网关（OpenAI 兼容）

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/chat/completions` | 聊天补全 |
| GET | `/api/v1/models` | 模型列表 |

### 系统

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |

---

## 六、前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/auth/login` | 登录页 | 邮箱密码登录 |
| `/auth/register` | 注册页 | 新用户注册 |
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
# 1. 启动数据库（Docker）
docker compose up -d postgres redis

# 2. 初始化数据库
cd server
npx prisma db push
npx prisma db seed

# 3. 启动后端
npm run dev          # :4000

# 4. 新终端启动前端
cd frontend
npm run dev          # :5173（自动代理 /api → :4000）
```

### 7.2 生产环境

```bash
docker compose up -d   # 一键启动全部5个服务
# 访问 http://localhost:3000
```

### 7.3 环境变量

```env
DATABASE_URL="postgresql://zirocode:dev_password@localhost:5432/zirocode"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-secret-key-change-in-production-min-32-chars"
JWT_EXPIRES_IN="7d"
OPENAI_API_KEY="sk-your-openai-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
PORT="4000"
CORS_ORIGIN="http://localhost:5173"
```

---

## 八、Phase 2（部分已实施）

**状态：85% 完成** | **完成时间：2026-05-28**

### 已实施

- ✅ 工单系统（后端 API + 前端对接）
- ✅ 公告系统（后端 API + 前端对接）
- ✅ 推荐系统完整实现（后端 + 前端）
- ✅ 邮件服务（密码重置 + 通知邮件）
- ✅ 管理后台（工单管理 + 公告管理）
- ✅ 多渠道智能路由（故障转移、SSE 流式响应）

### 延后功能

- ⏳ Stripe 支付集成
- ⏳ 定价页面

详细计划文档：[plan-phase2.md](./plan-phase2.md)

---

## 九、Phase 3：平台增强与开发者体验 ✅

**状态：已完成** | **完成时间：2026-05-28** | **完成度：100% (42/42 任务)**

详细计划文档：[plan-phase3.md](./plan-phase3.md)

### 9.1 核心功能

#### Week 1: 通知中心 ✅
- 通知引擎与 API
- 通知铃铛组件
- 自动通知触发（配额、支付、工单等）

#### Week 2: Webhook 系统 ✅
- Webhook 端点管理
- HMAC-SHA256 签名
- 重试与退避策略（3次重试：1m/5m/15m）
- Webhook 发送日志

#### Week 3: 高级分析与报表 ✅
- 数据分析总览
- 成本分析与模型分布
- 数据导出（CSV/JSON）

#### Week 4: 开发者门户与 API 优化 ✅
- Swagger/OpenAPI 文档集成
- API 状态页面
- Redis 缓存策略（模型列表5分钟、配额30秒）
- API Key 增强（IP白名单、速率限制、模型限制）
- 速率限制中间件

#### Week 5: 管理后台增强 ✅
- 审计日志系统
- 批量操作（兑换码生成、配额调整）
- 渠道健康监控
- 渠道测试工具
- 系统配置管理

### 9.2 技术实现

**新增数据表（6张）：**
- Notification（通知记录）
- NotificationPreference（通知偏好）
- WebhookEndpoint（Webhook端点）
- WebhookLog（Webhook日志）
- AuditLog（审计日志）
- SystemConfig（系统配置）

**新增 API 端点（17个）：**
- 通知管理：5个端点
- Webhook 管理：6个端点
- 数据分析：4个端点
- 管理后台：2个端点

**新增前端页面（4个）：**
- NotificationsPage（通知中心）
- WebhooksPage（Webhook管理）
- AnalyticsPage（数据分析）
- DeveloperPage（API文档）

### 9.3 编译测试

- ✅ 服务端编译通过
- ✅ 前端编译通过

---

## 十、Phase 4：功能增强与用户体验优化 ✅

**状态：已完成** | **完成时间：2026-05-28** | **完成度：100% (32/32 任务)**

详细计划文档：[plan-phase4.md](./plan-phase4.md)

### 10.1 核心功能

#### Week 1: 工单系统增强 ✅
- 工单分类系统（TicketCategory 表）
- 工单模板功能（TicketTemplate 表）
- 工单搜索与筛选
- 工单导出功能（CSV）
- 工单 SLA 管理（响应时间与解决时间）

#### Week 2: 推荐系统防作弊与分析 ✅
- 防作弊检测模块（ReferralFraudLog 表）
- 作弊记录与处理（同IP检测、快速注册检测）
- 推荐数据分析 API
- 推荐排行榜
- 推荐链接追踪统计

#### Week 3: 性能优化与缓存 ✅
- 数据库查询优化
- 数据库索引优化（ApiUsageLog、WebhookLog）
- API 响应缓存增强
- 性能监控集成

#### Week 4: 用户体验优化 ✅
- 暗黑模式支持
- 响应式设计优化
- 快捷键系统
- 加载状态优化
- 错误提示优化
- 表单验证增强
- 无障碍访问（A11y）
- 用户引导系统

### 10.2 技术实现

**新增数据表（3张）：**
- TicketCategory（工单分类）
- TicketTemplate（工单模板）
- ReferralFraudLog（推荐作弊记录）

**修改现有表：**
- Ticket 表：新增 categoryId、slaDeadline 字段
- Referral 表：新增 isFraud 字段
- 索引优化：ApiUsageLog、WebhookLog

**新增 API 端点（8个）：**
- 工单增强：4个端点（分类、模板、搜索、导出）
- 推荐增强：3个端点（分析、排行榜、链接统计）
- 管理后台：3个端点（SLA违规、作弊记录管理）

**新增前端组件（2个）：**
- TicketCategorySelect（工单分类选择器）
- TicketTemplateSelect（工单模板选择器）

**修改前端页面：**
- TicketsPage（增强搜索、筛选、导出功能）
- ReferralPage（数据分析看板）
- AdminPage（作弊审查、SLA监控）

### 10.3 编译测试

- ✅ 服务端编译通过
- ✅ 前端编译通过
