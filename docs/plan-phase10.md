# 第十阶段开发计划 — 深色模式样式系统完善

## 背景

当前深色模式功能完整（三模式切换、系统跟随、持久化），但样式系统不完整：
- CSS 变量只定义了 `background` 和 `foreground` 的深色版本
- 其他设计 token（primary、card、border、muted 等）缺少深色变体
- 存在初始加载闪烁风险（FOUC）
- `index.css` 中 `--radius-md: var(--radius-md)` 是无效的自引用

## 目标

1. 补全所有 CSS 变量的深色版本
2. 解决主题闪烁问题
3. 优化深色模式视觉体验

## 技术方案

### 1. CSS 变量补全

项目使用 Tailwind class 方案驱动深色模式（`useTheme` 通过 `document.documentElement.classList.toggle('dark', isDark)` 控制），因此 CSS 变量深色变体必须用 `.dark` 选择器，而非 `@media (prefers-color-scheme: dark)`：

```css
.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
  --primary: #e8673a;
  --primary-foreground: #ffffff;
  --secondary: #1a1a1a;
  --secondary-foreground: #ededed;
  --muted: #262626;
  --muted-foreground: #a3a3a3;
  --card: #171717;
  --card-foreground: #ededed;
  --ring: #404040;
  --border: #262626;
  --destructive: #ef4444;
}
```

同时修复 `--radius-md: var(--radius-md)` 自引用，改为 `--radius-md: 0.5rem`。

### 2. 防闪烁脚本

在 `index.html` 的 `<head>` 中注入内联脚本，在页面渲染前读取 localStorage 并应用 `dark` class：

```html
<script>
  (function() {
    const theme = localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

### 3. 样式审计与优化

检查所有组件，确保深色模式下的视觉效果：
- 用户端页面：DashboardPage、KeysPage、UsagePage、PricingPage、SubscriptionPage、PlansPage、TicketsPage、ProfilePage、AnalyticsPage、NotificationsPage、WebhooksPage
- 管理端页面：AdminDashboard、AdminSidebar、AdminTopNav、AdminChannels、AdminUsers、AdminAnalytics 等
- 通用组件：AppLayout、PublicNav、Footer、表单控件、表格、弹窗

审查要点：
- 背景色：灰色区域是否需要 `dark:bg-gray-800/900`
- 文字色：是否所有文字都有 `dark:text-*` 对应
- 边框色：`dark:border-gray-700` 是否覆盖
- 输入框/下拉框：深色模式下的背景和文字对比度
- 卡片/模态框：深色背景下的阴影或边框

### 4. 图表主题适配

ECharts 图表需要根据主题切换配色方案：
- 在 `useTheme` hook 中暴露当前是否为深色模式
- 图表组件监听主题变化，动态切换 ECharts 主题配色

## 实施步骤

### Step 1: 补全 CSS 变量
- 文件：`frontend/src/index.css`
- 将 `@media (prefers-color-scheme: dark)` 改为 `.dark` 选择器
- 为所有设计 token 添加深色变体
- 修复 `--radius-md` 自引用

### Step 2: 添加防闪烁脚本
- 文件：`frontend/index.html`
- 在 `<head>` 最前面注入主题初始化脚本

### Step 3: 增强 useTheme Hook
- 文件：`frontend/src/hooks/useTheme.ts`
- 导出 `isDark` 布尔值，方便组件判断当前主题

### Step 4: 审计用户端页面
- DashboardPage、KeysPage、UsagePage、PricingPage
- SubscriptionPage、PlansPage、TicketsPage、ProfilePage
- AnalyticsPage、NotificationsPage、WebhooksPage
- LandingPage（公开页面）

### Step 5: 审计管理端页面
- AdminSidebar、AdminTopNav、AdminDashboard
- AdminChannels、AdminUsers、AdminAnalytics
- AdminBillingReport、AdminSubscriptions、AdminTickets 等

### Step 6: 图表主题适配
- 文件：`frontend/src/components/admin/AdminAnalytics.tsx`
- 根据 `isDark` 切换 ECharts 主题配色

### Step 7: 测试验证
- 切换三种模式，检查所有页面视觉效果
- 刷新页面，确认无闪烁
- 系统主题变化时，确认自动跟随

## 文件清单

| 文件 | 改动 |
|------|------|
| `frontend/index.html` | 添加防闪烁脚本 |
| `frontend/src/index.css` | `.dark` 选择器补全变量，修复 radius-md |
| `frontend/src/hooks/useTheme.ts` | 导出 `isDark` 状态 |
| `frontend/src/components/admin/AdminAnalytics.tsx` | 图表主题适配 |
| 用户端页面（约 11 个） | 深色样式审计与补全 |
| 管理端组件（约 10 个） | 深色样式审计与补全 |

## 验证标准

1. ✅ 所有页面在深色模式下视觉正常
2. ✅ 三种模式切换（亮/暗/系统）均正常工作
3. ✅ 刷新页面无主题闪烁
4. ✅ 系统主题变化时自动跟随
5. ✅ 图表配色适配深色背景
6. ✅ 表单控件在深色模式下对比度良好

## 优先级

**P0（必须）**：
- CSS 变量补全 + radius-md 修复
- 防闪烁脚本

**P1（重要）**：
- 用户端页面深色审计
- 管理端页面深色审计
- 图表主题适配

**P2（优化）**：
- 过渡动画
- 焦点样式
- 滚动条样式
