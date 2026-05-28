import { BookOpenIcon, BellIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface TutorialItem {
  id: string;
  title: string;
  description: string;
  badge?: 'NEW' | 'HOT';
  link: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  date: string;
  badge?: 'NEW' | '更新';
  link?: string;
}

const tutorials: TutorialItem[] = [
  { id: '1', title: 'OpenClaw 快速配置', description: '5分钟完成 OpenClaw 客户端配置', badge: 'HOT', link: '/docs/openclaw' },
  { id: '2', title: 'Claude Code 接入教程', description: '将 API 接入 Claude Code 使用', badge: 'NEW', link: '/docs/claude-code' },
  { id: '3', title: 'API Key 获取指南', description: '创建和管理您的 API 密钥', link: '/docs/api-key' },
  { id: '4', title: 'Windows 配置指南', description: 'Windows 系统环境配置步骤', link: '/docs/windows' },
  { id: '5', title: '常见报错解决方案', description: '快速定位和解决常见问题', link: '/docs/troubleshooting' },
];

const announcements: AnnouncementItem[] = [
  { id: '1', title: 'Claude 4.6 模型上线', description: '全新 Sonnet 4.6 模型现已可用，性能提升 30%', date: '2026-05-28', badge: 'NEW' },
  { id: '2', title: '系统维护通知', description: '5月30日凌晨2:00-4:00进行系统升级', date: '2026-05-27', badge: '更新' },
  { id: '3', title: 'Token 计费优化', description: '优化计费算法，平均降低 15% 成本', date: '2026-05-25' },
  { id: '4', title: '新增节点上线', description: '美西节点已上线，延迟降低 40%', date: '2026-05-20' },
];

export default function TutorialAndAnnouncement() {
  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      {/* 左侧：官方教程 */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#e8673a] flex items-center justify-center">
            <BookOpenIcon className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold">官方教程</h2>
        </div>
        <div className="space-y-2 max-h-[160px] overflow-y-auto">
          {tutorials.map((item) => (
            <a
              key={item.id}
              href={item.link}
              className="block p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5 group border border-transparent hover:border-gray-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{item.title}</h3>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        item.badge === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-[#e8673a] transition-colors flex-shrink-0 mt-0.5" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 右侧：系统公告 */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#27ae60] flex items-center justify-center">
            <BellIcon className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold">系统公告</h2>
        </div>
        <div className="space-y-2 max-h-[160px] overflow-y-auto">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="block p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5 border border-transparent hover:border-gray-200"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{item.title}</h3>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                      item.badge === 'NEW' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{item.date}</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
