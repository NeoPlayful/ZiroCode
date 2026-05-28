import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import KeysPage from './pages/KeysPage'
import SubscriptionPage from './pages/SubscriptionPage'
import UsagePage from './pages/UsagePage'
import PricingPage from './pages/PricingPage'
import TicketsPage from './pages/TicketsPage'
import TicketDetailPage from './pages/TicketDetailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AdminPage from './pages/AdminPage'
import NotificationsPage from './pages/NotificationsPage'
import WebhooksPage from './pages/WebhooksPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DeveloperPage from './pages/DeveloperPage'

export default function App() {
  return (
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/keys" element={<KeysPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/usage" element={<UsagePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/developer" element={<DeveloperPage />} />
      </Route>
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
