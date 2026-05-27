import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import KeysPage from './pages/KeysPage'
import SubscriptionPage from './pages/SubscriptionPage'
import UsagePage from './pages/UsagePage'

export default function App() {
  return (
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/keys" element={<KeysPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/usage" element={<UsagePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
