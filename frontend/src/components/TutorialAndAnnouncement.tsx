import { useTranslation } from 'react-i18next';
import { BookOpenIcon, BellIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface TutorialItem {
  id: string;
  titleKey: string;
  descKey: string;
  badge?: 'NEW' | 'HOT';
  link: string;
}

interface AnnouncementItem {
  id: string;
  titleKey: string;
  descKey: string;
  date: string;
  badge?: 'NEW' | 'UPDATE';
  link?: string;
}

export default function TutorialAndAnnouncement() {
  const { t } = useTranslation('dashboard');

  const tutorials: TutorialItem[] = [
    { id: '1', titleKey: 'tutorial.items.openclaw.title', descKey: 'tutorial.items.openclaw.description', badge: 'HOT', link: '/docs/openclaw' },
    { id: '2', titleKey: 'tutorial.items.claudeCode.title', descKey: 'tutorial.items.claudeCode.description', badge: 'NEW', link: '/docs/claude-code' },
    { id: '3', titleKey: 'tutorial.items.apiKey.title', descKey: 'tutorial.items.apiKey.description', link: '/docs/api-key' },
    { id: '4', titleKey: 'tutorial.items.windows.title', descKey: 'tutorial.items.windows.description', link: '/docs/windows' },
    { id: '5', titleKey: 'tutorial.items.troubleshooting.title', descKey: 'tutorial.items.troubleshooting.description', link: '/docs/troubleshooting' },
  ];

  const announcements: AnnouncementItem[] = [
    { id: '1', titleKey: 'announcement.items.claude46.title', descKey: 'announcement.items.claude46.description', date: '2026-05-28', badge: 'NEW' },
    { id: '2', titleKey: 'announcement.items.maintenance.title', descKey: 'announcement.items.maintenance.description', date: '2026-05-27', badge: 'UPDATE' },
    { id: '3', titleKey: 'announcement.items.pricing.title', descKey: 'announcement.items.pricing.description', date: '2026-05-25' },
    { id: '4', titleKey: 'announcement.items.node.title', descKey: 'announcement.items.node.description', date: '2026-05-20' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      {/* Left: Tutorials */}
      <div className="bg-white dark:bg-[#1F1F21] rounded-2xl p-6 border border-gray-200 dark:border-[#303033]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#e8673a] flex items-center justify-center">
            <BookOpenIcon className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold">{t('tutorial.title')}</h2>
        </div>
        <div className="space-y-2 max-h-[160px] overflow-y-auto">
          {tutorials.map((item) => (
            <a
              key={item.id}
              href={item.link}
              className="block p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#242426]/50 transition-all duration-200 hover:-translate-y-0.5 group border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-[#E5E5E7] truncate">{t(item.titleKey)}</h3>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        item.badge === 'NEW' ? 'bg-green-100 dark:bg-[#30D158]/15 text-green-700 dark:text-[#30D158]' : 'bg-orange-100 dark:bg-[#F97346]/15 text-orange-700 dark:text-[#F97346]'
                      }`}>
                        {item.badge === 'NEW' ? t('tutorial.badge.new') : t('tutorial.badge.hot')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#98989D] line-clamp-1">{t(item.descKey)}</p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-400 dark:text-[#6E6E73] group-hover:text-[#e8673a] transition-colors flex-shrink-0 mt-0.5" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Right: Announcements */}
      <div className="bg-white dark:bg-[#1F1F21] rounded-2xl p-6 border border-gray-200 dark:border-[#303033]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#27ae60] flex items-center justify-center">
            <BellIcon className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold">{t('announcement.title')}</h2>
        </div>
        <div className="space-y-2 max-h-[160px] overflow-y-auto">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="block p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#242426]/50 transition-all duration-200 hover:-translate-y-0.5 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-[#E5E5E7] truncate">{t(item.titleKey)}</h3>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                      item.badge === 'NEW' ? 'bg-green-100 dark:bg-[#30D158]/15 text-green-700 dark:text-[#30D158]' : 'bg-blue-100 dark:bg-[#BF5AF2]/15 text-blue-700 dark:text-[#BF5AF2]'
                    }`}>
                      {item.badge === 'NEW' ? t('tutorial.badge.new') : t('announcement.badge.update')}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 dark:text-[#6E6E73] flex-shrink-0">{item.date}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-[#98989D] line-clamp-2">{t(item.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}