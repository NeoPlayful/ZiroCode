import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PlusIcon, ChatBubbleLeftIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/20/solid'
import TicketCategorySelect from '../components/TicketCategorySelect'
import TicketTemplateSelect from '../components/TicketTemplateSelect'

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: '待处理', color: 'bg-yellow-100 text-yellow-700' },
  IN_PROGRESS: { label: '处理中', color: 'bg-blue-100 text-blue-700' },
  RESOLVED: { label: '已解决', color: 'bg-green-100 text-green-700' },
  CLOSED: { label: '已关闭', color: 'bg-gray-100 text-gray-500' },
}

export default function TicketsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const params = new URLSearchParams()
  if (search) params.set('q', search)
  if (filterCategory) params.set('categoryId', filterCategory)
  if (filterStatus) params.set('status', filterStatus)

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', search, filterCategory, filterStatus],
    queryFn: () => fetch(`/api/tickets/search?${params}`).then(r => r.json()),
  })
  const tickets = data?.tickets || []

  const createMutation = useMutation({
    mutationFn: (body: any) => fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setShowForm(false)
      setTitle('')
      setContent('')
      setCategoryId('')
      setPriority('NORMAL')
    },
  })

  const handleExport = () => {
    window.open('/api/tickets/export', '_blank')
  }

  return (
    <div className="max-w-[900px] mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">工单</h1>
          <p className="text-gray-500 text-sm">提交问题或建议，我们将尽快回复</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
            <ArrowDownTrayIcon className="w-4 h-4" /> 导出
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
            <PlusIcon className="w-4 h-4" /> 新建工单
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索标题或内容..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e8673a]" />
          </div>
          <TicketCategorySelect value={filterCategory} onChange={setFilterCategory} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8673a]">
            <option value="">全部状态</option>
            <option value="OPEN">待处理</option>
            <option value="IN_PROGRESS">处理中</option>
            <option value="RESOLVED">已解决</option>
            <option value="CLOSED">已关闭</option>
          </select>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="font-semibold mb-3">新建工单</h3>
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">选择模板</label>
            <TicketTemplateSelect onSelect={tpl => { setTitle(tpl.title); setContent(tpl.content); if (tpl.categoryId) setCategoryId(tpl.categoryId) }} />
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="标题" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#e8673a]" />
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="详细描述您的问题..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#e8673a]" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">分类</label>
              <TicketCategorySelect value={categoryId} onChange={setCategoryId} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">优先级</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8673a]">
                <option value="LOW">低</option>
                <option value="NORMAL">普通</option>
                <option value="HIGH">高</option>
                <option value="URGENT">紧急</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
            <button onClick={() => createMutation.mutate({ title, content, categoryId: categoryId || undefined, priority })}
              disabled={!title || !content}
              className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">提交</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-3" />
          <p>暂无工单</p>
          <button onClick={() => setShowForm(true)} className="text-[#e8673a] text-sm mt-1">创建第一个工单</button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t: any) => {
            const s = statusLabels[t.status] || { label: t.status, color: 'bg-gray-100' }
            return (
              <Link key={t.id} to={`/tickets/${t.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-[#e8673a] transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">{t.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{t.content}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(t.createdAt).toLocaleString()}</p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
