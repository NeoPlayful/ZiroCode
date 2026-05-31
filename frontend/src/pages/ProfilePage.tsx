import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { UserCircleIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-[#242426] rounded ${className || ''}`} />;
}

export default function ProfilePage() {
  const { t } = useTranslation('developer');
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/user/profile', { credentials: 'include' });
      if (!res.ok) throw new Error(t('developer.profile.fetchError'));
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.name) setName(data.name);
  }, [data]);

  const updateProfile = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(t('developer.profile.updateError'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setMessage(t('developer.profile.updateSuccess'));
      setTimeout(() => setMessage(''), 3000);
    },
  });

  const changePassword = useMutation({
    mutationFn: async ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) => {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || t('developer.profile.changeError'));
      }
      return res.json();
    },
    onSuccess: () => {
      setOldPassword('');
      setNewPassword('');
      setMessage(t('developer.profile.passwordChangeSuccess'));
      setTimeout(() => setMessage(''), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10]">
        <main className="max-w-4xl mx-auto px-8 py-8">
          <Skeleton className="h-9 w-48 mb-6" />
          <Skeleton className="h-64 rounded-xl mb-4" />
          <Skeleton className="h-64 rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10]">
      <main className="max-w-4xl mx-auto px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E5E5E7] mb-6">{t('developer.profile.title')}</h1>

        {message && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-[#30D158]/10 border border-green-200 dark:border-[#30D158]/30 rounded-lg text-green-800 dark:text-green-200">
            {message}
          </div>
        )}

        <div className="bg-white dark:bg-[#1F1F21] rounded-xl shadow-sm p-6 mb-4">
          <div className="flex items-center gap-3 mb-6">
            <UserCircleIcon className="w-6 h-6 text-gray-600 dark:text-[#98989D]" />
            <h2 className="text-xl font-semibold">{t('developer.profile.basicInfo')}</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#E5E5E7] mb-1">{t('developer.profile.email')}</label>
              <input
                type="text"
                value={data?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#303033] rounded-lg bg-gray-50 dark:bg-[#242426] text-gray-500 dark:text-[#98989D]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#E5E5E7] mb-1">{t('developer.profile.role')}</label>
              <input
                type="text"
                value={data?.role || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#303033] rounded-lg bg-gray-50 dark:bg-[#242426] text-gray-500 dark:text-[#98989D]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#E5E5E7] mb-1">{t('developer.profile.referralCode')}</label>
              <input
                type="text"
                value={data?.referralCode || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#303033] rounded-lg bg-gray-50 dark:bg-[#242426] text-gray-500 dark:text-[#98989D]"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-[#E5E5E7] mb-1">{t('developer.profile.nickname')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#303033] rounded-lg focus:ring-2 focus:ring-[#e8673a] focus:border-transparent"
              />
              <button
                onClick={() => updateProfile.mutate(name)}
                disabled={updateProfile.isPending}
                className="px-6 py-2 bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f] disabled:opacity-50"
              >
                {updateProfile.isPending ? t('developer.profile.saving') : t('developer.profile.save')}
              </button>
            </div>
            {updateProfile.isError && (
              <p className="mt-2 text-sm text-red-600 dark:text-[#FF453A]">{updateProfile.error?.message}</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1F1F21] rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <KeyIcon className="w-6 h-6 text-gray-600 dark:text-[#98989D]" />
            <h2 className="text-xl font-semibold">{t('developer.profile.changePassword')}</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#E5E5E7] mb-1">{t('developer.profile.oldPassword')}</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#303033] rounded-lg focus:ring-2 focus:ring-[#e8673a] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#E5E5E7] mb-1">{t('developer.profile.newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#303033] rounded-lg focus:ring-2 focus:ring-[#e8673a] focus:border-transparent"
              />
            </div>
            <button
              onClick={() => changePassword.mutate({ oldPassword, newPassword })}
              disabled={changePassword.isPending || !oldPassword || !newPassword}
              className="w-full px-6 py-2 bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f] disabled:opacity-50"
            >
              {changePassword.isPending ? t('developer.profile.changing') : t('developer.profile.changePasswordBtn')}
            </button>
            {changePassword.isError && (
              <p className="text-sm text-red-600 dark:text-[#FF453A]">{changePassword.error?.message}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
