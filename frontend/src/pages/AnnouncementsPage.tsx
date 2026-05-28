import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function AnnouncementsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => fetch('/api/announcements').then(r => r.json()),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/announcements/${id}/read`, { method: 'PUT' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  })

  const announcements = data?.announcements || []

  return (
    <div className="max-w-[900px] mx-auto px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">公告中心</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 text-gray-400">暂无公告</div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => (
            <div key={a.id} className={`bg-white rounded-xl border p-5 ${a.isRead ? 'border-gray-200' : 'border-[#e8673a]'}`}>
              <div className="flex items-center gap-2 mb-2">
                {!a.isRead && <span className="text-xs bg-[#e8673a] text-white px-2 py-0.5 rounded-full">未读</span>}
              </div>
              <h3 className="font-semibold mb-2">{a.title}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{a.content}</p>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</p>
                {!a.isRead && (
                  <button onClick={() => markReadMutation.mutate(a.id)}
                    className="text-xs text-[#e8673a] hover:underline">标记已读</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
