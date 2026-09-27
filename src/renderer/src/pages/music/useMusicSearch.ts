/**
 * 音乐页搜索 hook:关键词、搜索结果、提交/清空、搜索历史(localStorage 本地存储)
 */
import { useState, useEffect } from 'react'
import { searchMusic, type MusicSong } from '../../lib/music'

const HISTORY_KEY = 'music_search_history'
const HISTORY_LIMIT = 10
/** lxserver 搜索单页固定返回 20 条,按页翻页追加 */
const PAGE_SIZE = 20

/** 读取本地搜索历史(最新在前) */
function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function useMusicSearch(source: string, onSearchStart: () => void) {
  const [keyword, setKeyword] = useState('')
  const [submittedKeyword, setSubmittedKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<MusicSong[]>([])
  const [searching, setSearching] = useState(false)
  const [history, setHistory] = useState<string[]>(loadHistory)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)) } catch {}
  }, [history])

  /* ============ 搜索历史维护:去重置顶,超过上限截断 ============ */
  const pushHistory = (q: string) => {
    setHistory((prev) => [q, ...prev.filter((x) => x !== q)].slice(0, HISTORY_LIMIT))
  }
  const removeHistory = (q: string) => {
    setHistory((prev) => prev.filter((x) => x !== q))
  }
  const clearHistory = () => setHistory([])

  /* ============ 搜索(可显式指定源,供切源后重新搜索;首页重置分页) ============ */
  const searchWith = async (q: string, src: string) => {
    if (!q) return
    onSearchStart()
    setSubmittedKeyword(q)
    setSearching(true)
    setPage(1)
    setHasMore(false)
    try {
      const res = await searchMusic(q, src, 1, PAGE_SIZE)
      setSearchResults(res.list || [])
      // 服务器模式返回精确 hasMore;lxserver 无该字段时按"满页即有下一页"推断
      setHasMore(typeof res.hasMore === 'boolean' ? res.hasMore : (res.list || []).length >= PAGE_SIZE)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  /* ============ 加载更多:下一页追加(按 songId 去重) ============ */
  const loadMore = async () => {
    const q = submittedKeyword
    if (!q || !hasMore || searching || loadingMore) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const res = await searchMusic(q, source, next, PAGE_SIZE)
      const list = res.list || []
      setSearchResults((prev) => {
        const seen = new Set(prev.map((s) => s.songId))
        return [...prev, ...list.filter((s) => !seen.has(s.songId))]
      })
      setPage(next)
      setHasMore(typeof res.hasMore === 'boolean' ? res.hasMore : list.length >= PAGE_SIZE)
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = keyword.trim()
    if (!q) return
    pushHistory(q)
    await searchWith(q, source)
  }

  const clearSearch = () => {
    setKeyword('')
    setSubmittedKeyword('')
    setSearchResults([])
  }

  return {
    keyword,
    setKeyword,
    submittedKeyword,
    searchResults,
    searching,
    handleSearch,
    searchWith,
    loadMore,
    hasMore,
    loadingMore,
    clearSearch,
    history,
    removeHistory,
    clearHistory
  }
}
