import { useQuery } from '@tanstack/react-query'

interface TicketTemplateSelectProps {
  onSelect: (template: { title: string; content: string; categoryId?: string }) => void
}

export default function TicketTemplateSelect({ onSelect }: TicketTemplateSelectProps) {
  const { data } = useQuery({
    queryKey: ['ticket-templates'],
    queryFn: () => fetch('/api/tickets/templates').then(r => r.json())
  })

  const templates = data?.templates || []

  return (
    <select
      onChange={e => {
        const template = templates.find((t: any) => t.id === e.target.value)
        if (template) onSelect({ title: template.title, content: template.content, categoryId: template.categoryId })
      }}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8673a]"
    >
      <option value="">选择模板（可选）</option>
      {templates.map((tpl: any) => (
        <option key={tpl.id} value={tpl.id}>
          {tpl.name}
        </option>
      ))}
    </select>
  )
}
