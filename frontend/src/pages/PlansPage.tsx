import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className || ''}`} />;
}

function formatQuota(value: number): string {
  if (value >= 100_000_000) return (value / 100_000_000).toFixed(1) + '亿';
  if (value >= 10_000) return (value / 10_000).toFixed(1) + '万';
  return value.toLocaleString();
}

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await fetch('/api/subscriptions/plans', { credentials: 'include' });
      if (!res.ok) throw new Error('获取套餐列表失败');
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
        throw new Error(err.error?.message || '购买失败');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setMessage('购买成功！');
      setTimeout(() => setMessage(''), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0ebe3]">
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
    <div className="min-h-screen bg-[#f0ebe3]">
      <main className="max-w-6xl mx-auto px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">订阅套餐</h1>
        <p className="text-gray-600 mb-8">选择适合您的套餐方案</p>

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.plans?.map((plan: any) => (
            <div key={plan.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-[#e8673a]">¥{Number(plan.price).toFixed(2)}</span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">配额：{formatQuota(Number(plan.quotaAmount))}</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">
                    类型：{plan.type === 'PAY_AS_YOU_GO' ? '按量付费' : plan.type === 'MONTHLY' ? '月卡' : '永久'}
                  </span>
                </div>
                {plan.durationDays && (
                  <div className="flex items-start gap-2">
                    <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">有效期：{plan.durationDays} 天</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => buyPlan.mutate(plan.id)}
                disabled={buyPlan.isPending}
                className="w-full px-6 py-3 bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f] disabled:opacity-50 font-medium"
              >
                {buyPlan.isPending ? '购买中...' : '立即购买'}
              </button>
            </div>
          ))}
        </div>

        {buyPlan.isError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {buyPlan.error?.message}
          </div>
        )}
      </main>
    </div>
  );
}
