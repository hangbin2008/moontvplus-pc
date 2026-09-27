/**
 * 音乐页顶部:搜索栏(含搜索历史下拉)+ 音乐源选择(紧凑布局)
 */
import { useState } from 'react'
import Icon from '../../components/Icon'
import { SOURCES } from './types'

interface MusicHeaderProps {
  keyword: string
  onKeywordChange: (v: string) => void
  onSearch: (e: React.FormEvent) => void
  onClearSearch: () => void
  source: string
  onSourceChange: (id: string) => void
  /** 搜索历史(最新在前) */
  history: string[]
  onHistorySelect: (q: string) => void
  onHistoryRemove: (q: string) => void
  onHistoryClear: () => void
}

export default function MusicHeader({
  keyword,
  onKeywordChange,
  onSearch,
  onClearSearch,
  source,
  onSourceChange,
  history,
  onHistorySelect,
  onHistoryRemove,
  onHistoryClear
}: MusicHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <div className="flex-shrink-0 px-5 py-2.5 border-b border-[var(--color-border-subtle)] flex items-center gap-3">
      <form
        onSubmit={onSearch}
        className="relative flex-1 min-w-[200px] max-w-md"
        onBlur={(e) => {
          // 焦点移出整个表单(含下拉)时收起;下拉内点击已用 onMouseDown 阻止焦点丢失
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowDropdown(false)
        }}
      >
        <input
          type="text"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder="搜索音乐、歌手..."
          className="w-full bg-[var(--color-hover-overlay)] border border-[var(--color-border-subtle)] px-3.5 py-1.5 pl-9 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] focus:outline-none focus:border-primary/50 focus:bg-[var(--color-hover-overlay-strong)] transition-all rounded"
        />
        <Icon name="search-check" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
        {keyword && (
          <button
            type="button"
            onClick={onClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] transition-all text-xs rounded"
          >
            ✕
          </button>
        )}

        {/* 搜索历史下拉 */}
        {showDropdown && history.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 z-30 rounded overflow-hidden border border-[var(--color-border-subtle)] shadow-lg"
            style={{ background: 'var(--color-card-bg)' }}
            // 鼠标按下不转移焦点,保证 onBlur 不提前触发、输入框保持聚焦
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border-subtle)]">
              <span className="text-xs text-[var(--color-text-tertiary)]">搜索历史</span>
              <button
                type="button"
                onClick={onHistoryClear}
                className="text-xs text-[var(--color-text-tertiary)] hover:text-red-400 transition-colors"
              >
                清空
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              {history.map((q) => (
                <div
                  key={q}
                  className="flex items-center justify-between px-3 py-2 hover:bg-[var(--color-hover-overlay)] transition-colors cursor-pointer group"
                  onClick={() => {
                    onHistorySelect(q)
                    setShowDropdown(false)
                  }}
                >
                  <span className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] truncate">
                    <Icon name="clock" size={13} className="text-[var(--color-text-quaternary)] flex-shrink-0" />
                    <span className="truncate">{q}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onHistoryRemove(q)
                    }}
                    className="w-4 h-4 flex items-center justify-center text-[var(--color-text-quaternary)] hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <Icon name="x" size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* 源选择(紧凑) */}
      <div className="flex items-center gap-1">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => onSourceChange(s.id)}
            className={`px-2.5 py-1 text-xs transition-all whitespace-nowrap rounded ${
              source === s.id ? 'bg-primary text-white' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)]'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}
