import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function KeysPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => fetch('/api/keys').then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then(r => r.json()),
    onSuccess: (result) => {
      setNewKeyResult(result.key?.key || '');
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/keys/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const keys = data?.keys || [];

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  return (
    <main className="max-w-[1280px] mx-auto px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-[#E5E5E7]">API 密钥</h1>
          <p className="text-sm text-gray-500 dark:text-[#98989D] mt-1">管理您的 API 访问密钥</p>
          </div>
          <button onClick={() => { setShowCreate(true); setNewKeyResult(null); }}
            className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium">
            + 创建密钥
          </button>
        </div>

        {/* 创建弹窗 */}
        {showCreate && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50" onClick={() => { if (!newKeyResult) setShowCreate(false); }}>
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              {newKeyResult ? (
                <div>
                  <h3 className="font-semibold text-lg mb-2 dark:text-[#E5E5E7]">密钥创建成功</h3>
                  <p className="text-sm text-gray-500 dark:text-[#98989D] mb-3">请立即复制此密钥，关闭后将不再显示完整密钥。</p>
                  <div className="bg-gray-50 dark:bg-[#242426] border border-gray-200 dark:border-[#303033] rounded-lg p-3 mb-3 font-mono text-sm break-all">{newKeyResult}</div>
                  <div className="flex gap-2">
                    <button onClick={() => copyKey(newKeyResult)} className="flex-1 bg-[#e8673a] text-white py-2 rounded-lg text-sm">
                      {copySuccess ? '✓ 已复制' : '复制密钥'}
                    </button>
                    <button onClick={() => { setShowCreate(false); setNewKeyResult(null); }}
                      className="flex-1 border border-gray-200 dark:border-[#303033] py-2 rounded-lg text-sm dark:text-[#E5E5E7]">关闭</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-lg mb-4 dark:text-[#E5E5E7]">创建新密钥</h3>
                  <label className="block text-sm font-medium mb-1 dark:text-[#E5E5E7]">密钥名称</label>
                  <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                    className="w-full border border-gray-200 dark:border-[#303033] rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-[#e8673a] dark:bg-[#242426] dark:text-[#E5E5E7]"
                    placeholder="例如：生产环境" />
                  <div className="flex gap-2">
                    <button onClick={() => createMutation.mutate(newKeyName)} disabled={!newKeyName || createMutation.isPending}
                      className="flex-1 bg-[#e8673a] text-white py-2 rounded-lg text-sm disabled:opacity-50">
                      {createMutation.isPending ? '创建中...' : '创建'}
                    </button>
                    <button onClick={() => setShowCreate(false)}
                      className="flex-1 border border-gray-200 dark:border-[#303033] py-2 rounded-lg text-sm dark:text-[#E5E5E7]">取消</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 密钥列表 */}
        {isLoading ? (
        <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-[#242426] rounded-lg" />)}
          </div>
        ) : keys.length === 0 ? (
        <div className="bg-white dark:bg-[#1F1F21] rounded-xl p-12 text-center border border-gray-200 dark:border-[#303033]">
          <div className="text-4xl mb-3">🔑</div>
            <p className="text-gray-500 dark:text-[#98989D] mb-4">还没有创建 API 密钥</p>
            <button onClick={() => setShowCreate(true)} className="bg-[#e8673a] text-white px-5 py-2 rounded-lg text-sm font-medium">
              创建第一个密钥
            </button>
          </div>
        ) : (
        <div className="bg-white dark:bg-[#1F1F21] rounded-xl border border-gray-200 dark:border-[#303033] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#303033] bg-gray-50 dark:bg-[#1F1F21]">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-[#98989D]">名称</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-[#98989D]">密钥</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-[#98989D]">状态</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-[#98989D]">最后使用</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500 dark:text-[#98989D]">操作</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key: any) => (
                  <tr key={key.id} className="border-b border-gray-50 dark:border-[#303033] hover:bg-gray-50 dark:hover:bg-[#242426]">
                    <td className="px-4 py-3 text-sm font-medium dark:text-[#E5E5E7]">{key.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-[#98989D]">{key.key}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${key.isActive ? 'bg-green-50 dark:bg-[#30D158]/15 text-green-600 dark:text-[#30D158]' : 'bg-gray-100 dark:bg-[#242426] text-gray-400'}`}>
                        {key.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 dark:text-[#6E6E73]">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : '从未使用'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { if (confirm('确定删除此密钥？')) deleteMutation.mutate(key.id); }}
                        className="text-red-500 dark:text-[#FF453A] hover:text-red-700 dark:hover:text-red-300 text-sm">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
  );
}
