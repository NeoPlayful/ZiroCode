import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { CreditCardIcon, CheckCircleIcon, ClockIcon, ChartBarIcon, MagnifyingGlassIcon, PencilIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function AdminSubscriptions() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { t } = useTranslation('admin')

  const { data } = useQuery({
    queryKey: ['admin-subscriptions', search, typeFilter, statusFilter, page, pageSize],
    queryFn: () => fetch(`/api/admin/subscriptions?${new URLSearchParams({ search, typeFilter, statusFilter, page: String(page), pageSize: String(pageSize) })}`).then(r => r.json()),
    refetchInterval: 30000,
  })

  const subs = data?.subscriptions || []
  const total = data?.total || 0
  const activeSubs = subs.filter((s: any) => s.isActive).length
  const expiringToday = subs.filter((s: any) => {
    if (!s.expiresAt) return false
    const today = new Date().toDateString()
    return new Date(s.expiresAt).toDateString() === today
  }).length
  const totalQuotaUsed = subs.reduce((sum: number, s: any) => sum + Number(s.quotaUsed || 0) + Number(s.quotaMonthlyUsed || 0), 0)

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={<CreditCardIcon className="w-5 h-5" />}
          label={t('subscriptions.kpi.totalSubs')}
          value={total}
          trend="+5%"
          trendUp={true}
        />
        <KPICard
          icon={<CheckCircleIcon className="w-5 h-5" />}
          label={t('subscriptions.kpi.activeSubs')}
          value={activeSubs}
          trend="+3%"
          trendUp={true}
        />
        <KPICard
          icon={<ClockIcon className="w-5 h-5" />}
          label={t('subscriptions.kpi.expiringToday')}
          value={expiringToday}
          trend="0"
          trendUp={false}
        />
        <KPICard
          icon={<ChartBarIcon className="w-5 h-5" />}
          label={t('subscriptions.kpi.totalQuota')}
          value={formatQuota(totalQuotaUsed)}
          trend="+12%"
          trendUp={true}
        />
      </div>

      {/* 筛选工具栏 */}
      <div className="bg-gray-50/50 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('subscriptions.search')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border-0 bg-white rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            />
          </div>

          {/* 订阅类型筛选 */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border-0 bg-white rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
          >
            <option value="all">{t('subscriptions.filter.allTypes')}</option>
            <option value="PAY_AS_YOU_GO">{t('subscriptions.filter.payAsYouGo')}</option>
            <option value="MONTHLY">{t('subscriptions.filter.monthly')}</option>
            <option value="PERMANENT">{t('subscriptions.filter.permanent')}</option>
          </select>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border-0 bg-white rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
          >
            <option value="all">{t('subscriptions.filter.allStatus')}</option>
            <option value="active">{t('subscriptions.filter.active')}</option>
            <option value="expired">{t('subscriptions.filter.expired')}</option>
          </select>
        </div>
      </div>

      {/* 表格容器 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('subscriptions.table.user')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('subscriptions.table.type')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('subscriptions.table.quotaUsage')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('subscriptions.table.status')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('subscriptions.table.expiresAt')}</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('subscriptions.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subs.map((sub: any) => (
                <SubscriptionRow key={sub.id} subscription={sub} />
              ))}
            </tbody>
          </table>
        </div>

        {/* 表格底部 - 分页 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {t('subscriptions.pagination', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            >
              <option value={10}>{t('subscriptions.pageSize', { size: 10 })}</option>
              <option value={20}>{t('subscriptions.pageSize', { size: 20 })}</option>
              <option value={50}>{t('subscriptions.pageSize', { size: 50 })}</option>
              <option value={100}>{t('subscriptions.pageSize', { size: 100 })}</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('subscriptions.prev')}
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('subscriptions.next')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// KPI 卡片组件
function KPICard({ icon, label, value, trend, trendUp }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600">
          {icon}
        </div>
        <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-gray-400'}`}>
          {trend}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  )
}

// 订阅行组件
function formatQuota(value: number): string {
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return value.toLocaleString();
}

function SubscriptionRow({ subscription }: any) {
  const { t } = useTranslation('admin')
  const isMonthly = subscription.type === 'MONTHLY'
  const quotaTotal = Number(isMonthly ? (subscription.quotaMonthly || 0) : (subscription.quotaTotal || 0))
  const quotaUsed = Number(isMonthly ? (subscription.quotaMonthlyUsed || 0) : (subscription.quotaUsed || 0))
  const usagePercent = quotaTotal > 0 ? (quotaUsed / quotaTotal) * 100 : 0

  const getTypeColor = (type: string) => {
    if (type === 'PAY_AS_YOU_GO') return 'bg-blue-50 text-blue-700'
    if (type === 'MONTHLY') return 'bg-purple-50 text-purple-700'
    if (type === 'PERMANENT') return 'bg-orange-50 text-orange-700'
    return 'bg-gray-50 text-gray-600'
  }

  const getTypeLabel = (type: string) => {
    if (type === 'PAY_AS_YOU_GO') return t('subscriptions.typeLabel.payAsYouGo')
    if (type === 'MONTHLY') return t('subscriptions.typeLabel.monthly')
    if (type === 'PERMANENT') return t('subscriptions.typeLabel.permanent')
    return type
  }

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
            {subscription.user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div className="font-medium text-gray-900">{subscription.user?.name || t('subscriptions.table.unnamed')}</div>
            <div className="text-sm text-gray-500">{subscription.user?.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(subscription.type)}`}>
          {getTypeLabel(subscription.type)}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{formatQuota(quotaUsed)} / {formatQuota(quotaTotal)}</span>
            <span className="text-gray-500">{usagePercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${subscription.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {subscription.isActive ? t('subscriptions.filter.active') : t('subscriptions.filter.expired')}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : t('subscriptions.table.permanent')}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors">
            <PencilIcon className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors">
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
