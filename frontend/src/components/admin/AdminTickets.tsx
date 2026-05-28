import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { TicketIcon, ClockIcon, CheckCircleIcon, ChartBarIcon, MagnifyingGlassIcon, PencilIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'

export default function AdminTickets() {
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
          label="总工单数"
          value={total}
          trend="+12"
          trendUp={true}
        />
        <KPICard
          icon={<ClockIcon className="w-5 h-5" />}
          label="待处理"
          value={pendingTickets}
          trend={`${((pendingTickets / total) * 100).toFixed(0)}%`}
          trendUp={false}
        />
        <KPICard
          icon={<CheckCircleIcon className="w-5 h-5" />}
          label="已解决"
          value={resolvedTickets}
          trend="+8"
          trendUp={true}
        />
        <KPICard
          icon={<ChartBarIcon className="w-5 h-5" />}
          label="平均响应时间"
          value={avgResponseTime}
          trend="-0.5h"
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
              placeholder="搜索工单..."
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
            <option value="all">所有状态</option>
            <option value="OPEN">待处理</option>
            <option value="PENDING">处理中</option>
            <option value="RESOLVED">已解决</option>
            <option value="CLOSED">已关闭</option>
          </select>

          {/* 优先级筛选 */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm border-0 bg-white rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
          >
            <option value="all">所有优先级</option>
            <option value="LOW">低</option>
            <option value="MEDIUM">中</option>
            <option value="HIGH">高</option>
            <option value="URGENT">紧急</option>
          </select>
        </div>
      </div>

      {/* 表格容器 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">工单标题</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">优先级</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tickets.map((ticket: any) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </tbody>
          </table>
        </div>

        {/* 表格底部 - 分页 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            >
              <option value={10}>10 / 页</option>
              <option value={20}>20 / 页</option>
              <option value={50}>50 / 页</option>
              <option value={100}>100 / 页</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
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

// 工单行组件
function TicketRow({ ticket }: any) {
  const getPriorityColor = (priority: string) => {
    if (priority === 'URGENT') return 'bg-red-50 text-red-700'
    if (priority === 'HIGH') return 'bg-orange-50 text-orange-700'
    if (priority === 'MEDIUM') return 'bg-yellow-50 text-yellow-700'
    if (priority === 'LOW') return 'bg-blue-50 text-blue-700'
    return 'bg-gray-50 text-gray-600'
  }

  const getPriorityLabel = (priority: string) => {
    if (priority === 'URGENT') return '紧急'
    if (priority === 'HIGH') return '高'
    if (priority === 'MEDIUM') return '中'
    if (priority === 'LOW') return '低'
    return priority
  }

  const getStatusColor = (status: string) => {
    if (status === 'RESOLVED' || status === 'CLOSED') return 'bg-green-50 text-green-700'
    if (status === 'PENDING') return 'bg-yellow-50 text-yellow-700'
    if (status === 'OPEN') return 'bg-blue-50 text-blue-700'
    return 'bg-gray-50 text-gray-600'
  }

  const getStatusLabel = (status: string) => {
    if (status === 'OPEN') return '待处理'
    if (status === 'PENDING') return '处理中'
    if (status === 'RESOLVED') return '已解决'
    if (status === 'CLOSED') return '已关闭'
    return status
  }

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="font-medium text-gray-900 hover:text-[#F97346] cursor-pointer">
          {ticket.title}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
            {ticket.user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{ticket.user?.name || '未命名'}</div>
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
      <td className="px-6 py-4 text-sm text-gray-500">
        {new Date(ticket.createdAt).toLocaleDateString()}
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
