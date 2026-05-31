import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/outline';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-[#242426] rounded ${className || ''}`} />;
}

function formatQuota(value: number, t: any): string {
  if (value >= 100_000_000) return (value / 100_000_000).toFixed(1) + t('subscription:numberFormat.hundredMillion');
  if (value >= 10_000) return (value / 10_000).toFixed(1) + t('subscription:numberFormat.tenThousand');
  return value.toLocaleString();
}

export default function PlansPage() {
  const { t } = useTranslation('subscription');
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await fetch('/api/subscriptions/plans', { credentials: 'include' });
      if (!res.ok) throw new Error(t('plans.error.fetchFailed'));
      return res.json();
    },
  });

  const buyPlan = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch('/api/subscriptions/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || t('plans.error.purchaseFailed'));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setMessage(t('plans.purchaseSuccess'));
      setTimeout(() => setMessage(''), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10]">
        <main className="max-w-6xl mx-auto px-8 py-8">
          <Skeleton className="h-9 w-48 mb-6" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10]">
      <main className="max-w-6xl mx-auto px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E5E5E7] mb-2">{t('plans.title')}</h1>
        <p className="text-gray-600 dark:text-[#98989D] mb-8">{t('plans.subtitle')}</p>

        {message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-[#30D158]/10 border border-green-200 dark:border-[#30D158]/30 rounded-lg text-green-800 dark:text-green-200">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.plans?.map((plan: any) => (
            <div key={plan.id} className="bg-white dark:bg-[#1F1F21] rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 dark:text-[#E5E5E7] mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-[#e8673a]">¥{Number(plan.price).toFixed(2)}</span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <CheckIcon className="w-5 h-5 text-green-600 dark:text-[#30D158] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-[#E5E5E7]">{t('plans.quota')}{formatQuota(Number(plan.quotaAmount), t)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckIcon className="w-5 h-5 text-green-600 dark:text-[#30D158] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-[#E5E5E7]">
                    {t('plans.type')}{t(`types.${plan.type}`)}
                  </span>
                </div>
                {plan.durationDays && (
                  <div className="flex items-start gap-2">
                    <CheckIcon className="w-5 h-5 text-green-600 dark:text-[#30D158] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 dark:text-[#E5E5E7]">{t('plans.duration', { days: plan.durationDays })}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => buyPlan.mutate(plan.id)}
                disabled={buyPlan.isPending}
                className="w-full px-6 py-3 bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f] disabled:opacity-50 font-medium"
              >
                {buyPlan.isPending ? t('plans.purchasing') : t('plans.buyNow')}
              </button>
            </div>
          ))}
        </div>

        {buyPlan.isError && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-[#FF453A]/30 rounded-lg text-red-800 dark:text-red-200">
            {buyPlan.error?.message}
          </div>
        )}
      </main>
    </div>
  );
}
