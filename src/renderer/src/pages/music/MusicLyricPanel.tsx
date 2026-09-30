/**
 * 音乐页右侧:歌词面板(模糊封面背景 + 卡拉OK高亮 + 设置)
 *
 * 配色全部走主题变量:
 *  - 非当前行用 text-tertiary,深浅色模式都可读
 *  - 当前行用用户选择的高亮色(默认 var(--color-primary))
 *  - 透明/发光变体用 color-mix 派生,兼容 hex 色值和 var() 变量
 */
import type { MusicSong, LyricLine } from './types'

/** 给任意颜色(hex 或 var())叠加透明度,Electron Chromium 原生支持 color-mix */
function withAlpha(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

interface MusicLyricPanelProps {
  currentSong: MusicSong | undefined
  karaokeMode: boolean
  onToggleKaraoke: () => void
  lyricColor: string
  onLyricColorChange: (c: string) => void
  lyricFontSize: number
  onLyricFontSizeChange: (size: number) => void
  lyricLines: LyricLine[]
  currentLyricIndex: number
  karaokeProgress: number
  lyricScrollRef: React.RefObject<HTMLDivElement>
  activeLyricRef: React.RefObject<HTMLDivElement>
}

export default function MusicLyricPanel({
  currentSong,
  karaokeMode,
  onToggleKaraoke,
  lyricColor,
  onLyricColorChange,
  lyricFontSize,
  onLyricFontSizeChange,
  lyricLines,
  currentLyricIndex,
  karaokeProgress,
  lyricScrollRef,
  activeLyricRef
}: MusicLyricPanelProps) {
  return (
    <div className="w-80 flex-shrink-0 border-l border-[var(--color-border-subtle)] flex flex-col bg-[var(--color-panel-bg)] relative overflow-hidden">
      {/* 模糊专辑封面背景:大模糊+降亮,只保留氛围色调 */}
      {currentSong && (currentSong.cover || currentSong.pic) && (
        <img
          key={currentSong.songmid || currentSong.name}
          src={currentSong.cover || currentSong.pic}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(70px) brightness(0.55) saturate(1.35)', transform: 'scale(1.25)', opacity: 0.55 }}
        />
      )}
      {/* 主题遮罩:上下不透明、中间微透,既露出封面色调又保证歌词可读,深浅色模式自适应 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, var(--color-panel-bg) 0%, color-mix(in srgb, var(--color-panel-bg) 82%, transparent) 28%, color-mix(in srgb, var(--color-panel-bg) 74%, transparent) 72%, var(--color-panel-bg) 100%)'
        }}
      />
      {/* 歌词标题 + 设置 */}
      <div className="relative z-10 flex-shrink-0 px-5 py-2.5 flex items-center justify-between border-b border-[var(--color-border-subtle)]">
        <span className="text-xs text-[var(--color-text-tertiary)] font-medium">歌词</span>
        <div className="flex items-center gap-1.5">
          {/* 卡拉OK开关 */}
          <button
            onClick={onToggleKaraoke}
            className={`text-[10px] px-2 py-0.5 transition-all rounded ${
              karaokeMode ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-[var(--color-hover-overlay)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
            }`}
            title="卡拉OK模式"
          >
            KTV
          </button>
          {/* 颜色选择 */}
          <div className="flex items-center gap-1">
            {['var(--color-primary)', '#ff5b8a', '#00d4aa', '#ffa500', '#e040fb'].map((c) => (
              <button
                key={c}
                onClick={() => onLyricColorChange(c)}
                className={`w-3 h-3 rounded-full transition-transform ${lyricColor === c ? 'scale-125 ring-1 ring-[var(--color-text-secondary)]' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }}
                title={c === 'var(--color-primary)' ? '高亮颜色(跟随主题)' : `高亮颜色 ${c}`}
              />
            ))}
          </div>
          {/* 字体大小 */}
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={() => onLyricFontSizeChange(Math.max(12, lyricFontSize - 2))}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] text-[10px] w-4 h-4 flex items-center justify-center hover:bg-[var(--color-hover-overlay)] transition-all"
              title="缩小字体"
            >A-</button>
            <button
              onClick={() => onLyricFontSizeChange(Math.min(24, lyricFontSize + 2))}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] text-[10px] w-4 h-4 flex items-center justify-center hover:bg-[var(--color-hover-overlay)] transition-all"
              title="放大字体"
            >A+</button>
          </div>
        </div>
      </div>
      {/* 歌词内容(上下边缘淡出) */}
      <div
        ref={lyricScrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-5 py-10 lyric-scroll"
        style={{
          maskImage: 'linear-gradient(180deg, transparent 0%, #000 12%, #000 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 12%, #000 88%, transparent 100%)'
        }}
      >
        {!currentSong ? (
          <p className="text-center text-[var(--color-text-quaternary)] text-sm mt-10">播放歌曲以查看歌词</p>
        ) : lyricLines.length === 0 ? (
          <p className="text-center text-[var(--color-text-quaternary)] text-sm mt-10">暂无歌词</p>
        ) : (
          <div className="space-y-4">
            {lyricLines.map((line, i) => {
              const isActive = i === currentLyricIndex
              // 距离当前行的距离,用于计算淡出透明度
              const distance = Math.abs(i - currentLyricIndex)
              const opacity = isActive ? 1 : Math.max(0.2, 1 - distance * 0.28)
              return (
                <div
                  key={i}
                  ref={isActive ? activeLyricRef : undefined}
                  className="transition-all duration-500 ease-out"
                  style={{
                    opacity,
                    transform: isActive ? 'scale(1.03)' : 'scale(0.97)',
                  }}
                >
                  {/* 卡拉OK模式:底层暗色完整文字 + 顶层高亮色按进度裁切 */}
                  {isActive && karaokeMode ? (
                    <div className="relative leading-relaxed font-semibold" style={{ fontSize: `${lyricFontSize + 1}px` }}>
                      {/* 底层:完整未唱文字 */}
                      <span style={{ color: 'var(--color-text-quaternary)' }}>
                        {line.text || '...'}
                      </span>
                      {/* 顶层:高亮文字按进度宽度裁切(线性平滑过渡) */}
                      <span
                        className="absolute inset-0 overflow-hidden whitespace-nowrap"
                        style={{
                          width: `${karaokeProgress * 100}%`,
                          color: lyricColor,
                          transition: 'width 0.3s linear',
                          textShadow: `0 0 10px ${withAlpha(lyricColor, 40)}`,
                        }}
                      >
                        {line.text || '...'}
                      </span>
                    </div>
                  ) : (
                    <p
                      className="leading-relaxed"
                      style={{
                        fontSize: `${isActive ? lyricFontSize + 1 : lyricFontSize - 2}px`,
                        color: isActive ? lyricColor : 'var(--color-text-tertiary)',
                        fontWeight: isActive ? 600 : 400,
                        textShadow: isActive ? `0 0 12px ${withAlpha(lyricColor, 35)}` : 'none',
                      }}
                    >
                      {line.text || '...'}
                    </p>
                  )}
                  {line.translation && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: isActive ? withAlpha(lyricColor, 70) : 'var(--color-text-quaternary)' }}
                    >
                      {line.translation}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
