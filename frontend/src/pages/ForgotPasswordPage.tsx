import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {} finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10] flex items-center justify-center">
      <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-8 w-full max-w-md border border-gray-200 dark:border-[#303033]">
        <h1 className="text-2xl font-bold mb-2">{t('forgotPassword.title')}</h1>
        <p className="text-gray-500 dark:text-[#98989D] text-sm mb-6">{t('forgotPassword.subtitle')}</p>

        {sent ? (
          <div className="bg-green-50 dark:bg-[#30D158]/10 border border-green-200 dark:border-[#30D158]/30 rounded-lg p-4 text-sm text-green-700 dark:text-green-200">
            {t('forgotPassword.successMessage')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('forgotPassword.email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 dark:border-[#303033] rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]"
                placeholder="your@email.com" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#e8673a] hover:bg-[#d4562a] text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
              {loading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
            </button>
            <p className="text-center text-sm text-gray-500 dark:text-[#98989D]">
              <a href="/auth/login" className="text-[#e8673a] hover:underline">{t('forgotPassword.backToLogin')}</a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
