import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export default function KeysPage() {
  const { t } = useTranslation('keys');
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [rateLimit, setRateLimit] = useState('60');
  const [maxTokens, setMaxTokens] = useState('4096');
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => fetch('/api/keys').then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; rateLimit?: number; maxTokens?: number }) =>
      fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (result) => {
      setNewKeyResult(result.key?.key || '');
      setNewKeyName('');
      setRateLimit('60');
      setMaxTokens('4096');
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
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
          <button onClick={() => { setShowCreate(true); setNewKeyResult(null); }}
            className="bg-[#e8673a] hover:bg-[#d4562a] text-white px-4 py-2 rounded-lg text-sm font-medium">
            {t('createButton')}
          </button>
        </div>

        {/* 创建弹窗 */}
        {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { if (!newKeyResult) setShowCreate(false); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              {newKeyResult ? (
                <div>
                  <h3 className="font-semibold text-lg mb-2">{t('createSuccess.title')}</h3>
                  <p className="text-sm text-gray-500 mb-3">{t('createSuccess.warning')}</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 font-mono text-sm break-all">{newKeyResult}</div>
                  <div className="flex gap-2">
                    <button onClick={() => copyKey(newKeyResult)} className="flex-1 bg-[#e8673a] text-white py-2 rounded-lg text-sm">
                      {copySuccess ? t('createSuccess.copied') : t('createSuccess.copyButton')}
                    </button>
                    <button onClick={() => { setShowCreate(false); setNewKeyResult(null); }}
                      className="flex-1 border border-gray-200 py-2 rounded-lg text-sm">{t('createSuccess.closeButton')}</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-lg mb-4">{t('createDialog.title')}</h3>
                  <label className="block text-sm font-medium mb-1">{t('createDialog.nameLabel')}</label>
                  <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-[#e8673a]"
                    placeholder={t('createDialog.namePlaceholder')} />
                  <label className="block text-sm font-medium mb-1">{t('createDialog.rateLimitLabel')}</label>
                  <input value={rateLimit} onChange={e => setRateLimit(e.target.value)} type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-[#e8673a]" />
                  <label className="block text-sm font-medium mb-1">{t('createDialog.maxTokensLabel')}</label>
                  <input value={maxTokens} onChange={e => setMaxTokens(e.target.value)} type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-[#e8673a]" />
                  <div className="flex gap-2">
                    <button onClick={() => createMutation.mutate({ name: newKeyName, rateLimit: parseInt(rateLimit), maxTokens: parseInt(maxTokens) })} disabled={!newKeyName || createMutation.isPending}
                      className="flex-1 bg-[#e8673a] text-white py-2 rounded-lg text-sm disabled:opacity-50">
                      {createMutation.isPending ? t('createDialog.creating') : t('createDialog.createButton')}
                    </button>
                    <button onClick={() => setShowCreate(false)}
                      className="flex-1 border border-gray-200 py-2 rounded-lg text-sm">{t('createDialog.cancelButton')}</button>
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
            <p className="text-gray-500 mb-4">{t('emptyState.message')}</p>
            <button onClick={() => setShowCreate(true)} className="bg-[#e8673a] text-white px-5 py-2 rounded-lg text-sm font-medium">
              {t('emptyState.button')}
            </button>
          </div>
        ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t('table.name')}</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t('table.key')}</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t('table.status')}</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t('table.lastUsed')}</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key: any) => (
                  <tr key={key.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{key.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{key.key}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${key.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {key.isActive ? t('table.statusActive') : t('table.statusDisabled')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : t('table.neverUsed')}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { if (confirm(t('table.deleteConfirm'))) deleteMutation.mutate(key.id); }}
                        className="text-red-500 hover:text-red-700 text-sm">{t('table.deleteButton')}</button>
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
