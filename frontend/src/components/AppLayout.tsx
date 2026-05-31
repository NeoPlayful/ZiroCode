import { useState, useRef, useEffect } from 'react'
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { SparklesIcon } from '@heroicons/react/20/solid'
import NotificationBell from './NotificationBell'
import AnnouncementBanner from './AnnouncementBanner'
import Footer from './Footer'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { labelKey: 'nav.dashboard', href: '/dashboard' },
  { labelKey: 'nav.keys', href: '/keys' },
  { labelKey: 'nav.subscription', href: '/subscription' },
  { labelKey: 'nav.usage', href: '/usage' },
  { labelKey: 'nav.pricing', href: '/pricing' },
]

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation('common')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetch('/api/auth/me').then(r => r.ok ? r.json() : { user: null }),
    staleTime: 5 * 60 * 1000,
  })
  const user = data?.user

  // 处理菜单点击
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // 登录验证
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth/login', { replace: true, state: { from: location.pathname } })
    }
  }, [isLoading, user, navigate, location.pathname])

  // 加载中显示加载动画
  if (isLoading) {
    return (
      <div className="h-screen bg-[#f0ebe3] dark:bg-[#0F0F10] flex items-center justify-center">
        <div className="text-center">
          <SparklesIcon className="w-12 h-12 text-[#e8673a] mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-[#98989D]">{t('message.loading')}</p>
        </div>
      </div>
    )
  }

  // 未登录时不渲染内容（等待重定向）
  if (!user) {
    return null
  }

  async function handleLogout() {
    setMenuOpen(false)
    await fetch('/api/auth/logout', { method: 'POST' })
    queryClient.clear()
    navigate('/auth/login')
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f0ebe3] dark:bg-[#0F0F10] flex flex-col">
      <nav className="sticky top-0 z-50 bg-white dark:bg-[#1F1F21] border-b border-gray-200 dark:border-[#303033]">
        <div className="max-w-[1280px] mx-auto px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <SparklesIcon className="w-7 h-7 text-[#e8673a]" />ZiroCode
          </div>
          <div className="flex-1 flex justify-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-4 py-1.5 rounded-md text-base font-medium ${
                    isActive ? 'bg-[#e8673a] text-white' : 'text-gray-600 dark:text-[#E5E5E7] hover:bg-gray-100 dark:hover:bg-[#242426]'
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              )
            })}
            {user?.role === 'ADMIN' && (
              <Link to="/admin"
                className={`px-4 py-1.5 rounded-md text-base font-medium ${
                  location.pathname.startsWith('/admin') ? 'bg-[#e8673a] text-white' : 'text-gray-600 dark:text-[#E5E5E7] hover:bg-gray-100 dark:hover:bg-[#242426]'
                }`}
              >
                {t('nav.admin')}
              </Link>
            )}
          </div>
          {user && <NotificationBell />}
          {user && <div className="ml-2"><ThemeToggle /></div>}
          {user && <div className="ml-1"><LanguageSwitcher /></div>}
          {user && (
            <div className="relative flex-shrink-0 ml-2" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 cursor-pointer">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#e8673a] text-white flex items-center justify-center font-bold text-sm">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="font-medium text-sm">{user.name || t('user.defaultName')}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-400 dark:text-[#6E6E73] border-b border-gray-100 dark:border-[#303033]">
                    {user.email}
                  </div>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-[#E5E5E7] hover:bg-gray-50 dark:hover:bg-[#242426]">
                    {t('user.menu.profile')}
                  </Link>
                  <Link to="/tickets" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-[#E5E5E7] hover:bg-gray-50 dark:hover:bg-[#242426]">
                    {t('user.menu.tickets')}
                  </Link>
                  <button onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-[#242426]">
                    {t('user.menu.logout')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
      <AnnouncementBanner />
      <div className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </div>
      {!location.pathname.startsWith('/admin') && <Footer />}
    </div>
  )
}
