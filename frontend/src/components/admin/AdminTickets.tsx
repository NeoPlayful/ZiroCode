import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TicketIcon, ClockIcon, CheckCircleIcon, ChartBarIcon, MagnifyingGlassIcon, PencilIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'

export default function AdminTickets() {
  const { t } = useTranslation('admin')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data } = useQuery({
    queryKey: ['admin-tickets', search, statusFilter, priorityFilter, page, pageSize],
    queryFn: () => fetch('/api/admin/tickets').then(r => r.json())
  })

  const tickets = data?.tickets || []
  const total = tickets.length
  const pendingTickets = tickets.filter((t: any) => t.status === 'PENDING' || t.status === 'OPEN').length
  const resolvedTickets = tickets.filter((t: any) => t.status === 'RESOLVED' || t.status === 'CLOSED').length
  const avgResponseTime = '2.5h' // 模拟数据

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={<TicketIcon className="w-5 h-5" />}
          label={t('tickets.kpi.totalTickets')}
          value={total}
          trend="+12"
          trendUp={true}
        />
        <KPICard
          icon={<ClockIcon className="w-5 h-5" />}
          label={t('tickets.kpi.pending')}
          value={pendingTickets}
          trend={`${((pendingTickets / total) * 100).toFixed(0)}%`}
          trendUp={false}
        />
        <KPICard
          icon={<CheckCircleIcon className="w-5 h-5" />}
          label={t('tickets.kpi.resolved')}
          value={resolvedTickets}
          trend="+8"
          trendUp={true}
        />
        <KPICard
          icon={<ChartBarIcon className="w-5 h-5" />}
          label={t('tickets.kpi.avgResponse')}
          value={avgResponseTime}
          trend="-0.5h"
          trendUp={true}
        />
      </div>

      {/* 筛选工具栏 */}
      <div className="bg-gray-50/50 dark:bg-[#242426]/50 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6E6E73]" />
            <input
              type="text"
              placeholder={t('tickets.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border-0 bg-white dark:bg-[#242426] dark:text-[#E5E5E7] rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            />
          </div>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border-0 bg-white dark:bg-[#242426] dark:text-[#E5E5E7] rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
          >
            <option value="all">{t('tickets.filter.allStatus')}</option>
            <option value="OPEN">{t('tickets.filter.open')}</option>
            <option value="PENDING">{t('tickets.filter.pending')}</option>
            <option value="RESOLVED">{t('tickets.filter.resolved')}</option>
            <option value="CLOSED">{t('tickets.filter.closed')}</option>
          </select>

          {/* 优先级筛选 */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm border-0 bg-white dark:bg-[#242426] dark:text-[#E5E5E7] rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
          >
            <option value="all">{t('tickets.filter.allPriority')}</option>
            <option value="LOW">{t('tickets.filter.low')}</option>
            <option value="MEDIUM">{t('tickets.filter.medium')}</option>
            <option value="HIGH">{t('tickets.filter.high')}</option>
            <option value="URGENT">{t('tickets.filter.urgent')}</option>
          </select>
        </div>
      </div>

      {/* 表格容器 */}
      <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-gray-100 dark:border-[#303033] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#303033]">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('tickets.table.title')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('tickets.table.user')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('tickets.table.priority')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('tickets.table.status')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('tickets.table.createdAt')}</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('tickets.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#303033]/50">
              {tickets.map((ticket: any) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </tbody>
          </table>
        </div>

        {/* 表格底部 - 分页 */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-[#303033] flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-[#98989D]">
            {t('tickets.pagination', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#303033] rounded-lg focus:ring-2 focus:ring-gray-200 outline-none dark:bg-[#242426] dark:text-[#E5E5E7]"
            >
              <option value={10}>{t('tickets.pageSize', { count: 10 })}</option>
              <option value={20}>{t('tickets.pageSize', { count: 20 })}</option>
              <option value={50}>{t('tickets.pageSize', { count: 50 })}</option>
              <option value={100}>{t('tickets.pageSize', { count: 100 })}</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#303033] rounded-lg hover:bg-gray-50 dark:hover:bg-[#242426] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('tickets.pagination.prev')}
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#303033] rounded-lg hover:bg-gray-50 dark:hover:bg-[#242426] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('tickets.pagination.next')}
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
    <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-gray-100 dark:border-[#303033] p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#242426] flex items-center justify-center text-gray-600 dark:text-[#E5E5E7]">
          {icon}
        </div>
        <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-gray-400 dark:text-[#6E6E73]'}`}>
          {trend}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-[#E5E5E7] mb-1">{value}</div>
      <div className="text-sm text-gray-500 dark:text-[#98989D]">{label}</div>
    </div>
  )
}

// 工单行组件
function TicketRow({ ticket }: any) {
  const { t } = useTranslation('admin')
  const getPriorityColor = (priority: string) => {
    if (priority === 'URGENT') return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-[#FF453A]'
    if (priority === 'HIGH') return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
    if (priority === 'MEDIUM') return 'bg-yellow-50 dark:bg-[#FF9F0A]/10 text-yellow-700 dark:text-yellow-300'
    if (priority === 'LOW') return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
    return 'bg-gray-50 dark:bg-[#242426] text-gray-600 dark:text-[#98989D]'
  }

  const getPriorityLabel = (priority: string) => {
    if (priority === 'URGENT') return t('tickets.priorityLabel.urgent')
    if (priority === 'HIGH') return t('tickets.priorityLabel.high')
    if (priority === 'MEDIUM') return t('tickets.priorityLabel.medium')
    if (priority === 'LOW') return t('tickets.priorityLabel.low')
    return priority
  }

  const getStatusColor = (status: string) => {
    if (status === 'RESOLVED' || status === 'CLOSED') return 'bg-green-50 dark:bg-[#30D158]/10 text-green-700 dark:text-[#30D158]'
    if (status === 'PENDING') return 'bg-yellow-50 dark:bg-[#FF9F0A]/10 text-yellow-700 dark:text-yellow-300'
    if (status === 'OPEN') return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
    return 'bg-gray-50 dark:bg-[#242426] text-gray-600 dark:text-[#98989D]'
  }

  const getStatusLabel = (status: string) => {
    if (status === 'OPEN') return t('tickets.statusLabel.open')
    if (status === 'PENDING') return t('tickets.statusLabel.pending')
    if (status === 'RESOLVED') return t('tickets.statusLabel.resolved')
    if (status === 'CLOSED') return t('tickets.statusLabel.closed')
    return status
  }

  return (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-[#242426]/50 transition-colors">
      <td className="px-6 py-4">
        <div className="font-medium text-gray-900 dark:text-[#E5E5E7] hover:text-[#F97346] cursor-pointer">
          {ticket.title}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
            {ticket.user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-[#E5E5E7]">{ticket.user?.name || t('tickets.statusLabel.unnamed')}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
          {getPriorityLabel(ticket.priority)}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
          {getStatusLabel(ticket.status)}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-[#98989D]">
        {new Date(ticket.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <button className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242426] flex items-center justify-center text-gray-600 dark:text-[#E5E5E7] transition-colors">
            <PencilIcon className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242426] flex items-center justify-center text-gray-600 dark:text-[#E5E5E7] transition-colors">
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
