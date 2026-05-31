import { useTranslation } from 'react-i18next';
import PublicNav from '../components/PublicNav';
import Footer from '../components/Footer';

export default function AboutPage() {
  const { t } = useTranslation('static');

  const advantages = (t('about.advantagesItems', { returnObjects: true }) as Array<{ title: string; description: string }>) || [];
  const useCases = (t('about.useCasesItems', { returnObjects: true }) as string[]) || [];
  const contactItems = (t('about.contactItems', { returnObjects: true }) as string[]) || [];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0F0F10] text-[#0a0a0a] dark:text-[#E5E5E7] flex flex-col">
      <PublicNav />

      <main className="flex-1 max-w-[900px] mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">{t('about.title')}</h1>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-[#E5E5E7] leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-[#E5E5E7]">{t('about.whoWeAre')}</h2>
            <p>{t('about.whoWeAreContent')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-[#E5E5E7]">{t('about.mission')}</h2>
            <p>{t('about.missionContent')}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-[#E5E5E7]">{t('about.advantages')}</h2>
            <ul className="list-disc pl-6 space-y-2">
              {advantages.map((item, i) => (
                <li key={i}><strong>{item.title}</strong>：{item.description}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-[#E5E5E7]">{t('about.supportedModels')}</h2>
            <p>{t('about.supportedModelsContent')}</p>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg p-4 text-center">OpenAI</div>
              <div className="bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg p-4 text-center">Claude</div>
              <div className="bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg p-4 text-center">Gemini</div>
              <div className="bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg p-4 text-center">DeepSeek</div>
              <div className="bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg p-4 text-center">Qwen</div>
              <div className="bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg p-4 text-center">Grok</div>
              <div className="bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg p-4 text-center">Moonshot</div>
              <div className="bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg p-4 text-center">Mistral</div>
              <div className="bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg p-4 text-center">{t('about.more')}</div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-[#E5E5E7]">{t('about.useCases')}</h2>
            <ul className="list-disc pl-6 space-y-2">
              {useCases.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-[#E5E5E7]">{t('about.contact')}</h2>
            <p>{t('about.contactContent')}</p>
            <ul className="list-disc pl-6 space-y-2">
              {contactItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <p className="text-sm text-gray-500 dark:text-[#98989D] mt-8">{t('about.copyright')}</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
