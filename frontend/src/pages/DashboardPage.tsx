import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import ReferralSection from '../components/ReferralSection';
import TutorialAndAnnouncement from '../components/TutorialAndAnnouncement';
import { BoltIcon, BanknotesIcon, CalendarDaysIcon, CheckCircleIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/16/solid';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-[#242426] rounded ${className || ''}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10]">
      <main className="max-w-[1280px] mx-auto px-8 py-8">
        <Skeleton className="h-9 w-64 mb-1" />
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 mb-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </main>
    </div>
  );
}

function formatQuota(value: number, t: any): string {
  if (value >= 100_000_000) return (value / 100_000_000).toFixed(1) + t('dashboard:numberFormat.hundredMillion');
  if (value >= 10_000) return (value / 10_000).toFixed(1) + t('dashboard:numberFormat.tenThousand');
  return value.toLocaleString();
}

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/user/dashboard').then(r => {
      if (!r.ok) throw new Error(t('error.fetchFailed'));
      return r.json();
    }),
  });

  const { data: annData } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => fetch('/api/announcements').then(r => r.json()),
    staleTime: 60 * 1000,
  })
  const announcements = annData?.announcements?.filter((a: any) => !a.isRead) || []

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10] flex items-center justify-center">
        <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-8 text-center border border-gray-200 dark:border-[#303033]">
          <ExclamationTriangleIcon className="w-10 h-10 text-[#e8673a] mx-auto mb-2" />
          <p className="text-gray-600 dark:text-[#98989D] mb-4">{t('error.loadFailed')}</p>
          <button onClick={() => window.location.reload()} className="bg-[#e8673a] text-white px-6 py-2 rounded-lg text-sm">
            {t('error.refreshButton')}
          </button>
        </div>
      </div>
    );
  }

  const user = data?.user || { name: t('defaultUserName') };
  const quota = data?.quota || { payAsYouGo: { remaining: 0 }, monthly: { remaining: null } };
  const subs = data?.subscriptions || [];

  return (
    <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10]">
      <main className="max-w-[1280px] mx-auto px-8 py-8">
        <h1 className="text-3xl font-bold mb-1">{t('welcome', { name: user.name })}</h1>
        <p className="text-gray-500 dark:text-[#98989D] text-sm mb-6">{t('subtitle')}</p>

        {/* 公告 */}
        {announcements.length > 0 && (
          <div className="mb-4 space-y-2">
            {announcements.slice(0, 3).map((a: any) => (
              <div key={a.id} className="bg-[#fffbf0] dark:bg-[#FF9F0A]/10 border border-[#f5e8c0] dark:border-[#FF9F0A]/30 rounded-xl px-4 py-3 flex items-start gap-2">
                <span className="text-yellow-600 dark:text-[#FF9F0A] text-sm flex-shrink-0 mt-0.5">📢</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-gray-500 dark:text-[#98989D] line-clamp-2">{a.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Row 1 */}
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 mb-4">
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-[#e8673a] flex items-center justify-center flex-shrink-0">
                <BoltIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-base">{t('quota.title')}</div>
                <p className="text-gray-400 dark:text-[#6E6E73] text-xs">{t('quota.subtitle')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#fef3ee] dark:bg-orange-900/20 border border-[#f5d5c5] dark:border-[#F97346]/30 rounded-lg p-3 flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#e8673a] flex items-center justify-center flex-shrink-0">
                  <BanknotesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-[#98989D]">{t('quota.payAsYouGo')}</div>
                  <div className="text-xl font-bold">{formatQuota(quota.payAsYouGo.remaining, t)}</div>
                </div>
              </div>
              <div className="bg-[#edfaf3] dark:bg-[#30D158]/10 border border-[#b8ecd4] dark:border-[#30D158]/30 rounded-lg p-3 flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#27ae60] flex items-center justify-center flex-shrink-0">
                  <CalendarDaysIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-[#98989D]">{t('quota.monthly')}</div>
                  <div className="text-xl font-bold">{quota.monthly?.remaining !== null && quota.monthly?.remaining !== undefined ? formatQuota(quota.monthly.remaining, t) : '0'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#27ae60] flex items-center justify-center flex-shrink-0">
                <CheckCircleIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-[#98989D]">{t('subscription.activeTitle')}</div>
                <div className="text-lg font-bold">{subs.length} {t('subscription.plansUnit')}</div>
              </div>
            </div>
            <a href="/subscription" className="block w-full bg-[#e8673a] hover:bg-[#d4562a] text-white py-2.5 rounded-lg text-sm font-medium text-center">
              {t('subscription.viewDetails')}
            </a>
          </div>

          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-5 border border-gray-200 dark:border-[#303033]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#27ae60] flex items-center justify-center flex-shrink-0">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-[#98989D]">{t('subscription.statusTitle')}</div>
                <div className="text-lg font-bold">{subs.some((s: any) => s.type === 'PERMANENT') ? t('subscription.statusPermanent') : subs.length > 0 ? t('subscription.statusValid') : t('subscription.statusNone')}</div>
              </div>
            </div>
            <a href="/subscription" className="block w-full bg-[#e8673a] hover:bg-[#d4562a] text-white py-2.5 rounded-lg text-sm font-medium text-center">
              {t('subscription.purchaseCode')}
            </a>
          </div>
        </div>

        {/* Row 2 - Tutorial & Announcement */}
        <TutorialAndAnnouncement />

        {/* Row 3 - Referral */}
        <ReferralSection />
      </main>
    </div>
  );
}
