import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('缺少验证令牌');
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
          setMessage(data.message || '邮箱验证成功');
        } else {
          const err = await res.json();
          setStatus('error');
          setMessage(err.error?.message || '验证失败');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('网络错误，请稍后重试');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e8673a] mx-auto mb-4"></div>
            <p className="text-gray-600">正在验证邮箱...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">验证成功</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              to="/auth/login"
              className="inline-block px-6 py-3 bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f]"
            >
              前往登录
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircleIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">验证失败</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              to="/auth/login"
              className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              返回登录
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
