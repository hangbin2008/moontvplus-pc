/**
 * 音乐页「播放列表 / 榜单」标签行(非搜索模式下显示)
 */
import Icon from '../../components/Icon'
import type { MusicBoard } from './types'
import type { MusicLibraryView } from './useMusicHistory'

interface MusicBoardTabsProps {
  boards: MusicBoard[]
  currentBoardId: string
  view: MusicLibraryView
  playlistCount: number
  onSelectPlaylist: () => void
  onSelectBoard: (boardId: string) => void
}

export default function MusicBoardTabs({
  boards,
  currentBoardId,
  view,
  playlistCount,
  onSelectPlaylist,
  onSelectBoard
}: MusicBoardTabsProps) {
  return (
    <div className="flex-shrink-0 px-5 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-[var(--color-border-subtle)] scrollbar-thin">
      {/* 播放列表 */}
      <button
        onClick={onSelectPlaylist}
        className={`flex-shrink-0 flex items-center gap-1 ${view === 'playlist' ? 'chip chip-active' : 'chip'}`}
      >
        <Icon name="list-music" size={15} className="inline-block" /> 播放列表
        {playlistCount > 0 && (
          <span className={`text-[10px] ${view === 'playlist' ? 'opacity-70' : 'text-[var(--color-text-quaternary)]'}`}>{playlistCount}</span>
        )}
      </button>
      {/* 分隔线 */}
      {boards.length > 0 && <div className="flex-shrink-0 h-3.5 w-px bg-[var(--color-border-subtle)]" />}
      {/* 榜单标签 */}
      {boards.map((b) => (
        <button
          key={b.id}
          onClick={() => onSelectBoard(b.id)}
          className={`flex-shrink-0 whitespace-nowrap ${view === 'none' && currentBoardId === b.id ? 'chip chip-active' : 'chip'}`}
        >
          {b.name}
        </button>
      ))}
    </div>
  )
}
