import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const { t } = useTranslation('admin');
  const { data } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => fetch('/api/admin/stats').then((r) => r.json()),
  });

  const stats = data?.stats || {};

  const kpiCards = [
    {
      label: t('dashboard.totalUsers'),
      value: stats.users ?? '-',
      change: '+12.5%',
      trend: 'up',
      color: 'text-[#F97346]',
    },
    {
      label: t('dashboard.activeKeys'),
      value: stats.activeKeys ?? '-',
      change: '+8.2%',
      trend: 'up',
      color: 'text-green-600',
    },
    {
      label: t('dashboard.todayCalls'),
      value: stats.todayCalls ?? '-',
      change: '-3.1%',
      trend: 'down',
      color: 'text-blue-600',
    },
    {
      label: t('dashboard.totalCalls'),
      value: stats.totalCalls ?? '-',
      change: '+24.8%',
      trend: 'up',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-sm transition-shadow"
          >
            <div className="text-sm text-gray-500 mb-2">{card.label}</div>
            <div className="flex items-end justify-between">
              <div className={`text-3xl font-semibold ${card.color}`}>
                {card.value}
              </div>
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {card.trend === 'up' ? (
                  <ArrowUpIcon className="w-3 h-3" />
                ) : (
                  <ArrowDownIcon className="w-3 h-3" />
                )}
                {card.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart & Announcements */}
      <div className="grid grid-cols-3 gap-6">
        {/* Chart */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">{t('dashboard.apiTrend')}</h3>
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            {t('dashboard.chartPlaceholder')}
          </div>
        </div>

        {/* Announcements */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">{t('dashboard.announcements')}</h3>
          <div className="space-y-3">
            {[
              { title: '系统维护通知', date: '2026-05-28', badge: 'NEW' },
              { title: 'Claude 4.6 发布', date: '2026-05-27', badge: 'UPDATE' },
              { title: 'Token价格更新', date: '2026-05-25' },
            ].map((item, i) => (
              <div key={i} className="pb-3 border-b border-gray-100 last:border-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {item.title}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders & System Status */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">{t('dashboard.recentOrders')}</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium">订单 #{1000 + i}</div>
                  <div className="text-xs text-gray-400">user@example.com</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">¥99.00</div>
                  <div className="text-xs text-green-600">{t('dashboard.completed')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">{t('dashboard.systemStatus')}</h3>
          <div className="space-y-3">
            {[
              { name: t('dashboard.apiServer'), status: t('dashboard.running') },
              { name: t('dashboard.database'), status: t('dashboard.running') },
              { name: t('dashboard.redisCache'), status: t('dashboard.running') },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm text-gray-600">{item.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
