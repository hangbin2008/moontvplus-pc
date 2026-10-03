/**
 * 音乐页左侧:歌曲列表(搜索结果 / 榜单 / 播放列表)
 * - 播放列表视图:行 hover 可删除,头部可清空
 * - 已收藏歌曲在歌名旁显示♥标识
 */
import { useEffect, useRef, useState } from 'react'
import SmartImage from '../../components/SmartImage'
import Icon from '../../components/Icon'
import { formatTime } from '../../lib/utils'
import type { MusicSong } from './types'
import { SOURCES } from './types'
import type { MusicLibraryView } from './useMusicHistory'

/** 平台 id → 显示名(酷狗音乐/酷我音乐/网易云音乐...) */
const SOURCE_LABELS: Record<string, string> = {
  kw: '酷我音乐',
  wy: '网易云音乐',
  tx: 'QQ音乐',
  kg: '酷狗音乐',
  mg: '咪咕音乐'
}

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] || SOURCES.find((s) => s.id === source)?.name || source
}

interface MusicSongListProps {
  searching: boolean
  loadingBoards: boolean
  displayList: MusicSong[]
  isSearchMode: boolean
  submittedKeyword: string
  searchCount: number
  /** 库视图:播放列表 / 榜单(none) */
  view: MusicLibraryView
  playlistCount: number
  boardCount: number
  currentSong: MusicSong | undefined
  isPlaying: boolean
  onPlaySong: (song: MusicSong, index: number, list: MusicSong[]) => void
  /** 判断歌曲是否已收藏(显示♥) */
  isFavoriteSong: (song: MusicSong) => boolean
  /** 删除单首(播放列表视图) */
  onRemoveSong: (song: MusicSong) => void
  /** 清空播放列表 */
  onClearPlaylist: () => void
  /** 搜索分页:还有下一页时列表底部显示"加载更多" */
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

export default function MusicSongList({
  searching,
  loadingBoards,
  displayList,
  isSearchMode,
  submittedKeyword,
  searchCount,
  view,
  playlistCount,
  boardCount,
  currentSong,
  isPlaying,
  onPlaySong,
  isFavoriteSong,
  onRemoveSong,
  onClearPlaylist,
  hasMore,
  loadingMore,
  onLoadMore
}: MusicSongListProps) {
  /** 清空二次确认态(3 秒无操作自动复位) */
  const [confirmingClear, setConfirmingClear] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    }
  }, [])

  const handleClearClick = () => {
    if (!confirmingClear) {
      setConfirmingClear(true)
      confirmTimerRef.current = setTimeout(() => setConfirmingClear(false), 3000)
      return
    }
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    setConfirmingClear(false)
    onClearPlaylist()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-5 py-2 text-xs text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-3">
        <span className="truncate">
          {isSearchMode
            ? `搜索 "${submittedKeyword}" 的结果(${searchCount})`
            : view === 'playlist'
            ? `播放列表(${playlistCount})`
            : loadingBoards
            ? '加载榜单中...'
            : `共 ${boardCount} 首`}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {currentSong && (
            <span className="text-[color-mix(in_srgb,var(--color-primary)_70%,transparent)] truncate max-w-[140px]">正在播放: {currentSong.name}</span>
          )}
          {view === 'playlist' && playlistCount > 0 && (
            <button
              onClick={handleClearClick}
              className={`flex items-center gap-1 transition-colors ${
                confirmingClear ? 'text-red-400' : 'text-[var(--color-text-quaternary)] hover:text-red-400'
              }`}
              title={confirmingClear ? '再次点击确认清空' : '清空播放列表'}
            >
              <Icon name="trash" size={12} />
              {confirmingClear ? '确认清空?' : '清空'}
            </button>
          )}
        </div>
      </div>

      {/* 列表表头 */}
      {displayList.length > 0 && (
        <div className="flex-shrink-0 px-5 py-1.5 grid grid-cols-[28px_44px_1fr_auto] gap-3 text-[11px] text-[var(--color-text-quaternary)] border-b border-[var(--color-border-subtle)] items-center">
          <span className="text-center">#</span>
          <span></span>
          <span>歌曲 / 歌手</span>
          <span className="text-right pr-1">时长</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {(searching || loadingBoards) && displayList.length === 0 ? (
          <div className="px-6 py-10 text-center text-[var(--color-text-tertiary)]">
            <div className="spinner" />
            <p className="mt-3 text-sm">加载中...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="px-6 py-20 text-center text-[var(--color-text-tertiary)]">
            <Icon name="music" size={64} strokeWidth={1.2} className="mx-auto mb-4 text-[var(--color-text-quaternary)] opacity-40" />
            <p>
              {isSearchMode
                ? '未找到相关音乐'
                : view === 'playlist'
                ? '播放列表为空,播放的歌曲会自动加入'
                : '暂无榜单数据'}
            </p>
          </div>
        ) : (
          <div className="px-3 py-1.5">
            {displayList.map((song, idx) => {
              const isCurrent =
                !!currentSong &&
                currentSong.songId === song.songId &&
                currentSong.source === song.source
              const isFav = isFavoriteSong(song)
              return (
                <div
                  key={`${song.source}-${song.songId}-${idx}`}
                  data-song-idx={idx}
                  data-song-key={`${song.source}::${song.songId}`}
                  onClick={() => onPlaySong(song, idx, displayList)}
                  className={`group grid grid-cols-[28px_44px_1fr_auto] gap-3 px-2 py-1.5 cursor-pointer transition-all items-center hover:bg-[var(--color-hover-overlay)]`}
                >
                  {/* 序号 / 播放指示 */}
                  <div className="w-7 flex-shrink-0 text-center">
                    {isCurrent && isPlaying ? (
                      <div className="flex items-end justify-center h-4 gap-0.5">
                        <span className="w-0.5 bg-primary" style={{ height: '40%', animation: 'eq 0.8s ease-in-out infinite alternate' }} />
                        <span className="w-0.5 bg-primary" style={{ height: '80%', animation: 'eq 0.6s ease-in-out infinite alternate' }} />
                        <span className="w-0.5 bg-primary" style={{ height: '60%', animation: 'eq 0.7s ease-in-out infinite alternate' }} />
                      </div>
                    ) : (
                      <span
                        className={`text-xs tabular-nums group-hover:hidden ${
                          isCurrent ? 'text-primary font-medium' : 'text-[var(--color-text-tertiary)]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    )}
                    {!(isCurrent && isPlaying) && (
                      <Icon name="play" size={14} className="hidden group-hover:block text-[var(--color-text-primary)] mx-auto" />
                    )}
                  </div>

                  {/* 封面 */}
                  <div className="w-11 h-11 overflow-hidden flex-shrink-0 bg-[var(--color-hover-overlay-subtle)] relative rounded">
                    <SmartImage src={song.cover || song.pic} alt={song.name} className="w-full h-full" />
                    {isCurrent && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Icon name={isPlaying ? 'pause' : 'play'} size={16} className="text-primary" />
                      </div>
                    )}
                  </div>

                  {/* 名称(含♥标识) / 歌手 */}
                  <div className="min-w-0 flex flex-col">
                    <p className="text-sm flex items-center gap-1 min-w-0">
                      <span className={`truncate ${isCurrent ? 'text-primary font-medium' : 'text-[var(--color-text-primary)]'}`}>
                        {song.name}
                      </span>
                      {isFav && (
                        <Icon name="heart" size={12} className="text-primary flex-shrink-0" />
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                      <span className="inline-block mr-1.5 px-1 py-px text-[10px] leading-3 rounded border border-[var(--color-border-subtle)] text-[var(--color-text-quaternary)] align-middle">
                        {sourceLabel(song.source)}
                      </span>
                      {song.artist}
                    </p>
                  </div>

                  {/* 时长(播放列表 hover 时替换为删除按钮) */}
                  <div className="flex-shrink-0 pr-1 relative h-5 flex items-center justify-end">
                    <span
                      className={`text-xs tabular-nums ${
                        view === 'playlist' ? 'group-hover:hidden' : ''
                      } ${isCurrent ? 'text-[color-mix(in_srgb,var(--color-primary)_70%,transparent)]' : 'text-[var(--color-text-quaternary)]'}`}
                    >
                      {song.durationText || (song.durationSec ? formatTime(song.durationSec) : (song.duration ? formatTime(song.duration) : '--:--'))}
                    </span>
                    {view === 'playlist' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveSong(song)
                        }}
                        title="从播放列表移除"
                        className="hidden group-hover:flex absolute right-1 items-center justify-center text-[var(--color-text-quaternary)] hover:text-red-400 transition-colors"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 搜索结果加载更多(分页) */}
        {isSearchMode && displayList.length > 0 && hasMore && (
          <div className="px-6 py-3 text-center">
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="px-4 py-1.5 text-xs rounded-md border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-overlay)] transition-colors disabled:opacity-60"
            >
              {loadingMore ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
