import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminDashboard from '../components/admin/AdminDashboard'
import AdminUsers from '../components/admin/AdminUsers'
import AdminSubscriptions from '../components/admin/AdminSubscriptions'
import AdminRedeemCodes from '../components/admin/AdminRedeemCodes'
import AdminTickets from '../components/admin/AdminTickets'
import AdminAnnouncements from '../components/admin/AdminAnnouncements'
import AdminChannels from '../components/admin/AdminChannels'
import AdminRoutes from '../components/admin/AdminRoutes'
import AdminWithdrawals from '../components/admin/AdminWithdrawals'
import AdminAuditLogs from '../components/admin/AdminAuditLogs'
import AdminBatch from '../components/admin/AdminBatch'
import AdminAnalytics from '../components/admin/AdminAnalytics'
import AdminBillingReport from '../components/admin/AdminBillingReport'

export default function AdminPage() {
  const { t } = useTranslation('admin')
  const [tab, setTab] = useState('dashboard')
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => fetch('/api/auth/me').then(r => r.json()) })

  if (!me?.user) return null
  if (me.user.role !== 'ADMIN') {
    return <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#0F0F10] flex items-center justify-center text-gray-400"><p>{t('admin.permissionRequired')}</p></div>
  }

  return (
    <div className="flex overflow-hidden bg-[#f9f9f9] dark:bg-[#0F0F10] flex-1 min-h-0">
      <AdminSidebar activeTab={tab} onTabChange={setTab} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-8">
          {tab === 'dashboard' && <AdminDashboard />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'subscriptions' && <AdminSubscriptions />}
          {tab === 'redeem-codes' && <AdminRedeemCodes />}
          {tab === 'channels' && <AdminChannels />}
          {tab === 'routes' && <AdminRoutes />}
          {tab === 'withdrawals' && <AdminWithdrawals />}
          {tab === 'tickets' && <AdminTickets />}
          {tab === 'announcements' && <AdminAnnouncements />}
          {tab === 'audit-logs' && <AdminAuditLogs />}
          {tab === 'batch' && <AdminBatch />}
          {tab === 'config' && <AdminConfig />}
          {tab === 'analytics' && <AdminAnalytics />}
          {tab === 'billing' && <AdminBillingReport />}
        </main>
      </div>
    )
  }

