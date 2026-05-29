# Phase 6：国际化（i18n）与多语言支持

> **周期：2 周** | **目标：实现完整的多语言支持，覆盖中文、英文**
> 前端国际化 → 后端国际化 → 翻译完善 → 本地化适配

## 📋 状态概览

**状态：规划中** | **完成度：0% (0/12)**

**前置条件**：Phase 5 已完成（功能补全、体验完善、API 100%实现）

### 任务分布

- 🔲 Week 1: 前端国际化 - 0% (0/6 任务)
- 🔲 Week 2: 后端国际化与翻译完善 - 0% (0/6 任务)

---

## 一、总体目标

### 1.1 核心目标

```
Phase 5 (功能补全)              Phase 6 (国际化)
─────────────────              ────────────────
✅ API 100%完成                 🔲 多语言支持
✅ 前端体验完善                 🔲 语言切换
✅ 功能全面完整                 🔲 翻译管理
✅ 中文界面完成                 🔲 本地化适配
```

### 1.2 支持语言

**Phase 6 目标语言：**
- 🇨🇳 简体中文（zh-CN）- 默认语言
- 🇺🇸 英文（en-US）- 国际化主要语言

**后续扩展（Phase 7+）：**
- 🇯🇵 日文（ja-JP）
- 繁体中文（zh-TW）
- 韩文（ko-KR）
- 其他语言按需添加

---

## 二、Week 1：前端国际化

### 2.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1 | 安装配置 react-i18next | `frontend/package.json` + `frontend/src/i18n/` | 2h |
| 2 | 语言切换组件 | `frontend/src/components/LanguageSwitcher.tsx` | 3h |
| 3 | 提取现有中文文本 | 所有前端文件 | 10h |
| 4 | 认证页面国际化 | `frontend/src/pages/auth/` | 5h |
| 5 | 主要功能页面国际化 | `frontend/src/pages/` | 8h |
| 6 | 管理后台国际化 | `frontend/src/pages/admin/` | 6h |

**Week 1 总计：34小时**

### 2.2 前端 i18n 框架集成

**任务 1：安装配置 react-i18next**
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

**实现内容：**
- [ ] 安装 i18next 相关依赖
- [ ] 创建 i18n 配置文件
- [ ] 配置语言检测器
- [ ] 配置命名空间
- [ ] 集成到 React 应用

**文件结构：**
```
frontend/src/
├── i18n/
│   ├── index.ts           # i18n 配置入口
│   ├── locales/
│   │   ├── zh-CN/
│   │   │   ├── common.json
│   │   │   ├── auth.json
│   │   │   ├── dashboard.json
│   │   │   └── ...
│   │   └── en-US/
│   │       └── ...
```

**任务 2：语言切换组件**
- [ ] 创建 LanguageSwitcher 组件
- [ ] 支持下拉选择语言
- [ ] 保存用户语言偏好到 localStorage
- [ ] 实时切换界面语言
- [ ] 添加语言图标/国旗

**任务 3：提取现有中文文本**
- [ ] 扫描所有页面组件
- [ ] 提取硬编码的中文文本
- [ ] 创建翻译键（key）命名规范
- [ ] 生成 zh-CN 翻译文件
- [ ] 替换为 t() 函数调用

### 2.2 核心页面国际化

**任务 4：认证页面国际化**
- [ ] LoginPage.tsx
- [ ] RegisterPage.tsx
- [ ] ForgotPasswordPage.tsx
- [ ] ResetPasswordPage.tsx
- [ ] VerifyEmailPage.tsx

**任务 5：主要功能页面国际化**
- [ ] DashboardPage.tsx
- [ ] KeysPage.tsx
- [ ] SubscriptionPage.tsx
- [ ] UsagePage.tsx
- [ ] AnalyticsPage.tsx
- [ ] TicketsPage.tsx

**任务 6：管理后台国际化**
- [ ] AdminPage.tsx
- [ ] 所有 admin 组件
- [ ] 表格列标题
- [ ] 按钮和操作文本
- [ ] 提示信息

