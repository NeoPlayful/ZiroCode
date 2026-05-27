import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function ResetPasswordPage() {
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
    if (password.length < 6) { setError('密码至少需要6个字符'); return }
    if (password !== confirm) { setError('两次密码输入不一致'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error?.message || '重置失败'); return }
      setSuccess(true)
    } catch { setError('网络错误') } finally { setLoading(false) }
  }

  if (!token) return (
    <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
        <p className="text-gray-600">无效的链接</p>
        <p className="text-sm text-gray-400 mt-2">请重新发送密码重置邮件</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 w-full max-w-md border border-gray-200">
        <h1 className="text-2xl font-bold mb-2">重置密码</h1>
        <p className="text-gray-500 text-sm mb-6">请输入您的新密码</p>

        {success ? (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700 mb-4">
              密码已重置成功
            </div>
            <button onClick={() => navigate('/auth/login')}
              className="w-full bg-[#e8673a] hover:bg-[#d4562a] text-white py-2.5 rounded-lg font-medium">
              前往登录
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}
            <div>
              <label className="block text-sm font-medium mb-1">新密码</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]"
                placeholder="至少6个字符" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">确认密码</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#e8673a]"
                placeholder="再次输入密码" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#e8673a] hover:bg-[#d4562a] text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
              {loading ? '重置中...' : '重置密码'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
