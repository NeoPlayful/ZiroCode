import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

export default function VerifyEmailPage() {
  const { t } = useTranslation('landing');
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage(t('landing.verifyEmail.errors.missingToken'));
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setStatus('success');
          setMessage(data.message || t('landing.verifyEmail.errors.verifySuccess'));
        } else {
          const err = await res.json();
          setStatus('error');
          setMessage(err.error?.message || t('landing.verifyEmail.errors.verifyFailed'));
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage(t('landing.verifyEmail.errors.networkError'));
      });
  }, [searchParams, t]);

  return (
    <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-[#1F1F21] rounded-xl shadow-sm p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e8673a] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-[#E5E5E7]">{t('landing.verifyEmail.verifying')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircleIcon className="w-16 h-16 text-green-600 dark:text-[#30D158] mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#E5E5E7] mb-2">{t('landing.verifyEmail.successTitle')}</h1>
            <p className="text-gray-600 dark:text-[#E5E5E7] mb-6">{message}</p>
            <Link
              to="/auth/login"
              className="inline-block px-6 py-3 bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f]"
            >
              {t('landing.verifyEmail.goToLogin')}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircleIcon className="w-16 h-16 text-red-600 dark:text-[#FF453A] mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#E5E5E7] mb-2">{t('landing.verifyEmail.errorTitle')}</h1>
            <p className="text-gray-600 dark:text-[#E5E5E7] mb-6">{message}</p>
            <Link
              to="/auth/login"
              className="inline-block px-6 py-3 bg-gray-600 dark:bg-[#242426] text-white rounded-lg hover:bg-gray-700 dark:hover:bg-[#2C2C2E]"
            >
              {t('landing.verifyEmail.backToLogin')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
