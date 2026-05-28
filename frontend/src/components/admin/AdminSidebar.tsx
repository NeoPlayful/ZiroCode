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
} from '@heroicons/react/24/outline';
import packageJson from '../../../package.json';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { key: 'dashboard', label: '概览', icon: HomeIcon },
  { key: 'users', label: '用户管理', icon: UsersIcon },
  { key: 'subscriptions', label: '订阅管理', icon: CreditCardIcon },
  { key: 'redeem-codes', label: '兑换码', icon: TicketIcon },
  { key: 'channels', label: '渠道管理', icon: ServerIcon },
  { key: 'withdrawals', label: '提现管理', icon: BanknotesIcon },
  { key: 'tickets', label: '工单系统', icon: ChatBubbleLeftRightIcon },
  { key: 'announcements', label: '系统公告', icon: MegaphoneIcon },
  { key: 'audit-logs', label: '审计日志', icon: DocumentTextIcon },
  { key: 'batch', label: '批量操作', icon: CommandLineIcon },
  { key: 'config', label: '系统设置', icon: Cog6ToothIcon },
];

export default function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                isActive
                  ? 'bg-[#FFF4F0] text-[#F97346]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
      <div className="m-3 p-3 bg-gray-50/50 border border-gray-100 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">系统运行正常</span>
        </div>
        <div className="text-[10px] text-gray-400">
          版本 v{packageJson.version}
        </div>
      </div>
    </aside>
  );
}
