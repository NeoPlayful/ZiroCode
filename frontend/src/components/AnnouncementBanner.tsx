import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { XMarkIcon } from '@heroicons/react/20/solid'

export default function AnnouncementBanner() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => fetch('/api/announcements').then(r => r.json()),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/announcements/${id}/read`, { method: 'PUT' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  })

  const unread = data?.announcements?.filter((a: any) => !a.isRead) || []
  if (unread.length === 0) return null

  const announcement = unread[0]

  return (
    <div className="border-b bg-[#fef3ee] border-[#f5d0c0] px-4 py-2 flex items-center justify-between text-sm text-[#8b4513]">
      <p className="flex-1">{announcement.title}</p>
      <button onClick={() => markReadMutation.mutate(announcement.id)} className="ml-2">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
