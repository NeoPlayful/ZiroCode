import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

const adminTabs = [
  { key: 'dashboard', label: '概览' },
  { key: 'users', label: '用户管理' },
  { key: 'subscriptions', label: '订阅' },
  { key: 'redeem-codes', label: '兑换码' },
  { key: 'channels', label: '渠道' },
  { key: 'withdrawals', label: '提现' },
  { key: 'tickets', label: '工单' },
  { key: 'announcements', label: '公告' },
  { key: 'audit-logs', label: '审计日志' },
  { key: 'batch', label: '批量操作' },
  { key: 'config', label: '系统配置' },
]

export default function AdminPage() {
  const [tab, setTab] = useState('dashboard')
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => fetch('/api/auth/me').then(r => r.json()) })

  if (!me?.user) return null
  if (me.user.role !== 'ADMIN') {
    return <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center text-gray-400"><p>需要管理员权限</p></div>
  }

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-6">
      <div className="flex items-center gap-2 mb-6">
        {adminTabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === t.key ? 'bg-[#e8673a] text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <AdminDashboard />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'subscriptions' && <AdminSubscriptions />}
      {tab === 'redeem-codes' && <AdminRedeemCodes />}
      {tab === 'channels' && <AdminChannels />}
      {tab === 'withdrawals' && <AdminWithdrawals />}
      {tab === 'tickets' && <AdminTickets />}
      {tab === 'announcements' && <AdminAnnouncements />}
      {tab === 'audit-logs' && <AdminAuditLogs />}
      {tab === 'batch' && <AdminBatch />}
      {tab === 'config' && <AdminConfig />}
    </div>
  )
}

