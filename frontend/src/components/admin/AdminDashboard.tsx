import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import ReactEChartsCore from 'echarts-for-react';

export default function AdminDashboard() {
  const { t } = useTranslation('admin');
  const [period, setPeriod] = useState('24h');
  const [metric, setMetric] = useState('requests');

  const { data } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => fetch('/api/admin/stats').then((r) => r.json()),
  });

  const { data: trends } = useQuery({
    queryKey: ['admin-dashboard-trends', period, metric],
    queryFn: () => fetch(`/api/admin/analytics/trends?period=${period}&metric=${metric}&granularity=${period === '24h' ? 'hour' : 'day'}`).then((r) => r.json()),
    refetchInterval: 60000,
  });

  const stats = data?.stats || {};

  const trendOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 50, right: 16, top: 30, bottom: 24 },
    xAxis: {
      type: 'category' as const,
      data: trends?.points?.map((p: any) => {
        const d = new Date(p.time);
        if (period === '24h') return `${d.getHours()}:00`;
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }) || [],
      axisLabel: { fontSize: 11, color: '#9CA3AF', rotate: period === '24h' ? 45 : 0 },
      axisLine: { lineStyle: { color: '#E5E7EB' } },
    },
    yAxis: {
      type: 'value' as const,
      name: metric === 'tokens' ? 'Tokens' : t('analytics.requests') || 'Requests',
      nameTextStyle: { fontSize: 11, color: '#9CA3AF' },
      splitLine: { lineStyle: { color: '#F3F4F6' } },
      axisLabel: { fontSize: 11, color: '#9CA3AF', formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : String(v) },
    },
    series: [{
      type: period === '24h' ? 'line' as const : 'bar' as const,
      data: trends?.points?.map((p: any) => p.value) || [],
      smooth: period === '24h',
      lineStyle: period === '24h' ? { color: '#F97346', width: 2 } : undefined,
      itemStyle: { color: '#F97346', borderRadius: period === '24h' ? undefined : [4, 4, 0, 0] },
      barMaxWidth: period === '24h' ? undefined : 40,
      areaStyle: period === '24h' ? {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(249,115,70,0.15)' }, { offset: 1, color: 'rgba(249,115,70,0)' }] },
      } : undefined,
    }],
  };

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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('dashboard.apiTrend')}</h3>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {['24h', '7d', '30d'].map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${period === p ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {['requests', 'tokens'].map(m => (
                  <button key={m} onClick={() => setMetric(m)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${metric === m ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {m === 'requests' ? (t('analytics.requests') || '请求量') : 'Tokens'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ReactEChartsCore option={trendOption} style={{ height: 260 }} notMerge />
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
