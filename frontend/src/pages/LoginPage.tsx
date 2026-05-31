import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message || t('login.error.failed'))
        return
      }

      const data = await res.json()
      // 刷新用户状态
      queryClient.setQueryData(['me'], data)
      navigate('/dashboard')
    } catch {
      setError(t('login.error.network'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10] flex items-center justify-center">
      <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-8 w-full max-w-md border border-gray-200 dark:border-[#303033]">
        <h1 className="text-2xl font-bold mb-2">{t('login.title')}</h1>
        <p className="text-gray-500 dark:text-[#98989D] text-sm mb-6">{t('login.subtitle')}</p>

        {error && (
          <div className="bg-red-50 dark:bg-[#FF453A]/10 border border-red-200 dark:border-[#FF453A]/30 rounded-lg p-3 mb-4 text-sm text-red-600 dark:text-[#FF453A]">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('login.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 dark:border-[#303033] dark:bg-[#242426] rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]"
              placeholder="your@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('login.password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 dark:border-[#303033] dark:bg-[#242426] rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]"
              placeholder={t('login.passwordPlaceholder')} required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#e8673a] hover:bg-[#d4562a] text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
          <p className="text-right text-sm">
            <a href="/auth/forgot-password" className="text-gray-400 dark:text-[#6E6E73] hover:text-[#e8673a]">{t('login.forgotPassword')}</a>
          </p>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-[#98989D] mt-4">
          {t('login.noAccount')}{' '}
          <a href="/auth/register" className="text-[#e8673a] hover:underline">{t('login.register')}</a>
        </p>
      </div>
    </div>
  )
}
