import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PlusIcon, ChatBubbleLeftIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/20/solid'
import { useTranslation } from 'react-i18next'
import TicketCategorySelect from '../components/TicketCategorySelect'
import TicketTemplateSelect from '../components/TicketTemplateSelect'

const statusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  IN_PROGRESS: 'bg-blue-100 dark:bg-[#BF5AF2]/12 text-blue-700 dark:text-blue-300',
  RESOLVED: 'bg-green-100 dark:bg-[#30D158]/10 text-green-700 dark:text-green-300',
  CLOSED: 'bg-gray-100 dark:bg-[#242426] text-gray-500 dark:text-[#98989D]',
}

export default function TicketsPage() {
  const { t } = useTranslation('tickets');
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
          <h1 className="text-2xl font-bold">{t('tickets.title')}</h1>
          <p className="text-gray-500 dark:text-[#98989D] text-sm">{t('tickets.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="bg-white dark:bg-[#1F1F21] border border-gray-200 dark:border-[#303033] hover:bg-gray-50 dark:hover:bg-[#242426] text-gray-700 dark:text-[#E5E5E7] px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
            <ArrowDownTrayIcon className="w-4 h-4" /> {t('tickets.export')}
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
            <PlusIcon className="w-4 h-4" /> {t('tickets.createNew')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1F1F21] rounded-xl border border-gray-200 dark:border-[#303033] p-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6E6E73]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('tickets.search.placeholder')}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-[#303033] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e8673a]" />
          </div>
          <TicketCategorySelect value={filterCategory} onChange={setFilterCategory} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="w-full border border-gray-200 dark:border-[#303033] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8673a]">
            <option value="">{t('tickets.status.all')}</option>
            <option value="OPEN">{t('tickets.status.OPEN')}</option>
            <option value="IN_PROGRESS">{t('tickets.status.IN_PROGRESS')}</option>
            <option value="RESOLVED">{t('tickets.status.RESOLVED')}</option>
            <option value="CLOSED">{t('tickets.status.CLOSED')}</option>
          </select>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-[#1F1F21] rounded-xl border border-gray-200 dark:border-[#303033] p-5 mb-6">
          <h3 className="font-semibold mb-3">{t('tickets.createNew')}</h3>
          <div className="mb-3">
            <label className="text-xs text-gray-500 dark:text-[#98989D] mb-1 block">{t('tickets.form.selectTemplate')}</label>
            <TicketTemplateSelect onSelect={tpl => { setTitle(tpl.title); setContent(tpl.content); if (tpl.categoryId) setCategoryId(tpl.categoryId) }} />
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('tickets.form.title')} className="w-full border border-gray-200 dark:border-[#303033] rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#e8673a]" />
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder={t('tickets.form.description')} className="w-full border border-gray-200 dark:border-[#303033] rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#e8673a]" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-[#98989D] mb-1 block">{t('tickets.form.category')}</label>
              <TicketCategorySelect value={categoryId} onChange={setCategoryId} />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-[#98989D] mb-1 block">{t('tickets.form.priority')}</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full border border-gray-200 dark:border-[#303033] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8673a]">
                <option value="LOW">{t('tickets.priority.LOW')}</option>
                <option value="NORMAL">{t('tickets.priority.NORMAL')}</option>
                <option value="HIGH">{t('tickets.priority.HIGH')}</option>
                <option value="URGENT">{t('tickets.priority.URGENT')}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 dark:text-[#98989D] hover:bg-gray-100 dark:hover:bg-[#242426] rounded-lg">{t('tickets.form.cancel')}</button>
            <button onClick={() => createMutation.mutate({ title, content, categoryId: categoryId || undefined, priority })}
              disabled={!title || !content}
              className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{t('tickets.form.submit')}</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-[#242426] rounded-xl animate-pulse" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-[#6E6E73]">
          <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-3" />
          <p>{t('tickets.emptyState.message')}</p>
          <button onClick={() => setShowForm(true)} className="text-[#e8673a] text-sm mt-1">{t('tickets.emptyState.hint')}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => {
            const statusColor = statusColors[ticket.status] || 'bg-gray-100'
            const statusLabel = t(`tickets.status.${ticket.status}`)
            return (
              <Link key={ticket.id} to={`/tickets/${ticket.id}`}
                className="block bg-white dark:bg-[#1F1F21] rounded-xl border border-gray-200 dark:border-[#303033] p-4 hover:border-[#e8673a] transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">{ticket.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-[#98989D] line-clamp-2">{ticket.content}</p>
                <p className="text-xs text-gray-400 dark:text-[#6E6E73] mt-2">{new Date(ticket.createdAt).toLocaleString()}</p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
