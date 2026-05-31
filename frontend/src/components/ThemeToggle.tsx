import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const themes = [
    { value: 'light' as const, icon: SunIcon, label: t('theme.light') },
    { value: 'dark' as const, icon: MoonIcon, label: t('theme.dark') },
    { value: 'system' as const, icon: ComputerDesktopIcon, label: t('theme.system') },
  ];

  const CurrentIcon = themes.find(t => t.value === theme)?.icon || ComputerDesktopIcon;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-gray-600 dark:text-[#98989D] hover:bg-gray-100 dark:hover:bg-[#242426] transition-colors"
        title={t('theme.switch')}
      >
        <CurrentIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] rounded-lg shadow-lg py-1 z-50">
          {themes.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => { setTheme(value); setIsOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                theme === value
                  ? 'text-[#F97346] bg-orange-50 dark:bg-[#F97346]/12'
                  : 'text-gray-700 dark:text-[#E5E5E7] hover:bg-gray-50 dark:hover:bg-[#242426]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
