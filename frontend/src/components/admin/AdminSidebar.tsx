import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  TicketIcon,
  ServerIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  CommandLineIcon,
  Cog6ToothIcon,
  ArrowRightEndOnRectangleIcon,
  ChartBarSquareIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import packageJson from '../../../package.json';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { t } = useTranslation('admin');

  const menuItems = [
    { key: 'dashboard', label: t('sidebar.dashboard'), icon: HomeIcon },
    { key: 'users', label: t('sidebar.users'), icon: UsersIcon },
    { key: 'subscriptions', label: t('sidebar.subscriptions'), icon: CreditCardIcon },
    { key: 'redeem-codes', label: t('sidebar.redeemCodes'), icon: TicketIcon },
    { key: 'channels', label: t('sidebar.channels'), icon: ServerIcon },
    { key: 'routes', label: t('sidebar.routes') || '路由管理', icon: ArrowRightEndOnRectangleIcon },
    { key: 'withdrawals', label: t('sidebar.withdrawals'), icon: BanknotesIcon },
    { key: 'tickets', label: t('sidebar.tickets'), icon: ChatBubbleLeftRightIcon },
    { key: 'announcements', label: t('sidebar.announcements'), icon: MegaphoneIcon },
    { key: 'analytics', label: t('sidebar.analytics') || '数据分析', icon: ChartBarSquareIcon },
    { key: 'billing', label: '计费报表', icon: BanknotesIcon },
    { key: 'audit-logs', label: t('sidebar.auditLogs'), icon: DocumentTextIcon },
    { key: 'batch', label: t('sidebar.batch'), icon: CommandLineIcon },
    { key: 'config', label: t('sidebar.config'), icon: Cog6ToothIcon },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#161618] border-r border-gray-200 dark:border-[#303033] h-full flex flex-col">
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${
                isActive
                  ? 'bg-[#FFF4F0] dark:bg-[#F97346]/12 text-[#F97346]'
                  : 'text-gray-600 dark:text-[#E5E5E7] hover:bg-gray-50 dark:hover:bg-[#242426] hover:text-gray-900 dark:hover:text-[#F5F5F7]'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#F97346] rounded-r-full" />
              )}
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Status */}
      <div className="m-3 p-3 bg-gray-50/50 dark:bg-[#242426]/50 border border-gray-100 dark:border-[#303033] rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600 dark:text-[#E5E5E7]">{t('sidebar.statusNormal')}</span>
        </div>
        <div className="text-[10px] text-gray-400 dark:text-[#6E6E73]">
          {t('sidebar.version', { version: packageJson.version })}
        </div>
      </div>
    </aside>
  );
}
