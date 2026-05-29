import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ServerIcon, CheckCircleIcon, CubeIcon, ChartBarIcon, MagnifyingGlassIcon, PlusIcon, PencilIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'

export default function AdminChannels() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', displayName: '', baseUrl: '', apiKey: '', models: '', priority: '0' })
  const { t } = useTranslation('admin')

  const { data, refetch } = useQuery({
    queryKey: ['admin-channels', search, statusFilter, page, pageSize],
    queryFn: () => fetch('/api/admin/channels').then(r => r.json())
  })

  const channels = data?.channels || []
  const total = channels.length
  const activeChannels = channels.filter((c: any) => c.isActive).length
  const totalModels = channels.reduce((sum: number, c: any) => sum + (c.models?.length || 0), 0)
  const avgPriority = channels.length > 0 ? (channels.reduce((sum: number, c: any) => sum + Number(c.priority || 0), 0) / channels.length).toFixed(1) : '0'

  async function create() {
    await fetch('/api/admin/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, models: form.models.split(',').filter(Boolean) })
    })
    setShowForm(false)
    setForm({ name: '', displayName: '', baseUrl: '', apiKey: '', models: '', priority: '0' })
    refetch()
  }

  async function testChannel(id: string) {
    const res = await fetch(`/api/admin/channels/${id}/test`, { method: 'POST' })
    const data = await res.json()
    alert(data.healthy ? t('channels.testSuccess') : t('channels.testFailed'))
  }

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={<ServerIcon className="w-5 h-5" />}
          label={t('channels.kpi.totalChannels')}
          value={total}
          trend="+2"
          trendUp={true}
        />
        <KPICard
          icon={<CheckCircleIcon className="w-5 h-5" />}
          label={t('channels.kpi.activeChannels')}
          value={activeChannels}
          trend={`${((activeChannels / total) * 100 || 0).toFixed(0)}%`}
          trendUp={true}
        />
        <KPICard
          icon={<CubeIcon className="w-5 h-5" />}
          label={t('channels.kpi.totalModels')}
          value={totalModels}
          trend="+5"
          trendUp={true}
        />
        <KPICard
          icon={<ChartBarIcon className="w-5 h-5" />}
          label={t('channels.kpi.avgPriority')}
          value={avgPriority}
          trend="稳定"
          trendUp={true}
        />
      </div>

      {/* 新增表单 */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('channels.form.title')}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('channels.form.name')}</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
                placeholder={t('channels.form.namePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('channels.form.displayName')}</label>
              <input
                value={form.displayName}
                onChange={e => setForm({ ...form, displayName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
                placeholder={t('channels.form.displayNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('channels.form.baseUrl')}</label>
              <input
                value={form.baseUrl}
                onChange={e => setForm({ ...form, baseUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
                placeholder={t('channels.form.baseUrlPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('channels.form.apiKey')}</label>
              <input
                value={form.apiKey}
                onChange={e => setForm({ ...form, apiKey: e.target.value })}
                type="password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
                placeholder={t('channels.form.apiKeyPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('channels.form.models')}</label>
              <input
                value={form.models}
                onChange={e => setForm({ ...form, models: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
                placeholder={t('channels.form.modelsPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('channels.form.priority')}</label>
              <input
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                type="number"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
                placeholder={t('channels.form.priorityPlaceholder')}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={create}
              className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium transition-colors"
            >
{t('channels.form.create')}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
{t('channels.form.cancel')}
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
              placeholder={t('channels.search')}
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
            <option value="all">{t('channels.filter.allStatus')}</option>
            <option value="active">{t('channels.filter.active')}</option>
            <option value="inactive">{t('channels.filter.inactive')}</option>
          </select>
        </div>

        {/* 新增按钮 */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
{t('channels.addBtn')}
        </button>
      </div>

      {/* 表格容器 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('channels.table.name')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('channels.table.baseUrl')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('channels.table.models')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('channels.table.priority')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('channels.table.status')}</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('channels.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {channels.map((channel: any) => (
                <ChannelRow key={channel.id} channel={channel} onTest={testChannel} />
              ))}
            </tbody>
          </table>
        </div>

        {/* 表格底部 - 分页 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
{t('channels.pagination', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            >
              <option value={10}>{t('channels.pageSize', { size: 10 })}</option>
              <option value={20}>{t('channels.pageSize', { size: 20 })}</option>
              <option value={50}>{t('channels.pageSize', { size: 50 })}</option>
              <option value={100}>{t('channels.pageSize', { size: 100 })}</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
{t('channels.prev')}
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
{t('channels.next')}
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

// 渠道行组件
function ChannelRow({ channel, onTest }: any) {
  const { t } = useTranslation('admin')
  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="font-medium text-gray-900">{channel.displayName || channel.name}</div>
        <div className="text-sm text-gray-500">{channel.name}</div>
      </td>
      <td className="px-6 py-4">
        <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{channel.baseUrl}</code>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {channel.models?.length || 0}
      </td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          {channel.priority}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${channel.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {channel.isActive ? t('channels.statusLabel.active') : t('channels.statusLabel.inactive')}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onTest(channel.id)}
            className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
          >
{t('channels.test')}
          </button>
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
