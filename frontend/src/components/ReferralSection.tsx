import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  UsersIcon,
  BanknotesIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  UserIcon,
} from '@heroicons/react/16/solid'

export default function ReferralSection() {
  const { t } = useTranslation('referral')
  const { data, isLoading } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => fetch('/api/referral/stats').then(r => r.ok ? r.json() : { stats: null, referrals: [] }),
  })

  const stats = data?.stats || { totalReferrals: 0, totalReward: 0, claimedReward: 0, pendingReward: 0 }
  const referrals = data?.referrals || []
  const link = typeof window !== 'undefined' ? `${window.location.origin}/auth/register?ref=${data?.referralCode || ''}` : ''
  const [claiming, setClaiming] = useState(false)
  const [claimMsg, setClaimMsg] = useState('')

  async function handleClaim() {
    setClaiming(true)
    setClaimMsg('')
    try {
      const res = await fetch('/api/referral/claim', { method: 'POST' })
      const result = await res.json()
      setClaimMsg(result.message || t('claim.submitted'))
    } catch {
      setClaimMsg(t('claim.error'))
    } finally {
      setClaiming(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 shadow-sm mb-4 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-[#242426] rounded w-24 mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-[#242426] rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 shadow-sm mb-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-9 h-9 rounded-lg bg-[#fde8df] dark:bg-[#F97346]/12 flex items-center justify-center">
          <UsersIcon className="w-5 h-5 text-[#e8673a]" />
        </div>
        <h3 className="text-base font-semibold">{t('title')}</h3>
      </div>
      <p className="text-gray-400 dark:text-[#6E6E73] text-xs mb-4">{t('subtitle')}</p>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: UserIcon, bg: 'bg-[#fde8df] dark:bg-[#F97346]/12', iconColor: 'text-[#e8673a]', label: t('stats.referrals'), value: `${stats.totalReferrals}` },
          { icon: BanknotesIcon, bg: 'bg-[#d4f5e2] dark:bg-[#30D158]/10', iconColor: 'text-[#27ae60]', label: t('stats.claimed'), value: `¥${Number(stats.claimedReward).toFixed(2)}` },
          { icon: ClockIcon, bg: 'bg-[#fde8df] dark:bg-[#F97346]/12', iconColor: 'text-[#e8673a]', label: t('stats.pending'), value: `¥${Number(stats.pendingReward).toFixed(2)}` },
        ].map(({ icon: Icon, bg, iconColor, label, value }) => (
          <div key={label} className="bg-gray-50 dark:bg-[#242426]/50 rounded-lg p-3.5 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-[#98989D]">{label}</div>
              <div className="text-lg font-bold">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[13px] font-semibold mb-2">{t('link.title')}</p>
      <div className="flex gap-2 mb-1.5">
        <input readOnly value={link} className="flex-1 border border-gray-200 dark:border-[#303033] rounded-lg px-3 py-2 text-[13px] text-gray-600 dark:text-[#E5E5E7] bg-gray-50 dark:bg-[#242426] focus:outline-none focus:border-[#e8673a]" />
        <button onClick={() => navigator.clipboard.writeText(link)} className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
          <ArrowPathIcon className="w-4 h-4" /> {t('link.copy')}
        </button>
      </div>
      <p className="text-xs text-gray-300 dark:text-gray-600 mb-4">{t('link.hint')}</p>

      <div className="bg-[#fffbf0] dark:bg-[#FF9F0A]/10 border border-[#f5e8c0] dark:border-[#FF9F0A]/30 rounded-lg p-3.5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg bg-[#fde8df] flex items-center justify-center flex-shrink-0">
            <ClipboardDocumentListIcon className="w-5 h-5 text-[#e8673a]" />
          </div>
          <h4 className="text-[13px] font-semibold">{t('rules.title')}</h4>
        </div>
        <ol className="list-decimal pl-4 space-y-1">
          {(t('rules.items', { returnObjects: true }) as string[] || []).map((rule, i) => (
            <li key={i} className="text-[13px] text-gray-600 dark:text-[#98989D] leading-relaxed">{rule}</li>
          ))}
        </ol>
      </div>

      {Number(stats.pendingReward) > 0 && (
        <div className="flex items-center justify-between bg-[#fde8df] dark:bg-[#F97346]/12 rounded-lg p-3.5 mb-4">
          <div>
            <p className="text-sm font-semibold">{t('claim.title')}</p>
            <p className="text-lg font-bold text-[#e8673a]">¥{Number(stats.pendingReward).toFixed(2)}</p>
          </div>
          <button onClick={handleClaim} disabled={claiming}
            className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {claiming ? t('claim.buttonInProgress') : t('claim.button')}
          </button>
        </div>
      )}
      {claimMsg && (
        <div className="bg-green-50 dark:bg-[#30D158]/10 border border-green-200 dark:border-[#30D158]/30 rounded-lg p-3 text-sm text-green-700 dark:text-[#30D158] mb-4">{claimMsg}</div>
      )}

      {referrals.length === 0 ? (
        <div className="text-center py-8 text-gray-300 dark:text-gray-600">
          <CurrencyDollarIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-[13px]">{t('empty.title')}</p>
          <p className="text-[13px]">{t('empty.subtitle')}</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-base font-semibold">{t('history.title')}</span>
            <span className="text-xs text-gray-300 dark:text-gray-600">{t('history.recent', { count: referrals.length })}</span>
          </div>
          <div className="space-y-2">
            {referrals.slice(0, 10).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-[#303033] last:border-0">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-gray-400 dark:text-[#6E6E73]">{new Date(r.joinedAt).toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-semibold text-green-600">+¥{r.reward?.toFixed(2) || '0.00'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}