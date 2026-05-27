import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PlusIcon, ChatBubbleLeftIcon } from '@heroicons/react/20/solid'

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

  const { data, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => fetch('/api/tickets').then(r => r.json()),
  })
  const tickets = data?.tickets || []

  const createMutation = useMutation({
    mutationFn: (body: any) => fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setShowForm(false)
      setTitle('')
      setContent('')
    },
  })

  return (
    <div className="max-w-[900px] mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">工单</h1>
          <p className="text-gray-500 text-sm">提交问题或建议，我们将尽快回复</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" /> 新建工单
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="font-semibold mb-3">新建工单</h3>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="标题" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#e8673a]" />
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="详细描述您的问题..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#e8673a]" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
            <button onClick={() => createMutation.mutate({ title, content })}
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
