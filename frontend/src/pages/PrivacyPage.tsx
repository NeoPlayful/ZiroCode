import { useTranslation } from 'react-i18next';
import PublicNav from '../components/PublicNav';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  const { t } = useTranslation('static');

  const sections = (t('privacy.sections', { returnObjects: true }) as Array<{ title: string; content?: string; items?: string[] }>) || [];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0F0F10] text-[#0a0a0a] dark:text-[#E5E5E7] flex flex-col">
      <PublicNav />

      <main className="flex-1 max-w-[900px] mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">{t('privacy.title')}</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 dark:text-[#E5E5E7] leading-relaxed">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-[#E5E5E7]">{section.title}</h2>
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

          <p className="text-sm text-gray-500 dark:text-[#98989D] mt-8">{t('privacy.lastUpdated')}</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
