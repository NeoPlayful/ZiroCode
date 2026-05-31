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
        <p className="text-sm text-gray-500 dark:text-[#98989D] mb-6">{t('subtitle')}</p>

        {/* 兑换码区域 */}
        <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-6 border border-gray-200 dark:border-[#303033] mb-6">
          <h2 className="font-semibold mb-1">{t('redeem.title')}</h2>
          <p className="text-sm text-gray-400 dark:text-[#6E6E73] mb-4">{t('redeem.subtitle')}</p>

          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-[#FF453A]/30 rounded-lg p-3 mb-3 text-sm text-red-600 dark:text-[#FF453A]">{error}</div>}
          {success && <div className="bg-green-50 dark:bg-[#30D158]/10 border border-green-200 dark:border-[#30D158]/30 rounded-lg p-3 mb-3 text-sm text-green-600 dark:text-[#30D158]">{success}</div>}

          <div className="flex gap-2">
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              className="flex-1 border border-gray-200 dark:border-[#303033] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#e8673a] uppercase"
              placeholder={t('redeem.placeholder')} />
            <button onClick={() => redeemMutation.mutate(code)} disabled={!code || redeemMutation.isPending}
              className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {redeemMutation.isPending ? t('redeem.redeeming') : t('redeem.button')}
            </button>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-6 border border-gray-200 dark:border-[#303033] mb-6">
          <h2 className="font-semibold mb-4">使用说明</h2>
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#e8673a] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">1</span>
              <p className="text-sm text-gray-500 dark:text-[#98989D]">在上方输入框中输入您获得的兑换码</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#e8673a] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">2</span>
              <p className="text-sm text-gray-500 dark:text-[#98989D]">点击"立即兑换"按钮进行验证</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#e8673a] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">3</span>
              <p className="text-sm text-gray-500 dark:text-[#98989D]">兑换成功后，订阅将立即生效</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#e8673a] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">4</span>
              <p className="text-sm text-gray-500 dark:text-[#98989D]">前往控制台查看您的订阅详情和使用情况</p>
            </div>
          </div>

          <div className="border border-amber-200 dark:border-amber-400/30 bg-amber-50/50 dark:bg-amber-400/5 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-[#E5E5E7] mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              温馨提示</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-[#98989D]">
                <span className="text-[#e8673a] mt-0.5">•</span>
                <span>每个兑换码只能使用一次</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-[#98989D]">
                <span className="text-[#e8673a] mt-0.5">•</span>
                <span>兑换码可能有有效期限制，请及时使用</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-[#98989D]">
                <span className="text-[#e8673a] mt-0.5">•</span>
                <span>兑换后的订阅将从当前时间开始计算</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-[#98989D]">
                <span className="text-[#e8673a] mt-0.5">•</span>
                <span>如有问题请联系客服支持</span>
              </div>
            </div>
          </div>
        </div>

        {/* 订阅列表 */}
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-[#242426] rounded-xl" />)}
          </div>
        ) : subs.length === 0 ? (
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-12 text-center border border-gray-200 dark:border-[#303033]">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-gray-500 dark:text-[#98989D] mb-2">{t('emptyState.message')}</p>
            <p className="text-sm text-gray-400 dark:text-[#6E6E73]">{t('emptyState.hint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subs.map((sub: any) => {
              const total = Number(sub.quotaTotal || 0);
              const used = Number(sub.quotaUsed || 0);
              const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
              const hasMonthly = sub.type === 'MONTHLY' && sub.quotaMonthly;

              return (
                <div key={sub.id} className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033]">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-semibold">{typeLabel(sub.type)}</span>
                      <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sub.isActive ? 'bg-green-50 dark:bg-[#30D158]/10 text-green-600 dark:text-[#30D158]' : 'bg-gray-100 dark:bg-[#242426] text-gray-400 dark:text-[#6E6E73]'}`}>
                        {sub.isActive ? t('status.active') : t('status.expired')}
                      </span>
                    </div>
                    {sub.expiresAt && (
                      <span className="text-xs text-gray-400 dark:text-[#6E6E73]">{t('details.expires')} {new Date(sub.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>

                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-[#98989D]">{t('details.usage')}</span>
                    <span>{formatQuota(used, t)} / {formatQuota(total, t)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-[#242426] rounded-full h-2">
                    <div className="bg-[#e8673a] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>

                  {hasMonthly && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#303033]">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-[#98989D]">{t('details.monthlyQuota')}</span>
                        <span>{formatQuota(Number(sub.quotaMonthlyUsed || 0), t)} / {formatQuota(Number(sub.quotaMonthly), t)}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-[#242426] rounded-full h-1.5">
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
