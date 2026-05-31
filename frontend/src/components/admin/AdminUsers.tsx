import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { UsersIcon, UserGroupIcon, ShieldCheckIcon, PlusIcon, MagnifyingGlassIcon, PencilIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { t } = useTranslation('admin')

  const { data } = useQuery({
    queryKey: ['admin-users', search, roleFilter, statusFilter, page, pageSize],
    queryFn: () => fetch('/api/admin/users').then(r => r.json())
  })

  const users = data?.users || []
  const total = data?.total || 0
  const activeUsers = users.filter((u: any) => u.isActive).length
  const adminCount = users.filter((u: any) => u.role === 'ADMIN').length
  const todayNew = users.filter((u: any) => {
    const today = new Date().toDateString()
    return new Date(u.createdAt).toDateString() === today
  }).length

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={<UsersIcon className="w-5 h-5" />}
          label={t('users.kpi.totalUsers')}
          value={total}
          trend="+12%"
          trendUp={true}
        />
        <KPICard
          icon={<UserGroupIcon className="w-5 h-5" />}
          label={t('users.kpi.activeUsers')}
          value={activeUsers}
          trend="+8%"
          trendUp={true}
        />
        <KPICard
          icon={<ShieldCheckIcon className="w-5 h-5" />}
          label={t('users.kpi.adminCount')}
          value={adminCount}
          trend="0%"
          trendUp={false}
        />
        <KPICard
          icon={<PlusIcon className="w-5 h-5" />}
          label={t('users.kpi.todayNew')}
          value={todayNew}
          trend="+3"
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
              placeholder={t('users.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border-0 bg-white dark:bg-[#242426] dark:text-[#E5E5E7] rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            />
          </div>

          {/* 角色筛选 */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm border-0 bg-white dark:bg-[#242426] dark:text-[#E5E5E7] rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
          >
            <option value="all">{t('users.filter.allRoles')}</option>
            <option value="ADMIN">{t('users.filter.admin')}</option>
            <option value="USER">{t('users.filter.user')}</option>
          </select>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border-0 bg-white dark:bg-[#242426] dark:text-[#E5E5E7] rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
          >
            <option value="all">{t('users.filter.allStatus')}</option>
            <option value="active">{t('users.filter.active')}</option>
            <option value="disabled">{t('users.filter.disabled')}</option>
            <option value="banned">{t('users.filter.banned')}</option>
          </select>
        </div>

        {/* 新增用户按钮 */}
        <button className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <PlusIcon className="w-4 h-4" />
          {t('users.addUser')}
        </button>
      </div>

      {/* 表格容器 */}
      <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-gray-100 dark:border-[#303033] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#303033]">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('users.table.user')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('users.table.role')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('users.table.status')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('users.table.apiKey')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('users.table.subscription')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('users.table.registeredAt')}</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 dark:text-[#98989D] uppercase tracking-wider">{t('users.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#303033]/50">
              {users.map((user: any) => (
                <UserRow key={user.id} user={user} />
              ))}
            </tbody>
          </table>
        </div>

        {/* 表格底部 - 分页 */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-[#303033] flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-[#98989D]">
            {t('users.pagination', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#303033] rounded-lg focus:ring-2 focus:ring-gray-200 outline-none dark:bg-[#242426] dark:text-[#E5E5E7]"
            >
              <option value={10}>{t('users.pageSize', { size: 10 })}</option>
              <option value={20}>{t('users.pageSize', { size: 20 })}</option>
              <option value={50}>{t('users.pageSize', { size: 50 })}</option>
              <option value={100}>{t('users.pageSize', { size: 100 })}</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#303033] rounded-lg hover:bg-gray-50 dark:hover:bg-[#242426] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('users.prev')}
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#303033] rounded-lg hover:bg-gray-50 dark:hover:bg-[#242426] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('users.next')}
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

// 用户行组件
function UserRow({ user }: any) {
  const { t } = useTranslation('admin')
  const getStatusColor = (status: string) => {
    if (status === 'active' || user.isActive !== false) return 'bg-green-50 dark:bg-[#30D158]/10 text-green-700 dark:text-[#30D158]'
    if (status === 'disabled') return 'bg-gray-50 dark:bg-[#242426] text-gray-600 dark:text-[#98989D]'
    if (status === 'banned') return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-[#FF453A]'
    return 'bg-gray-50 dark:bg-[#242426] text-gray-600 dark:text-[#98989D]'
  }

  const getRoleColor = (role: string) => {
    if (role === 'ADMIN') return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
    return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
  }

  return (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-[#242426]/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
            {user.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-[#E5E5E7]">{user.name || t('users.table.unnamed')}</div>
            <div className="text-sm text-gray-500 dark:text-[#98989D]">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
          {user.isActive !== false ? t('users.filter.active') : t('users.filter.disabled')}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#E5E5E7]">{user._count?.apiKeys || 0}</td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#E5E5E7]">{user._count?.subscriptions || 0}</td>
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-[#98989D]">{new Date(user.createdAt).toLocaleDateString()}</td>
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
