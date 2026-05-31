import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '@heroicons/react/20/solid';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

export default function PublicNav() {
  const { t } = useTranslation('static');
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetch('/api/auth/me').then(r => r.ok ? r.json() : { user: null }),
    staleTime: 5 * 60 * 1000,
  });
  const user = data?.user;

  return (
    <nav className="border-b border-gray-200 dark:border-[#303033] bg-white/80 dark:bg-[#0F0F10]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
          <SparklesIcon className="w-6 h-6 text-[#F97346]" />
          <span>ZiroCode</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LanguageSwitcher />
          {user ? (
            <>
              <span className="text-sm text-gray-600 dark:text-[#98989D]">{t('nav.welcome', { name: user.name })}</span>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium transition-colors"
              >
                {t('nav.dashboard')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/auth/login')}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-[#98989D] hover:text-black dark:hover:text-white transition-colors"
              >
                {t('nav.login')}
              </button>
              <button
                onClick={() => navigate('/auth/register')}
                className="px-4 py-2 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium transition-colors"
              >
                {t('nav.register')}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
