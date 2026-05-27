import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('密码至少需要6个字符'); return }
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error?.message || '注册失败'); return }
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
        <h1 className="text-2xl font-bold mb-2">注册</h1>
        <p className="text-gray-500 text-sm mb-6">创建一个新账户</p>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">昵称</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]" placeholder="您的昵称" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]" placeholder="your@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]" placeholder="至少6个字符" required minLength={6} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#e8673a] hover:bg-[#d4562a] text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          已有账户？ <a href="/auth/login" className="text-[#e8673a] hover:underline">登录</a>
        </p>
      </div>
    </div>
  )
}
