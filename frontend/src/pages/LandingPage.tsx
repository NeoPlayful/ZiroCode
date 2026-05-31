import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicNav from '../components/PublicNav';
import Footer from '../components/Footer';

export default function LandingPage() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();

  const copyAPI = () => {
    const text = 'https://api.zirocode.com/v1/chat/completions';
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector('.copy-btn') as HTMLButtonElement;
      if (btn) {
        btn.textContent = t('landing.hero.copied');
        setTimeout(() => {
          btn.textContent = t('landing.hero.copy');
        }, 2000);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0F0F10] text-[#0a0a0a] dark:text-[#E5E5E7] flex flex-col">
      <PublicNav />
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative">
        {/* Background Glow */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle, rgba(249, 115, 70, 0.08) 0%, transparent 70%)'
          }}
        />

        <div className="max-w-[900px] text-center relative z-10">
          {/* Hero Title */}
          <h1 className="text-7xl font-bold leading-tight mb-6 tracking-tight text-inherit" style={{ whiteSpace: 'pre-line' }}>
            {t('landing.hero.title')}
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 dark:text-[#98989D] leading-relaxed mb-12 max-w-[600px] mx-auto">
            {t('landing.hero.subtitle')}
          </p>

          {/* API Box */}
          <div className="bg-white/80 dark:bg-[#1F1F21]/80 backdrop-blur-md border border-gray-200 dark:border-[#303033] rounded-2xl p-4 px-6 my-12 max-w-[600px] mx-auto flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <span className="flex-1 font-mono text-[15px] select-all">
              https://api.zirocode.com/v1/chat/completions
            </span>
            <button
              onClick={copyAPI}
              className="copy-btn bg-gray-100 dark:bg-[#242426] hover:bg-gray-200 dark:hover:bg-[#2C2C2E] px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-[#E5E5E7] hover:text-black dark:hover:text-white transition-colors"
            >
              {t('landing.hero.copy')}
            </button>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center mb-20">
            <button
              onClick={() => navigate('/auth/register')}
              className="px-8 py-3.5 bg-[#F97346] hover:bg-[#e8673a] text-white rounded-xl text-base font-medium transition-all hover:-translate-y-0.5"
            >
              {t('landing.hero.getApiKey')}
            </button>
            <button
              onClick={() => navigate('/docs')}
              className="px-8 py-3.5 bg-gray-100 dark:bg-[#1F1F21] hover:bg-gray-200 dark:hover:bg-[#242426] text-black dark:text-[#E5E5E7] rounded-xl text-base font-medium border border-gray-200 dark:border-[#303033] transition-colors"
            >
              {t('landing.hero.viewDocs')}
            </button>
          </div>

          {/* Platforms */}
          <div className="mt-20">
            <div className="text-sm text-gray-400 dark:text-[#6E6E73] uppercase tracking-widest mb-8">
              {t('landing.hero.supportedPlatforms')}
            </div>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-8 max-w-[1000px] mx-auto">
              {['OpenAI', 'Claude', 'Gemini', 'OpenRouter', 'DeepSeek', 'OpenClaw',
                'Qwen', 'Grok', 'Moonshot', 'Mistral', 'Llama', 'Stability AI'].map((platform) => (
                <div
                  key={platform}
                  className="flex items-center justify-center h-10 opacity-40 hover:opacity-80 transition-opacity text-base font-medium dark:text-[#E5E5E7]"
                >
                  {platform}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
