import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function RegisterPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation('auth')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError(t('register.error.passwordTooShort')); return }
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error?.message || t('register.error.failed')); return }
      const data = await res.json()
      // 刷新用户状态
      queryClient.setQueryData(['me'], data)
      navigate('/dashboard')
    } catch {
      setError(t('register.error.network'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 w-full max-w-md border border-gray-200">
        <h1 className="text-2xl font-bold mb-2">{t('register.title')}</h1>
        <p className="text-gray-500 text-sm mb-6">{t('register.subtitle')}</p>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('register.name')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]" placeholder={t('register.namePlaceholder')} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('register.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]" placeholder="your@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('register.password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]" placeholder={t('register.passwordPlaceholder')} required minLength={6} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#e8673a] hover:bg-[#d4562a] text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
            {loading ? t('register.submitting') : t('register.submit')}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          {t('register.hasAccount')}{' '}
          <a href="/auth/login" className="text-[#e8673a] hover:underline">{t('register.login')}</a>
        </p>
      </div>
    </div>
  )
}
