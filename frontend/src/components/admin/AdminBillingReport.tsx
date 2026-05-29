import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function AdminBillingReport() {
  const { t } = useTranslation('admin')
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)
  const [userId, setUserId] = useState('')
  const [drillUserId, setDrillUserId] = useState<string | null>(null)

  const { data: report, isLoading } = useQuery({
    queryKey: ['admin-billing-report', from, to, userId],
    queryFn: () => fetch(`/api/admin/billing/report?from=${from}&to=${to}${userId ? `&userId=${userId}` : ''}`).then(r => r.json()),
    enabled: !!from && !!to,
  })

  const { data: userReport, isLoading: userLoading } = useQuery({
    queryKey: ['admin-billing-user', drillUserId, from, to],
    queryFn: () => fetch(`/api/admin/billing/user-report/${drillUserId}?from=${from}&to=${to}`).then(r => r.json()),
    enabled: !!drillUserId,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">{t('billing.title') || '计费报表'}</h2>
          <p className="text-sm text-gray-500 mt-1">按时间段查看系统计费汇总</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#ECEFF3] shadow-sm p-4 flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-xs text-gray-400 mb-1">开始日期</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="h-9 px-3 text-sm border border-[#ECEFF3] rounded-xl focus:outline-none focus:border-[#111827]" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">结束日期</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="h-9 px-3 text-sm border border-[#ECEFF3] rounded-xl focus:outline-none focus:border-[#111827]" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">用户 ID（可选）</label>
          <input type="text" value={userId} onChange={e => setUserId(e.target.value)} placeholder="筛选指定用户"
            className="h-9 px-3 text-sm border border-[#ECEFF3] rounded-xl focus:outline-none focus:border-[#111827] w-48" />
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : report?.summary ? (
        <>
          <div className="grid grid-cols-4 gap-4">
            <SummaryCard label="总费用(USD)" value={`$${report.summary.totalCost.toFixed(4)}`} color="text-[#F97346]" />
            <SummaryCard label="总 Token" value={report.summary.totalTokens.toLocaleString()} color="text-purple-600" />
            <SummaryCard label="总请求数" value={report.summary.totalRequests.toLocaleString()} color="text-blue-600" />
            <SummaryCard label="总配额消耗" value={report.summary.totalQuota.toLocaleString()} color="text-green-600" />
          </div>

          {/* Token Breakdown */}
          <div className="bg-white rounded-2xl border border-[#ECEFF3] shadow-sm p-5">
            <h3 className="text-base font-semibold text-[#111827] mb-4">Token 消耗分布</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400 mb-1">输入 Token</div>
                <div className="text-lg font-semibold text-[#111827]">{report.summary.totalInputTokens.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">输出 Token</div>
                <div className="text-lg font-semibold text-[#111827]">{report.summary.totalOutputTokens.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">缓存读取</div>
                <div className="text-lg font-semibold text-[#111827]">{report.summary.totalCacheReadTokens.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">缓存写入</div>
                <div className="text-lg font-semibold text-[#111827]">{report.summary.totalCacheWriteTokens.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <div className="bg-white rounded-2xl border border-[#ECEFF3] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#ECEFF3]">
              <h3 className="text-base font-semibold text-[#111827]">每日明细</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ECEFF3]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">日期</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">请求数</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">总 Token</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">费用(USD)</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">配额</th>
                  </tr>
                </thead>
                <tbody>
                  {report.breakdown.map((b: any) => (
                    <tr key={b.period} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700">{b.period}</td>
                      <td className="px-4 py-3 text-gray-700">{b.requests}</td>
                      <td className="px-4 py-3 text-gray-700">{b.tokens.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-[#F97346]">${b.cost.toFixed(4)}</td>
                      <td className="px-4 py-3 text-gray-700">{b.quota.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!report.breakdown || report.breakdown.length === 0) && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{t('common.noData') || '暂无数据'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Drill-down */}
          {drillUserId && (
            <div className="bg-white rounded-2xl border border-[#ECEFF3] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#ECEFF3] flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#111827]">
                  用户计费明细: {userReport?.user?.name || drillUserId}
                </h3>
                <button onClick={() => setDrillUserId(null)}
                  className="text-xs text-gray-400 hover:text-gray-600">关闭</button>
              </div>
              {userLoading ? (
                <div className="p-6 text-center text-gray-400">加载中...</div>
              ) : userReport ? (
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400">总费用</div>
                      <div className="text-lg font-semibold text-[#F97346]">${userReport.summary.totalCost.toFixed(4)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400">总配额</div>
                      <div className="text-lg font-semibold text-[#111827]">{userReport.summary.totalQuota.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400">请求数</div>
                      <div className="text-lg font-semibold text-[#111827]">{userReport.summary.totalRequests}</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#ECEFF3]">
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-400">时间</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-400">模型</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-400">输入</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-400">输出</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-400">费用</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-400">配额</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userReport.logs.map((l: any, i: number) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{new Date(l.time).toLocaleString()}</td>
                            <td className="px-3 py-2"><span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{l.model}</span></td>
                            <td className="px-3 py-2 font-mono text-xs">{l.inputTokens.toLocaleString()}</td>
                            <td className="px-3 py-2 font-mono text-xs">{l.outputTokens.toLocaleString()}</td>
                            <td className="px-3 py-2 font-mono text-xs text-[#F97346]">${l.cost.toFixed(6)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{l.quotaUsed.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-[#ECEFF3] shadow-sm py-16 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500">选择时间范围查看计费报表</p>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEFF3] shadow-sm p-5">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}
