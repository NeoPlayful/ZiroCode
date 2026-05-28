# Phase 5 部署说明

## 新增环境变量

Phase 5 新增以下环境变量配置：

### 邮箱验证
```env
# 是否启用邮箱验证
EMAIL_VERIFICATION_ENABLED="true"

# 验证令牌过期时间
EMAIL_VERIFICATION_EXPIRY="24h"
```

### Token 刷新
```env
# Refresh Token 过期时间
JWT_REFRESH_EXPIRES_IN="30d"
```

### 系统配置
```env
# 默认主题模式 (light | dark | system)
THEME_DEFAULT="system"

# 是否启用用户引导
ONBOARDING_ENABLED="true"
```

## 数据库迁移

Phase 5 新增了以下数据库字段，需要运行迁移：

```bash
cd server
npx prisma db push
```

新增字段：
- User 表：`emailVerified`, `emailVerificationToken`

## 部署步骤

1. 更新环境变量
2. 运行数据库迁移
3. 重启服务

```bash
# 后端
cd server
npm run build
npm start

# 前端
cd frontend
npm run build
```
