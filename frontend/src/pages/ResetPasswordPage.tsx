import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError(t('resetPassword.error.passwordTooShort')); return }
    if (password !== confirm) { setError(t('resetPassword.error.passwordMismatch')); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error?.message || t('resetPassword.error.failed')); return }
      setSuccess(true)
    } catch { setError(t('resetPassword.error.network')) } finally { setLoading(false) }
  }

  if (!token) return (
    <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10] flex items-center justify-center">
      <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-8 text-center border border-gray-200 dark:border-[#303033]">
        <p className="text-gray-600 dark:text-[#98989D]">{t('resetPassword.invalidLink')}</p>
        <p className="text-sm text-gray-400 dark:text-[#6E6E73] mt-2">{t('resetPassword.invalidLinkHint')}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10] flex items-center justify-center">
      <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-8 w-full max-w-md border border-gray-200 dark:border-[#303033]">
        <h1 className="text-2xl font-bold mb-2">{t('resetPassword.title')}</h1>
        <p className="text-gray-500 dark:text-[#98989D] text-sm mb-6">{t('resetPassword.subtitle')}</p>

        {success ? (
          <div>
            <div className="bg-green-50 dark:bg-[#30D158]/10 border border-green-200 dark:border-[#30D158]/30 rounded-lg p-4 text-sm text-green-700 dark:text-green-200 mb-4">
              {t('resetPassword.successMessage')}
            </div>
            <button onClick={() => navigate('/auth/login')}
              className="w-full bg-[#e8673a] hover:bg-[#d4562a] text-white py-2.5 rounded-lg font-medium">
              {t('resetPassword.goToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-[#FF453A]/30 rounded-lg p-3 text-sm text-red-600 dark:text-[#FF453A]">{error}</div>}
            <div>
              <label className="block text-sm font-medium mb-1">{t('resetPassword.newPassword')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 dark:border-[#303033] rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]"
                placeholder={t('resetPassword.newPasswordPlaceholder')} required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('resetPassword.confirmPassword')}</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full border border-gray-200 dark:border-[#303033] rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]"
                placeholder={t('resetPassword.confirmPasswordPlaceholder')} required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#e8673a] hover:bg-[#d4562a] text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
              {loading ? t('resetPassword.submitting') : t('resetPassword.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
