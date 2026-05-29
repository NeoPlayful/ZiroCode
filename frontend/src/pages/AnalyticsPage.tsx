import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import ReactECharts from 'echarts-for-react'

export default function AnalyticsPage() {
  const { t } = useTranslation('usage');
  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => fetch('/api/analytics/overview').then(r => r.json()),
  })

  const { data: costData } = useQuery({
    queryKey: ['analytics-cost'],
    queryFn: () => fetch('/api/analytics/cost').then(r => r.json()),
  })

  const { data: modelsData } = useQuery({
    queryKey: ['analytics-models'],
    queryFn: () => fetch('/api/analytics/models').then(r => r.json()),
  })

  const costChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: costData?.data?.map((d: any) => d.date) || [] },
    yAxis: { type: 'value', name: t('analytics.costTrends.yAxisLabel') },
    series: [{ data: costData?.data?.map((d: any) => d.cost) || [], type: 'line', smooth: true }],
  }

  const modelsChartOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '50%',
      data: modelsData?.data?.map((d: any) => ({ value: d.calls, name: d.model })) || [],
    }],
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>
        <a href="/api/analytics/export?format=csv" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">{t('analytics.exportCSV')}</a>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">{t('analytics.summary.totalCalls')}</div>
          <div className="text-2xl font-bold mt-1">{overview?.totalCalls?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">{t('analytics.summary.totalTokens')}</div>
          <div className="text-2xl font-bold mt-1">{overview?.totalTokens?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">{t('analytics.summary.totalCost')}</div>
          <div className="text-2xl font-bold mt-1">¥{overview?.totalCost || '0.00'}</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="font-semibold mb-4">{t('analytics.costTrends.title')}</h2>
        <ReactECharts option={costChartOption} style={{ height: 300 }} />
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="font-semibold mb-4">{t('analytics.modelDistribution.title')}</h2>
        <ReactECharts option={modelsChartOption} style={{ height: 300 }} />
      </div>
    </div>
  )
}
