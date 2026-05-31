import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { SparklesIcon, CheckIcon } from '@heroicons/react/20/solid'

export default function PricingPage() {
  const { t } = useTranslation('subscription');
  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetch('/api/payments/plans').then(r => r.json()),
  })
  const plans = data?.plans || []

  async function handlePurchase(planId: string) {
    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error?.message || t('pricing.error.createPayment'))
        return
      }
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      alert(t('pricing.error.network'))
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto px-8 py-10">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold mb-2">{t('pricing.title')}</h1>
        <p className="text-gray-500 dark:text-[#98989D]">{t('pricing.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-[#1F1F21] rounded-xl border border-gray-200 dark:border-[#303033] p-6 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-[#242426] rounded w-20 mb-4" />
              <div className="h-10 bg-gray-200 dark:bg-[#242426] rounded w-32 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map(j => <div key={j} className="h-4 bg-gray-200 dark:bg-[#242426] rounded" />)}
              </div>
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-[#6E6E73]">
          <SparklesIcon className="w-12 h-12 mx-auto mb-3" />
          <p>{t('pricing.emptyMessage')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {plans.map((plan: any) => (
            <div key={plan.id} className={`bg-white dark:bg-[#1F1F21] rounded-xl border-2 p-6 flex flex-col ${
              plan.type === 'MONTHLY' ? 'border-[#e8673a] shadow-md' : 'border-gray-200 dark:border-[#303033]'
            }`}>
              {plan.type === 'MONTHLY' && (
                <span className="text-xs font-semibold text-[#e8673a] dark:text-[#e8673a] bg-[#fde8df] dark:bg-[#3a1e14] px-2.5 py-0.5 rounded-full self-start mb-2">{t('pricing.recommended')}</span>
              )}
              <h2 className="text-lg font-bold mb-1">{plan.name}</h2>
              <div className="mb-4">
                <span className="text-3xl font-bold">¥{Number(plan.price).toFixed(2)}</span>
                {plan.type === 'MONTHLY' && <span className="text-gray-400 dark:text-[#6E6E73] text-sm">{t('pricing.monthly')}</span>}
                {plan.type === 'PAY_AS_YOU_GO' && <span className="text-gray-400 dark:text-[#6E6E73] text-sm ml-1">{t('pricing.startingFrom')}</span>}
              </div>
              <p className="text-sm text-gray-500 dark:text-[#98989D] mb-4">
                {t('pricing.quota', { amount: (Number(plan.quotaAmount) / 100000000).toFixed(0) })}
              </p>
              <ul className="space-y-2 mb-6 flex-1">
                {(t(`pricing.features.${plan.type}`, { returnObjects: true }) as string[] || []).map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-[#E5E5E7]">
                    <CheckIcon className="w-4 h-4 text-green-500 dark:text-[#30D158] mt-0.5 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => handlePurchase(plan.id)}
                className={`w-full py-2.5 rounded-lg font-medium text-sm ${
                  plan.type === 'MONTHLY'
                    ? 'bg-[#e8673a] hover:bg-[#d4562a] text-white'
                    : 'bg-gray-100 dark:bg-[#242426] hover:bg-gray-200 dark:hover:bg-[#2C2C2E] text-gray-700 dark:text-[#E5E5E7]'
                }`}>
                {t('pricing.buyNow')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
