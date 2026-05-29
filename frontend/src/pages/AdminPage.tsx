import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminDashboard from '../components/admin/AdminDashboard'
import AdminUsers from '../components/admin/AdminUsers'
import AdminSubscriptions from '../components/admin/AdminSubscriptions'
import AdminRedeemCodes from '../components/admin/AdminRedeemCodes'
import AdminTickets from '../components/admin/AdminTickets'
import AdminAnnouncements from '../components/admin/AdminAnnouncements'
import AdminChannels from '../components/admin/AdminChannels'
import AdminRoutes from '../components/admin/AdminRoutes'
import AdminWithdrawals from '../components/admin/AdminWithdrawals'
import AdminAuditLogs from '../components/admin/AdminAuditLogs'
import AdminBatch from '../components/admin/AdminBatch'

export default function AdminPage() {
  const { t } = useTranslation('admin')
  const [tab, setTab] = useState('dashboard')
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => fetch('/api/auth/me').then(r => r.json()) })

  if (!me?.user) return null
  if (me.user.role !== 'ADMIN') {
    return <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center text-gray-400"><p>{t('admin.permissionRequired')}</p></div>
  }

  return (
    <div className="flex overflow-hidden bg-[#f9f9f9]" style={{ height: 'calc(100vh - 56px)' }}>
      <AdminSidebar activeTab={tab} onTabChange={setTab} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-8">
          {tab === 'dashboard' && <AdminDashboard />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'subscriptions' && <AdminSubscriptions />}
          {tab === 'redeem-codes' && <AdminRedeemCodes />}
          {tab === 'channels' && <AdminChannels />}
          {tab === 'routes' && <AdminRoutes />}
          {tab === 'withdrawals' && <AdminWithdrawals />}
          {tab === 'tickets' && <AdminTickets />}
          {tab === 'announcements' && <AdminAnnouncements />}
          {tab === 'audit-logs' && <AdminAuditLogs />}
          {tab === 'batch' && <AdminBatch />}
          {tab === 'config' && <AdminConfig />}
        </main>
      </div>
    )
  }

function AdminConfig() {
  const { t } = useTranslation('admin')
  const [siteName, setSiteName] = useState('ZiroCode')
  const [defaultQuota, setDefaultQuota] = useState('100000000')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold mb-4">{t('admin.config.title')}</h3>
      <label className="block text-sm mb-1">{t('admin.config.siteName')}</label>
      <input value={siteName} onChange={e => setSiteName(e.target.value)} className="w-full border rounded px-3 py-2 mb-3" />
      <label className="block text-sm mb-1">{t('admin.config.defaultQuota')}</label>
      <input value={defaultQuota} onChange={e => setDefaultQuota(e.target.value)} type="number" className="w-full border rounded px-3 py-2 mb-3" />
      <button className="bg-[#e8673a] text-white px-4 py-2 rounded">{t('admin.config.save')}</button>
    </div>
  )
}
