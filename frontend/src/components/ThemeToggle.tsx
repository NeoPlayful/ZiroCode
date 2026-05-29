import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation('common');

  const themes = [
    { value: 'light' as const, icon: SunIcon, label: t('theme.light') },
    { value: 'dark' as const, icon: MoonIcon, label: t('theme.dark') },
    { value: 'system' as const, icon: ComputerDesktopIcon, label: t('theme.system') },
  ];

  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`p-2 rounded transition-colors ${
            theme === value
              ? 'bg-white dark:bg-gray-700 text-[#e8673a] shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
          title={label}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
}
