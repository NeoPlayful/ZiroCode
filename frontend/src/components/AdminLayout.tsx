import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SparklesIcon } from '@heroicons/react/20/solid'

const navItems = [
  { label: '仪表板', href: '/dashboard' },
  { label: 'API密钥', href: '/keys' },
  { label: '兑换订阅', href: '/subscription' },
  { label: '使用统计', href: '/usage' },
  { label: '定价', href: '/pricing' },
  { label: '工单', href: '/tickets' },
]

const adminTabs = [
  { key: 'dashboard', label: '概览' },
  { key: 'users', label: '用户管理' },
  { key: 'subscriptions', label: '订阅' },
  { key: 'redeem-codes', label: '兑换码' },
  { key: 'channels', label: '渠道' },
  { key: 'withdrawals', label: '提现' },
]

export default function AdminLayout({ tab, onTabChange, children }: { tab: string; onTabChange: (t: string) => void; children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetch('/api/auth/me').then(r => r.ok ? r.json() : { user: null }),
    staleTime: 5 * 60 * 1000,
  })
  const user = data?.user

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    setMenuOpen(false)
    await fetch('/api/auth/logout', { method: 'POST' })
    queryClient.clear()
    navigate('/auth/login')
  }

  return (
    <div className="min-h-screen bg-[#f0ebe3]">
      <nav className="bg-white border-b border-gray-200">
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
                    isActive ? 'bg-[#e8673a] text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            {user?.role === 'ADMIN' && (
              <Link to="/admin"
                className={`px-4 py-1.5 rounded-md text-base font-medium ${
                  location.pathname.startsWith('/admin') ? 'bg-[#e8673a] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                管理后台
              </Link>
            )}
          </div>
          {user && (
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 cursor-pointer">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#e8673a] text-white flex items-center justify-center font-bold text-sm">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="font-medium text-sm">{user.name || '用户'}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-100">{user.email}</div>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">个人设置</Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50">退出登录</button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
      <div className="max-w-[1280px] mx-auto px-8 py-6">
        <div className="flex items-center gap-2 mb-6">
          {adminTabs.map((t) => (
            <button key={t.key} onClick={() => onTabChange(t.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === t.key ? 'bg-[#e8673a] text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {children}
      </div>
    </div>
  )
}
