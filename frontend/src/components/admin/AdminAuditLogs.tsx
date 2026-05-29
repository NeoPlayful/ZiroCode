import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentTextIcon, ClockIcon, UserGroupIcon, ChartBarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { t } = useTranslation('admin')

  const { data } = useQuery({
    queryKey: ['admin-audit-logs', search, actionFilter, page, pageSize],
    queryFn: () => fetch('/api/admin/audit-logs').then(r => r.json())
  })

  const logs = data?.logs || []
  const total = logs.length
  const todayLogs = logs.filter((log: any) => {
    const today = new Date().toDateString()
    return new Date(log.createdAt).toDateString() === today
  }).length
  const uniqueUsers = new Set(logs.map((log: any) => log.userId).filter(Boolean)).size
  const actionCounts = logs.reduce((acc: any, log: any) => {
    acc[log.action] = (acc[log.action] || 0) + 1
    return acc
  }, {})
  const mostCommonAction = Object.keys(actionCounts).sort((a, b) => actionCounts[b] - actionCounts[a])[0] || '-'

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={<DocumentTextIcon className="w-5 h-5" />}
          label={t('auditLogs.kpi.totalLogs')}
          value={total}
          trend="+24"
          trendUp={true}
        />
        <KPICard
          icon={<ClockIcon className="w-5 h-5" />}
          label={t('auditLogs.kpi.todayLogs')}
          value={todayLogs}
          trend="+12"
          trendUp={true}
        />
        <KPICard
          icon={<UserGroupIcon className="w-5 h-5" />}
          label={t('auditLogs.kpi.activeUsers')}
          value={uniqueUsers}
          trend="+3"
          trendUp={true}
        />
        <KPICard
          icon={<ChartBarIcon className="w-5 h-5" />}
          label={t('auditLogs.kpi.mostCommonAction')}
          value={mostCommonAction}
          trend="稳定"
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
              placeholder={t('auditLogs.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border-0 bg-white rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            />
          </div>

          {/* 操作筛选 */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-sm border-0 bg-white rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
          >
            <option value="all">{t('auditLogs.filter.allActions')}</option>
            <option value="CREATE">{t('auditLogs.filter.create')}</option>
            <option value="UPDATE">{t('auditLogs.filter.update')}</option>
            <option value="DELETE">{t('auditLogs.filter.delete')}</option>
            <option value="LOGIN">{t('auditLogs.filter.login')}</option>
          </select>
        </div>
      </div>

      {/* 表格容器 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('auditLogs.table.action')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('auditLogs.table.resource')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('auditLogs.table.userId')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('auditLogs.table.time')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log: any) => (
                <LogRow key={log.id} log={log} />
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    {t('auditLogs.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 表格底部 - 分页 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
{t('auditLogs.pagination', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            >
              <option value={10}>{t('auditLogs.pageSize', { size: 10 })}</option>
              <option value={20}>{t('auditLogs.pageSize', { size: 20 })}</option>
              <option value={50}>{t('auditLogs.pageSize', { size: 50 })}</option>
              <option value={100}>{t('auditLogs.pageSize', { size: 100 })}</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
{t('auditLogs.prev')}
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
{t('auditLogs.next')}
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

// 日志行组件
function LogRow({ log }: any) {
  const getActionColor = (action: string) => {
    if (action === 'CREATE') return 'bg-green-50 text-green-700'
    if (action === 'UPDATE') return 'bg-blue-50 text-blue-700'
    if (action === 'DELETE') return 'bg-red-50 text-red-700'
    if (action === 'LOGIN') return 'bg-purple-50 text-purple-700'
    return 'bg-gray-50 text-gray-600'
  }

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
          {log.action}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">{log.resource}</div>
      </td>
      <td className="px-6 py-4">
        <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{log.userId || '-'}</code>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {new Date(log.createdAt).toLocaleString()}
      </td>
    </tr>
  )
}
