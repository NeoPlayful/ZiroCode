import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

const eventKeys = [
  { value: 'QUOTA_LOW', key: 'form.eventsOptions.QUOTA_LOW' },
  { value: 'QUOTA_EXHAUSTED', key: 'form.eventsOptions.QUOTA_EXHAUSTED' },
  { value: 'PAYMENT_SUCCESS', key: 'form.eventsOptions.PAYMENT_SUCCESS' },
  { value: 'API_CALL_COMPLETED', key: 'form.eventsOptions.API_CALL_COMPLETED' },
  { value: 'SUBSCRIPTION_EXPIRING', key: 'form.eventsOptions.SUBSCRIPTION_EXPIRING' },
  { value: 'SUBSCRIPTION_EXPIRED', key: 'form.eventsOptions.SUBSCRIPTION_EXPIRED' },
]

export default function WebhooksPage() {
  const { t } = useTranslation('webhooks')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', url: '', events: [] as string[] })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => fetch('/api/webhooks').then(r => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setShowForm(false)
      setFormData({ name: '', url: '', events: [] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/webhooks/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/webhooks/${id}/test`, { method: 'POST' }).then(r => r.json()),
  })

  const webhooks = data?.webhooks || []

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="animate-pulse space-y-4">
          {[1, 2].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-[#242426] rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f]">
          {showForm ? t('cancel') : t('newWebhook')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-[#1F1F21] p-6 rounded-lg border border-gray-200 dark:border-[#303033] mb-6">
          <h2 className="font-semibold mb-4">{t('form.title')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.name')}</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-[#303033] rounded-lg dark:bg-[#242426] dark:text-[#E5E5E7]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.url')}</label>
              <input type="url" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-[#303033] rounded-lg dark:bg-[#242426] dark:text-[#E5E5E7]" placeholder={t('form.urlPlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('form.events')}</label>
              <div className="grid grid-cols-2 gap-2">
                {eventKeys.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.events.includes(opt.value)} onChange={e => {
                      if (e.target.checked) setFormData({ ...formData, events: [...formData.events, opt.value] })
                      else setFormData({ ...formData, events: formData.events.filter(ev => ev !== opt.value) })
                    }} />
                    <span className="text-sm">{t(opt.key)}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={() => createMutation.mutate(formData)} disabled={!formData.name || !formData.url || formData.events.length === 0} className="px-4 py-2 bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f] disabled:opacity-50">
              {t('form.create')}
            </button>
          </div>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-[#6E6E73]">
          <div className="text-4xl mb-4">🔗</div>
          <div>{t('empty')}</div>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh: any) => (
            <div key={wh.id} className="bg-white dark:bg-[#1F1F21] p-4 rounded-lg border border-gray-200 dark:border-[#303033]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold">{wh.name}</div>
                  <div className="text-sm text-gray-600 dark:text-[#E5E5E7] mt-1">{wh.url}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {wh.events.map((ev: string) => (
                      <span key={ev} className="px-2 py-1 bg-gray-100 dark:bg-[#242426] text-xs rounded">{eventKeys.find(o => o.value === ev)?.key ? t(eventKeys.find(o => o.value === ev)!.key) : ev}</span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-[#6E6E73] mt-2">
                    {wh.lastSuccessAt && t('lastSuccess', { date: new Date(wh.lastSuccessAt).toLocaleString() })}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => testMutation.mutate(wh.id)} className="px-3 py-1 text-sm border border-gray-300 dark:border-[#303033] rounded hover:bg-gray-50 dark:hover:bg-[#242426]">{t('test')}</button>
                  <button onClick={() => deleteMutation.mutate(wh.id)} className="px-3 py-1 text-sm text-red-500 border border-red-300 dark:border-[#FF453A]/30 rounded hover:bg-red-50 dark:hover:bg-red-900/20">{t('delete')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}