---

## 三、Week 2：后端国际化与翻译完善

### 3.1 任务清单

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 7 | 安装配置后端 i18next | `server/package.json` + `server/src/i18n/` | 2h |
| 8 | API 错误信息国际化 | `server/src/routes/` | 6h |
| 9 | 邮件模板多语言 | `server/src/templates/` | 6h |
| 10 | User 表添加 language 字段 | `server/prisma/schema.prisma` | 2h |
| 11 | 语言偏好 API | `server/src/routes/user.ts` | 3h |
| 12 | 英文翻译与本地化适配 | `frontend/src/i18n/locales/en-US/` + 格式化 | 16h |

**Week 2 总计：35小时**

### 3.2 后端 i18n 框架

**任务 7：安装配置 i18next（Node.js）**
```bash
npm install i18next i18next-fs-backend
```

**实现内容：**
- [ ] 安装后端 i18n 依赖
- [ ] 创建翻译文件结构
- [ ] 配置语言检测（Accept-Language）
- [ ] 创建翻译中间件
- [ ] 集成到 Fastify

**文件结构：**
```
server/src/
├── i18n/
│   ├── index.ts           # i18n 配置
│   ├── middleware.ts      # 语言检测中间件
│   └── locales/
│       ├── zh-CN/
│       │   ├── errors.json
│       │   ├── messages.json
│       │   └── emails.json
│       └── en-US/
│           └── ...
```

**任务 8：API 错误信息国际化**
- [ ] 提取所有错误消息
- [ ] 创建错误码映射
- [ ] 翻译错误信息（中英文）
- [ ] 更新所有 API 路由
- [ ] 根据 Accept-Language 返回对应语言

### 3.3 邮件模板与数据库

**任务 9：邮件模板多语言**
- [ ] 密码重置邮件（中英文）
- [ ] 邮箱验证邮件（中英文）
- [ ] 欢迎邮件（中英文）
- [ ] 通知邮件（中英文）
- [ ] 根据用户语言偏好发送

**任务 10：数据库字段添加**

```prisma
model User {
  // 现有字段...
  language String @default("zh-CN")  // 用户语言偏好
}
```

**任务 11：语言偏好 API**

```typescript
// PUT /api/user/language
{
  language: "zh-CN" | "en-US"
}
```

- [ ] 使用 date-fns 或 dayjs 格式化日期
- [ ] 根据语言格式化日期和时间
- [ ] 时区处理

### 3.4 翻译与本地化

**任务 12：英文翻译与本地化适配**

**翻译内容：**
- [ ] 所有前端文本翻译
- [ ] 所有后端消息翻译
- [ ] 邮件模板翻译
- [ ] 文档翻译（README等）
- [ ] 审校和优化

**本地化适配：**
- [ ] 数字格式（千分位、小数点）
- [ ] 货币格式（¥、$）
- [ ] 日期格式（YYYY-MM-DD vs MM/DD/YYYY）
- [ ] 时间格式（24小时 vs 12小时）
- [ ] UI文本长度适配
- [ ] 翻译质量保证与测试

---

## 四、时间线

```
Week 1 (Day 1-5):   前端国际化（i18n框架 + 页面国际化）
Week 2 (Day 6-10):  后端国际化 + 翻译完善与本地化
Day 11-12:          集成测试 + Bug 修复
```

**总计：2 周 + 2 天，约 69 小时工作量**

---

## 五、技术实现细节

### 5.1 前端 i18n 配置示例

```typescript
// frontend/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': zhCN,
      'en-US': enUS,
    },
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

### 5.2 语言切换组件示例

```typescript
// frontend/src/components/LanguageSwitcher.tsx
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const languages = [
    { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
  ];

  return (
    <select 
      value={i18n.language} 
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.label}
        </option>
      ))}
    </select>
  );
}
```

### 5.3 使用示例

```typescript
// 使用翻译
import { useTranslation } from 'react-i18next';

