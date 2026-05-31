import { useQuery } from '@tanstack/react-query'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactEChartsCore from 'echarts-for-react'
import { useTheme } from '../../hooks/useTheme'

export default function AdminAnalytics() {
  const { t } = useTranslation('admin')
  const { isDark } = useTheme()
  const [period, setPeriod] = useState('7d')
  const [metric, setMetric] = useState('requests')
  const [logExpanded, setLogExpanded] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [logFilter, setLogFilter] = useState('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  // Today overview
  const { data: overview } = useQuery({
    queryKey: ['admin-analytics-overview'],
    queryFn: () => fetch('/api/admin/analytics/overview').then(r => r.json()),
    refetchInterval: 30000,
  })

  // Trends
  const { data: trends } = useQuery({
    queryKey: ['admin-analytics-trends', period, metric],
    queryFn: () => fetch(`/api/admin/analytics/trends?period=${period}&metric=${metric}&granularity=${period === '24h' ? 'hour' : 'day'}`).then(r => r.json()),
  })

  // Model rankings
  const { data: modelData } = useQuery({
    queryKey: ['admin-analytics-models'],
    queryFn: () => fetch('/api/admin/analytics/models?limit=10').then(r => r.json()),
    refetchInterval: 60000,
  })

  // Channel report
  const { data: channelData } = useQuery({
    queryKey: ['admin-analytics-channels'],
    queryFn: () => fetch('/api/admin/analytics/channels').then(r => r.json()),
    refetchInterval: 60000,
  })

  // Request logs
  const { data: logData } = useQuery({
    queryKey: ['admin-analytics-requests', logPage, logFilter],
    queryFn: () => fetch(`/api/admin/analytics/requests?page=${logPage}&pageSize=15${logFilter ? `&${logFilter}` : ''}`).then(r => r.json()),
  })

  const axisLabelColor = isDark ? '#98989D' : '#9CA3AF'
  const axisLineColor = isDark ? '#2C2C2E' : '#E5E7EB'
  const splitLineColor = isDark ? '#2C2C2E' : '#F3F4F6'
  const seriesColor = '#F97346'

  const trendChartOption = {
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: isDark ? 'rgba(15,15,16,0.95)' : 'rgba(255,255,255,0.95)',
      borderColor: isDark ? '#303033' : '#E5E7EB',
      textStyle: { color: isDark ? '#F5F5F7' : '#111827', fontSize: 12 },
    },
    grid: { left: 40, right: 16, top: 20, bottom: 24 },
    xAxis: {
      type: 'category' as const,
      data: trends?.points?.map((p: any) => {
        const d = new Date(p.time)
        return period === '24h' ? `${d.getHours()}:00` : `${d.getMonth() + 1}/${d.getDate()}`
      }) || [],
      axisLabel: { fontSize: 11, color: axisLabelColor, rotate: period === '24h' ? 45 : 0 },
      axisLine: { lineStyle: { color: axisLineColor } },
    },
    yAxis: {
      type: 'value' as const,
      splitLine: { lineStyle: { color: splitLineColor } },
      axisLabel: { fontSize: 11, color: axisLabelColor, formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : String(v) },
    },
    series: [{
      type: period === '24h' ? 'line' as const : 'bar' as const,
      data: trends?.points?.map((p: any) => p.value) || [],
      smooth: period === '24h',
      lineStyle: period === '24h' ? { color: seriesColor, width: 2 } : undefined,
      itemStyle: { color: seriesColor, borderRadius: period === '24h' ? undefined : [4, 4, 0, 0] },
      barMaxWidth: period === '24h' ? undefined : 40,
      areaStyle: period === '24h' ? {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(249,115,70,0.15)' }, { offset: 1, color: 'rgba(249,115,70,0)' }] },
      } : undefined,
    }],
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={<div className="w-5 h-5 rounded bg-blue-100 dark:bg-[#BF5AF2]/15 text-blue-600 dark:text-[#BF5AF2] flex items-center justify-center text-xs font-bold">R</div>}
          label={t('analytics.requests') || '请求量'}
          value={overview?.todayRequests?.toLocaleString() || '-'}
          trend={`昨 ${overview?.yesterdayRequests?.toLocaleString() || '-'}`}
        />
        <KPICard
          icon={<div className="w-5 h-5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-[#BF5AF2] flex items-center justify-center text-xs font-bold">T</div>}
          label={t('analytics.tokens') || 'Token 消耗'}
          value={overview?.todayTokens?.toLocaleString() || '-'}
          trend={`${overview?.todayTokens ? (overview.todayTokens / 1000).toFixed(1) : 0}K`}
        />
        <KPICard
          icon={<div className="w-5 h-5 rounded bg-green-100 dark:bg-[#30D158]/15 text-green-600 dark:text-[#30D158] flex items-center justify-center text-xs font-bold">U</div>}
          label={t('analytics.activeUsers') || '活跃用户'}
          value={overview?.todayActiveUsers?.toLocaleString() || '-'}
          trend={t('analytics.today') || '今日'}
        />
        <KPICard
          icon={<div className="w-5 h-5 rounded bg-red-100 dark:bg-[#FF453A]/15 text-red-600 dark:text-[#FF453A] flex items-center justify-center text-xs font-bold">E</div>}
          label={t('analytics.errorRate') || '错误率'}
          value={overview ? `${overview.todayErrorRate}%` : '-'}
          trend={`${overview?.todayRequests || 0} 次请求`}
          valueClass={overview?.todayErrorRate > 5 ? 'text-red-600' : overview?.todayErrorRate > 1 ? 'text-amber-600' : ''}
        />
      </div>

      {/* Trend Chart */}
      <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#111827] dark:text-[#E5E5E7]">{t('analytics.trend') || '趋势'}</h3>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-[#242426] rounded-lg p-0.5">
              {['24h', '7d', '30d'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${period === p ? 'bg-white dark:bg-[#2C2C2E] text-[#111827] dark:text-[#E5E5E7] shadow-sm' : 'text-gray-500 dark:text-[#98989D] hover:text-gray-700 dark:hover:text-[#F5F5F7]'}`}>
                  {t(`analytics.period.${p}`) || p}
                </button>
              ))}
            </div>
            <div className="flex bg-gray-100 dark:bg-[#242426] rounded-lg p-0.5">
              {['requests', 'tokens', 'input_tokens', 'output_tokens', 'cost'].map(m => (
                <button key={m} onClick={() => setMetric(m)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${metric === m ? 'bg-white dark:bg-[#2C2C2E] text-[#111827] dark:text-[#E5E5E7] shadow-sm' : 'text-gray-500 dark:text-[#98989D] hover:text-gray-700 dark:hover:text-[#F5F5F7]'}`}>
                  {t(`analytics.metric.${m}`) || m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ReactEChartsCore option={trendChartOption} style={{ height: 280 }} notMerge />
      </div>

      {/* Model Rankings + Channel Report */}
      <div className="grid grid-cols-2 gap-6">
        {/* Model Rankings */}
        <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm">
          <div className="px-6 py-4 border-b border-[#ECEFF3] dark:border-[#303033]">
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#E5E5E7]">{t('analytics.models') || '模型排行'}</h3>
          </div>
          <div className="p-4">
            {!modelData?.models?.length ? (
              <div className="py-8 text-center text-sm text-gray-400 dark:text-[#6E6E73]">{t('common.noData') || '暂无数据'}</div>
            ) : (
              <div className="space-y-2">
                {modelData.models.map((m: any, i: number) => (
                  <div key={m.model} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#242426]/50">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-[#FFF4F0] dark:bg-[#F97346]/15 text-[#F97346] dark:text-[#F97346]' : 'bg-gray-100 dark:bg-[#242426] text-gray-500 dark:text-[#98989D]'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#111827] dark:text-[#E5E5E7] truncate">{m.model}</div>
                      <div className="text-xs text-gray-400 dark:text-[#6E6E73]">{m.requests} 请求 · {m.tokens.toLocaleString()} tokens</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[#111827] dark:text-[#E5E5E7]">{m.tokens.toLocaleString()}</div>
                      <div className="text-xs text-gray-400 dark:text-[#6E6E73]">tokens</div>
                      {m.cost > 0 && <div className="text-xs text-[#F97346] dark:text-[#e8673a]">${m.cost.toFixed(4)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Channel Report */}
        <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm">
          <div className="px-6 py-4 border-b border-[#ECEFF3] dark:border-[#303033]">
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#E5E5E7]">{t('analytics.channels') || '渠道报表'}</h3>
          </div>
          <div className="p-4">
            {!channelData?.channels?.length ? (
              <div className="py-8 text-center text-sm text-gray-400 dark:text-[#6E6E73]">{t('common.noData') || '暂无数据'}</div>
            ) : (
              <div className="space-y-2">
                {channelData.channels.map((c: any) => (
                  <div key={c.channelId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#242426]/50">
                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${c.healthStatus === 'HEALTHY' ? 'bg-green-500' : c.healthStatus === 'UNHEALTHY' ? 'bg-red-500' : 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#111827] dark:text-[#E5E5E7] truncate">{c.channelName}</div>
                      <div className="text-xs text-gray-400 dark:text-[#6E6E73]">{c.requests} 请求</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[#111827] dark:text-[#E5E5E7]">{c.tokens.toLocaleString()}</div>
                      <div className="text-xs text-gray-400 dark:text-[#6E6E73]">tokens</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request Log */}
      <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm">
        <button onClick={() => setLogExpanded(!logExpanded)} className="w-full px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#111827] dark:text-[#E5E5E7]">{t('analytics.log') || '请求日志'}</h3>
          <svg className={`w-5 h-5 text-gray-400 dark:text-[#6E6E73] transition-transform ${logExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
        </button>

        {logExpanded && (
          <div className="px-6 pb-4">
            {/* Log Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ECEFF3] dark:border-[#303033]">
                    <th className="w-8 py-2.5 px-1"></th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73] uppercase w-[155px]">时间</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73] uppercase">用户</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73] uppercase">模型</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73] uppercase">入口</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73] uppercase">渠道</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73] uppercase">IP</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73] uppercase">Token</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73] uppercase">耗时</th>
                    <th className="text-center py-2.5 px-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73] uppercase">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {logData?.logs?.map((log: any) => {
                    const isOpen = expandedLogId === log.id
                    return (
                      <React.Fragment key={log.id}>
                      <tr onClick={() => setExpandedLogId(isOpen ? null : log.id)}
                        className={`border-b border-gray-50 dark:border-[#303033]/50 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-[#242426]/30 ${isOpen ? 'bg-gray-50/50 dark:bg-[#242426]/30' : ''}`}>
                        <td className="py-2.5 px-1 text-center">
                          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-[#98989D] whitespace-nowrap">
                          {new Date(log.requestTime).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-700 dark:text-[#E5E5E7] max-w-[100px] truncate" title={log.userEmail || log.userId}>
                          {log.userName || log.userId.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-700 dark:text-[#E5E5E7] max-w-[120px] truncate" title={log.model}>{log.model}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-[#98989D] max-w-[100px] truncate" title={log.routePath || ''}>{log.routePath || '-'}</td>
                        <td className="py-2.5 px-3 text-xs">
                          {log.channelDisplayOrder ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#FFF4F0] dark:bg-[#F97346]/15 text-[#F97346] dark:text-[#F97346] text-[10px] font-bold">{log.channelDisplayOrder}</span>
                              <span className="text-gray-500 dark:text-[#98989D]">{log.channelDisplayName || ''}</span>
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-[#98989D]">{log.clientIp || '-'}</td>
                        <td className="py-2.5 px-3 text-xs text-right text-gray-700 dark:text-[#E5E5E7]">{log.tokensUsed}</td>
                        <td className="py-2.5 px-3 text-xs text-right text-gray-500 dark:text-[#98989D]">{log.latencyMs ? `${log.latencyMs}ms` : '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.statusCode < 400 ? 'bg-green-50 dark:bg-[#30D158]/15 text-green-700 dark:text-[#30D158]' : 'bg-red-50 dark:bg-[#FF453A]/15 text-red-700 dark:text-[#FF453A]'
                          }`}>
                            {log.statusCode}
                          </span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={10} className="px-6 py-0">
                            <div className="border-t border-gray-100 dark:border-[#303033] mb-3" />
                            {/* 请求详情 */}
                            <div className="space-y-3 pb-4">
                              {log.requestPath && (
                                <div>
                                  <span className="text-xs font-medium text-gray-400 dark:text-[#6E6E73]">完整请求地址</span>
                                  <div className="mt-1 text-xs font-mono text-[#e8673a] break-all bg-gray-50 dark:bg-[#242426] rounded-lg px-3 py-2">
                                    {window.location.origin}{log.requestPath}
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-gray-400 dark:text-[#6E6E73]">用户</span>
                                  <p className="mt-0.5 text-gray-700 dark:text-[#E5E5E7]">{log.userName || log.userEmail || log.userId}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400 dark:text-[#6E6E73]">用户 ID</span>
                                  <p className="mt-0.5 text-gray-700 dark:text-[#E5E5E7] font-mono">{log.userId}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400 dark:text-[#6E6E73]">请求时间</span>
                                  <p className="mt-0.5 text-gray-700 dark:text-[#E5E5E7]">{new Date(log.requestTime).toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-gray-400 dark:text-[#6E6E73]">模型</span>
                                  <p className="mt-0.5 text-gray-700 dark:text-[#E5E5E7]">{log.model}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400 dark:text-[#6E6E73]">Token 消耗</span>
                                  <p className="mt-0.5 text-gray-700 dark:text-[#E5E5E7]">{log.tokensUsed?.toLocaleString() || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400 dark:text-[#6E6E73]">渠道</span>
                                  <p className="mt-0.5 text-gray-700 dark:text-[#E5E5E7]">{log.channelDisplayName || '-'}</p>
                                </div>
                              </div>
                              {log.error && (
                                <div>
                                  <span className="text-xs font-medium text-red-500">错误信息</span>
                                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{log.error}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logData && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#ECEFF3] dark:border-[#303033]">
                <div className="text-xs text-gray-400 dark:text-[#6E6E73]">
                  共 {logData.total} 条 · 第 {logData.page}/{logData.totalPages} 页
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage <= 1}
                    className="h-8 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-[#242426] disabled:opacity-50 dark:text-[#E5E5E7]">上一页</button>
                  <button onClick={() => setLogPage(p => p + 1)} disabled={logPage >= (logData.totalPages || 1)}
                    className="h-8 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-[#242426] disabled:opacity-50 dark:text-[#E5E5E7]">下一页</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function KPICard({ icon, label, value, trend, valueClass }: { icon: React.ReactNode; label: string; value: string; trend?: string; valueClass?: string }) {
  return (
    <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#242426] flex items-center justify-center text-gray-600 dark:text-[#98989D]">{icon}</div>
        <span className="text-xs font-medium text-gray-400 dark:text-[#6E6E73]">{trend}</span>
      </div>
      <div className={`text-2xl font-bold text-[#111827] dark:text-[#E5E5E7] mb-1 ${valueClass || ''}`}>{value}</div>
      <div className="text-sm text-[#6B7280] dark:text-[#98989D]">{label}</div>
    </div>
  )
}
