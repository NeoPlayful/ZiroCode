import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/20/solid';
import { useTranslation } from 'react-i18next';

interface AdminTopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'API Keys' },
  { key: 'subscriptions', label: 'Subscription' },
  { key: 'usage', label: 'Usage' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'admin', label: 'Admin' },
];

export default function AdminTopNav({ activeTab, onTabChange }: AdminTopNavProps) {
  const { t } = useTranslation('common');

  return (
    <nav className="bg-white dark:bg-[#1F1F21] border-b border-gray-200 dark:border-[#303033] sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 font-semibold text-lg">
          <SparklesIcon className="w-6 h-6 text-[#F97346]" />
          <span>ZiroCode</span>
        </div>

        {/* Center Nav */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === item.key
                  ? 'bg-[#FFF4F0] dark:bg-[#2d1a14] text-[#F97346]'
                  : 'text-gray-600 dark:text-[#E5E5E7] hover:text-gray-900 dark:hover:text-[#F5F5F7] hover:bg-gray-50 dark:hover:bg-[#242426]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-[#242426] flex items-center justify-center transition-colors">
            <BellIcon className="w-5 h-5 text-gray-600 dark:text-[#E5E5E7]" />
          </button>
          <button className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#242426] flex items-center justify-center">
            <UserCircleIcon className="w-5 h-5 text-gray-600 dark:text-[#E5E5E7]" />
          </button>
        </div>
      </div>
    </nav>
  );
}
