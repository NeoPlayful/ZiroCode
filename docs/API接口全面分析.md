# 📡 API 接口全面分析

## 一、认证相关 (Auth)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/logout` | 用户登出 |
| POST | `/api/auth/refresh` | 刷新 Token |
| POST | `/api/auth/forgot-password` | 发送重置密码邮件 |
| POST | `/api/auth/reset-password` | 重置密码 |
| POST | `/api/auth/verify-email` | 邮箱验证 |

## 二、用户相关 (User)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/dashboard` | 获取仪表板数据 |
| GET | `/api/user/profile` | 获取用户资料 |
| PUT | `/api/user/profile` | 更新用户资料 |
| GET | `/api/user/quota` | 获取配额信息 |
| GET | `/api/user/usage` | 获取使用统计 |
| PUT | `/api/user/password` | 修改密码 |

## 三、推荐系统 (Referral)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/referral` | 获取推荐信息 |
| GET | `/api/user/referral/claims` | 获取收益记录 |
| POST | `/api/user/referral/claim` | 领取推荐奖励 |
| GET | `/api/user/referral/link` | 生成推荐链接 |

## 四、API 密钥管理 (Keys)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/keys` | 获取密钥列表 |
| POST | `/api/keys` | 创建新密钥 |
| DELETE | `/api/keys/:id` | 删除密钥 |
| PUT | `/api/keys/:id` | 更新密钥 |
| GET | `/api/keys/:id/usage` | 查询密钥使用量 |

## 五、订阅管理 (Subscription)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/subscriptions` | 获取订阅列表 |
| POST | `/api/subscriptions/redeem` | 兑换订阅码 |
| GET | `/api/subscriptions/plans` | 获取套餐列表 |
| POST | `/api/subscriptions/buy` | 购买订阅 |

## 六、工单系统 (Tickets)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tickets` | 获取工单列表 |
| POST | `/api/tickets` | 创建工单 |
| GET | `/api/tickets/:id` | 获取工单详情 |
| PUT | `/api/tickets/:id` | 更新工单 |
| POST | `/api/tickets/:id/reply` | 回复工单 |

## 七、公告与教程 (Announcements)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/announcements` | 获取系统公告 |
| GET | `/api/tutorials` | 获取官方教程 |

## 八、支付相关 (Payment)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/payment/stripe/checkout` | 创建 Stripe 支付 |
| POST | `/api/payment/stripe/webhook` | Stripe 回调 |
| GET | `/api/payment/history` | 支付历史 |

## 九、统计分析 (Analytics)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/analytics/usage` | 使用量统计 |
| GET | `/api/analytics/cost` | 费用统计 |
| GET | `/api/analytics/models` | 模型使用统计 |

## 十、系统接口 (System)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/config` | 获取配置 |

## 十一、模型广场 (Models)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/models` | 获取渠道与模型列表 |
| GET | `/api/models/:channel` | 获取指定渠道详情及教程 |

## 十二、通知系统 (Notifications)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notifications` | 获取通知列表 |
| PUT | `/api/notifications/:id/read` | 标记通知已读 |
| PUT | `/api/notifications/read-all` | 全部标记已读 |

---

## 总结

| 类型 | 数量 |
|------|------|
| 已确认接口 | 4 个 |
| 推断接口 | 约 40+ 个 |

**主要模块：** 认证、用户、推荐、密钥、订阅、工单、支付、统计、模型广场、通知