function AdminConfig() {
  const { t } = useTranslation('admin')
  const [siteName, setSiteName] = useState('ZiroCode')
  const [defaultQuota, setDefaultQuota] = useState('100000000')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [modelPrices, setModelPrices] = useState<Record<string, { input: string; output: string; cacheWrite: string; cacheRead: string }>>({})

  const BUILTIN_MODEL_PRICES: Record<string, { input: string; output: string; cacheWrite: string; cacheRead: string }> = {
    'gpt-4o': { input: '1', output: '1', cacheWrite: '1', cacheRead: '1' },
    'gpt-4o-mini': { input: '1', output: '1', cacheWrite: '1', cacheRead: '1' },
    'gpt-4-turbo': { input: '1', output: '1', cacheWrite: '1', cacheRead: '1' },
    'gpt-3.5-turbo': { input: '1', output: '1', cacheWrite: '1', cacheRead: '1' },
    'gpt-4': { input: '1', output: '1', cacheWrite: '1', cacheRead: '1' },
    'claude-sonnet-4-6': { input: '1', output: '1', cacheWrite: '1', cacheRead: '1' },
    'claude-3-5-sonnet': { input: '1', output: '1', cacheWrite: '1', cacheRead: '1' },
    'claude-3-opus': { input: '1', output: '1', cacheWrite: '1', cacheRead: '1' },
    'claude-3-haiku': { input: '1', output: '1', cacheWrite: '1', cacheRead: '1' },
  }

  const { data: configData } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => fetch('/api/admin/config').then(r => r.json()),
  })

  useEffect(() => {
    if (configData) {
      if (configData.model_pricing) {
        const mp: Record<string, any> = {}
        for (const [model, prices] of Object.entries(configData.model_pricing as any)) {
          const p = prices as any
          mp[model] = {
            input: String(p.input ?? ''),
            output: String(p.output ?? ''),
            cacheWrite: String(p.cacheWrite ?? ''),
            cacheRead: String(p.cacheRead ?? ''),
          }
        }
        setModelPrices(mp)
      }
    }
  }, [configData])

  function fillBuiltinPrices() {
    setModelPrices({ ...BUILTIN_MODEL_PRICES })
  }

  function updateModelPrice(model: string, field: string, value: string) {
    setModelPrices(prev => ({
      ...prev,
      [model]: { ...(prev[model] || { input: '', output: '', cacheWrite: '', cacheRead: '' }), [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const modelPricingPayload: Record<string, any> = {}
      for (const [model, prices] of Object.entries(modelPrices)) {
        const ip = parseFloat(prices.input)
        const op = parseFloat(prices.output)
        const cwp = parseFloat(prices.cacheWrite)
        const crp = parseFloat(prices.cacheRead)
        if (!isNaN(ip) || !isNaN(op) || !isNaN(cwp) || !isNaN(crp)) {
          modelPricingPayload[model] = {
            input: isNaN(ip) ? 0 : ip,
            output: isNaN(op) ? 0 : op,
            cacheWrite: isNaN(cwp) ? 0 : cwp,
            cacheRead: isNaN(crp) ? 0 : crp,
          }
        }
      }
      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_pricing: modelPricingPayload }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const models = Object.keys(BUILTIN_MODEL_PRICES)

  return (
    <div className="space-y-6">
      {/* 基本设置 */}
      <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm p-6">
        <h3 className="text-base font-semibold text-[#111827] dark:text-[#E5E5E7] mb-4">{t('admin.config.title')}</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('admin.config.siteName')}</label>
            <input value={siteName} onChange={e => setSiteName(e.target.value)}
              className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:focus:border-gray-400 dark:bg-[#242426] dark:text-[#E5E5E7]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1">{t('admin.config.defaultQuota')}</label>
            <input value={defaultQuota} onChange={e => setDefaultQuota(e.target.value)} type="number"
              className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:focus:border-gray-400 dark:bg-[#242426] dark:text-[#E5E5E7]" />
          </div>
        </div>
      </div>

      {/* 模型定价 */}
      <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#E5E5E7]">{t('admin.config.modelPricing') || '模型定价（最高优先级）'}</h3>
            <p className="text-sm text-gray-400 dark:text-[#6E6E73] mt-1">按模型设置独立定价，单位为每百万 token 的美元价格。留空表示不设置该模型价格。</p>
          </div>
          <button onClick={fillBuiltinPrices}
            className="h-9 px-4 text-xs font-medium border border-[#ECEFF3] dark:border-[#303033] rounded-xl hover:bg-gray-50 dark:hover:bg-[#242426] text-gray-600 dark:text-[#E5E5E7] transition-colors">
            {t('admin.config.fillBuiltin') || '统一设为 $1'}
          </button>
        </div>

        {/* 价格摘要 */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-[#242426]/50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400 dark:text-[#6E6E73]">{t('admin.config.configuredModels') || '已配置模型'}</div>
            <div className="text-lg font-bold text-[#111827] dark:text-[#E5E5E7]">{Object.keys(modelPrices).length} / {models.length}</div>
          </div>
          <div className="bg-gray-50 dark:bg-[#242426]/50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400 dark:text-[#6E6E73]">最高输入价</div>
            <div className="text-lg font-bold text-[#F97346] dark:text-[#e8673a]">
              ${Math.max(...models.map(m => parseFloat(modelPrices[m]?.input) || 0), 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-[#242426]/50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400 dark:text-[#6E6E73]">最低输入价</div>
            <div className="text-lg font-bold text-green-600 dark:text-[#30D158]">
              ${Math.min(...models.map(m => parseFloat(modelPrices[m]?.input) || Infinity), Infinity).toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-[#242426]/50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400 dark:text-[#6E6E73]">最高输出价</div>
            <div className="text-lg font-bold text-[#F97346] dark:text-[#e8673a]">
              ${Math.max(...models.map(m => parseFloat(modelPrices[m]?.output) || 0), 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* 模型价格表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ECEFF3] dark:border-[#303033]">
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 dark:text-[#6E6E73] w-48">{t('admin.config.modelName') || '模型'}</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 dark:text-[#6E6E73]">{t('admin.config.inputPrice') || '输入单价（$/M）'}</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 dark:text-[#6E6E73]">{t('admin.config.outputPrice') || '输出单价（$/M）'}</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 dark:text-[#6E6E73]">{t('admin.config.cacheWritePrice') || '缓存写入（$/M）'}</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 dark:text-[#6E6E73]">{t('admin.config.cacheReadPrice') || '缓存读取（$/M）'}</th>
              </tr>
            </thead>
            <tbody>
              {models.map(model => {
                const p = modelPrices[model]
                return (
                  <tr key={model} className="border-b border-gray-50 dark:border-[#303033]/50 hover:bg-gray-50/50 dark:hover:bg-[#242426]/30">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#242426] text-gray-700 dark:text-[#E5E5E7]">{model}</span>
                    </td>
                    <td className="px-3 py-2">
                      <input value={p?.input ?? ''} onChange={e => updateModelPrice(model, 'input', e.target.value)} type="number" step="0.001" placeholder="默认"
                        className="w-24 h-8 px-2 border border-[#ECEFF3] dark:border-[#303033] rounded-lg text-xs focus:outline-none focus:border-[#111827] dark:focus:border-gray-400 dark:bg-[#242426] dark:text-[#E5E5E7]" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={p?.output ?? ''} onChange={e => updateModelPrice(model, 'output', e.target.value)} type="number" step="0.001" placeholder="默认"
                        className="w-24 h-8 px-2 border border-[#ECEFF3] dark:border-[#303033] rounded-lg text-xs focus:outline-none focus:border-[#111827] dark:focus:border-gray-400 dark:bg-[#242426] dark:text-[#E5E5E7]" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={p?.cacheWrite ?? ''} onChange={e => updateModelPrice(model, 'cacheWrite', e.target.value)} type="number" step="0.001" placeholder="默认"
                        className="w-24 h-8 px-2 border border-[#ECEFF3] dark:border-[#303033] rounded-lg text-xs focus:outline-none focus:border-[#111827] dark:focus:border-gray-400 dark:bg-[#242426] dark:text-[#E5E5E7]" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={p?.cacheRead ?? ''} onChange={e => updateModelPrice(model, 'cacheRead', e.target.value)} type="number" step="0.001" placeholder="默认"
                        className="w-24 h-8 px-2 border border-[#ECEFF3] dark:border-[#303033] rounded-lg text-xs focus:outline-none focus:border-[#111827] dark:focus:border-gray-400 dark:bg-[#242426] dark:text-[#E5E5E7]" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="h-10 px-6 bg-[#e8673a] hover:bg-[#d4562a] text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
          {saving ? (t('admin.config.saving') || '保存中...') : (t('admin.config.save') || '保存')}
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-[#30D158]">已保存</span>}
      </div>
    </div>
  )
}
