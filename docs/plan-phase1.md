# Phase 1：MVP 最小可行产品开发计划（修订版 v2）

> **周期：3 周** | **目标：核心闭环可运行**  
> 用户注册 → 兑换订阅 → 创建API Key → 调用网关 → 扣减配额 → 查看仪表板

---

## 📌 修订说明

**v2 主要变更（2026-05-27）：**
- ❌ 不再使用 Next.js（已迁移至 React 19.2.6 + Fastify）
- ❌ 删除独立 Fastify 网关服务（改为 Next.js API Routes，后迁移至独立 Fastify）
- ❌ 删除 Stripe 支付（Phase 2 实现）
- ❌ 删除推荐系统完整实现（Phase 2 实现）
- ❌ 删除工单系统、公告系统（Phase 3 实现）
- ❌ 删除多渠道智能路由（先固定单渠道）
- ✅ API 使用日志表（UsageLog）
- ✅ 认证方案（自研 JWT + httpOnly cookie）
- ✅ 环境变量清单
- ✅ 简化数据模型

**核心原则：** 只做能跑通业务闭环的最小功能集

---

## 一、架构决策

### 1.1 最终技术架构

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
│   │       ├── db.ts         # Prisma client 单例
│   │       ├── quota.ts      # 配额计算 + API Key 生成 + 限流
│   │       └── api-utils.ts  # 认证中间件 + 统一错误格式
│   ├── prisma/
│   │   ├── schema.prisma     # 7张表完整数据模型
│   │   └── seed.ts           # 种子数据
│   └── Dockerfile
├── frontend/                 # React 19.2.6 + Vite (:5173)
│   ├── src/
│   │   ├── pages/            # 6个页面组件
│   │   ├── components/       # 共享组件
│   │   ├── App.tsx           # 路由配置
│   │   └── main.tsx          # 入口（TanStack Query + Router）
│   └── Dockerfile
├── nginx/
│   └── default.conf          # 反向代理（统一 :3000）
├── docker-compose.yml        # PostgreSQL 16 + Redis 7 + Server + Frontend + Nginx
└── .env.example
```

**关键决策：**
1. **前后端分离**：React 19.2.6 + Fastify，各自独立部署
2. **统一端口**：Nginx 反向代理处理 `/api/*` → 后端，其他 → 前端
3. **开发环境**：Vite 自动代理 `/api/*` 到后端

### 1.2 认证方案

**选择：自研 JWT + httpOnly Cookie**

- 使用 `jose` 库生成/验证 JWT
- Token 存储在 httpOnly cookie（防 XSS）
- 过期时间：7 天

### 1.3 环境变量

```env
DATABASE_URL="postgresql://zirocode:dev_password@localhost:5432/zirocode"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-min-32-chars-change-in-production"
JWT_EXPIRES_IN="7d"
OPENAI_API_KEY="sk-xxx"
OPENAI_BASE_URL="https://api.openai.com/v1"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
ADMIN_EMAIL="admin@zirocode.com"
ADMIN_PASSWORD="admin123"
```

### 1.4 项目基础设施

```yaml
# docker-compose.yml
services:
  postgres:    # PostgreSQL 16
  redis:       # Redis 7
  server:      # Fastify 后端 :4000
  frontend:    # React + Vite :5173
  nginx:       # 反向代理 :3000
```

**启动命令：**
```bash
# 开发环境（本地）
cd server && npm run dev    # :4000
cd frontend && npm run dev  # :5173（代理 /api → :4000）

# 生产环境（Docker）
docker compose up -d        # :3000 统一入口
```

---

## 二、数据模型

### 核心表（7张）

| 表名 | 说明 |
|------|------|
| User | 用户表（USER/ADMIN） |
| ApiKey | API 密钥（sk-xxx 格式） |
| Subscription | 订阅（按量/月卡/永久） |
| RedeemCode | 兑换码 |
| Transaction | 交易记录 |
| ApiUsageLog | API 使用日志 |
| ModelChannel | 模型渠道 |

### 配额规则

- **优先级**：月卡额度 → 按量额度
- **月卡重置**：每日 8:00 自动重置
- **计费单位**：1 token = 1 配额

---

## 三、API 接口（15个端点）

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | POST `/api/auth/register` | 注册 |
| 认证 | POST `/api/auth/login` | 登录 |
| 认证 | POST `/api/auth/logout` | 登出 |
| 认证 | GET `/api/auth/me` | 用户信息 |
| Key | GET/POST `/api/keys` | 列表/创建 |
| Key | DELETE `/api/keys/:id` | 删除 |
| 订阅 | GET `/api/subscriptions` | 订阅列表 |
| 订阅 | POST `/api/subscriptions/redeem` | 兑换 |
| 用户 | GET `/api/user/dashboard` | 仪表板 |
| 用户 | GET `/api/user/quota` | 配额 |
| 用户 | GET `/api/user/usage` | 使用统计 |
| 网关 | POST `/api/v1/chat/completions` | 聊天 |
| 网关 | GET `/api/v1/models` | 模型列表 |
| 系统 | GET `/api/health` | 健康检查 |
| 系统 | GET `/api/models` | 渠道列表 |

---

## 四、前端页面（6个）

| 路由 | 页面 | 状态 |
|------|------|------|
| `/auth/login` | 登录 | ✅ |
| `/auth/register` | 注册 | ✅ |
| `/dashboard` | 仪表板 | ✅ |
| `/keys` | API 密钥管理 | ✅ |
| `/subscription` | 订阅管理 | ✅ |
| `/usage` | 使用统计 | ✅ |

所有页面覆盖：加载态（骨架屏）、空状态、错误态（重试按钮）

---

## 五、状态处理清单

- [x] **加载态**：每个数据驱动组件都有骨架屏
- [x] **空状态**：列表无数据时显示引导文案
- [x] **错误态**：API 请求失败时显示错误提示 + 重试按钮
- [ ] **边界态**：超长文本截断、数值溢出处理（待完善）

---

## 六、测试策略

测试目录已移除（MVP 阶段手动测试）。

关键测试路径：
1. 认证流程：注册 → 登录 → 获取用户信息
2. API Key：创建 → 验证 → 删除
3. 兑换流程：兑换码 → 创建订阅 → 配额增加
4. 网关代理：API Key 验证 → 配额扣减 → 日志记录

---

## 七、验收标准

### 功能验收

- [x] 用户可以注册并登录
- [x] 登录后可以看到仪表板（显示真实配额数据）
- [x] 用户可以创建/删除 API Key
- [x] 用户可以使用兑换码兑换订阅
- [x] 兑换后配额正确增加
- [x] 使用 API Key 调用 `/api/v1/chat/completions`（需配置 Open AI Key）
- [x] 调用后配额正确扣减
- [x] 使用统计页面显示调用记录

### 质量验收

- [x] 前端所有页面覆盖加载态、空状态、错误态
- [x] API 错误响应格式统一
- [x] 密码使用 bcrypt 加密存储
- [x] JWT 使用 httpOnly cookie
- [x] API Key 格式正确（sk-xxx）

### 部署验收

- [x] Docker Compose 一键启动开发环境（5个服务）
- [x] 环境变量配置完整（.env.example）
- [x] 数据库迁移脚本可正常运行
- [x] Seed 数据可正常创建

---

## 八、Phase 2 延后功能

- ❌ Stripe 支付集成
- ❌ 推荐系统完整实现
- ❌ 工单系统
- ❌ 公告系统
- ❌ 多渠道智能路由
- ❌ 流式响应（SSE）
- ❌ 邮件服务（密码重置）
- ❌ 管理后台
