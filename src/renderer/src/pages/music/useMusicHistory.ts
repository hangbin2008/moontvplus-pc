/**
 * 音乐页「播放列表」hook(本地优先)
 *
 * - 播放列表:本地 localStorage 持久化(无服务器或自定义 lxserver 模式也可用);
 *   本地为空时回退服务端 /api/music/v2/history 并回填本地
 * - 收藏:本地 localStorage(服务端无音乐收藏接口),仅作为歌曲上的♥标识集合,
 *   不再有独立的收藏列表视图
 * - view:当前左侧列表视图('playlist' | 'none')
 */
import { useCallback, useEffect, useState } from 'react'
import {
  getMusicHistory,
  saveMusicHistory,
  getLocalPlaylist,
  getLocalFavorites,
  addToLocalPlaylist,
  joinLocalPlaylist,
  removeFromLocalPlaylist,
  clearLocalPlaylist,
  isFavoriteSong,
  toggleFavoriteSong,
  writeLocalPlaylistBulk,
  type MusicSong
} from '../../lib/music'

export type MusicLibraryView = 'playlist' | 'none'

export function useMusicHistory() {
  const [playlistSongs, setPlaylistSongs] = useState<MusicSong[]>([])
  /** 收藏标记集合(仅用于判断 isFavorite) */
  const [favoriteSongs, setFavoriteSongs] = useState<MusicSong[]>([])
  const [view, setView] = useState<MusicLibraryView>('none')
  /** 初次加载是否完成(启动自动播放依赖) */
  const [loaded, setLoaded] = useState(false)

  /* ============ 加载:本地优先,本地空则回退服务端历史 ============ */
  const loadLibrary = useCallback(async () => {
    let local = getLocalPlaylist()
    if (local.length === 0) {
      try {
        const serverList = await getMusicHistory()
        if (serverList && serverList.length > 0) {
          // 回填本地,下次启动即使服务器不可用也有列表
          writeLocalPlaylistBulk(serverList)
          local = serverList.slice(0, 200)
        }
      } catch {
        // 无服务器或请求失败,使用本地(可能为空)
      }
    }
    setPlaylistSongs(local)
    setFavoriteSongs(getLocalFavorites())
    setLoaded(true)
  }, [])

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  /* ============ 播放列表 ============ */

  /** 播放歌曲时调用:置顶加入(本地持久化)+ 后台同步服务端历史 */
  const upsertPlaylistSong = useCallback((song: MusicSong) => {
    setPlaylistSongs((prev) => addToLocalPlaylist(prev, song))
    // 后台同步到服务端(失败静默;自定义源无服务器时会失败)
    saveMusicHistory(song, 0, 1, '').catch(() => {})
  }, [])

  /** 手动「加入播放列表」,返回是否新加入 */
  const joinPlaylist = useCallback((song: MusicSong): boolean => {
    let added = false
    setPlaylistSongs((prev) => {
      const r = joinLocalPlaylist(prev, song)
      added = r.added
      return r.list
    })
    return added
  }, [])

  /** 删除单首(本地持久化) */
  const removePlaylistSong = useCallback((song: MusicSong) => {
    setPlaylistSongs((prev) => removeFromLocalPlaylist(prev, song))
  }, [])

  /** 清空播放列表(本地持久化) */
  const clearPlaylist = useCallback(() => {
    clearLocalPlaylist()
    setPlaylistSongs([])
  }, [])

  /* ============ 收藏(仅标识) ============ */

  const isFavorite = useCallback(
    (song: MusicSong | undefined): boolean => (song ? isFavoriteSong(favoriteSongs, song) : false),
    [favoriteSongs]
  )

  /** 切换收藏,返回切换后是否已收藏 */
  const toggleFavorite = useCallback((song: MusicSong): boolean => {
    let favorited = false
    setFavoriteSongs((prev) => {
      const r = toggleFavoriteSong(prev, song)
      favorited = r.favorited
      return r.list
    })
    return favorited
  }, [])

  return {
    loaded,
    playlistSongs,
    view,
    setView,
    upsertPlaylistSong,
    joinPlaylist,
    removePlaylistSong,
    clearPlaylist,
    isFavorite,
    toggleFavorite
  }
}
