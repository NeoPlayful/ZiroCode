import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function NotificationsPage() {
  const { t } = useTranslation('notifications')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => fetch(`/api/notifications?page=${page}&limit=20`).then(r => r.json()),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => fetch(`/api/notifications/${id}/read`, { method: 'PUT' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => fetch('/api/notifications/read-all', { method: 'PUT' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  const notifications = data?.notifications || []
  const total = data?.total || 0

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-[#242426] rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
        {notifications.some((n: any) => !n.isRead) && (
          <button
            onClick={() => markAllRead.mutate()}
            className="px-4 py-2 text-sm bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f]"
          >
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-[#6E6E73]">
          <div className="text-4xl mb-4">🔔</div>
          <div>{t('notifications.emptyState')}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border ${n.isRead ? 'bg-white dark:bg-[#1F1F21] border-gray-200 dark:border-[#303033]' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-[#BF5AF2]/30'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{n.title}</div>
                  {n.content && <div className="text-sm text-gray-600 dark:text-[#E5E5E7] mt-1">{n.content}</div>}
                  <div className="text-xs text-gray-400 dark:text-[#6E6E73] mt-2">
                    {new Date(n.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markRead.mutate(n.id)}
                    className="ml-4 text-sm text-[#e8673a] hover:underline"
                  >
                    {t('notifications.markRead')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 dark:border-[#303033] rounded-lg disabled:opacity-50"
          >
            {t('notifications.pagination.previous')}
          </button>
          <span className="text-sm text-gray-600 dark:text-[#E5E5E7]">
            {t('notifications.pagination.pageInfo', { page, total: Math.ceil(total / 20) })}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-4 py-2 border border-gray-300 dark:border-[#303033] rounded-lg disabled:opacity-50"
          >
            {t('notifications.pagination.next')}
          </button>
        </div>
      )}
    </div>
  )
}
