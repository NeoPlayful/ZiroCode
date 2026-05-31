import { Link } from 'react-router-dom';
import { SparklesIcon } from '@heroicons/react/20/solid';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation('common');

  return (
    <footer className="bg-white dark:bg-[#1F1F21] border-t border-gray-200 dark:border-[#303033] mt-auto">
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="flex items-center gap-2 font-bold text-lg mb-2">
          <SparklesIcon className="w-6 h-6 text-[#F97346]" />
          <span>ZiroCode</span>
        </div>
        <p className="text-gray-500 dark:text-[#98989D] text-sm mb-4">{t('footer.description')}</p>
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-[#6E6E73]">
          <span>{t('footer.copyright', { year: 2026 })}</span>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">{t('footer.privacy')}</Link>
            <Link to="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">{t('footer.terms')}</Link>
            <Link to="/about" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">{t('footer.about')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
