import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ModelMultiSelect from '../ModelMultiSelect'

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return new Date(dateStr).toLocaleDateString()
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${M}-${D} ${h}:${m}`
}

function HealthDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    HEALTHY: 'bg-green-500',
    UNHEALTHY: 'bg-red-500',
    UNKNOWN: 'bg-gray-400',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-400'} mr-1.5`} />
}

export default function AdminChannels() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [healthFilter, setHealthFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showCreate, setShowCreate] = useState(false)
  const [editChannel, setEditChannel] = useState<any | null>(null)
  const [deleteChannel, setDeleteChannel] = useState<any | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { healthy: boolean; message: string }>>({})
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set())

  // Create form state
  const [newForm, setNewForm] = useState({
    name: '', displayName: '', baseUrl: '', apiKey: '',
    models: [] as string[], priority: '0', weight: '1',
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '', displayName: '', baseUrl: '', apiKey: '',
    models: [] as string[], priority: '0', weight: '1',
  })

  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    statusFilter,
  }).toString()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-channels', page, pageSize, search, statusFilter],
    queryFn: () => fetch(`/api/admin/channels?${queryParams}`).then(r => r.json()),
  })

  const channels = data?.channels || []
  const total = data?.total || 0

  const activeChannels = channels.filter((c: any) => c.isActive).length
  const totalModels = channels.reduce((sum: number, c: any) => sum + (c.models?.length || 0), 0)
  const healthyChannels = channels.filter((c: any) => c.healthStatus === 'HEALTHY').length
  const healthRate = channels.length > 0 ? Math.round((healthyChannels / channels.length) * 100) : 0

  const filteredChannels = channels.filter((c: any) => {
    if (healthFilter !== 'all' && c.healthStatus !== healthFilter) return false
    return true
  })

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetch('/api/admin/channels', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      }).then(async r => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error?.message || '创建失败')
        return res
      }),
    onSuccess: () => {
      setShowCreate(false)
      setNewForm({ name: '', displayName: '', baseUrl: '', apiKey: '', models: [], priority: '0', weight: '1' })
      queryClient.invalidateQueries({ queryKey: ['admin-channels'] })
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/admin/channels/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      }).then(async r => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error?.message || '更新失败')
        return res
      }),
    onSuccess: () => {
      setEditChannel(null)
      queryClient.invalidateQueries({ queryKey: ['admin-channels'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/channels/${id}`, { method: 'DELETE' }).then(async r => {
        const res = await r.json()
        if (!r.ok) throw res
        return res
      }),
    onSuccess: () => {
      setDeleteChannel(null)
      queryClient.invalidateQueries({ queryKey: ['admin-channels'] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/admin/channels/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }),
      }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-channels'] }),
  })

  async function testChannel(id: string) {
    setTestingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/admin/channels/${id}/test`, { method: 'POST' })
      const data = await res.json()
      setTestResult(prev => ({ ...prev, [id]: { healthy: data.healthy ?? false, message: data.message || (data.healthy ? t('channels.testSuccess') : t('channels.testFailed')) } }))
      queryClient.invalidateQueries({ queryKey: ['admin-channels'] })
      setTimeout(() => {
        setTestResult(prev => { const n = { ...prev }; delete n[id]; return n })
      }, 3000)
    } catch {
      setTestResult(prev => ({ ...prev, [id]: { healthy: false, message: t('channels.testFailed') } }))
    } finally {
      setTestingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  function openEdit(channel: any) {
    setEditForm({
      name: channel.name,
      displayName: channel.displayName || '',
      baseUrl: channel.baseUrl,
      apiKey: '',
      models: channel.models || [],
      priority: String(channel.priority ?? 0),
      weight: String(channel.weight ?? 1),
    })
    setEditChannel(channel)
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard icon={<ServerSvg />} label={t('channels.kpi.totalChannels')} value={total} trend={`${channels.length}`} />
        <KPICard icon={<CheckCircleSvg />} label={t('channels.kpi.activeChannels')} value={activeChannels} trend={`${channels.length > 0 ? Math.round(activeChannels / channels.length * 100) : 0}%`} />
        <KPICard icon={<HeartSvg />} label={t('channels.kpi.healthRate') || '健康率'} value={`${healthRate}%`} trend={`${healthyChannels}/${channels.length}`} />
        <KPICard icon={<CubeSvg />} label={t('channels.kpi.totalModels')} value={totalModels} trend={`${channels.length > 0 ? Math.round(totalModels / channels.length) : 0}/渠道`} />
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm p-6 animate-pulse">
              <div className="h-5 bg-gray-100 dark:bg-[#242426] rounded w-48 mb-3" />
              <div className="h-4 bg-gray-100 dark:bg-[#242426] rounded w-64 mb-2" />
              <div className="h-4 bg-gray-100 dark:bg-[#242426] rounded w-32" />
            </div>
          ))}
        </div>
      ) : filteredChannels.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm py-20 px-6 text-center">
          <ServerSvg className="w-16 h-16 mx-auto mb-5 text-gray-200 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] mb-1">{t('channels.empty') || '暂无渠道'}</h3>
          <p className="text-sm text-[#6B7280] dark:text-[#98989D] mb-6">创建第一个渠道开始转发模型请求</p>
          <button onClick={() => setShowCreate(true)}
            className="h-11 px-5 bg-[#e8673a] hover:bg-[#d4562a] text-white rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5 shadow-sm">
            {t('channels.addBtn')}
          </button>
        </div>
      ) : (
        /* Filter Bar + Channel Cards */
        <>
          {/* Filter Bar */}
          <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm p-4 mb-4 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlassSvg />
              <input type="text" placeholder={t('channels.search')}
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-3 h-10 text-sm border border-[#ECEFF3] dark:border-[#303033] rounded-xl focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" />
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="h-10 px-3 text-sm border border-[#ECEFF3] dark:border-[#303033] rounded-xl focus:outline-none focus:border-[#111827] bg-white dark:bg-[#242426] dark:text-[#E5E5E7]">
              <option value="all">{t('channels.filter.allStatus')}</option>
              <option value="active">{t('channels.filter.active')}</option>
              <option value="inactive">{t('channels.filter.inactive')}</option>
            </select>
            <select value={healthFilter} onChange={e => { setHealthFilter(e.target.value); setPage(1) }}
              className="h-10 px-3 text-sm border border-[#ECEFF3] dark:border-[#303033] rounded-xl focus:outline-none focus:border-[#111827] bg-white dark:bg-[#242426] dark:text-[#E5E5E7]">
              <option value="all">{t('channels.healthLabel') || '健康状态'} - {t('channels.filter.allStatus')}</option>
              <option value="HEALTHY">{t('channels.healthStatus.healthy') || '健康'}</option>
              <option value="UNHEALTHY">{t('channels.healthStatus.unhealthy') || '异常'}</option>
              <option value="UNKNOWN">{t('channels.healthStatus.unknown') || '未知'}</option>
            </select>
            <div className="flex-1" />
            <button
              onClick={() => setShowCreate(true)}
              className="h-10 px-4 bg-[#e8673a] hover:bg-[#d4562a] text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all hover:-translate-y-0.5 shadow-sm flex-shrink-0"
            >
              <PlusSvg />
              {t('channels.addBtn')}
            </button>
          </div>

          {/* Channel Cards */}
          <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm divide-y divide-[#ECEFF3] dark:divide-[#303033]">
            <div className="px-6 py-4">
              <h2 className="text-base font-semibold text-[#111827] dark:text-[#E5E5E7]">渠道列表</h2>
            </div>
            {filteredChannels.map((channel: any) => {
              const testRes = testResult[channel.id]
              const isTesting = testingIds.has(channel.id)

              return (
                <div key={channel.id} className="px-6 py-5">
                  {/* Row 1: Name + Status Badges + Actions */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#FFF4F0] text-[#F97346] text-sm font-bold flex-shrink-0">{channel.displayOrder ?? '-'}</span>
                      <span className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] truncate">{channel.displayName || channel.name}</span>
                      <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium ${
                        channel.isActive ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEE2E2] text-[#DC2626]'
                      }`}>
                        {channel.isActive ? t('channels.statusLabel.active') : t('channels.statusLabel.inactive')}
                      </span>
                      <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium ${
                        channel.healthStatus === 'HEALTHY' ? 'bg-[#DCFCE7] text-[#16A34A]' :
                        channel.healthStatus === 'UNHEALTHY' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                        'bg-gray-100 dark:bg-[#242426] text-gray-500 dark:text-[#98989D]'
                      }`}>
                        <HealthDot status={channel.healthStatus} />
                        {channel.healthStatus === 'HEALTHY' ? (t('channels.healthStatus.healthy') || '健康') :
                         channel.healthStatus === 'UNHEALTHY' ? (t('channels.healthStatus.unhealthy') || '异常') :
                         (t('channels.healthStatus.unknown') || '未知')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Test Button */}
                      <button onClick={() => testChannel(channel.id)} disabled={isTesting}
                        className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          testRes ? (testRes.healthy ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEE2E2] text-[#DC2626]') : 'bg-gray-100 dark:bg-[#242426] hover:bg-gray-200 dark:hover:bg-[#2C2C2E] text-gray-700 dark:text-[#E5E5E7]'
                        }`}>
                        {isTesting ? (
                          <><SpinnerSvg />{t('channels.testing') || '测试中...'}</>
                        ) : testRes ? (
                          testRes.healthy ? <><CheckSvg />{t('channels.testSuccess')}</> : <><XMarkSvg />{t('channels.testFailed')}</>
                        ) : t('channels.test')}
                      </button>
                      {/* Toggle Active */}
                      <button onClick={() => toggleMutation.mutate({ id: channel.id, isActive: !channel.isActive })}
                        className="h-8 px-3 rounded-lg text-xs font-medium bg-gray-100 dark:bg-[#242426] hover:bg-gray-200 dark:hover:bg-[#2C2C2E] text-gray-700 dark:text-[#E5E5E7] transition-colors">
                        {channel.isActive ? (t('channels.disableButton') || '禁用') : (t('channels.enableButton') || '启用')}
                      </button>
                      {/* Edit */}
                      <button onClick={() => openEdit(channel)}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242426] flex items-center justify-center text-gray-500 dark:text-[#98989D] transition-colors">
                        <PencilSvg />
                      </button>
                      {/* Delete */}
                      <button onClick={() => setDeleteChannel(channel)}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-400 dark:text-[#6E6E73] hover:text-red-500 transition-colors">
                        <TrashSvg />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Base URL */}
                  <div className="mb-3">
                    <code className="text-xs text-gray-500 dark:text-[#98989D] bg-[#F8FAFC] dark:bg-[#242426] px-2 py-1 rounded">{channel.baseUrl}</code>
                  </div>

                  {/* Row 3: Meta info */}
                  <div className="flex items-center gap-6 text-sm text-[#6B7280] dark:text-[#98989D]">
                    <span>优先级 {channel.priority ?? 0}</span>
                    <span>{t('channels.weight') || '权重'}: {channel.weight ?? 1}</span>
                    <span>模型: {channel.models?.length || 0}</span>
                    {channel.routeRefs && channel.routeRefs.length > 0 && (
                      <span className="flex items-center gap-1 group relative cursor-help">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-blue-600">被 {channel.routeRefs.length} 个路由引用</span>
                        {/* Hover tooltip showing route paths */}
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                          <div className="bg-[#111827] dark:bg-[#0F0F10] text-white dark:text-[#E5E5E7] text-xs rounded-xl px-3 py-2 shadow-lg whitespace-nowrap">
                            {channel.routeRefs.map((r: any) => (
                              <div key={r.id} className="py-0.5">{r.displayName} <span className="text-gray-400 dark:text-[#6E6E73]">({r.path})</span></div>
                            ))}
                          </div>
                        </div>
                      </span>
                    )}
                    {channel.lastHealthCheckAt && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        {t('channels.lastCheckAt') || '上次检查'}: {timeAgo(channel.lastHealthCheckAt)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-[#6B7280] dark:text-[#98989D]">
            <span>显示 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}，共 {total} 条</span>
            <div className="flex items-center gap-2">
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="h-8 px-2 text-sm border border-[#ECEFF3] dark:border-[#303033] rounded-lg focus:outline-none bg-white dark:bg-[#242426] dark:text-[#E5E5E7]">
                <option value={10}>10 / 页</option>
                <option value={20}>20 / 页</option>
                <option value={50}>50 / 页</option>
              </select>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="h-8 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-lg hover:bg-gray-50 dark:hover:bg-[#242426] disabled:opacity-50">上一页</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total}
                className="h-8 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-lg hover:bg-gray-50 dark:hover:bg-[#242426] disabled:opacity-50">下一页</button>
            </div>
          </div>
        </>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-[#1F1F21] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl border border-[#ECEFF3] dark:border-[#303033]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] mb-4">{t('channels.form.title') || '新增渠道'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.name') || '名称'}</label>
                <input value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" placeholder={t('channels.form.namePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.displayName') || '显示名称'}</label>
                <input value={newForm.displayName} onChange={e => setNewForm({ ...newForm, displayName: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" placeholder={t('channels.form.displayNamePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.baseUrl') || 'Base URL'}</label>
                <input value={newForm.baseUrl} onChange={e => setNewForm({ ...newForm, baseUrl: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" placeholder={t('channels.form.baseUrlPlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.apiKey') || 'API Key'}</label>
                <input value={newForm.apiKey} onChange={e => setNewForm({ ...newForm, apiKey: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" placeholder={t('channels.form.apiKeyPlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.models') || '模型列表'}</label>
                <ModelMultiSelect value={newForm.models} onChange={models => setNewForm({ ...newForm, models })} placeholder={t('channels.form.modelsPlaceholder') || 'gpt-4,gpt-3.5-turbo'} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.priority') || '优先级'}</label>
                  <input value={newForm.priority} onChange={e => setNewForm({ ...newForm, priority: e.target.value })} type="number"
                    className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" placeholder={t('channels.form.priorityPlaceholder')} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.weight') || '权重'}</label>
                  <input value={newForm.weight} onChange={e => setNewForm({ ...newForm, weight: e.target.value })} type="number"
                    className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" placeholder={t('channels.form.weightPlaceholder')} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => createMutation.mutate({ name: newForm.name, displayName: newForm.displayName, baseUrl: newForm.baseUrl, apiKey: newForm.apiKey, models: newForm.models, priority: parseInt(newForm.priority) || 0, weight: parseInt(newForm.weight) || 1 })}
                disabled={createMutation.isPending}
                className="flex-1 h-10 bg-[#e8673a] hover:bg-[#d4562a] text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {createMutation.isPending ? (t('channels.form.saving') || '保存中...') : (t('channels.form.create') || '创建')}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="flex-1 h-10 border border-[#ECEFF3] dark:border-[#303033] hover:bg-gray-50 dark:hover:bg-[#242426] rounded-xl text-sm text-[#6B7280] dark:text-[#98989D] font-medium transition-colors">
                {t('channels.form.cancel') || '取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editChannel && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setEditChannel(null)}>
          <div className="bg-white dark:bg-[#1F1F21] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl border border-[#ECEFF3] dark:border-[#303033]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] mb-4">{t('channels.form.editTitle') || '编辑渠道'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.name') || '名称'}</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.displayName') || '显示名称'}</label>
                <input value={editForm.displayName} onChange={e => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.baseUrl') || 'Base URL'}</label>
                <input value={editForm.baseUrl} onChange={e => setEditForm({ ...editForm, baseUrl: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.apiKey') || 'API Key'}</label>
                <input value={editForm.apiKey} onChange={e => setEditForm({ ...editForm, apiKey: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" placeholder={t('channels.form.apiKeyHint')} />
                <p className="text-xs text-gray-400 dark:text-[#6E6E73] mt-1">{t('channels.form.apiKeyHint') || '留空则不修改'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.models') || '模型列表'}</label>
                <ModelMultiSelect value={editForm.models} onChange={models => setEditForm({ ...editForm, models })} placeholder={t('channels.form.modelsPlaceholder') || 'gpt-4,gpt-3.5-turbo'} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.form.priority') || '优先级'}</label>
                  <input value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })} type="number"
                    className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none dark:bg-[#242426] dark:text-[#E5E5E7]" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('channels.weight') || '权重'}</label>
                  <input value={editForm.weight} onChange={e => setEditForm({ ...editForm, weight: e.target.value })} type="number"
                    className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none dark:bg-[#242426] dark:text-[#E5E5E7]" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => editMutation.mutate({ id: editChannel.id, data: { name: editForm.name, displayName: editForm.displayName, baseUrl: editForm.baseUrl, apiKey: editForm.apiKey || undefined, models: editForm.models, priority: parseInt(editForm.priority) || 0, weight: parseInt(editForm.weight) || 1 } })}
                disabled={editMutation.isPending}
                className="flex-1 h-10 bg-[#e8673a] hover:bg-[#d4562a] text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {editMutation.isPending ? (t('channels.form.saving') || '保存中...') : (t('channels.form.save') || '保存')}
              </button>
              <button onClick={() => setEditChannel(null)}
                className="flex-1 h-10 border border-[#ECEFF3] dark:border-[#303033] hover:bg-gray-50 dark:hover:bg-[#242426] rounded-xl text-sm text-[#6B7280] dark:text-[#98989D] font-medium transition-colors">
                {t('channels.form.cancel') || '取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteChannel && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setDeleteChannel(null)}>
          <div className="bg-white dark:bg-[#1F1F21] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl border border-[#ECEFF3] dark:border-[#303033]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] mb-2">{t('channels.deleteConfirm') || '确定删除此渠道？'}</h3>
            {deleteChannel.routeRefs?.length > 0 && (
              <p className="text-sm text-amber-600 mb-2">{t('channels.deleteConfirmWithRefs', { count: deleteChannel.routeRefs.length }) || `该渠道被 ${deleteChannel.routeRefs.length} 个路由引用`}</p>
            )}
            <p className="text-sm text-[#6B7280] dark:text-[#98989D] mb-4">{t('channels.deleteConfirmMessage') || '将永久删除该渠道，此操作不可撤销。'}</p>
            <div className="flex gap-2">
              <button onClick={() => deleteMutation.mutate(deleteChannel.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 h-10 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {deleteMutation.isPending ? '删除中...' : (t('channels.deleteButton') || '删除')}
              </button>
              <button onClick={() => setDeleteChannel(null)}
                className="flex-1 h-10 border border-[#ECEFF3] dark:border-[#303033] hover:bg-gray-50 dark:hover:bg-[#242426] rounded-xl text-sm text-[#6B7280] dark:text-[#98989D] font-medium transition-colors">
                {t('channels.form.cancel') || '取消'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* Sub-components */
function KPICard({ icon, label, value, trend }: any) {
  return (
    <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#242426] flex items-center justify-center text-gray-600 dark:text-[#E5E5E7]">{icon}</div>
        <span className="text-xs font-medium text-gray-400 dark:text-[#6E6E73]">{trend}</span>
      </div>
      <div className="text-2xl font-bold text-[#111827] dark:text-[#E5E5E7] mb-1">{value}</div>
      <div className="text-sm text-[#6B7280] dark:text-[#98989D]">{label}</div>
    </div>
  )
}

/* Inline SVG Icons */
function PlusSvg() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>)
}

function PencilSvg() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>)
}

function TrashSvg() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>)
}

function CheckSvg() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>)
}

function XMarkSvg() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>)
}

function SpinnerSvg() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>)
}

function ServerSvg({ className }: { className?: string }) {
  return (<svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>)
}

function CheckCircleSvg() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>)
}

function HeartSvg() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>)
}

function CubeSvg() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 16 8 12 3 16" /><line x1="3" y1="16" x2="3" y2="22" /><line x1="21" y1="16" x2="21" y2="22" /><polyline points="12 7 3 12 12 17 21 12 12 7" /></svg>)
}

function MagnifyingGlassSvg() {
  return (<svg width="16" height="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6E6E73]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>)
}
