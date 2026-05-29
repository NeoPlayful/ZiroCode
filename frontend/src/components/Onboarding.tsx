import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';

const stepKeys = ['welcome', 'createKey', 'subscribe', 'start'] as const;

export default function Onboarding() {
  const { t } = useTranslation('onboarding');
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) setShow(true);
  }, []);

  const handleClose = () => {
    setShow(false);
    localStorage.setItem('onboarding_completed', 'true');
  };

  const handleNext = () => {
    if (step < stepKeys.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  if (!show) return null;

  const currentKey = stepKeys[step];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t(`${currentKey}.title`)}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{t(`${currentKey}.description`)}</p>
        <div className="flex gap-1 mb-6">
          {stepKeys.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-[#e8673a]' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            {t('skip')}
          </button>
          <button onClick={handleNext} className="flex-1 px-4 py-2 bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f]">
            {step < stepKeys.length - 1 ? t('next') : t('finish')}
          </button>
        </div>
      </div>
    </div>
  );
}