function LoginPage() {
  const { t } = useTranslation('auth');
  
  return (
    <div>
      <h1>{t('login.title')}</h1>
      <button>{t('login.submit')}</button>
    </div>
  );
}
```

### 5.4 后端 i18n 中间件

```typescript
// server/src/i18n/middleware.ts
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

await i18next
  .use(Backend)
  .init({
    fallbackLng: 'zh-CN',
    backend: {
      loadPath: './src/i18n/locales/{{lng}}/{{ns}}.json',
    },
  });

export function i18nMiddleware(req: any, reply: any, done: any) {
  const lang = req.headers['accept-language']?.split(',')[0] || 'zh-CN';
  req.t = i18next.getFixedT(lang);
  done();
}
```

---

## 六、翻译文件结构

### 6.1 命名空间划分

```
common.json      # 通用文本（按钮、标签等）
auth.json        # 认证相关
dashboard.json   # 仪表板
keys.json        # API密钥
subscription.json # 订阅
tickets.json     # 工单
admin.json       # 管理后台
errors.json      # 错误消息
validation.json  # 表单验证
```

### 6.2 翻译键命名规范

```json
{
  "page.section.element.action": "文本",
  
  // 示例
  "login.form.email.label": "邮箱",
  "login.form.email.placeholder": "请输入邮箱",
  "login.form.submit": "登录",
  "login.error.invalid": "邮箱或密码错误",
  
  "dashboard.stats.totalCalls": "总调用次数",
  "dashboard.stats.totalTokens": "总Token数"
}
```

---

## 七、验收标准

### 7.1 功能标准

- [ ] 支持中文、英文两种语言
- [ ] 语言切换实时生效
- [ ] 用户语言偏好持久化
- [ ] 所有界面文本已翻译
- [ ] API 错误消息已国际化
- [ ] 邮件模板已多语言化

### 7.2 质量标准

- [ ] 翻译准确率 > 95%
- [ ] 无遗漏的硬编码文本
- [ ] 术语翻译统一
- [ ] 上下文语义正确
- [ ] 字符长度适配良好

### 7.3 性能标准

- [ ] 语言切换响应 < 100ms
- [ ] 翻译文件按需加载
- [ ] 首屏加载不受影响
- [ ] 翻译缓存机制

---

## 八、风险与挑战

### 8.1 技术挑战

**挑战 1：文本长度差异**
- **问题**：英文通常比中文长 30-50%
- **解决**：响应式布局、文本截断、工具提示

**挑战 2：翻译质量**
- **问题**：机器翻译不准确
- **解决**：人工审校、母语者校对

**挑战 3：动态内容翻译**
- **问题**：用户生成内容无法翻译
- **解决**：标记语言、可选机器翻译

### 8.2 维护挑战

**挑战 4：翻译同步**
- **问题**：新功能添加后翻译滞后
- **解决**：翻译管理流程、自动检测遗漏

**挑战 5：多人协作**
- **问题**：翻译冲突、术语不统一
- **解决**：术语表、翻译规范文档

---

## 九、后续扩展

### Phase 7+ 国际化增强

**更多语言支持：**
- 繁体中文（zh-TW）
- 韩文（ko-KR）
- 德文（de-DE）
- 法文（fr-FR）
- 西班牙文（es-ES）

**高级功能：**
- 在线翻译管理平台
- 众包翻译
- 机器翻译辅助
- A/B 测试不同翻译
- 地区特定内容

**本地化深化：**
- 支付方式本地化
- 法律条款本地化
- 客服渠道本地化
- 营销内容本地化

---

## 十、总结

Phase 6 将 ZiroCode 从单一中文界面扩展到支持多语言的国际化产品：

1. **覆盖全面**：前端、后端、邮件全面国际化
2. **双语支持**：中文、英文
3. **用户友好**：语言切换便捷、偏好持久化
4. **可维护性**：规范的翻译管理、清晰的命名规范

完成 Phase 6 后，ZiroCode 将具备进入国际市场的基础能力。
