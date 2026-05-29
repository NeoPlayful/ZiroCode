import { useState, useRef, useEffect, useCallback } from 'react'
import { MODEL_CATEGORIES, getModelById, getProviderForModel } from '../lib/models'

interface ModelMultiSelectProps {
  value: string[]
  onChange: (models: string[]) => void
  placeholder?: string
}

export default function ModelMultiSelect({ value, onChange, placeholder = 'Search models...' }: ModelMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Flatten all models with their category for flat indexing
  const allFlatItems = MODEL_CATEGORIES.flatMap(cat =>
    cat.models.map(m => ({ ...m, category: cat.name, provider: cat.provider }))
  )

  const filtered = allFlatItems.filter(m =>
    !value.includes(m.id) &&
    (m.id.toLowerCase().includes(search.toLowerCase()) ||
     m.name.toLowerCase().includes(search.toLowerCase()))
  )

  // Group filtered results by category
  const groupedFiltered = MODEL_CATEGORIES
    .map(cat => ({
      ...cat,
      models: cat.models.filter(m =>
        !value.includes(m.id) &&
        (m.id.toLowerCase().includes(search.toLowerCase()) ||
         m.name.toLowerCase().includes(search.toLowerCase()))
      ),
    }))
    .filter(cat => cat.models.length > 0)

  // Build a flat list of all items (including category headers as separators) for keyboard nav
  const flatNavItems: { type: 'header'; label: string } | { type: 'item'; index: number; id: string }[] = []
  groupedFiltered.forEach(cat => {
    flatNavItems.push({ type: 'header', label: cat.name })
    cat.models.forEach(m => {
      const globalIdx = allFlatItems.findIndex(x => x.id === m.id)
      flatNavItems.push({ type: 'item', index: globalIdx, id: m.id })
    })
  })

  const flatItemIndices = flatNavItems.filter(x => x.type === 'item') as { type: 'item'; index: number; id: string }[]

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
    if (!isOpen) {
      setSearch('')
      setFocusedIndex(-1)
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-nav-index]')
      const target = items[focusedIndex] as HTMLElement
      if (target) {
        target.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [focusedIndex])

  function removeModel(modelId: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(value.filter(v => v !== modelId))
  }

  function addModel(modelId: string) {
    if (!value.includes(modelId)) {
      onChange([...value, modelId])
    }
    setSearch('')
    setFocusedIndex(-1)
    searchInputRef.current?.focus()
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => Math.min(prev + 1, flatItemIndices.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < flatItemIndices.length) {
          addModel(flatItemIndices[focusedIndex].id)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
      case 'Backspace':
        if (search === '' && value.length > 0) {
          onChange(value.slice(0, -1))
        }
        break
    }
  }, [isOpen, focusedIndex, flatItemIndices, search, value])

  const providerColors: Record<string, string> = {
    anthropic: 'bg-[#F0EDFF] text-[#6B4FF5] border-[#D9D0FF]',
    openai: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]',
    google: 'bg-[#E3F2FD] text-[#1565C0] border-[#BBDEFB]',
    deepseek: 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]',
    other: 'bg-gray-100 text-gray-700 border-gray-200',
  }

  const providerLabels: Record<string, string> = {
    anthropic: 'A',
    openai: 'O',
    google: 'G',
    deepseek: 'D',
    other: 'M',
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger / Tags area */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`
          min-h-[44px] w-full px-3 py-1.5
          bg-white border border-[#E5E7EB] rounded-2xl
          cursor-text flex flex-wrap items-center gap-1.5
          transition-colors
          ${isOpen ? 'border-[#111827] ring-1 ring-[#111827]/10' : 'hover:border-[#D1D5DB]'}
        `}
      >
        {value.map(modelId => {
          const model = getModelById(modelId)
          const provider = getProviderForModel(modelId)
          const pColor = providerColors[provider] || providerColors.other
          const pLabel = providerLabels[provider] || 'M'
          return (
            <span
              key={modelId}
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-[#F3F4F6] border border-[#D1D5DB] rounded-full text-sm select-none group"
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${providerColors[provider] || providerColors.other}`}>
                {providerLabels[provider] || 'M'}
              </span>
              <span className="text-[#111827] font-medium">{model?.name || modelId}</span>
              <button
                onClick={(e) => removeModel(modelId, e)}
                className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#E5E7EB] transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          )
        })}
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setFocusedIndex(0); if (!isOpen) setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] h-9 bg-transparent border-none outline-none text-sm text-[#111827] placeholder:text-[#9CA3AF]"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Search within dropdown */}
          <div className="px-3 pt-2 pb-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setFocusedIndex(0) }}
                placeholder={placeholder}
                className="w-full h-10 pl-9 pr-3 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10 transition-colors"
              />
            </div>
          </div>

          {/* Model list */}
          <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1">
            {groupedFiltered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                {search ? `No models matching "${search}"` : 'No models available'}
              </div>
            ) : (
              groupedFiltered.map((category) => {
                // Calculate the starting nav index for this category
                const catStartIdx = flatNavItems.findIndex(
                  x => x.type === 'header' && x.label === category.name
                )
                const catFirstItemIdx = catStartIdx + 1

                return (
                  <div key={category.name}>
                    {/* Category header */}
                    <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                      {category.name}
                    </div>

                    {/* Models */}
                    {category.models.map((model, mi) => {
                      const navIdx = catFirstItemIdx + mi
                      const isFocused = focusedIndex === (flatItemIndices.findIndex(x => x.id === model.id))
                      const provider = category.name === 'Anthropic' ? 'anthropic' :
                        category.name === 'OpenAI' ? 'openai' :
                        category.name === 'Google' ? 'google' :
                        category.name === 'DeepSeek' ? 'deepseek' : 'other'
                      const pColor = providerColors[provider] || providerColors.other
                      const pLabel = providerLabels[provider] || 'M'

                      return (
                        <div
                          key={model.id}
                          data-nav-index={navIdx}
                          onClick={() => addModel(model.id)}
                          className={`
                            flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors
                            ${isFocused ? 'bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]'}
                          `}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${pColor}`}>
                            {pLabel}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#111827]">{model.name}</div>
                            {model.description && (
                              <div className="text-[11px] text-[#9CA3AF] mt-0.5">{model.description}</div>
                            )}
                          </div>
                          <div className="w-4 h-4 rounded border border-[#D1D5DB] flex-shrink-0 flex items-center justify-center">
                            {value.includes(model.id) && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[#E5E7EB] flex items-center gap-3 text-[11px] text-[#9CA3AF]">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[10px] font-mono text-[#6B7280]">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[10px] font-mono text-[#6B7280]">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#F3F4F6] border border-[#D1D5DB] rounded text-[10px] font-mono text-[#6B7280]">esc</kbd> Close
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
