import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

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
            {/* 每日趋势 */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 mb-6">
              <h3 className="font-semibold mb-4">{t('usage.dailyTrends.title')}</h3>
              {daily.length > 0 ? (
                <div className="flex items-end gap-2 h-40">
                  {daily.map((d: any) => {
                    const max = Math.max(...daily.map((x: any) => x.calls), 1);
                    const h = (d.calls / max) * 100;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-400">{d.calls}</span>
                        <div className="w-full bg-[#fde8df] rounded-t relative" style={{ height: `${h}%` }}>
                          <div className="absolute bottom-0 w-full bg-[#e8673a] rounded-t transition-all" style={{ height: `${h}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{d.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">{t('usage.dailyTrends.noData')}</p>
              )}
            </div>

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
