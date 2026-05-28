import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { MegaphoneIcon, CheckCircleIcon, PlusIcon, EyeIcon, MagnifyingGlassIcon, PencilIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'

export default function AdminAnnouncements() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })

  const { data, refetch } = useQuery({
    queryKey: ['admin-announcements', search, statusFilter, page, pageSize],
    queryFn: () => fetch('/api/admin/announcements').then(r => r.json())
  })

  const announcements = data?.announcements || []
  const total = announcements.length
  const activeAnnouncements = announcements.filter((a: any) => a.isActive).length
  const todayPublished = announcements.filter((a: any) => {
    const today = new Date().toDateString()
    return new Date(a.createdAt).toDateString() === today
  }).length
  const totalReads = announcements.reduce((sum: number, a: any) => sum + (a.readCount || 0), 0)

  async function create() {
    await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setShowForm(false)
    setForm({ title: '', content: '' })
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={<MegaphoneIcon className="w-5 h-5" />}
          label="总公告数"
          value={total}
          trend="+3"
          trendUp={true}
        />
        <KPICard
          icon={<CheckCircleIcon className="w-5 h-5" />}
          label="启用公告"
          value={activeAnnouncements}
          trend={`${((activeAnnouncements / total) * 100).toFixed(0)}%`}
          trendUp={true}
        />
        <KPICard
          icon={<PlusIcon className="w-5 h-5" />}
          label="今日发布"
          value={todayPublished}
          trend="+2"
          trendUp={true}
        />
        <KPICard
          icon={<EyeIcon className="w-5 h-5" />}
          label="总阅读量"
          value={totalReads}
          trend="+156"
          trendUp={true}
        />
      </div>

      {/* 新增表单 */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">新建公告</h3>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
                placeholder="输入公告标题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
                placeholder="输入公告内容"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={create}
              className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium transition-colors"
            >
              发布
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 筛选工具栏 */}
      <div className="bg-gray-50/50 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索公告..."
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
            <option value="active">启用</option>
            <option value="inactive">禁用</option>
          </select>
        </div>

        {/* 新建按钮 */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          新建公告
        </button>
      </div>

      {/* 表格容器 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">阅读量</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">发布时间</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {announcements.map((announcement: any) => (
                <AnnouncementRow key={announcement.id} announcement={announcement} />
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

// 公告行组件
function AnnouncementRow({ announcement }: any) {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="font-medium text-gray-900">{announcement.title}</div>
        <div className="text-sm text-gray-500 line-clamp-1">{announcement.content}</div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${announcement.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
          {announcement.isActive ? '启用' : '禁用'}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {announcement.readCount || 0}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {new Date(announcement.createdAt).toLocaleDateString()}
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
