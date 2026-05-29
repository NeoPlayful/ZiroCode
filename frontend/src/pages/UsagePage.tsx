import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as echarts from 'echarts';

export default function UsagePage() {
  const { t } = useTranslation('usage');
  const [days, setDays] = useState(7);

  const { data, isLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: () => fetch('/api/user/usage').then(r => r.json()),
  });

  if (isLoading) {
    return (
      <main className="max-w-[1280px] mx-auto px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-64 bg-gray-200 rounded" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
            </div>
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </main>
    );
  }

  const total = data?.total || { calls: 0, tokens: 0, quota: 0 };
  const daily = (data?.daily || []).slice(-days);
  const byModel = data?.byModel || [];
  const recent = data?.recent || [];

  return (
    <main className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('usage.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('usage.subtitle')}</p>
          </div>
          <div className="flex gap-1">
            {[7, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-md text-sm ${days === d ? 'bg-[#e8673a] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                {t('usage.lastDays', { days: d })}
              </button>
            ))}
          </div>
        </div>

        {/* 汇总卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">{t('usage.summary.totalCalls')}</div>
            <div className="text-2xl font-bold">{total.calls.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">{t('usage.summary.totalTokens')}</div>
            <div className="text-2xl font-bold">{total.tokens.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">{t('usage.summary.quotaConsumed')}</div>
            <div className="text-2xl font-bold">{total.quota.toLocaleString()}</div>
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-500">{t('usage.emptyState.message')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('usage.emptyState.hint')}</p>
          </div>
        ) : (
          <>
            {/* 24小时各模型花费趋势 */}
            <HourlyTrendChart data={data?.hourly} t={t} />

            {/* 模型分布 */}
            {byModel.length > 0 && (
              <div className="bg-white rounded-xl p-5 border border-gray-200 mb-6">
                <h3 className="font-semibold mb-4">{t('usage.modelDistribution.title')}</h3>
                <div className="space-y-3">
                  {byModel.map((m: any) => {
                    const totalCalls = byModel.reduce((s: number, x: any) => s + x.calls, 0);
                    const pct = totalCalls > 0 ? Math.round((m.calls / totalCalls) * 100) : 0;
                    return (
                      <div key={m.model}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{m.model}</span>
                          <span className="text-gray-500">{m.calls} {t('usage.modelDistribution.times')} / {m.tokens.toLocaleString()} tokens</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-[#e8673a] h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 最近记录 */}
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <h3 className="font-semibold mb-4">{t('usage.recentRecords.title')}</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-2 py-2 text-xs text-gray-400 font-medium">{t('usage.recentRecords.time')}</th>
                    <th className="text-left px-2 py-2 text-xs text-gray-400 font-medium">{t('usage.recentRecords.model')}</th>
                    <th className="text-right px-2 py-2 text-xs text-gray-400 font-medium">{t('usage.recentRecords.token')}</th>
                    <th className="text-right px-2 py-2 text-xs text-gray-400 font-medium">{t('usage.recentRecords.quota')}</th>
                    <th className="text-right px-2 py-2 text-xs text-gray-400 font-medium">{t('usage.recentRecords.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.slice(0, 20).map((log: any) => (
                    <tr key={log.id} className="border-b border-gray-50">
                      <td className="px-2 py-2 text-sm text-gray-500">{new Date(log.requestTime).toLocaleString()}</td>
                      <td className="px-2 py-2 text-sm">{log.model}</td>
                      <td className="px-2 py-2 text-sm text-right">{log.tokensUsed.toLocaleString()}</td>
                      <td className="px-2 py-2 text-sm text-right">{Number(log.quotaUsed).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${log.statusCode < 400 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {log.statusCode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
  );
}

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function HourlyTrendChart({ data, t }: { data: any; t: any }) {
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
        backgroundColor: 'rgba(34,34,34,0.9)',
        borderColor: 'transparent',
        textStyle: { color: '#fff', fontSize: 12, fontWeight: 600 },
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
        textStyle: { color: '#6b7280', fontSize: 11 },
      },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        name: `⏰ ${t('usage.dailyTrends.timeLabel')}`,
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: { fontWeight: 700, fontSize: 12, color: '#1f2937' },
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 11, interval: 0 },
      },
      yAxis: {
        type: 'value',
        name: `💰 ${t('usage.dailyTrends.costLabel')}`,
        nameLocation: 'middle',
        nameGap: 60,
        max: Math.ceil(maxVal * 1.2),
        nameTextStyle: { fontWeight: 700, fontSize: 12, color: '#1f2937' },
        axisLabel: { color: '#6b7280', fontSize: 11, formatter: (v: number) => v.toLocaleString() },
        splitLine: { lineStyle: { color: '#eef0f4' } },
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
  }, [data]);

  if (!data?.slots) return null;

  const totalModels = data.models?.length || 0;
  const totalCalls = data.slots.reduce((s: number, slot: any) =>
    s + Object.values(slot.models).reduce((sum: number, m: any) => sum + m.calls, 0), 0);

  return (
    <div style={{
      background: '#fff', marginBottom: 24, padding: '28px 36px 20px',
      borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <h2 style={{ margin: 0, fontSize: 20, color: '#111827', fontWeight: 700 }}>
        {t('usage.dailyTrends.title')}
      </h2>
      <p style={{ margin: '8px 0 16px', fontSize: 14, color: '#6b7280' }}>
        {t('usage.dailyTrends.subtitle')}
      </p>

      <div ref={chartRef} style={{ width: '100%', height: 300 }} />

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        color: '#64748b', fontSize: 13, padding: '8px 4px 0',
      }}>
        <span>📊 {t('usage.dailyTrends.footer')}</span>
        <span>{t('usage.dailyTrends.modelCount', { n: totalModels })}，{t('usage.dailyTrends.callCount', { n: totalCalls.toLocaleString() })}</span>
      </div>
    </div>
  );
}
