/**
 * 详情页
 * 展示影视详情、剧集列表,支持收藏与"继续观看"
 * 路由参数:source, id, title
 */
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getDetail, getFavorite } from '../lib/api'
import { processImageUrl } from '../lib/image'
import { useStore } from '../lib/store'
import { buildPlayUrl } from '../lib/utils'
import { getDetailWithCache, cacheSearchResult } from '../lib/searchCache'
import Icon from '../components/Icon'
import SmartImage from '../components/SmartImage'
import { generateStorageKey, type Favorite, type SearchResult } from '../types'

/** 选集分页页码序列;页码过多时折叠为 1 … (当前±1) … 末页 */
function buildPageItems(cur: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i)
  const items: Array<number | 'ellipsis'> = [0]
  const pushRange = (from: number, to: number) => {
    for (let i = from; i <= to; i++) items.push(i)
  }
  if (cur > 2) items.push('ellipsis')
  pushRange(Math.max(1, cur - 1), Math.min(total - 2, cur + 1))
  if (cur < total - 3) items.push('ellipsis')
  items.push(total - 1)
  return items
}

/** 选集网格每页集数;超出后分页展示 */
const EPISODES_PAGE_SIZE = 50

export default function Detail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const source = searchParams.get('source') || ''
  const id = searchParams.get('id') || ''
  const title = searchParams.get('title') || ''

  const playRecords = useStore((s) => s.playRecords)
  const upsertFavorite = useStore((s) => s.upsertFavorite)
  const removeFavorite = useStore((s) => s.removeFavorite)

  const key = generateStorageKey(source, id)

  const [detail, setDetail] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  /** 选集分页当前页(0 基) */
  const [page, setPage] = useState(0)
  const [favorited, setFavorited] = useState<boolean>(
    () => !!useStore.getState().favorites[key]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getDetailWithCache(source, id, getDetail)
      .then((res) => {
        if (cancelled) return
        setDetail(res)
        cacheSearchResult(res)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setError((e as Error)?.message || '加载详情失败')
        setLoading(false)
      })

    getFavorite(key)
      .then((f) => {
        if (cancelled) return
        setFavorited(!!f)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [source, id, key])

  /** 用户是否手动翻过页(手动后不再被记录更新覆盖定位) */
  const userPagedRef = useRef(false)

  /* 切换 source/id 时:重置手动标记,按当前已知记录定位页,否则第 1 页 */
  useEffect(() => {
    userPagedRef.current = false
    const rec = playRecords[generateStorageKey(source, id)]
    const li = rec ? rec.index - 1 : -1
    setPage(li >= 0 ? Math.floor(li / EPISODES_PAGE_SIZE) : 0)
    // 仅在影片切换时重置;playRecords 只取本次值,不作为重跑依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, id])

  /* 记录晚到(直接刷新详情页、store 尚未加载完成):用户未翻页时补一次定位 */
  useEffect(() => {
    if (userPagedRef.current) return
    const rec = playRecords[generateStorageKey(source, id)]
    if (!rec) return
    setPage(Math.floor((rec.index - 1) / EPISODES_PAGE_SIZE))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, id, playRecords])

  const record = playRecords[key]
  const lastIndex = record ? record.index - 1 : -1

  const toggleFavorite = () => {
    if (!detail) return
    if (favorited) {
      removeFavorite(key)
      setFavorited(false)
    } else {
      const fav: Favorite = {
        source_name: detail.source_name,
        total_episodes: detail.episodes.length,
        title: detail.title,
        year: detail.year,
        cover: detail.poster,
        save_time: Date.now(),
        search_title: title,
        origin: 'vod',
        vod_remarks: detail.vod_remarks
      }
      upsertFavorite(key, fav)
      setFavorited(true)
    }
  }

  const goPlay = (index: number) => {
    navigate(buildPlayUrl(source, id, title, index))
  }

  /** 用户主动翻页(上一页/下一页/页码):标记后不再被记录更新自动覆盖 */
  const gotoPage = (p: number) => {
    userPagedRef.current = true
    setPage(p)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 animate-fadeIn">
        <div className="spinner-lg" />
        <p className="text-[var(--color-text-tertiary)] text-sm">加载中...</p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 animate-fadeIn">
        <div className="w-20 h-20 flex items-center justify-center bg-[var(--color-hover-overlay-subtle)] border border-[var(--color-border-subtle)]">
          <Icon name="info" size={36} strokeWidth={1.5} className="text-[var(--color-text-quaternary)]" />
        </div>
        <p className="text-[var(--color-text-tertiary)]">{error || '未找到该影视信息'}</p>
        <button onClick={() => navigate(-1)} className="btn-ghost">
          返回
        </button>
      </div>
    )
  }

  const episodes = detail.episodes || []
  const episodeTitle = (i: number) => detail.episodes_titles?.[i] || `第${i + 1}集`

  const totalPages = Math.max(1, Math.ceil(episodes.length / EPISODES_PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageStart = safePage * EPISODES_PAGE_SIZE
  const pageEpisodes = episodes.slice(pageStart, pageStart + EPISODES_PAGE_SIZE)
  const pageItems = buildPageItems(safePage, totalPages)

  return (
    <div className="animate-fadeIn">
      {/* 返回按钮栏 */}
      <div className="sticky top-0 z-30 px-6 py-3 flex items-center gap-3 glass border-b border-[var(--color-border-subtle)]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors group"
        >
          <Icon name="chevron-left-slim" size={16} className="transition-transform group-hover:-translate-x-0.5" />
          返回
        </button>
        <div className="h-4 w-px bg-[var(--color-border-default)]" />
        <span className="text-sm text-[var(--color-text-tertiary)] truncate">详情</span>
      </div>

      {/* 沉浸式背景头部 */}
      <div className="relative h-[280px] overflow-hidden">
        {/* 模糊背景图 */}
        {detail.poster && (
          <div className="absolute inset-0 scale-110">
            <img
              src={processImageUrl(detail.poster)}
              alt=""
              className="w-full h-full object-cover blur-2xl opacity-30"
            />
          </div>
        )}
        {/* 渐变遮罩 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, var(--color-app-bg) 0%, var(--color-app-bg) 25%, color-mix(in srgb, var(--color-app-bg) 80%, transparent) 55%, color-mix(in srgb, var(--color-app-bg) 40%, transparent) 100%)'
          }}
        />

        {/* 头部内容:海报 + 信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 flex gap-6">
          {/* 海报 */}
          <div className="w-36 md:w-44 flex-shrink-0">
            <div className="aspect-[2/3] overflow-hidden shadow-lg ring-1 ring-white/10 relative rounded-md">
              <SmartImage
                src={detail.poster}
                alt={detail.title}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* 信息区 */}
          <div className="flex-1 min-w-0 flex flex-col justify-end pb-2">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg truncate">
              {detail.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {detail.year && <span className="badge">{detail.year}</span>}
              {detail.source_name && (
                <span className="text-sm text-[var(--color-text-tertiary)]">
                  {detail.source_name}
                </span>
              )}
              {detail.vod_remarks && (
                <span className="badge badge-gold">{detail.vod_remarks}</span>
              )}
              {detail.type_name && (
                <span className="badge badge-primary">{detail.type_name}</span>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {record ? (
                <button
                  onClick={() => goPlay(lastIndex)}
                  className="btn-primary px-6 py-2.5 flex items-center gap-2"
                >
                  <Icon name="play" size={16} />
                  继续观看第 {record.index} 集
                </button>
              ) : (
                episodes.length > 0 && (
                  <button
                    onClick={() => goPlay(0)}
                    className="btn-primary px-6 py-2.5 flex items-center gap-2"
                  >
                    <Icon name="play" size={16} />
                    开始播放
                  </button>
                )
              )}
              <button
                onClick={toggleFavorite}
                className={`px-5 py-2.5 transition-all font-medium border flex items-center gap-2 rounded ${
                  favorited
                    ? 'text-primary border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] hover:border-[color-mix(in_srgb,var(--color-primary)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]'
                    : 'bg-[var(--color-hover-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)] hover:bg-[var(--color-hover-overlay-strong)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)]'
                }`}
              >
                <Icon
                  name={favorited ? 'star' : 'star-outline'}
                  size={16}
                  stroke={favorited ? 2 : undefined}
                />
                {favorited ? '已收藏' : '收藏'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-6 space-y-6">
        {/* 简介 */}
        {detail.desc && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="section-bar" />
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                简介
              </h2>
            </div>
            <p className="text-[var(--color-text-tertiary)] text-sm leading-relaxed selectable line-clamp-4">
              {detail.desc}
            </p>
          </div>
        )}

        {/* 剧集列表(平铺 + 分页) */}
        {episodes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="section-bar" />
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-2">
                剧集列表
                <span className="text-[var(--color-text-quaternary)] font-normal">
                  共 {episodes.length} 集
                </span>
                {totalPages > 1 && (
                  <span className="text-[var(--color-text-quaternary)] font-normal">
                    · 第 {safePage + 1}/{totalPages} 页
                  </span>
                )}
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2">
              {pageEpisodes.map((_, pi) => {
                const i = pageStart + pi
                const isLast = i === lastIndex
                return (
                  <button
                    key={i}
                    onClick={() => goPlay(i)}
                    title={episodeTitle(i)}
                    className={`text-sm py-2.5 px-2 truncate transition-all border rounded ${
                      isLast
                        ? 'bg-gradient-to-r from-primary to-red-700 text-white font-medium border-[color-mix(in_srgb,var(--color-primary)_50%,transparent)] shadow-[0_10px_24px_-8px_color-mix(in_srgb,var(--color-primary)_50%,transparent)]'
                        : 'bg-[var(--color-card-bg)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)] hover:bg-[var(--color-card-hover)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)] hover:-translate-y-0.5'
                    }`}
                  >
                    {episodeTitle(i)}
                  </button>
                )
              })}
            </div>

            {/* 分页栏:上一页 + 页码(多页折叠)+ 下一页 */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-1.5 flex-wrap">
                <button
                  onClick={() => gotoPage(safePage - 1)}
                  disabled={safePage === 0}
                  className="px-2.5 py-1 text-xs border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] rounded hover:bg-[var(--color-hover-overlay)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  上一页
                </button>
                {pageItems.map((it, k) =>
                  it === 'ellipsis' ? (
                    <span key={`e-${k}`} className="px-1 text-[var(--color-text-quaternary)]">
                      …
                    </span>
                  ) : (
                    <button
                      key={it}
                      onClick={() => gotoPage(it)}
                      className={`min-w-[30px] px-1.5 py-1 text-xs tabular-nums border rounded transition-all ${
                        it === safePage
                          ? 'bg-primary text-white border-primary font-medium'
                          : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-overlay)]'
                      }`}
                    >
                      {it + 1}
                    </button>
                  )
                )}
                <button
                  onClick={() => gotoPage(safePage + 1)}
                  disabled={safePage === totalPages - 1}
                  className="px-2.5 py-1 text-xs border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] rounded hover:bg-[var(--color-hover-overlay)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
