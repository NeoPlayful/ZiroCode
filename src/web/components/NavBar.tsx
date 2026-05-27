'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { SparklesIcon } from '@heroicons/react/20/solid';

const navItems = [
  { label: '仪表板', href: '/dashboard' },
  { label: 'API密钥', href: '/keys' },
  { label: '兑换订阅', href: '/subscription' },
  { label: '使用统计', href: '/usage' },
];

export default function NavBar() {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');
  if (isAuthPage) return null;

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetch('/api/auth/me').then(r => r.ok ? r.json() : { user: null }),
    staleTime: 5 * 60 * 1000,
  });
  const user = data?.user;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-[1280px] mx-auto px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl">
          <SparklesIcon className="w-7 h-7 text-[#e8673a]" />ZiroCode
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-1.5 rounded-md text-base font-medium ${
                  isActive ? 'bg-[#e8673a] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#e8673a] text-white flex items-center justify-center font-bold text-sm">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="font-medium text-sm">{user.name || '用户'}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
