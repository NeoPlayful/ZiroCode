import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

const languages = [
  { code: 'zh-CN', label: '简体中文', shortLabel: '中文' },
  { code: 'en-US', label: 'English', shortLabel: 'EN' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-11 w-[90px] flex items-center justify-center gap-2 rounded-full bg-transparent text-blue-600 hover:bg-gray-100 transition-colors"
      >
        <GlobeAltIcon className="w-5 h-5" />
        <span className="text-sm font-medium">{currentLanguage.shortLabel}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-[110px] bg-white rounded-3xl border border-[#EAECEF] p-1.5 transition-all duration-150 ease-out origin-top-right animate-in fade-in zoom-in-95"
          style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center px-3 py-1.5 rounded-xl text-left transition-colors ${
                lang.code === i18n.language
                  ? 'text-[#2563EB] font-medium'
                  : 'text-[#111827] hover:bg-gray-50'
              }`}
            >
              <span className="text-sm">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