function AdminDashboard() {
  const { data } = useQuery({ queryKey: ['admin-stats'], queryFn: () => fetch('/api/admin/stats').then(r => r.json()) })
  const stats = data?.stats || {}
  return (
    <div className="grid grid-cols-4 gap-4">
      {[
        { label: '用户总数', value: stats.users, color: 'bg-blue-500' },
        { label: '活跃密钥', value: stats.activeKeys, color: 'bg-green-500' },
        { label: '今日调用', value: stats.todayCalls, color: 'bg-orange-500' },
        { label: '总调用量', value: stats.totalCalls, color: 'bg-purple-500' },
      ].map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className={`w-3 h-3 rounded-full ${s.color} mb-2`} />
          <div className="text-2xl font-bold">{s.value ?? '-'}</div>
          <div className="text-sm text-gray-500">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

function AdminUsers() {
  const { data } = useQuery({ queryKey: ['admin-users'], queryFn: () => fetch('/api/admin/users').then(r => r.json()) })
  const users = data?.users || []

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold">用户列表 ({data?.total || 0})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b">{['邮箱', '昵称', '角色', '密钥', '订阅', '注册时间'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.name}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'ADMIN' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100'}`}>{u.role}</span></td>
                <td className="p-3">{u._count?.apiKeys || 0}</td>
                <td className="p-3">{u._count?.subscriptions || 0}</td>
                <td className="p-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminSubscriptions() {
  const { data } = useQuery({ queryKey: ['admin-subscriptions'], queryFn: () => fetch('/api/admin/subscriptions').then(r => r.json()) })
  const subs = data?.subscriptions || []
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 border-b">{['用户', '类型', '总配额', '已用', '状态', '到期'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {subs.map((s: any) => (
            <tr key={s.id} className="border-b border-gray-50">
              <td className="p-3">{s.user?.name || '-'}</td>
              <td className="p-3">{s.type}</td>
              <td className="p-3">{(Number(s.quotaTotal) / 100000000).toFixed(1)}亿</td>
              <td className="p-3">{(Number(s.quotaUsed) / 100000000).toFixed(1)}亿</td>
              <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.isActive ? '有效' : '过期'}</span></td>
              <td className="p-3 text-gray-400">{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : '永久'}</td>
            </tr>
          ))}
          {subs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">暂无数据</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function AdminRedeemCodes() {
  const { data, refetch } = useQuery({ queryKey: ['admin-redeem-codes'], queryFn: () => fetch('/api/admin/redeem-codes').then(r => r.json()) })
  const codes = data?.codes || []
  const [quota, setQuota] = useState('100000000')
  const [type, setType] = useState('PAY_AS_YOU_GO')
  const [count, setCount] = useState('1')

  async function generate() {
    await fetch('/api/admin/redeem-codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quotaAmount: quota, type, count: parseInt(count) }) })
    refetch()
  }

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-3">
        <div><label className="text-xs text-gray-500 mb-1 block">配额</label><input value={quota} onChange={e => setQuota(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-28" /></div>
        <div><label className="text-xs text-gray-500 mb-1 block">类型</label>
          <select value={type} onChange={e => setType(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
            <option value="PAY_AS_YOU_GO">按量</option><option value="MONTHLY">月卡</option><option value="PERMANENT">永久</option>
          </select>
        </div>
        <div><label className="text-xs text-gray-500 mb-1 block">数量</label><input value={count} onChange={e => setCount(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-16" /></div>
        <button onClick={generate} className="bg-[#e8673a] text-white px-4 py-1.5 rounded-lg text-sm">生成</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b">{['兑换码', '配额', '类型', '已用/最大', '状态', '创建时间'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {codes.map((c: any) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="p-3 font-mono text-xs">{c.code}</td>
                <td className="p-3">{(Number(c.quotaAmount) / 100000000).toFixed(1)}亿</td>
                <td className="p-3">{c.type}</td>
                <td className="p-3">{c.usedCount}/{c.maxUses}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.isActive ? '有效' : '禁用'}</span></td>
                <td className="p-3 text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminChannels() {
  const { data, refetch } = useQuery({ queryKey: ['admin-channels'], queryFn: () => fetch('/api/admin/channels').then(r => r.json()) })
  const channels = data?.channels || []
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', displayName: '', baseUrl: '', apiKey: '', models: '', priority: '0' })

  async function create() {
    await fetch('/api/admin/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, models: form.models.split(',').filter(Boolean) }) })
    setShowForm(false); refetch()
  }

  async function testChannel(id: string) {
    const res = await fetch(`/api/admin/channels/${id}/test`, { method: 'POST' })
    const data = await res.json()
    alert(data.healthy ? '测试成功' : '测试失败')
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm(!showForm)} className="bg-[#e8673a] text-white px-4 py-1.5 rounded-lg text-sm">新增渠道</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-2 gap-3">
          {['name','displayName','baseUrl','apiKey'].map(f => <input key={f} value={(form as any)[f]} onChange={e => setForm({...form, [f]: e.target.value})} placeholder={f} className="border rounded px-2 py-1.5 text-sm" />)}
          <input value={form.models} onChange={e => setForm({...form, models: e.target.value})} placeholder="模型 (逗号分隔)" className="border rounded px-2 py-1.5 text-sm" />
          <input value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} placeholder="优先级" className="border rounded px-2 py-1.5 text-sm" />
          <button onClick={create} className="bg-[#e8673a] text-white px-4 py-1.5 rounded-lg text-sm col-span-2">保存</button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b">{['名称', 'URL', '模型数', '优先级', '状态', '操作'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {channels.map((c: any) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="p-3">{c.displayName || c.name}</td>
                <td className="p-3 text-xs text-gray-400">{c.baseUrl}</td>
                <td className="p-3">{c.models?.length || 0}</td>
                <td className="p-3">{c.priority}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.isActive ? '启用' : '禁用'}</span></td>
                <td className="p-3"><button onClick={() => testChannel(c.id)} className="text-blue-600 hover:underline text-xs">测试</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminWithdrawals() {
  const { data, refetch } = useQuery({ queryKey: ['admin-withdrawals'], queryFn: () => fetch('/api/admin/withdrawals').then(r => r.json()) })
  const withdrawals = data?.withdrawals || []

  async function approve(id: string) {
    await fetch(`/api/admin/withdrawals/${id}/approve`, { method: 'PUT' })
    refetch()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 border-b">{['用户', '金额', '状态', '申请时间', '操作'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {withdrawals.map((w: any) => (
            <tr key={w.id} className="border-b border-gray-50">
              <td className="p-3">{w.user?.name || '-'}</td>
              <td className="p-3">¥{Number(w.amount).toFixed(2)}</td>
              <td className="p-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${w.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {w.status === 'PENDING' ? '待审核' : w.status === 'APPROVED' ? '已通过' : '已拒绝'}
                </span>
              </td>
              <td className="p-3 text-gray-400">{new Date(w.createdAt).toLocaleDateString()}</td>
              <td className="p-3">
                {w.status === 'PENDING' && (
                  <button onClick={() => approve(w.id)} className="text-green-600 hover:underline text-xs">批准</button>
                )}
              </td>
            </tr>
          ))}
          {withdrawals.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">暂无提现申请</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function AdminAuditLogs() {
  const { data } = useQuery({ queryKey: ['admin-audit-logs'], queryFn: () => fetch('/api/admin/audit-logs').then(r => r.json()) })
  const logs = data?.logs || []
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 border-b">{['操作', '资源', '用户ID', '时间'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {logs.map((log: any) => (
            <tr key={log.id} className="border-b border-gray-50">
              <td className="p-3">{log.action}</td>
              <td className="p-3">{log.resource}</td>
              <td className="p-3 text-gray-400">{log.userId || '-'}</td>
              <td className="p-3 text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">暂无审计日志</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function AdminBatch() {
  const [count, setCount] = useState('10')
  const [quotaAmount, setQuotaAmount] = useState('100000000')

  async function batchGenerate() {
    await fetch('/api/admin/batch/redeem-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: parseInt(count), quotaAmount, type: 'PAY_AS_YOU_GO' })
    })
    alert('批量生成成功')
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">批量生成兑换码</h3>
        <label className="block text-sm mb-1">数量</label>
        <input value={count} onChange={e => setCount(e.target.value)} type="number" className="w-full border rounded px-3 py-2 mb-3" />
        <label className="block text-sm mb-1">配额</label>
        <input value={quotaAmount} onChange={e => setQuotaAmount(e.target.value)} type="number" className="w-full border rounded px-3 py-2 mb-3" />
        <button onClick={batchGenerate} className="bg-[#e8673a] text-white px-4 py-2 rounded">生成</button>
      </div>
    </div>
  )
}

function AdminConfig() {
  const [siteName, setSiteName] = useState('ZiroCode')
  const [defaultQuota, setDefaultQuota] = useState('100000000')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold mb-4">系统配置</h3>
      <label className="block text-sm mb-1">站点名称</label>
      <input value={siteName} onChange={e => setSiteName(e.target.value)} className="w-full border rounded px-3 py-2 mb-3" />
      <label className="block text-sm mb-1">默认配额</label>
      <input value={defaultQuota} onChange={e => setDefaultQuota(e.target.value)} type="number" className="w-full border rounded px-3 py-2 mb-3" />
      <button className="bg-[#e8673a] text-white px-4 py-2 rounded">保存</button>
    </div>
  )
}

function AdminTickets() {
  const { data } = useQuery({ queryKey: ['admin-tickets'], queryFn: () => fetch('/api/admin/tickets').then(r => r.json()) })
  const tickets = data?.tickets || []
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 border-b">{['标题', '用户', '状态', '优先级', '创建时间'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {tickets.map((t: any) => (
            <tr key={t.id} className="border-b border-gray-50">
              <td className="p-3">{t.title}</td>
              <td className="p-3">{t.user?.name || '-'}</td>
              <td className="p-3">{t.status}</td>
              <td className="p-3">{t.priority}</td>
              <td className="p-3 text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {tickets.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">暂无工单</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function AdminAnnouncements() {
  const { data, refetch } = useQuery({ queryKey: ['admin-announcements'], queryFn: () => fetch('/api/admin/announcements').then(r => r.json()) })
  const announcements = data?.announcements || []
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })

  async function create() {
    await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setShowForm(false); setForm({ title: '', content: '' }); refetch()
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowForm(!showForm)} className="bg-[#e8673a] text-white px-4 py-1.5 rounded-lg text-sm">新建公告</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="标题" className="w-full border rounded px-2 py-1.5 text-sm mb-2" />
          <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="内容" rows={3} className="w-full border rounded px-2 py-1.5 text-sm mb-2" />
          <button onClick={create} className="bg-[#e8673a] text-white px-4 py-1.5 rounded-lg text-sm">保存</button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b">{['标题', '状态', '创建时间'].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {announcements.map((a: any) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="p-3">{a.title}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{a.isActive ? '启用' : '禁用'}</span></td>
                <td className="p-3 text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
