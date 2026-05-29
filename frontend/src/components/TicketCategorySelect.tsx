import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

interface TicketCategorySelectProps {
  value?: string
  onChange: (categoryId: string) => void
}

export default function TicketCategorySelect({ value, onChange }: TicketCategorySelectProps) {
  const { t } = useTranslation('common')
  const { data } = useQuery({
    queryKey: ['ticket-categories'],
    queryFn: () => fetch('/api/tickets/categories').then(r => r.json())
  })

  const categories = data?.categories || []

  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8673a]"
    >
      <option value="">{t('ticket.allCategories')}</option>
      {categories.map((cat: any) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </select>
  )
}
