import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export default function SubscriptionPage() {
  const { t } = useTranslation('subscription');
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => fetch('/api/subscriptions').then(r => r.json()),
  });

  const redeemMutation = useMutation({
    mutationFn: (redeemCode: string) =>
      fetch('/api/subscriptions/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: redeemCode }),
      }).then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error?.message || t('redeem.error'));
        return data;
      }),
    onSuccess: (data) => {
      setSuccess(t('redeem.success', { quota: (Number(data.subscription.quotaTotal) / 100000000).toFixed(1) }));
      setCode('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess('');
    },
  });

  const subs = data?.subscriptions || [];

  function formatQuota(v: number | bigint, t: any): string {
    const n = Number(v);
    if (n >= 100_000_000) return (n / 100_000_000).toFixed(2) + t('subscription:numberFormat.hundredMillion');
    if (n >= 10_000) return (n / 10_000).toFixed(1) + t('subscription:numberFormat.tenThousand');
    return n.toLocaleString();
  }

  function typeLabel(type: string): string {
    return t(`types.${type}`, { defaultValue: type });
  }

  return (
    <main className="max-w-[1280px] mx-auto px-8 py-8">
        <h1 className="text-2xl font-bold mb-1">{t('title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('subtitle')}</p>

        {/* 兑换码区域 */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
          <h2 className="font-semibold mb-1">{t('redeem.title')}</h2>
          <p className="text-sm text-gray-400 mb-4">{t('redeem.subtitle')}</p>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-sm text-red-600">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 text-sm text-green-600">{success}</div>}

          <div className="flex gap-2">
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#e8673a] uppercase"
              placeholder={t('redeem.placeholder')} />
            <button onClick={() => redeemMutation.mutate(code)} disabled={!code || redeemMutation.isPending}
              className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {redeemMutation.isPending ? t('redeem.redeeming') : t('redeem.button')}
            </button>
          </div>
        </div>

        {/* 订阅列表 */}
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
          </div>
        ) : subs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-gray-500 mb-2">{t('emptyState.message')}</p>
            <p className="text-sm text-gray-400">{t('emptyState.hint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subs.map((sub: any) => {
              const total = Number(sub.quotaTotal || 0);
              const used = Number(sub.quotaUsed || 0);
              const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
              const hasMonthly = sub.type === 'MONTHLY' && sub.quotaMonthly;

              return (
                <div key={sub.id} className="bg-white rounded-xl p-5 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-semibold">{typeLabel(sub.type)}</span>
                      <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sub.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {sub.isActive ? t('status.active') : t('status.expired')}
                      </span>
                    </div>
                    {sub.expiresAt && (
                      <span className="text-xs text-gray-400">{t('details.expires')} {new Date(sub.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>

                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-gray-500">{t('details.usage')}</span>
                    <span>{formatQuota(used, t)} / {formatQuota(total, t)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#e8673a] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>

                  {hasMonthly && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">{t('details.monthlyQuota')}</span>
                        <span>{formatQuota(Number(sub.quotaMonthlyUsed || 0), t)} / {formatQuota(Number(sub.quotaMonthly), t)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-[#27ae60] h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.round((Number(sub.quotaMonthlyUsed || 0) / Number(sub.quotaMonthly)) * 100))}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
  );
}
