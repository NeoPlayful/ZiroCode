import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
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
        setError(data.error?.message || '登录失败')
        return
      }

      navigate('/dashboard')
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 w-full max-w-md border border-gray-200">
        <h1 className="text-2xl font-bold mb-2">登录</h1>
        <p className="text-gray-500 text-sm mb-6">欢迎回来，请登录您的账户</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]"
              placeholder="your@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]"
              placeholder="输入密码" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#e8673a] hover:bg-[#d4562a] text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
            {loading ? '登录中...' : '登录'}
          </button>
          <p className="text-right text-sm">
            <a href="/auth/forgot-password" className="text-gray-400 hover:text-[#e8673a]">忘记密码？</a>
          </p>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          还没有账户？{' '}
          <a href="/auth/register" className="text-[#e8673a] hover:underline">注册</a>
        </p>
      </div>
    </div>
  )
}
