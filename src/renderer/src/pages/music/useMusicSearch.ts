/**
 * 音乐页搜索 hook:关键词、搜索结果、提交/清空、搜索历史(localStorage 本地存储)
 */
import { useState, useEffect } from 'react'
import { searchMusic, type MusicSong } from '../../lib/music'

const HISTORY_KEY = 'music_search_history'
const HISTORY_LIMIT = 10

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

  /* ============ 搜索(可显式指定源,供切源后重新搜索) ============ */
  const searchWith = async (q: string, src: string) => {
    if (!q) return
    onSearchStart()
    setSubmittedKeyword(q)
    setSearching(true)
    try {
      const res = await searchMusic(q, src, 1, 50)
      setSearchResults(res.list || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
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
    clearSearch,
    history,
    removeHistory,
    clearHistory
  }
}
