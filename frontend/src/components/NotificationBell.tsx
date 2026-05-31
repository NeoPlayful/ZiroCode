import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BellIcon } from '@heroicons/react/24/outline'

export default function NotificationBell() {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: countData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => fetch('/api/notifications/unread-count').then(r => r.json()),
    refetchInterval: 30000,
  })

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: () => fetch('/api/notifications?limit=5').then(r => r.json()),
    enabled: open,
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unreadCount = countData?.count || 0
  const notifications = notificationsData?.notifications || []

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setOpen(!open)} className="relative p-2 hover:bg-gray-100 dark:hover:bg-[#242426] rounded-lg">
        <BellIcon className="w-6 h-6 text-gray-600 dark:text-[#E5E5E7]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg shadow-lg py-2 z-50">
          <div className="px-4 py-2 font-semibold border-b border-gray-100 dark:border-[#303033]">{t('notification.title')}</div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 dark:text-[#6E6E73] text-sm">{t('notification.empty')}</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n: any) => (
                <Link
                  key={n.id}
                  to={n.link || '/notifications'}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#242426]/50 border-b border-gray-50 dark:border-[#303033]/50 ${!n.isRead ? 'bg-blue-50 dark:bg-[#BF5AF2]/12' : ''}`}
                >
                  <div className="font-medium text-sm dark:text-[#E5E5E7]">{n.title}</div>
                  {n.content && <div className="text-xs text-gray-500 dark:text-[#98989D] mt-1">{n.content}</div>}
                  <div className="text-xs text-gray-400 dark:text-[#6E6E73] mt-1">
                    {new Date(n.createdAt).toLocaleString('zh-CN')}
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-center text-sm text-[#e8673a] hover:bg-gray-50 dark:hover:bg-[#242426]/50 border-t border-gray-100 dark:border-[#303033]"
          >
            {t('notification.viewAll')} →
          </Link>
        </div>
      )}
    </div>
  )
}
