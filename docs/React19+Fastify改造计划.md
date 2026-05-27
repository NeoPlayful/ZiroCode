# ZiroCode 重构计划：Next.js → React 19.2.6 + Fastify 5.8.5

> 日期：2026-05-27 | 版本：v1.0

---

## 一、重构原因

| 问题 | 说明 |
|------|------|
| Turbopack 资源占用高 | 开发模式下 CPU/内存飙升，影响开发体验 |
| 前后端耦合 | Next.js API Routes 不能独立部署扩容 |
| 技术栈偏向全栈 | 实际需前后端分离，各自独立迭代 |

---

## 二、目标架构

```
用户 → Nginx (:3000)
         ├── /api/*    → Fastify 后端 (:4000)
         └── /*        → React 19.2.6 + Vite 前端 (:5173)
```

### 2.1 目录结构

```
ZiroCode/
├── docker-compose.yml          # PostgreSQL + Redis + Nginx
├── nginx/                      # 反向代理配置
│   └── default.conf
├── frontend/                   # React 19.2.6 + Vite
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Keys.tsx
│   │   │   ├── Subscription.tsx
│   │   │   ├── Usage.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── components/         # 共享组件
│   │   │   ├── NavBar.tsx
│   │   │   ├── ReferralSection.tsx
│   │   │   └── ui/
│   │   ├── lib/                # 工具函数
│   │   │   └── api.ts          # HTTP 请求封装
│   │   ├── App.tsx             # 路由配置
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── server/                     # Fastify 后端
│   ├── src/
│   │   ├── routes/             # API 路由
│   │   │   ├── auth.ts         # 认证
│   │   │   ├── keys.ts         # API Key
│   │   │   ├── subscriptions.ts # 订阅
│   │   │   ├── user.ts         # 用户
│   │   │   ├── v1.ts           # AI 网关
│   │   │   └── health.ts
│   │   ├── lib/                # 业务逻辑
│   │   │   ├── auth.ts         # JWT
│   │   │   ├── db.ts           # Prisma
│   │   │   ├── quota.ts        # 配额
│   │   │   └── api-utils.ts
│   │   ├── middleware/         # 中间件
│   │   │   └── auth.ts         # 认证中间件
│   │   ├── plugins/            # Fastify 插件
│   │   │   └── cors.ts
│   │   └── app.ts              # 入口
│   ├── prisma/
│   │   └── schema.prisma       # 复用现有
│   ├── tsconfig.json
│   └── package.json
└── .env.example
```

---

## 三、改造步骤

### 第一步：新建 Fastify 后端（1天）

**目标：** 后端独立运行，所有 API 可调用

**操作清单：**

| # | 任务 | 说明 |
|---|------|------|
| 1 | 创建 `server/` 目录，初始化 Node 项目 | `npm init` |
| 2 | 安装依赖 | `fastify`, `@fastify/cors`, `@prisma/client`, `bcryptjs`, `jose`, `ioredis` |
| 3 | 复制 `prisma/` | 从 `src/web/prisma/` 直接复制，无需修改 |
| 4 | 复制 `lib/` | `auth.ts`, `db.ts`, `quota.ts`, `api-utils.ts` 直接复制，改 import 路径 |
| 5 | 注册路由 | 15 个 API 端点，每个从 `route.ts` 复制逻辑，改为 `fastify.get/post` 格式 |

**路由对照表：**

```
Next.js Route Handler                     →  Fastify Route
─────────────────────────────────────────────────────────────────
app/api/auth/register/route.ts (POST)     →  server/src/routes/auth.ts (POST /api/auth/register)
app/api/auth/login/route.ts (POST)        →  server/src/routes/auth.ts (POST /api/auth/login)
app/api/auth/logout/route.ts (POST)       →  server/src/routes/auth.ts (POST /api/auth/logout)
app/api/auth/me/route.ts (GET)            →  server/src/routes/auth.ts (GET /api/auth/me)
app/api/keys/route.ts (GET, POST)         →  server/src/routes/keys.ts (GET/POST /api/keys)
app/api/keys/[id]/route.ts (DELETE)       →  server/src/routes/keys.ts (DELETE /api/keys/:id)
app/api/subscriptions/route.ts (GET)      →  server/src/routes/subscriptions.ts (GET /api/subscriptions)
app/api/subscriptions/redeem/route.ts     →  server/src/routes/subscriptions.ts (POST /api/subscriptions/redeem)
app/api/user/dashboard/route.ts (GET)     →  server/src/routes/user.ts (GET /api/user/dashboard)
app/api/user/quota/route.ts (GET)         →  server/src/routes/user.ts (GET /api/user/quota)
app/api/user/usage/route.ts (GET)         →  server/src/routes/user.ts (GET /api/user/usage)
app/api/v1/chat/completions/route.ts      →  server/src/routes/v1.ts (POST /api/v1/chat/completions)
app/api/v1/models/route.ts (GET)          →  server/src/routes/v1.ts (GET /api/v1/models)
app/api/health/route.ts (GET)             →  server/src/routes/health.ts (GET /api/health)
app/api/models/route.ts (GET)             →  server/src/routes/health.ts (GET /api/models)
```

**代码修改点（每个路由）：**

