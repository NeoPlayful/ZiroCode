import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SparklesIcon } from '@heroicons/react/20/solid';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function AboutPage() {
  const { t } = useTranslation('static');
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetch('/api/auth/me').then(r => r.ok ? r.json() : { user: null }),
    staleTime: 5 * 60 * 1000,
  });
  const user = data?.user;

  const advantages = (t('about.advantagesItems', { returnObjects: true }) as Array<{ title: string; description: string }>) || [];
  const useCases = (t('about.useCasesItems', { returnObjects: true }) as string[]) || [];
  const contactItems = (t('about.contactItems', { returnObjects: true }) as string[]) || [];

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#0a0a0a] flex flex-col">
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
            <SparklesIcon className="w-6 h-6 text-[#F97346]" />
            <span>ZiroCode</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
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
        <h1 className="text-4xl font-bold mb-8">{t('about.title')}</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('about.whoWeAre')}</h2>
            <p>{t('about.whoWeAreContent')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('about.mission')}</h2>
            <p>{t('about.missionContent')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('about.advantages')}</h2>
            <ul className="list-disc pl-6 space-y-2">
              {advantages.map((item, i) => (
                <li key={i}><strong>{item.title}</strong>：{item.description}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('about.supportedModels')}</h2>
            <p>{t('about.supportedModelsContent')}</p>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">OpenAI</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Claude</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Gemini</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">DeepSeek</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Qwen</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Grok</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Moonshot</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">Mistral</div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">{t('about.more')}</div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('about.useCases')}</h2>
            <ul className="list-disc pl-6 space-y-2">
              {useCases.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{t('about.contact')}</h2>
            <p>{t('about.contactContent')}</p>
            <ul className="list-disc pl-6 space-y-2">
              {contactItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <p className="text-sm text-gray-500 mt-8">{t('about.copyright')}</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
