import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/20/solid'
import { useTranslation } from 'react-i18next'

const statusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  IN_PROGRESS: 'bg-blue-100 dark:bg-[#BF5AF2]/12 text-blue-700 dark:text-blue-300',
  RESOLVED: 'bg-green-100 dark:bg-[#30D158]/10 text-green-700 dark:text-green-300',
  CLOSED: 'bg-gray-100 dark:bg-[#242426] text-gray-500 dark:text-[#98989D]',
}

export default function TicketDetailPage() {
  const { t } = useTranslation('tickets');
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [replyContent, setReplyContent] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetch(`/api/tickets/${id}`).then(r => r.json()),
  })
  const ticket = data?.ticket
  const statusColor = ticket ? (statusColors[ticket.status] || 'bg-gray-100') : ''
  const statusLabel = ticket ? t(`tickets.status.${ticket.status}`) : ''

  const replyMutation = useMutation({
    mutationFn: (content: string) => fetch(`/api/tickets/${id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      setReplyContent('')
    },
  })

  if (isLoading) return (
    <div className="max-w-[900px] mx-auto px-8 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-[#242426] rounded w-48" />
        <div className="h-32 bg-gray-100 dark:bg-[#242426] rounded-xl" />
      </div>
    </div>
  )

  if (!ticket) return (
    <div className="max-w-[900px] mx-auto px-8 py-16 text-center text-gray-400 dark:text-[#6E6E73]">
      <p>{t('tickets.notFound')}</p>
      <button onClick={() => navigate('/tickets')} className="text-[#e8673a] text-sm mt-2">{t('tickets.backToList')}</button>
    </div>
  )

  return (
    <div className="max-w-[900px] mx-auto px-8 py-8">
      <button onClick={() => navigate('/tickets')} className="flex items-center gap-1 text-sm text-gray-500 dark:text-[#98989D] hover:text-gray-700 dark:hover:text-[#F5F5F7] mb-4">
        <ArrowLeftIcon className="w-4 h-4" /> {t('tickets.backToList')}
      </button>

      <div className="bg-white dark:bg-[#1F1F21] rounded-xl border border-gray-200 dark:border-[#303033] p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">{ticket.title}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-[#E5E5E7] whitespace-pre-wrap mb-2">{ticket.content}</p>
        <p className="text-xs text-gray-400 dark:text-[#6E6E73]">{new Date(ticket.createdAt).toLocaleString()}</p>
      </div>

      {ticket.replies?.map((r: any) => (
        <div key={r.id} className={`bg-white dark:bg-[#1F1F21] rounded-xl border border-gray-200 dark:border-[#303033] p-4 mb-3 ${r.isStaff ? 'border-[#e8673a] bg-[#fef3ee] dark:bg-[#2a1510]' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{r.isStaff ? t('tickets.reply.admin') : t('tickets.reply.me')}</span>
            {r.isStaff && <span className="text-xs bg-[#e8673a] dark:bg-[#e8673a] text-white px-1.5 py-0.5 rounded">{t('tickets.reply.official')}</span>}
          </div>
          <p className="text-sm text-gray-700 dark:text-[#E5E5E7] whitespace-pre-wrap">{r.content}</p>
          <p className="text-xs text-gray-400 dark:text-[#6E6E73] mt-1">{new Date(r.createdAt).toLocaleString()}</p>
        </div>
      ))}

      {ticket.status !== 'CLOSED' && (
        <div className="bg-white dark:bg-[#1F1F21] rounded-xl border border-gray-200 dark:border-[#303033] p-4">
          <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} rows={3}
            placeholder={t('tickets.reply.placeholder')} className="w-full border border-gray-200 dark:border-[#303033] rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#e8673a]" />
          <div className="flex justify-end">
            <button onClick={() => replyMutation.mutate(replyContent)}
              disabled={!replyContent.trim()}
              className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{t('tickets.reply.submit')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
