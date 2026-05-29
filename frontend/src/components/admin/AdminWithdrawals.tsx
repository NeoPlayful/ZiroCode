import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BanknotesIcon, ClockIcon, CheckCircleIcon, CurrencyDollarIcon, MagnifyingGlassIcon, PencilIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'

export default function AdminWithdrawals() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { t } = useTranslation('admin')

  const { data, refetch } = useQuery({
    queryKey: ['admin-withdrawals', search, statusFilter, page, pageSize],
    queryFn: () => fetch('/api/admin/withdrawals').then(r => r.json())
  })

  const withdrawals = data?.withdrawals || []
  const total = withdrawals.length
  const pendingWithdrawals = withdrawals.filter((w: any) => w.status === 'PENDING').length
  const approvedWithdrawals = withdrawals.filter((w: any) => w.status === 'APPROVED').length
  const totalAmount = withdrawals.filter((w: any) => w.status === 'APPROVED').reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0)

  async function approve(id: string) {
    await fetch(`/api/admin/withdrawals/${id}/approve`, { method: 'PUT' })
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={<BanknotesIcon className="w-5 h-5" />}
          label={t('withdrawals.kpi.totalWithdrawals')}
          value={total}
          trend="+8"
          trendUp={true}
        />
        <KPICard
          icon={<ClockIcon className="w-5 h-5" />}
          label={t('withdrawals.kpi.pending')}
          value={pendingWithdrawals}
          trend={`${((pendingWithdrawals / total) * 100 || 0).toFixed(0)}%`}
          trendUp={false}
        />
        <KPICard
          icon={<CheckCircleIcon className="w-5 h-5" />}
          label={t('withdrawals.kpi.approved')}
          value={approvedWithdrawals}
          trend="+5"
          trendUp={true}
        />
        <KPICard
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          label={t('withdrawals.kpi.totalAmount')}
          value={`¥${totalAmount.toFixed(2)}`}
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
              placeholder={t('withdrawals.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border-0 bg-white rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            />
          </div>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border-0 bg-white rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
          >
            <option value="all">{t('withdrawals.filter.allStatus')}</option>
            <option value="PENDING">{t('withdrawals.filter.pending')}</option>
            <option value="APPROVED">{t('withdrawals.filter.approved')}</option>
            <option value="REJECTED">{t('withdrawals.filter.rejected')}</option>
          </select>
        </div>
      </div>

      {/* 表格容器 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('withdrawals.table.user')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('withdrawals.table.amount')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('withdrawals.table.status')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('withdrawals.table.createdAt')}</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('withdrawals.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {withdrawals.map((withdrawal: any) => (
                <WithdrawalRow key={withdrawal.id} withdrawal={withdrawal} onApprove={approve} />
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    {t('withdrawals.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 表格底部 - 分页 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
{t('withdrawals.pagination', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            >
              <option value={10}>{t('withdrawals.pageSize', { size: 10 })}</option>
              <option value={20}>{t('withdrawals.pageSize', { size: 20 })}</option>
              <option value={50}>{t('withdrawals.pageSize', { size: 50 })}</option>
              <option value={100}>{t('withdrawals.pageSize', { size: 100 })}</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
{t('withdrawals.prev')}
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
{t('withdrawals.next')}
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

// 提现行组件
function WithdrawalRow({ withdrawal, onApprove }: any) {
  const { t } = useTranslation('admin')

  const getStatusColor = (status: string) => {
    if (status === 'APPROVED') return 'bg-green-50 text-green-700'
    if (status === 'PENDING') return 'bg-yellow-50 text-yellow-700'
    if (status === 'REJECTED') return 'bg-red-50 text-red-700'
    return 'bg-gray-50 text-gray-600'
  }

  const getStatusLabel = (status: string) => {
    if (status === 'APPROVED') return t('withdrawals.statusLabel.approved')
    if (status === 'PENDING') return t('withdrawals.statusLabel.pending')
    if (status === 'REJECTED') return t('withdrawals.statusLabel.rejected')
    return status
  }

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
            {withdrawal.user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div className="font-medium text-gray-900">{withdrawal.user?.name || t('withdrawals.unnamed')}</div>
            <div className="text-sm text-gray-500">{withdrawal.user?.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-lg font-semibold text-gray-900">¥{Number(withdrawal.amount).toFixed(2)}</div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
          {getStatusLabel(withdrawal.status)}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {new Date(withdrawal.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          {withdrawal.status === 'PENDING' && (
            <button
              onClick={() => onApprove(withdrawal.id)}
              className="px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors font-medium"
            >
{t('withdrawals.approve')}
            </button>
          )}
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
