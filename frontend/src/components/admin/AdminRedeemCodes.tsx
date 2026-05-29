import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TicketIcon, CheckCircleIcon, XCircleIcon, PlusIcon, MagnifyingGlassIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'

export default function AdminRedeemCodes() {
  const { t } = useTranslation('admin')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showForm, setShowForm] = useState(false)
  const [quota, setQuota] = useState('100000000')
  const [type, setType] = useState('PAY_AS_YOU_GO')
  const [count, setCount] = useState('1')

  const { data, refetch } = useQuery({
    queryKey: ['admin-redeem-codes', search, typeFilter, statusFilter, page, pageSize],
    queryFn: () => fetch(`/api/admin/redeem-codes?${new URLSearchParams({ search, typeFilter, statusFilter, page: String(page), pageSize: String(pageSize) })}`).then(r => r.json())
  })

  const codes = data?.codes || []
  const total = data?.total || 0
  const usedCodes = data?.usedCount || 0
  const unusedCodes = data?.unusedCount || 0
  const todayGenerated = data?.todayGenerated || 0

  async function generate() {
    await fetch('/api/admin/redeem-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotaAmount: quota, type, count: parseInt(count) })
    })
    refetch()
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={<TicketIcon className="w-5 h-5" />}
          label={t('redeemCodes.kpi.totalCodes')}
          value={total}
          trend="+8"
          trendUp={true}
        />
        <KPICard
          icon={<CheckCircleIcon className="w-5 h-5" />}
          label={t('redeemCodes.kpi.used')}
          value={usedCodes}
          trend={`${total > 0 ? ((usedCodes / total) * 100).toFixed(0) : 0}%`}
          trendUp={false}
        />
        <KPICard
          icon={<XCircleIcon className="w-5 h-5" />}
          label={t('redeemCodes.kpi.unused')}
          value={unusedCodes}
          trend={`${total > 0 ? ((unusedCodes / total) * 100).toFixed(0) : 0}%`}
          trendUp={true}
        />
        <KPICard
          icon={<PlusIcon className="w-5 h-5" />}
          label={t('redeemCodes.kpi.todayGenerated')}
          value={todayGenerated}
          trend="+5"
          trendUp={true}
        />
      </div>

      {/* 生成表单 */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('redeemCodes.generateForm.title')}</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('redeemCodes.generateForm.quota')}</label>
              <input
                value={quota}
                onChange={e => setQuota(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
                placeholder="100000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('redeemCodes.generateForm.type')}</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
              >
                <option value="PAY_AS_YOU_GO">{t('redeemCodes.generateForm.types.payAsYouGo')}</option>
                <option value="MONTHLY">{t('redeemCodes.generateForm.types.monthly')}</option>
                <option value="PERMANENT">{t('redeemCodes.generateForm.types.permanent')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('redeemCodes.generateForm.count')}</label>
              <input
                value={count}
                onChange={e => setCount(e.target.value)}
                type="number"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
                placeholder="1"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={generate}
              className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium transition-colors"
            >
              {t('redeemCodes.generateForm.generate')}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              {t('redeemCodes.generateForm.cancel')}
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
              placeholder={t('redeemCodes.search')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border-0 bg-white rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            />
          </div>

          {/* 类型筛选 */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border-0 bg-white rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
          >
            <option value="all">{t('redeemCodes.filter.allTypes')}</option>
            <option value="PAY_AS_YOU_GO">{t('redeemCodes.filter.payAsYouGo')}</option>
            <option value="MONTHLY">{t('redeemCodes.filter.monthly')}</option>
            <option value="PERMANENT">{t('redeemCodes.filter.permanent')}</option>
          </select>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border-0 bg-white rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
          >
            <option value="all">{t('redeemCodes.filter.allStatus')}</option>
            <option value="active">{t('redeemCodes.filter.active')}</option>
            <option value="used">{t('redeemCodes.filter.used')}</option>
            <option value="disabled">{t('redeemCodes.filter.disabled')}</option>
          </select>
        </div>

        {/* 生成按钮 */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          {t('redeemCodes.generateBtn')}
        </button>
      </div>

      {/* 表格容器 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('redeemCodes.table.code')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('redeemCodes.table.quota')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('redeemCodes.table.type')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('redeemCodes.table.usage')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('redeemCodes.table.status')}</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('redeemCodes.table.createdAt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {codes.map((code: any) => (
                <CodeRow key={code.id} code={code} />
              ))}
            </tbody>
          </table>
        </div>

        {/* 表格底部 - 分页 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {t('redeemCodes.pagination', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
            >
              <option value={10}>{t('redeemCodes.pageSize', { size: 10 })}</option>
              <option value={20}>{t('redeemCodes.pageSize', { size: 20 })}</option>
              <option value={50}>{t('redeemCodes.pageSize', { size: 50 })}</option>
              <option value={100}>{t('redeemCodes.pageSize', { size: 100 })}</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('redeemCodes.prev')}
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('redeemCodes.next')}
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

// 兑换码行组件
function CodeRow({ code }: any) {
  const { t } = useTranslation('admin')
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(code.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getTypeColor = (type: string) => {
    if (type === 'PAY_AS_YOU_GO') return 'bg-blue-50 text-blue-700'
    if (type === 'MONTHLY') return 'bg-purple-50 text-purple-700'
    if (type === 'PERMANENT') return 'bg-orange-50 text-orange-700'
    return 'bg-gray-50 text-gray-600'
  }

  const getTypeLabel = (type: string) => {
    if (type === 'PAY_AS_YOU_GO') return t('redeemCodes.typeLabel.payAsYouGo')
    if (type === 'MONTHLY') return t('redeemCodes.typeLabel.monthly')
    if (type === 'PERMANENT') return t('redeemCodes.typeLabel.permanent')
    return type
  }

  const usagePercent = (code.usedCount / code.maxUses) * 100

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm text-gray-900">{code.code}</code>
          <button
            onClick={copyCode}
            className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          >
            <ClipboardDocumentIcon className="w-4 h-4" />
          </button>
          {copied && <span className="text-xs text-green-600">{t('redeemCodes.copied')}</span>}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {(Number(code.quotaAmount) / 100000000).toFixed(1)}亿
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(code.type)}`}>
          {getTypeLabel(code.type)}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{code.usedCount} / {code.maxUses}</span>
            <span className="text-gray-500">{usagePercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${usagePercent >= 100 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${code.isActive && code.usedCount < code.maxUses ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {code.isActive && code.usedCount < code.maxUses ? t('redeemCodes.statusLabel.active') : code.usedCount >= code.maxUses ? t('redeemCodes.statusLabel.used') : t('redeemCodes.statusLabel.disabled')}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {new Date(code.createdAt).toLocaleDateString()}
      </td>
    </tr>
  )
}
