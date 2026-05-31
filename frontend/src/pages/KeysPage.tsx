import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

function maskKey(key: string): string {
  if (key.length <= 12) return key;
  return key.slice(0, 12) + '••••••••••••••••' + key.slice(-4);
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${M}-${D} ${h}:${m}`;
}

export default function KeysPage() {
  const { t } = useTranslation('keys');
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [rateLimit, setRateLimit] = useState('0');
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => fetch('/api/keys').then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; rateLimit?: number }) =>
      fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (result) => {
      setNewKeyResult(result.key?.key || '');
      setNewKeyName('');
      setRateLimit('0');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/keys/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/keys/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }) }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const keys = data?.keys || [];

  async function copyKey(id: string, key: string) {
    await navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleReveal(id: string) {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const isLoading_ = isLoading;

  return (
    <main className="max-w-[1280px] mx-auto px-8 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#E5E5E7]">{t('title')}</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#98989D] mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setNewKeyResult(null); }}
          className="h-11 px-5 bg-[#e8673a] hover:bg-[#d4562a] text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all hover:-translate-y-0.5 shadow-sm"
        >
          <PlusSvg />
          {t('createButton')}
        </button>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" onClick={() => { if (!newKeyResult) setShowCreate(false); }}>
          <div className="bg-white dark:bg-[#1F1F21] rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl border border-[#ECEFF3] dark:border-[#303033]" onClick={e => e.stopPropagation()}>
            {newKeyResult ? (
              <div>
                <h3 className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] mb-2">{t('createSuccess.title')}</h3>
                <p className="text-sm text-[#6B7280] dark:text-[#98989D] mb-4">{t('createSuccess.warning')}</p>
                <div className="bg-[#F8FAFC] dark:bg-[#242426] border border-[#ECEFF3] dark:border-[#303033] rounded-xl p-3 mb-4 font-mono text-sm break-all select-all">{newKeyResult}</div>
                <div className="flex gap-2">
                  <button onClick={() => copyKey('new', newKeyResult)} className="flex-1 h-10 bg-[#111827] dark:bg-[#F97346] hover:bg-[#1f2937] dark:hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium">
                    {copiedId === 'new' ? '✓ ' + t('createSuccess.copied') : t('createSuccess.copyButton')}
                  </button>
                  <button onClick={() => { setShowCreate(false); setNewKeyResult(null); }}
                    className="flex-1 h-10 border border-[#ECEFF3] dark:border-[#303033] hover:bg-gray-50 dark:hover:bg-[#242426] rounded-lg text-sm text-[#6B7280] dark:text-[#98989D] font-medium transition-colors">
                    {t('createSuccess.closeButton')}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] mb-4">{t('createDialog.title')}</h3>
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1.5">{t('createDialog.nameLabel')}</label>
                <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:focus:border-gray-400 transition-colors mb-2 dark:bg-[#242426] dark:text-[#E5E5E7]"
                  placeholder={t('createDialog.namePlaceholder')} />
                <label className="block text-sm font-medium text-[#6B7280] dark:text-[#98989D] mb-1.5">{t('createDialog.rateLimitLabel')}</label>
                <input value={rateLimit} onChange={e => setRateLimit(e.target.value)} type="number"
                  className="w-full h-10 px-3 border border-[#ECEFF3] dark:border-[#303033] rounded-xl text-sm focus:outline-none focus:border-[#111827] dark:focus:border-gray-400 transition-colors mb-2 dark:bg-[#242426] dark:text-[#E5E5E7]" />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => createMutation.mutate({ name: newKeyName, rateLimit: parseInt(rateLimit) })} disabled={!newKeyName || createMutation.isPending}
                    className="flex-1 h-10 bg-[#111827] dark:bg-[#F97346] hover:bg-[#1f2937] dark:hover:bg-[#e8673a] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    {createMutation.isPending ? t('createDialog.creating') : t('createDialog.createButton')}
                  </button>
                  <button onClick={() => setShowCreate(false)}
                    className="flex-1 h-10 border border-[#ECEFF3] dark:border-[#303033] hover:bg-gray-50 dark:hover:bg-[#242426] rounded-lg text-sm text-[#6B7280] dark:text-[#98989D] font-medium transition-colors">
                    {t('createDialog.cancelButton')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading_ ? (
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm p-6 animate-pulse">
              <div className="h-6 bg-gray-100 dark:bg-[#242426] rounded w-48 mb-4" />
              <div className="h-4 bg-gray-100 dark:bg-[#242426] rounded w-64 mb-4" />
              <div className="h-12 bg-gray-100 dark:bg-[#242426] rounded-xl" />
            </div>
          ))}
        </div>
      ) : keys.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm py-20 px-6 text-center">
          <KeySvg className="w-16 h-16 mx-auto mb-5 text-gray-200 dark:text-[#303033]" />
          <h3 className="text-lg font-semibold text-[#111827] dark:text-[#E5E5E7] mb-1">{t('emptyState.title')}</h3>
          <p className="text-sm text-[#6B7280] dark:text-[#98989D] mb-6">{t('emptyState.message')}</p>
          <button onClick={() => setShowCreate(true)} className="h-11 px-5 bg-[#e8673a] hover:bg-[#d4562a] text-white rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5 shadow-sm">
            {t('emptyState.button')}
          </button>
        </div>
      ) : (
        /* Key Cards */
        <div className="bg-white dark:bg-[#1F1F21] rounded-2xl border border-[#ECEFF3] dark:border-[#303033] shadow-sm divide-y divide-[#ECEFF3] dark:divide-[#303033]">
          <div className="px-6 py-4">
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#E5E5E7]">{t('listTitle')}</h2>
          </div>
          {keys.map((key: any) => {
            const isRevealed = revealedIds.has(key.id);
            const displayKey = isRevealed ? key.key : maskKey(key.key);

            return (
              <div key={key.id} className="px-6 py-5">
                {/* Row 1: Name + Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-semibold text-[#111827] dark:text-[#E5E5E7]">{key.name}</span>
                    <span className={`inline-flex items-center h-7 px-3 rounded-full text-xs font-medium ${
                      key.isActive
                        ? 'bg-[#DCFCE7] text-[#16A34A]'
                        : 'bg-[#FEE2E2] text-[#DC2626]'
                    }`}>
                      {key.isActive ? t('table.statusActive') : t('table.statusDisabled')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMutation.mutate({ id: key.id, isActive: !key.isActive })}
                      className="h-9 px-3 rounded-lg text-xs font-medium bg-[#FEE2E2] hover:bg-[#fecaca] text-[#DC2626] transition-colors"
                    >
                      {key.isActive ? t('table.disableButton') : t('table.enableButton')}
                    </button>
                    <button
                      onClick={() => { if (confirm(t('table.deleteConfirm'))) deleteMutation.mutate(key.id); }}
                      className="h-9 px-3 rounded-lg text-xs font-medium bg-[#FEE2E2] hover:bg-[#fecaca] text-[#DC2626] transition-colors"
                    >
                      {t('table.deleteButton')}
                    </button>
                  </div>
                </div>

                {/* Row 2: Created + Last Used + Monthly Calls */}
                <div className="flex items-center gap-6 text-sm text-[#6B7280] dark:text-[#98989D] mb-5">
                  <span>{t('table.createdAt')} {formatDate(key.createdAt)}</span>
                  <span>{t('table.lastUsed')} {key.lastUsedAt ? timeAgo(key.lastUsedAt) : t('table.neverUsed')}</span>
                  {key.monthlyCalls > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e8673a]" />
                      {key.monthlyCalls.toLocaleString()} 次请求
                    </span>
                  )}
                </div>

                {/* Row 3: API Key display */}
                <div className="flex items-center gap-1">
                  <div className={`h-12 bg-[#F8FAFC] dark:bg-[#242426] rounded-xl px-4 flex items-center ${isRevealed ? 'w-auto' : 'max-w-[260px]'} min-w-0`}>
                    <code className="font-mono text-sm text-[#6B7280] dark:text-[#98989D] select-all truncate">{displayKey}</code>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleReveal(key.id)}
                      className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242426] flex items-center justify-center text-[#6B7280] dark:text-[#98989D] transition-colors flex-shrink-0"
                    >
                      {isRevealed ? <EyeOffSvg /> : <EyeSvg />}
                    </button>
                    <button
                      onClick={() => copyKey(key.id, key.key)}
                      className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242426] flex items-center justify-center text-[#6B7280] dark:text-[#98989D] transition-colors flex-shrink-0"
                    >
                      {copiedId === key.id ? <CheckSvg /> : <CopySvg />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

/* Inline SVG Icons */
function PlusSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EyeSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

function CopySvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function KeySvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
