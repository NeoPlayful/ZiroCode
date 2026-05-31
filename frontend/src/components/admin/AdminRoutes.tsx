import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const API_HOST = window.location.origin

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
  return new Date(dateStr).toLocaleDateString()
}

export default function AdminRoutes() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editRoute, setEditRoute] = useState<any | null>(null)
  const [deleteRoute, setDeleteRoute] = useState<any | null>(null)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  // Create form
  const [newForm, setNewForm] = useState({
    path: '', displayName: '', mode: 'single',
    primaryChannelId: '', backupChannelId: '',
    channelIds: [] as string[], strategy: 'round_robin',
    status: 'active', activeChannel: 'primary', billingMultiplier: '1.0',
  })

  // Edit form
  const [editForm, setEditForm] = useState({
    path: '', displayName: '', mode: 'single',
    primaryChannelId: '', backupChannelId: '',
    channelIds: [] as string[], strategy: 'round_robin',
    isActive: true, status: 'active', activeChannel: 'primary', billingMultiplier: '1.0',
  })

  const { data: routesData, isLoading } = useQuery({
    queryKey: ['admin-routes'],
    queryFn: () => fetch('/api/admin/routes').then(r => r.json()),
  })

  const { data: channelsData } = useQuery({
    queryKey: ['admin-channels'],
    queryFn: () => fetch('/api/admin/channels?pageSize=200').then(r => r.json()),
  })

  const routes = routesData?.routes || []
  const channels = channelsData?.channels || []

  const totalRoutes = routes.length
  const activeRoutes = routes.filter((r: any) => r.isActive).length
  const singleModeRoutes = routes.filter((r: any) => r.mode === 'single').length
  const withBackupRoutes = routes.filter((r: any) => r.mode === 'single' && r.backupChannelId).length

  const channelMap = Object.fromEntries(channels.map((c: any) => [c.id, c]))

  function getChannelName(id: string | null | undefined): string {
    if (!id) return '-'
    const ch = channelMap[id]
    return ch ? (ch.displayName || ch.name) : id
  }

  function getChannelHealth(id: string | null | undefined): string {
    if (!id) return 'unknown'
    return channelMap[id]?.healthStatus || 'unknown'
  }

  async function copyFullUrl(path: string) {
    const url = `${API_HOST}${path}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedPath(path)
      setTimeout(() => setCopiedPath(null), 2000)
    } catch {}
  }

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetch('/api/admin/routes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      }).then(async r => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error?.message || '创建失败')
        return res
      }),
    onSuccess: () => {
      setShowCreate(false)
      setNewForm({ path: '', displayName: '', mode: 'single', primaryChannelId: '', backupChannelId: '', channelIds: [], strategy: 'round_robin', status: 'active', activeChannel: 'primary', billingMultiplier: '1.0' })
      queryClient.invalidateQueries({ queryKey: ['admin-routes'] })
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/admin/routes/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      }).then(async r => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error?.message || '更新失败')
        return res
      }),
    onSuccess: () => {
      setEditRoute(null)
      queryClient.invalidateQueries({ queryKey: ['admin-routes'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/routes/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      setDeleteRoute(null)
      queryClient.invalidateQueries({ queryKey: ['admin-routes'] })
    },
  })

  function openEdit(route: any) {
    setEditForm({
      path: route.path,
      displayName: route.displayName,
      mode: route.mode,
      primaryChannelId: route.primaryChannelId || '',
      backupChannelId: route.backupChannelId || '',
      channelIds: route.channelIds || [],
      strategy: route.strategy || 'round_robin',
      isActive: route.isActive,
      status: route.status || 'active',
      activeChannel: route.activeChannel || 'primary',
      billingMultiplier: String(route.billingMultiplier ?? '1.0'),
    })
    setEditRoute(route)
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard icon={<ListSvg />} label={t('routes.kpi.totalRoutes') || '总路由数'} value={totalRoutes} trend={`${routes.length}`} />
        <KPICard icon={<CheckCircleSvg />} label={t('routes.kpi.activeRoutes') || '启用路由'} value={activeRoutes} trend={`${totalRoutes > 0 ? Math.round(activeRoutes / totalRoutes * 100) : 0}%`} />
        <KPICard icon={<SingleSvg />} label={t('routes.kpi.singleMode') || '单一模式'} value={singleModeRoutes} trend={`${totalRoutes > 0 ? Math.round(singleModeRoutes / totalRoutes * 100) : 0}%`} />
        <KPICard icon={<BackupSvg />} label={t('routes.kpi.withBackup') || '有备用渠道'} value={withBackupRoutes} trend={`${singleModeRoutes > 0 ? Math.round(withBackupRoutes / singleModeRoutes * 100) : 0}%`} />
      </div>

      {/* Route List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm p-6 animate-pulse">
              <div className="h-5 bg-gray-100 dark:bg-[#242426] rounded w-48 mb-3" />
              <div className="h-4 bg-gray-100 dark:bg-[#242426] rounded w-64" />
            </div>
          ))}
        </div>
      ) : routes.length === 0 ? (
        <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm py-20 px-6 text-center">
          <RouteSvg className="w-16 h-16 mx-auto mb-5 text-gray-200 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] mb-1">{t('routes.empty') || '暂无路由'}</h3>
          <p className="text-sm text-[#6B7280] dark:text-[#98989D] mb-6">创建第一个路由开始配置转发规则</p>
          <button onClick={() => setShowCreate(true)}
            className="h-11 px-5 bg-[#e8673a] hover:bg-[#d4562a] text-white rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5 shadow-sm">
            {t('routes.addBtn') || '新增路由'}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm divide-y divide-[#ECEFF3] dark:divide-[#303033]">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#E5E5E7]">{t('routes.listTitle') || '转发规则'} ({routes.length})</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="h-9 px-4 bg-[#e8673a] hover:bg-[#d4562a] text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all hover:-translate-y-0.5 shadow-sm"
            >
              <PlusSvg />
              {t('routes.addBtn') || '新增路由'}
            </button>
          </div>
          {routes.map((route: any) => (
            <div key={route.id} className="px-6 py-5">
              {/* Row 1: Name + Badges + Actions */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7]">{route.displayName}</span>
                  <code className="text-xs text-[#6B7280] dark:text-[#98989D] bg-[#F3F4F6] dark:bg-[#242426] px-2 py-1 rounded-md font-mono">{route.path}</code>
                  <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium ${
                    route.mode === 'single' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                  }`}>
                    {route.mode === 'single' ? (t('routes.mode.single') || '单一') : (t('routes.mode.loadBalance') || '负载均衡')}
                  </span>
                  <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium ${
                    route.isActive ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEE2E2] text-[#DC2626]'
                  }`}>
                    {route.isActive ? (t('routes.status.active') || '启用') : (t('routes.status.inactive') || '禁用')}
                  </span>
                  {route.billingMultiplier != null && Number(route.billingMultiplier) !== 1.0 && (
                    <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[#FFF4F0] text-[#F97346]">
                      ×{Number(route.billingMultiplier).toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(route)}
                    className="h-8 px-3 rounded-lg text-xs font-medium bg-gray-100 dark:bg-[#242426] hover:bg-gray-200 dark:hover:bg-[#2C2C2E] text-gray-700 dark:text-[#E5E5E7] transition-colors">
                    {t('routes.editButton') || '编辑'}
                  </button>
                  <button onClick={() => setDeleteRoute(route)}
                    className="h-8 px-3 rounded-lg text-xs font-medium bg-[#FEE2E2] hover:bg-[#fecaca] text-[#DC2626] transition-colors">
                    {t('routes.deleteButton') || '删除'}
                  </button>
                </div>
              </div>

              {/* Row 2: API Endpoint */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium text-[#6B7280] dark:text-[#98989D] uppercase tracking-wider">Endpoint</span>
                <code className="text-xs bg-[#F3F4F6] dark:bg-[#242426] text-[#6B7280] dark:text-[#98989D] px-2.5 py-1 rounded-md font-mono max-w-[480px] truncate" title={`${API_HOST}${route.path}`}>
                  {API_HOST}{route.path}
                </code>
                <button
                  onClick={(e) => { e.stopPropagation(); copyFullUrl(route.path) }}
                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs text-[#6B7280] dark:text-[#98989D] hover:text-[#111827] dark:hover:text-[#F5F5F7] hover:bg-[#F3F4F6] dark:hover:bg-[#242426] rounded-lg transition-colors"
                >
                  {copiedPath === route.path ? (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>已复制</>
                  ) : (
                    <><CopySvg />复制</>
                  )}
                </button>
              </div>

              {/* Row 2: Channel info */}
              <div className="text-sm text-[#6B7280] dark:text-[#98989D] space-y-1">
                {route.mode === 'single' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <HealthDot status={getChannelHealth(route.primaryChannelId)} />
                      <span>{t('routes.primaryChannel') || '主要'}: <span className="font-medium text-[#111827] dark:text-[#E5E5E7]">{getChannelName(route.primaryChannelId)}</span></span>
                      {route.activeChannel === 'backup' && (
                        <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">已切备用</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <HealthDot status={getChannelHealth(route.backupChannelId)} />
                      <span>{t('routes.backupChannel') || '备用'}: <span className="font-medium text-[#111827] dark:text-[#E5E5E7]">{getChannelName(route.backupChannelId)}</span></span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{t('routes.strategy') || '策略'}: <span className="font-medium text-[#111827] dark:text-[#E5E5E7]">
                      {route.strategy === 'round_robin' ? (t('routes.strategies.roundRobin') || '轮询') : (t('routes.strategies.weighted') || '加权轮询')}
                    </span></span>
                    <span className="text-[#9CA3AF] dark:text-gray-600">|</span>
                    <span>{t('routes.channels') || '渠道池'}: <span className="font-medium text-[#111827] dark:text-[#E5E5E7]">{(route.channelIds || []).length} 个渠道</span></span>
                  </div>
                )}
              </div>

              {/* Row 3: Channel tags for load balance */}
              {route.mode === 'load_balance' && (route.channelIds || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(route.channelIds || []).map((chId: string) => (
                    <span key={chId} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F3F4F6] dark:bg-[#242426] border border-[#E5E7EB] dark:border-[#303033] rounded-md text-xs text-[#6B7280] dark:text-[#98989D]">
                      <HealthDot status={getChannelHealth(chId)} />
                      {getChannelName(chId)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-[#1F1F21] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl border border-[#ECEFF3] dark:border-[#303033]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] mb-4">{t('routes.form.title') || '新增路由'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.form.path') || '路径'}</label>
                <input value={newForm.path} onChange={e => setNewForm({ ...newForm, path: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" placeholder="/codex" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.form.displayName') || '名称'}</label>
                <input value={newForm.displayName} onChange={e => setNewForm({ ...newForm, displayName: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" placeholder="Codex API" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.form.mode') || '模式'}</label>
                <select value={newForm.mode} onChange={e => setNewForm({ ...newForm, mode: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none bg-white dark:bg-[#242426] dark:text-[#E5E5E7]">
                  <option value="single">{t('routes.mode.single') || '单一渠道'}</option>
                  <option value="load_balance">{t('routes.mode.loadBalance') || '负载均衡'}</option>
                </select>
              </div>
              {newForm.mode === 'single' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.primaryChannel') || '主要渠道'}</label>
                    <select value={newForm.primaryChannelId} onChange={e => setNewForm({ ...newForm, primaryChannelId: e.target.value })}
                      className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none bg-white dark:bg-[#242426] dark:text-[#E5E5E7]">
                      <option value="">--</option>
                      {channels.map((c: any) => <option key={c.id} value={c.id}>{c.displayName || c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.backupChannel') || '备用渠道'}</label>
                    <select value={newForm.backupChannelId} onChange={e => setNewForm({ ...newForm, backupChannelId: e.target.value })}
                      className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none bg-white dark:bg-[#242426] dark:text-[#E5E5E7]">
                      <option value="">--</option>
                      {channels.map((c: any) => <option key={c.id} value={c.id}>{c.displayName || c.name}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.channels') || '渠道池'}</label>
                    <div className="border border-[#ECEFF3] dark:border-[#303033] rounded-xl p-2 max-h-32 overflow-y-auto">
                      {channels.map((c: any) => (
                        <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-[#242426] rounded-lg cursor-pointer">
                          <input type="checkbox" checked={newForm.channelIds.includes(c.id)}
                            onChange={() => setNewForm({ ...newForm, channelIds: newForm.channelIds.includes(c.id) ? newForm.channelIds.filter(id => id !== c.id) : [...newForm.channelIds, c.id] })}
                            className="rounded border-gray-300 dark:border-[#303033]" />
                          {c.displayName || c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.strategy') || '策略'}</label>
                    <select value={newForm.strategy} onChange={e => setNewForm({ ...newForm, strategy: e.target.value })}
                      className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none bg-white dark:bg-[#242426] dark:text-[#E5E5E7]">
                      <option value="round_robin">{t('routes.strategies.roundRobin') || '轮询'}</option>
                      <option value="weighted">{t('routes.strategies.weighted') || '加权轮询'}</option>
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.form.billingMultiplier') || '计费倍率'}</label>
                <input value={newForm.billingMultiplier} onChange={e => setNewForm({ ...newForm, billingMultiplier: e.target.value })}
                  type="number" step="0.1" min="0.1"
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => createMutation.mutate({ ...newForm, billingMultiplier: parseFloat(newForm.billingMultiplier) || 1.0 })}
                disabled={createMutation.isPending}
                className="flex-1 h-10 bg-[#e8673a] hover:bg-[#d4562a] text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {createMutation.isPending ? (t('routes.form.saving') || '保存中...') : (t('routes.form.create') || '创建')}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="flex-1 h-10 border border-[#ECEFF3] dark:border-[#303033] hover:bg-gray-50 dark:hover:bg-[#242426] rounded-xl text-sm text-[#6B7280] dark:text-[#98989D] font-medium transition-colors">
                {t('routes.form.cancel') || '取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editRoute && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setEditRoute(null)}>
          <div className="bg-white dark:bg-[#1F1F21] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl border border-[#ECEFF3] dark:border-[#303033]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] mb-4">{t('routes.form.editTitle') || '编辑路由'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.form.path') || '路径'}</label>
                <input value={editForm.path} onChange={e => setEditForm({ ...editForm, path: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.form.displayName') || '名称'}</label>
                <input value={editForm.displayName} onChange={e => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.isActive}
                    onChange={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                    className="rounded border-gray-300 dark:border-[#303033]" />
                  <span className="text-sm text-[#6B7280] dark:text-[#98989D]">{t('routes.status.active') || '启用'}</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.form.mode') || '模式'}</label>
                <select value={editForm.mode} onChange={e => setEditForm({ ...editForm, mode: e.target.value })}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none bg-white dark:bg-[#242426] dark:text-[#E5E5E7]">
                  <option value="single">{t('routes.mode.single') || '单一渠道'}</option>
                  <option value="load_balance">{t('routes.mode.loadBalance') || '负载均衡'}</option>
                </select>
              </div>
              {editForm.mode === 'single' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.primaryChannel') || '主要渠道'}</label>
                    <select value={editForm.primaryChannelId} onChange={e => setEditForm({ ...editForm, primaryChannelId: e.target.value })}
                      className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none bg-white dark:bg-[#242426] dark:text-[#E5E5E7]">
                      <option value="">--</option>
                      {channels.map((c: any) => <option key={c.id} value={c.id}>{c.displayName || c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.backupChannel') || '备用渠道'}</label>
                    <select value={editForm.backupChannelId} onChange={e => setEditForm({ ...editForm, backupChannelId: e.target.value })}
                      className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none bg-white dark:bg-[#242426] dark:text-[#E5E5E7]">
                      <option value="">--</option>
                      {channels.map((c: any) => <option key={c.id} value={c.id}>{c.displayName || c.name}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.channels') || '渠道池'}</label>
                    <div className="border border-[#ECEFF3] dark:border-[#303033] rounded-xl p-2 max-h-32 overflow-y-auto">
                      {channels.map((c: any) => (
                        <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-[#242426] rounded-lg cursor-pointer">
                          <input type="checkbox" checked={editForm.channelIds.includes(c.id)}
                            onChange={() => setEditForm({ ...editForm, channelIds: editForm.channelIds.includes(c.id) ? editForm.channelIds.filter(id => id !== c.id) : [...editForm.channelIds, c.id] })}
                            className="rounded border-gray-300 dark:border-[#303033]" />
                          {c.displayName || c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.strategy') || '策略'}</label>
                    <select value={editForm.strategy} onChange={e => setEditForm({ ...editForm, strategy: e.target.value })}
                      className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none bg-white dark:bg-[#242426] dark:text-[#E5E5E7]">
                      <option value="round_robin">{t('routes.strategies.roundRobin') || '轮询'}</option>
                      <option value="weighted">{t('routes.strategies.weighted') || '加权轮询'}</option>
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('routes.form.billingMultiplier') || '计费倍率'}</label>
                <input value={editForm.billingMultiplier} onChange={e => setEditForm({ ...editForm, billingMultiplier: e.target.value })}
                  type="number" step="0.1" min="0.1"
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:bg-[#242426] dark:text-[#E5E5E7]" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => editMutation.mutate({ id: editRoute.id, data: { ...editForm, billingMultiplier: parseFloat(editForm.billingMultiplier) || 1.0 } })}
                disabled={editMutation.isPending}
                className="flex-1 h-10 bg-[#e8673a] hover:bg-[#d4562a] text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {editMutation.isPending ? (t('routes.form.saving') || '保存中...') : (t('routes.form.save') || '保存')}
              </button>
              <button onClick={() => setEditRoute(null)}
                className="flex-1 h-10 border border-[#ECEFF3] dark:border-[#303033] hover:bg-gray-50 dark:hover:bg-[#242426] rounded-xl text-sm text-[#6B7280] dark:text-[#98989D] font-medium transition-colors">
                {t('routes.form.cancel') || '取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteRoute && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => setDeleteRoute(null)}>
          <div className="bg-white dark:bg-[#1F1F21] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl border border-[#ECEFF3] dark:border-[#303033]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] mb-2">{t('routes.deleteConfirm') || '确定删除此路由？'}</h3>
            <p className="text-sm text-[#6B7280] dark:text-[#98989D] mb-4">{t('routes.deleteConfirmMessage') || '将永久删除该路由，此操作不可撤销。'}</p>
            <div className="flex gap-2">
              <button onClick={() => deleteMutation.mutate(deleteRoute.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 h-10 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {deleteMutation.isPending ? '删除中...' : (t('routes.deleteButton') || '删除')}
              </button>
              <button onClick={() => setDeleteRoute(null)}
                className="flex-1 h-10 border border-[#ECEFF3] dark:border-[#303033] hover:bg-gray-50 dark:hover:bg-[#242426] rounded-xl text-sm text-[#6B7280] dark:text-[#98989D] font-medium transition-colors">
                {t('routes.form.cancel') || '取消'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlusSvg() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>)
}

function RouteSvg({ className }: { className?: string }) {
  return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v7m0 6v7m-7-7h7m6 0h2"/></svg>)
}

function HealthDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    HEALTHY: 'bg-green-500',
    UNHEALTHY: 'bg-red-500',
    UNKNOWN: 'bg-gray-400',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-400'}`} />
}

function CopySvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

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

function CheckCircleSvg() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>)
}

function ListSvg() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>)
}

function SingleSvg() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>)
}

function BackupSvg() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>)
}
