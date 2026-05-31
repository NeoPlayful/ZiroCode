import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as echarts from 'echarts';
import { useTheme } from '../hooks/useTheme';

export default function UsagePage() {
  const { t } = useTranslation('usage');
  const [days, setDays] = useState(7);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: () => fetch('/api/user/usage').then(r => r.json()),
  });

  if (isLoading) {
    return (
      <main className="max-w-[1280px] mx-auto px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-gray-200 dark:bg-[#242426] rounded" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-[#242426] rounded" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-[#242426] rounded-xl" />)}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-[#242426] rounded-xl" />
          </div>
        </main>
    );
  }

  const total = data?.total || { calls: 0, tokens: 0, quota: 0 };
  const daily = (data?.daily || []).slice(-days);
  const byModel = data?.byModel || [];
  const recent = data?.recent || [];
  const paginated = recent.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(recent.length / pageSize);

  return (
    <main className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('usage.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-[#98989D] mt-1">{t('usage.subtitle')}</p>
          </div>
          <div className="flex gap-1">
            {[7, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-md text-sm ${days === d ? 'bg-[#e8673a] text-white' : 'bg-white dark:bg-[#242426] text-gray-600 dark:text-[#E5E5E7] border border-gray-200 dark:border-[#303033]'}`}>
                {t('usage.lastDays', { days: d })}
              </button>
            ))}
          </div>
        </div>

        {/* 汇总卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033]">
            <div className="text-sm text-gray-500 dark:text-[#98989D] mb-1">{t('usage.summary.totalCalls')}</div>
            <div className="text-2xl font-bold">{total.calls.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033]">
            <div className="text-sm text-gray-500 dark:text-[#98989D] mb-1">{t('usage.summary.totalTokens')}</div>
            <div className="text-2xl font-bold">{total.tokens.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033]">
            <div className="text-sm text-gray-500 dark:text-[#98989D] mb-1">{t('usage.summary.quotaConsumed')}</div>
            <div className="text-2xl font-bold">{total.quota.toLocaleString()}</div>
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-12 text-center border border-gray-200 dark:border-[#303033]">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-500 dark:text-[#98989D]">{t('usage.emptyState.message')}</p>
            <p className="text-sm text-gray-400 dark:text-[#6E6E73] mt-1">{t('usage.emptyState.hint')}</p>
          </div>
        ) : (
          <>
            {/* 24小时各模型花费趋势 */}
            <HourlyTrendChart data={data?.hourly} t={t} />

            {/* 模型分布 */}
            {byModel.length > 0 && (
              <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033] mb-6">
                <h3 className="font-semibold mb-4">{t('usage.modelDistribution.title')}</h3>
                <div className="space-y-3">
                  {byModel.map((m: any) => {
                    const totalCalls = byModel.reduce((s: number, x: any) => s + x.calls, 0);
                    const pct = totalCalls > 0 ? Math.round((m.calls / totalCalls) * 100) : 0;
                    return (
                      <div key={m.model}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{m.model}</span>
                          <span className="text-gray-500 dark:text-[#98989D]">{m.calls} {t('usage.modelDistribution.times')} / {m.tokens.toLocaleString()} tokens</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-[#242426] rounded-full h-2">
                          <div className="bg-[#e8673a] h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 近一周消费记录 */}
            <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-gray-100 dark:border-[#303033] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-[#303033]">
                <h3 className="font-semibold text-gray-900 dark:text-[#E5E5E7]">{t('usage.recentRecords.title')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-[#303033]">
                      <th className="w-10 px-2 py-3" />
                      <th className="text-left px-2 py-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73] whitespace-nowrap w-36">{t('usage.recentRecords.time')}</th>
                      <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73]">{t('usage.recentRecords.model')}</th>
                      <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73]">输入</th>
                      <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73]">输出</th>
                      <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73]">缓存创建</th>
                      <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73]">缓存读取</th>
                      <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73] whitespace-nowrap">额度使用</th>
                      <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 dark:text-[#6E6E73]">价格（消耗基数费用）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((log: any) => (
                      <BillingRow key={log.id} log={log} isOpen={expandedId === log.id} onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-100 dark:border-[#303033] flex items-center justify-between">
                  <div className="text-xs text-gray-400 dark:text-[#6E6E73]">
                    显示第 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, recent.length)} 条
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="h-8 px-3 text-xs border border-gray-200 dark:border-[#303033] rounded-lg hover:bg-gray-50 dark:hover:bg-[#242426] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">上一页</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setPage(p)}
                        className={`h-8 min-w-8 px-2 text-xs rounded-lg font-medium transition-colors ${page === p ? 'bg-[#F97346] text-white' : 'border border-gray-200 dark:border-[#303033] hover:bg-gray-50 dark:hover:bg-[#242426] text-gray-600 dark:text-[#E5E5E7]'}`}>{p}</button>
                    ))}
                    <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                      className="h-8 px-3 text-xs border border-gray-200 dark:border-[#303033] rounded-lg hover:bg-gray-50 dark:hover:bg-[#242426] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">下一页</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
  );
}

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function BillingRow({ log, isOpen, onToggle }: { log: any; isOpen: boolean; onToggle: () => void }) {
  const p = log.pricing;
  const inputPrice = p?.input || 0;
  const outputPrice = p?.output || 0;
  const cacheWritePrice = p?.cacheWrite || 0;
  const cacheReadPrice = p?.cacheRead || 0;
  const qpd = log.quotaPerDollar || 1_000_000;

  const it = log.inputTokens || 0;
  const ot = log.outputTokens || 0;
  const cct = log.cacheCreationTokens || 0;
  const crt = log.cacheReadTokens || 0;

  const costUsd = (it / 1_000_000 * inputPrice) + (ot / 1_000_000 * outputPrice) + (cct / 1_000_000 * cacheWritePrice) + (crt / 1_000_000 * cacheReadPrice);
  const quotaCalc = Math.round(costUsd * qpd);

  return (
    <>
      <tr onClick={onToggle}
        className={`border-b border-gray-50 dark:border-[#303033]/50 cursor-pointer transition-colors hover:bg-gray-50/80 dark:hover:bg-[#242426]/50 ${isOpen ? 'bg-gray-50/50 dark:bg-[#242426]/30' : ''}`}>
        <td className="px-2 py-3 text-center">
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </td>
        <td className="px-2 py-3 text-sm text-gray-500 dark:text-[#98989D] whitespace-nowrap">{new Date(log.requestTime).toLocaleString()}</td>
        <td className="px-3 py-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#242426] text-gray-700 dark:text-[#E5E5E7]">{log.model}</span>
        </td>
        <td className="px-3 py-3 text-sm text-left text-gray-700 dark:text-[#E5E5E7] font-mono whitespace-nowrap">{it > 0 ? it.toLocaleString() : '-'}</td>
        <td className="px-3 py-3 text-sm text-left text-gray-700 dark:text-[#E5E5E7] font-mono whitespace-nowrap">{ot > 0 ? ot.toLocaleString() : '-'}</td>
        <td className="px-3 py-3 text-sm text-left text-gray-700 dark:text-[#E5E5E7] font-mono whitespace-nowrap">{cct > 0 ? cct.toLocaleString() : '-'}</td>
        <td className="px-3 py-3 text-sm text-left text-gray-700 dark:text-[#E5E5E7] font-mono whitespace-nowrap">{crt > 0 ? crt.toLocaleString() : '-'}</td>
        <td className="px-3 py-3 text-sm text-left font-mono font-semibold text-[#F97346] whitespace-nowrap">{Number(log.quotaUsed).toLocaleString()}</td>
        <td className="px-3 py-3 text-sm text-left text-gray-500 dark:text-[#98989D] font-mono font-semibold">{costUsd > 0 ? `$${costUsd.toFixed(6)}` : '-'}</td>
      </tr>
      {isOpen && (
        <tr key={`${log.id}-detail`}>
          <td colSpan={9} className="px-6 py-0">
            <div className="border-t border-gray-100 dark:border-[#303033] mb-3" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-[#E5E5E7] mb-4">计费详情</h4>

            {/* 价格卡片 */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <PriceCard label="输入单价" value={inputPrice} unit="$0.75/M" colorClass="bg-blue-50 text-blue-700" />
              <PriceCard label="输出单价" value={outputPrice} unit="$3.75/M" colorClass="bg-green-50 text-green-700" />
              <PriceCard label="缓存写入单价" value={cacheWritePrice} unit="$0.9375/M" colorClass="bg-purple-50 text-purple-700" />
              <PriceCard label="缓存读取单价" value={cacheReadPrice} unit="$0.075/M" colorClass="bg-amber-50 text-amber-700" />
            </div>

            {/* 计算公式 */}
            <div className="bg-gray-50 dark:bg-[#242426]/50 rounded-xl p-4 mb-4">
              <div className="text-xs text-gray-500 dark:text-[#98989D] mb-2 font-mono">
                {it > 0 && <>{it.toLocaleString()} × ${inputPrice}/M</>}
                {ot > 0 && <>{it > 0 && <span className="text-gray-300 dark:text-[#5A5A5F] mx-1">+</span>}{ot.toLocaleString()} × ${outputPrice}/M</>}
                {cct > 0 && <> <span className="text-gray-300 dark:text-[#5A5A5F] mx-1">+</span>{cct.toLocaleString()} × ${cacheWritePrice}/M</>}
                {crt > 0 && <> <span className="text-gray-300 dark:text-[#5A5A5F] mx-1">+</span>{crt.toLocaleString()} × ${cacheReadPrice}/M</>}
                {!it && !ot && !cct && !crt && <span className="text-gray-400 dark:text-[#6E6E73]">无 token 消耗</span>}
              </div>
              <div className="text-sm">
                <span className="text-gray-500 dark:text-[#98989D]">基础消耗 = </span>
                <span className="text-[#F97346] font-semibold font-mono">{quotaCalc.toLocaleString()}</span>
                <span className="text-gray-400 dark:text-[#6E6E73] mx-1">（额度）</span>
                <span className="text-gray-400 dark:text-[#6E6E73]">≈ </span>
                <span className="text-gray-500 dark:text-[#98989D] font-mono">${costUsd.toFixed(6)}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PriceCard({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="rounded-xl p-4 border border-gray-100 dark:border-[#303033] bg-white dark:bg-[#1F1F21]">
      <div className="text-xs text-gray-400 dark:text-[#6E6E73] mb-1">{label}</div>
      <div className={`text-base font-semibold font-mono ${colorClass}`}>${value.toFixed(4)}<span className="text-xs font-normal opacity-70">/M</span></div>
    </div>
  );
}

function HourlyTrendChart({ data, t }: { data: any; t: any }) {
  const { isDark } = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data?.slots) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    const chart = chartInstance.current;

    const slots = data.slots;
    const labels = slots.map((s: any) => s.label);
    const models = data.models || [];

    const maxVal = Math.max(
      ...slots.flatMap((s: any) => Object.values(s.models).map((m: any) => m.tokens)),
      1
    );

    const option = {
      grid: { left: 70, right: 30, top: 30, bottom: 100 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(30,30,32,0.95)' : 'rgba(34,34,34,0.9)',
        borderColor: 'transparent',
        textStyle: { color: isDark ? '#E5E5E7' : '#fff', fontSize: 12, fontWeight: 600 },
        padding: 10,
        formatter(params: any) {
          const time = params[0].axisValue;
          return `
            <div style="font-size:13px;font-weight:700;margin-bottom:6px;">⏰ ${time}</div>
            ${params.map((item: any) => `
              <div style="display:flex;align-items:center;gap:4px;line-height:20px;">
                <span style="width:8px;height:8px;border:2px solid ${item.color};background:#fff;display:inline-block;flex-shrink:0;"></span>
                <span style="font-size:11px;white-space:nowrap;">${item.seriesName}: ${Number(item.value).toLocaleString()} (${item.data?.calls || 0}次)</span>
              </div>
            `).join('')}
          `;
        },
      },
      legend: {
        bottom: 10,
        icon: 'circle',
        itemWidth: 14,
        itemHeight: 14,
        textStyle: { color: isDark ? '#98989D' : '#6b7280', fontSize: 11 },
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        name: `⏰ ${t('usage.dailyTrends.timeLabel')}`,
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: { fontWeight: 700, fontSize: 12, color: isDark ? '#E5E5E7' : '#1f2937' },
        axisLine: { lineStyle: { color: isDark ? '#303033' : '#d1d5db' } },
        axisTick: { show: false },
        axisLabel: { color: isDark ? '#98989D' : '#6b7280', fontSize: 11, interval: 0 },
      },
      yAxis: {
        type: 'value',
        name: `💰 ${t('usage.dailyTrends.costLabel')}`,
        nameLocation: 'middle',
        nameGap: 60,
        max: Math.ceil(maxVal * 1.2),
        nameTextStyle: { fontWeight: 700, fontSize: 12, color: isDark ? '#E5E5E7' : '#1f2937' },
        axisLabel: { color: isDark ? '#98989D' : '#6b7280', fontSize: 11, formatter: (v: number) => v.toLocaleString() },
        splitLine: { lineStyle: { color: isDark ? '#242426' : '#eef0f4' } },
      },
      series: models.map((model: string, i: number) => ({
        name: model,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 },
        itemStyle: { color: colors[i % colors.length], borderWidth: 2, borderColor: colors[i % colors.length] },
        data: slots.map((s: any) => {
          const m = s.models[model];
          return { value: m?.tokens || 0, calls: m?.calls || 0 };
        }),
      })),
    };

    chart.setOption(option, true);
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [data, isDark]);

  if (!data?.slots) return null;

  const totalModels = data.models?.length || 0;
  const totalCalls = data.slots.reduce((s: number, slot: any) =>
    s + Object.values(slot.models).reduce((sum: number, m: any) => sum + m.calls, 0), 0);

  return (
    <div style={{
      background: isDark ? '#1F1F21' : '#fff', marginBottom: 24, padding: '28px 36px 20px',
      borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: isDark ? '1px solid #303033' : 'none',
    }}>
      <h2 style={{ margin: 0, fontSize: 20, color: isDark ? '#E5E5E7' : '#111827', fontWeight: 700 }}>
        {t('usage.dailyTrends.title')}
      </h2>
      <p style={{ margin: '8px 0 16px', fontSize: 14, color: isDark ? '#98989D' : '#6b7280' }}>
        {t('usage.dailyTrends.subtitle')}
      </p>

      <div ref={chartRef} style={{ width: '100%', height: 300 }} />

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        color: isDark ? '#98989D' : '#64748b', fontSize: 13, padding: '8px 4px 0',
      }}>
        <span>📊 {t('usage.dailyTrends.footer')}</span>
        <span>{t('usage.dailyTrends.modelCount', { n: totalModels })}，{t('usage.dailyTrends.callCount', { n: totalCalls.toLocaleString() })}</span>
      </div>
    </div>
  );
}
