import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function UsagePage() {
  const [days, setDays] = useState(7);

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

  return (
    <main className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">使用统计</h1>
            <p className="text-sm text-gray-500 dark:text-[#98989D] mt-1">查看您的 API 调用情况</p>
          </div>
          <div className="flex gap-1">
            {[7, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-md text-sm ${days === d ? 'bg-[#e8673a] text-white' : 'bg-white dark:bg-[#1F1F21] text-gray-600 dark:text-[#E5E5E7] border border-gray-200 dark:border-[#303033]'}`}>
                近{d}天
              </button>
            ))}
          </div>
        </div>

        {/* 汇总卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033]">
            <div className="text-sm text-gray-500 dark:text-[#98989D] mb-1">总调用次数</div>
            <div className="text-2xl font-bold">{total.calls.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033]">
            <div className="text-sm text-gray-500 dark:text-[#98989D] mb-1">总 Token 数</div>
            <div className="text-2xl font-bold">{total.tokens.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033]">
            <div className="text-sm text-gray-500 dark:text-[#98989D] mb-1">消耗配额</div>
            <div className="text-2xl font-bold">{total.quota.toLocaleString()}</div>
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-12 text-center border border-gray-200 dark:border-[#303033]">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-500 dark:text-[#98989D]">暂无使用记录</p>
            <p className="text-sm text-gray-400 dark:text-[#6E6E73] mt-1">调用 API 后将在此显示统计数据</p>
          </div>
        ) : (
          <>
            {/* 每日趋势 */}
            <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033] mb-6">
              <h3 className="font-semibold mb-4">每日调用趋势</h3>
              {daily.length > 0 ? (
                <div className="flex items-end gap-2 h-40">
                  {daily.map((d: any) => {
                    const max = Math.max(...daily.map((x: any) => x.calls), 1);
                    const h = (d.calls / max) * 100;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-400 dark:text-[#6E6E73]">{d.calls}</span>
                        <div className="w-full bg-[#fde8df] dark:bg-[#F97346]/20 rounded-t relative" style={{ height: `${h}%` }}>
                          <div className="absolute bottom-0 w-full bg-[#e8673a] dark:bg-[#D96B3A] rounded-t transition-all" style={{ height: `${h}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 dark:text-[#6E6E73]">{d.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-[#6E6E73] text-center py-8">暂无每日数据</p>
              )}
            </div>

            {/* 模型分布 */}
            {byModel.length > 0 && (
              <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033] mb-6">
                <h3 className="font-semibold mb-4">模型使用分布</h3>
                <div className="space-y-3">
                  {byModel.map((m: any) => {
                    const totalCalls = byModel.reduce((s: number, x: any) => s + x.calls, 0);
                    const pct = totalCalls > 0 ? Math.round((m.calls / totalCalls) * 100) : 0;
                    return (
                      <div key={m.model}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{m.model}</span>
                          <span className="text-gray-500 dark:text-[#98989D]">{m.calls} 次 / {m.tokens.toLocaleString()} tokens</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-[#242426] rounded-full h-2">
                          <div className="bg-[#e8673a] dark:bg-[#D96B3A] h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 最近记录 */}
            <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033]">
              <h3 className="font-semibold mb-4">最近调用记录</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#303033]">
                    <th className="text-left px-2 py-2 text-xs text-gray-400 dark:text-[#98989D] font-medium">时间</th>
                    <th className="text-left px-2 py-2 text-xs text-gray-400 dark:text-[#98989D] font-medium">模型</th>
                    <th className="text-right px-2 py-2 text-xs text-gray-400 dark:text-[#98989D] font-medium">Token</th>
                    <th className="text-right px-2 py-2 text-xs text-gray-400 dark:text-[#98989D] font-medium">配额</th>
                    <th className="text-right px-2 py-2 text-xs text-gray-400 dark:text-[#98989D] font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.slice(0, 20).map((log: any) => (
                    <tr key={log.id} className="border-b border-gray-50 dark:border-[#303033]/50">
                      <td className="px-2 py-2 text-sm text-gray-500 dark:text-[#98989D]">{new Date(log.requestTime).toLocaleString()}</td>
                      <td className="px-2 py-2 text-sm">{log.model}</td>
                      <td className="px-2 py-2 text-sm text-right">{log.tokensUsed.toLocaleString()}</td>
                      <td className="px-2 py-2 text-sm text-right">{Number(log.quotaUsed).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${log.statusCode < 400 ? 'bg-green-50 dark:bg-[#30D158]/15 text-green-600 dark:text-[#30D158]' : 'bg-red-50 dark:bg-[#FF453A]/15 text-red-600 dark:text-[#FF453A]'}`}>
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
