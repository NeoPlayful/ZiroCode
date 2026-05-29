import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SparklesIcon } from '@heroicons/react/20/solid';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';

export default function TermsPage() {
  const { t } = useTranslation('static');
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetch('/api/auth/me').then(r => r.ok ? r.json() : { user: null }),
    staleTime: 5 * 60 * 1000,
  });
  const user = data?.user;

  const sections = (t('terms.sections', { returnObjects: true }) as Array<{ title: string; content?: string; items?: string[] }>) || [];

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#0a0a0a] flex flex-col">
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
            <SparklesIcon className="w-6 h-6 text-[#F97346]" />
            <span>ZiroCode</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-600">{t('nav.welcome', { name: user.name })}</span>
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
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
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

      <main className="flex-1 max-w-[900px] mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">{t('terms.title')}</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">{section.title}</h2>
              {section.content && <p>{section.content}</p>}
              {section.items && (
                <ul className="list-disc pl-6 space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <p className="text-sm text-gray-500 mt-8">{t('terms.lastUpdated')}</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
