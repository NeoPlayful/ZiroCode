import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SparklesIcon, TicketIcon, CubeIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function AdminBatch() {
  const { t } = useTranslation('admin')
  const [count, setCount] = useState('10')
  const [quotaAmount, setQuotaAmount] = useState('100000000')
  const [type, setType] = useState('PAY_AS_YOU_GO')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function batchGenerate() {
    setLoading(true)
    setMessage(null)
    try {
      await fetch('/api/admin/batch/redeem-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: parseInt(count), quotaAmount, type })
      })
      setMessage({ type: 'success', text: t('batch.generateForm.success', { count: count }) })
      setCount('10')
    } catch (error) {
      setMessage({ type: 'error', text: t('batch.generateForm.error') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={<SparklesIcon className="w-5 h-5" />}
          label={t('batch.kpi.batchOps')}
          value={t('batch.kpiValue.batchOps')}
          trend={t('batch.kpiTrend.batchOps')}
          trendUp={true}
        />
        <KPICard
          icon={<TicketIcon className="w-5 h-5" />}
          label={t('batch.kpi.redeemCodes')}
          value={t('batch.kpiValue.redeemCodes')}
          trend={t('batch.kpiTrend.redeemCodes')}
          trendUp={true}
        />
        <KPICard
          icon={<CubeIcon className="w-5 h-5" />}
          label={t('batch.kpi.quotaMgmt')}
          value={t('batch.kpiValue.quotaMgmt')}
          trend={t('batch.kpiTrend.quotaMgmt')}
          trendUp={true}
        />
        <KPICard
          icon={<CheckCircleIcon className="w-5 h-5" />}
          label={t('batch.kpi.automation')}
          value={t('batch.kpiValue.automation')}
          trend={t('batch.kpiTrend.automation')}
          trendUp={true}
        />
      </div>

      {/* 批量生成表单 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{t('batch.generateForm.title')}</h3>
            <p className="text-sm text-gray-500">{t('batch.generateForm.subtitle')}</p>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('batch.generateForm.count')}</label>
            <input
              value={count}
              onChange={e => setCount(e.target.value)}
              type="number"
              min="1"
              max="1000"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none text-lg"
              placeholder="10"
            />
            <p className="mt-1 text-xs text-gray-500">{t('batch.generateForm.countHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('batch.generateForm.quotaAmount')}</label>
            <input
              value={quotaAmount}
              onChange={e => setQuotaAmount(e.target.value)}
              type="number"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none text-lg"
              placeholder="100000000"
            />
            <p className="mt-1 text-xs text-gray-500">{t('batch.generateForm.quotaHint', { amount: (Number(quotaAmount) / 100000000).toFixed(1) })}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('batch.generateForm.type')}</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none text-lg"
            >
              <option value="PAY_AS_YOU_GO">{t('batch.generateForm.types.payAsYouGo')}</option>
              <option value="MONTHLY">{t('batch.generateForm.types.monthly')}</option>
              <option value="PERMANENT">{t('batch.generateForm.types.permanent')}</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">{t('batch.generateForm.typeHint')}</p>
          </div>

          <div>
            <button
              onClick={batchGenerate}
              disabled={loading}
              className="w-full px-4 py-3 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-5"
            >
              {loading ? t('batch.generateForm.submitting') : t('batch.generateForm.submit')}
            </button>
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
