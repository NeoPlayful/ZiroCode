'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SparklesIcon } from '@heroicons/react/20/solid';

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
    <div className="min-h-screen bg-[#f0ebe3]">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-[1280px] mx-auto px-8 h-14 flex items-center relative font-bold text-xl">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-7 h-7 text-[#e8673a]" />ZiroCode
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 flex gap-1 font-normal text-base">
            {[
              { label: '仪表板', href: '/dashboard' },
              { label: 'API密钥', href: '/keys' },
              { label: '兑换订阅', href: '/subscription' },
              { label: '使用统计', href: '/usage' },
            ].map((item) => (
              <a key={item.label} href={item.href}
                className={`px-4 py-1.5 rounded-md ${item.href === '/keys' ? 'bg-[#e8673a] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">API 密钥</h1>
            <p className="text-sm text-gray-500 mt-1">管理您的 API 访问密钥</p>
          </div>
          <button onClick={() => { setShowCreate(true); setNewKeyResult(null); }}
            className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium">
            + 创建密钥
          </button>
        </div>

        {/* 创建弹窗 */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { if (!newKeyResult) setShowCreate(false); }}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              {newKeyResult ? (
                <div>
                  <h3 className="font-semibold text-lg mb-2">密钥创建成功</h3>
                  <p className="text-sm text-gray-500 mb-3">请立即复制此密钥，关闭后将不再显示完整密钥。</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 font-mono text-sm break-all">{newKeyResult}</div>
                  <div className="flex gap-2">
                    <button onClick={() => copyKey(newKeyResult)} className="flex-1 bg-[#e8673a] text-white py-2 rounded-lg text-sm">
                      {copySuccess ? '✓ 已复制' : '复制密钥'}
                    </button>
                    <button onClick={() => { setShowCreate(false); setNewKeyResult(null); }}
                      className="flex-1 border border-gray-200 py-2 rounded-lg text-sm">关闭</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-lg mb-4">创建新密钥</h3>
                  <label className="block text-sm font-medium mb-1">密钥名称</label>
                  <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-[#e8673a]"
                    placeholder="例如：生产环境" />
                  <div className="flex gap-2">
                    <button onClick={() => createMutation.mutate(newKeyName)} disabled={!newKeyName || createMutation.isPending}
                      className="flex-1 bg-[#e8673a] text-white py-2 rounded-lg text-sm disabled:opacity-50">
                      {createMutation.isPending ? '创建中...' : '创建'}
                    </button>
                    <button onClick={() => setShowCreate(false)}
                      className="flex-1 border border-gray-200 py-2 rounded-lg text-sm">取消</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 密钥列表 */}
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-lg" />)}
          </div>
        ) : keys.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <div className="text-4xl mb-3">🔑</div>
            <p className="text-gray-500 mb-4">还没有创建 API 密钥</p>
            <button onClick={() => setShowCreate(true)} className="bg-[#e8673a] text-white px-5 py-2 rounded-lg text-sm font-medium">
              创建第一个密钥
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">名称</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">密钥</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">状态</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">最后使用</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key: any) => (
                  <tr key={key.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{key.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{key.key}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${key.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {key.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : '从未使用'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { if (confirm('确定删除此密钥？')) deleteMutation.mutate(key.id); }}
                        className="text-red-500 hover:text-red-700 text-sm">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