```typescript
// Next.js 写法                                 // Fastify 写法
export async function POST(req) {               fastify.post('/api/auth/login', async (req, reply) => {
  const { email, password } = await req.json()    const { email, password } = req.body
  return NextResponse.json({...})                 return reply.send({...})
}                                                 })
```

### 第二步：新建 React 19.2.6 + Vite 前端（2天）

**目标：** 页面正常渲染，API 连接后端

**操作清单：**

| # | 任务 | 说明 |
|---|------|------|
| 1 | 用 Vite 创建项目 | `npm create vite@latest frontend -- --template react-ts` |
| 2 | 安装依赖 | `react-router-dom`, `@tanstack/react-query`, `@heroicons/react`, `tailwindcss`, `echarts-for-react` |
| 3 | 复制页面组件 | 6 个页面直接复制到 `src/pages/` |
| 4 | 复制组件 | `NavBar.tsx`, `ReferralSection.tsx`, `ui/*` 复制到 `src/components/` |
| 5 | 配置路由 | 用 react-router-dom 替换 Next.js 文件路由 |
| 6 | 修改 API 请求 | 所有 `fetch('/api/xxx')` 改为 `fetch('/api/xxx')`（Nginx 统一端口后路径不变） |

**路由配置：**

```tsx
// App.tsx
<Routes>
  <Route path="/auth/login" element={<Login />} />
  <Route path="/auth/register" element={<Register />} />
  <Route element={<AppLayout />}>   {/* 含导航栏 */}
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/keys" element={<Keys />} />
    <Route path="/subscription" element={<Subscription />} />
    <Route path="/usage" element={<Usage />} />
  </Route>
</Routes>
```

**主要修改点：**

| 修改项 | Next.js | React 19.2.6 |
|--------|---------|----------|
| 路由 | 文件路由 | `react-router-dom` |
| 页面跳转 | `useRouter().push()` | `useNavigate()` |
| 布局 | 文件布局 `layout.tsx` | `<Outlet />` |
| API 路径 | 同源 `/api/xxx` | Nginx 反代后同源，或配代理 |
| 全局样式 | 无 | 无变化 |

### 第三步：配置 Nginx + Docker（半天）

**目标：** 统一端口 3000，前后端无缝配合

```nginx
# nginx/default.conf
server {
    listen 3000;

    # API 请求转发到后端
    location /api/ {
        proxy_pass http://server:4000;
        proxy_set_header Host $host;
    }

    # 页面请求转发到前端
    location / {
        proxy_pass http://frontend:5173;
        proxy_set_header Host $host;
    }
}
```

**docker-compose.yml 更新：**

```yaml
services:
  postgres:    # 不变
  redis:       # 不变
  server:      # 新增 Fastify 后端
    build: ./server
    ports:
      - "4000:4000"
    depends_on: [postgres, redis]
  frontend:    # 新增 React 前端
    build: ./frontend
    ports:
      - "5173:5173"
  nginx:       # 新增反向代理
    image: nginx:alpine
    ports:
      - "3000:3000"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on: [server, frontend]
```

### 第四步：迁移数据与验证（半天）

| # | 任务 |
|---|------|
| 1 | 启动 Docker Compose |
| 2 | 执行 `prisma db push` |
| 3 | 执行 `prisma db seed` |
| 4 | 测试注册/登录 |
| 5 | 测试 API Key CRUD |
| 6 | 测试仪表板数据 |
| 7 | 测试 AI 网关代理 |

---

## 四、代码复用率统计

| 模块 | 总行数 | 复用行数 | 重写行数 |
|------|--------|---------|---------|
| 后端 lib/ (auth, db, quota, utils) | ~250 | 250 (100%) | 0 |
| Prisma schema | ~100 | 100 (100%) | 0 |
| API 路由逻辑 | ~800 | 720 (90%) | 80 |
| 前端页面组件 | ~800 | 560 (70%) | 240 |
| 前端共享组件 | ~200 | 180 (90%) | 20 |
| **合计** | **~2150** | **~1810 (84%)** | **~340 (16%)** |

---

## 五、注意事项

### 5.1 Cookie 问题

当前使用 httpOnly cookie 存 JWT，前后端分离后：
- 前端和后端同域名但不同端口，通过 Nginx 反代后同源，cookie 不受影响
- 或者改用 `Authorization: Bearer xxx` header 方式，前端存 localStorage

**建议：** 继续用 httpOnly cookie，Nginx 统一端口后无跨域问题。

### 5.2 开发环境热更新

- React 19.2.6 + Vite 开发服务器支持 HMR，比 Next.js Turbopack 稳定
- 后端 Fastify 支持 `--watch` 模式自动重启

### 5.3 部署变化

| 部署项 | 当前 (Next.js) | 改后 (React + Fastify) |
|--------|---------------|----------------------|
| 构建 | `next build` | `vite build` + `tsc` |
| 运行 | 1 个进程 | 3 个容器 (server, frontend, nginx) |
| 资源 | 单容器大内存 | 多容器分散 |
| 扩容 | 整体扩容 | 后端可独立水平扩容 |

---

## 六、时间线

```
Day 1:  新建 Fastify 后端，迁移 API 路由 + lib  + prisma
Day 2:  新建 React 19.2.6 前端，迁移页面组件 + 配置路由
Day 3:  配置 Nginx + Docker Compose，联调测试
Day 4:  Bug 修复 + 收尾
```

**总计：3-4 天，约 24-32 小时工作量。**
