import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const steps = [
  { title: '欢迎使用 ZiroCode', description: '让我们快速了解如何开始使用平台' },
  { title: '创建 API 密钥', description: '在"API 密钥"页面创建您的第一个密钥' },
  { title: '兑换或购买订阅', description: '在"订阅管理"页面获取配额' },
  { title: '开始使用', description: '使用您的 API 密钥调用 AI 服务' },
];

export default function Onboarding() {
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
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{steps[step].title}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{steps[step].description}</p>
        <div className="flex gap-1 mb-6">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-[#e8673a]' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            跳过
          </button>
          <button onClick={handleNext} className="flex-1 px-4 py-2 bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f]">
            {step < steps.length - 1 ? '下一步' : '完成'}
          </button>
        </div>
      </div>
    </div>
  );
}
