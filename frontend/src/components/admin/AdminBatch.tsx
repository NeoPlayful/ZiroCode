import { useState } from 'react'
import { SparklesIcon, TicketIcon, CubeIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function AdminBatch() {
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
      setMessage({ type: 'success', text: `成功生成 ${count} 个兑换码` })
      setCount('10')
    } catch (error) {
      setMessage({ type: 'error', text: '生成失败，请重试' })
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
          label="批量操作"
          value="快速生成"
          trend="高效"
          trendUp={true}
        />
        <KPICard
          icon={<TicketIcon className="w-5 h-5" />}
          label="兑换码"
          value="批量生成"
          trend="便捷"
          trendUp={true}
        />
        <KPICard
          icon={<CubeIcon className="w-5 h-5" />}
          label="配额管理"
          value="灵活配置"
          trend="稳定"
          trendUp={true}
        />
        <KPICard
          icon={<CheckCircleIcon className="w-5 h-5" />}
          label="自动化"
          value="一键完成"
          trend="可靠"
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
            <h3 className="text-xl font-semibold text-gray-900">批量生成兑换码</h3>
            <p className="text-sm text-gray-500">快速创建多个兑换码，支持不同类型和配额</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">生成数量</label>
            <input
              value={count}
              onChange={e => setCount(e.target.value)}
              type="number"
              min="1"
              max="1000"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none text-lg"
              placeholder="10"
            />
            <p className="mt-1 text-xs text-gray-500">最多可生成 1000 个</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">配额金额</label>
            <input
              value={quotaAmount}
              onChange={e => setQuotaAmount(e.target.value)}
              type="number"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none text-lg"
              placeholder="100000000"
            />
            <p className="mt-1 text-xs text-gray-500">{(Number(quotaAmount) / 100000000).toFixed(1)} 亿 tokens</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">兑换码类型</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none text-lg"
            >
              <option value="PAY_AS_YOU_GO">按量付费</option>
              <option value="MONTHLY">月卡</option>
              <option value="PERMANENT">永久</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">选择兑换码的订阅类型</p>
          </div>

          <div>
            <button
              onClick={batchGenerate}
              disabled={loading}
              className="w-full px-4 py-3 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-5"
            >
              {loading ? '生成中...' : '开始批量生成'}
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
