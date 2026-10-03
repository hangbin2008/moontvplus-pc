/**
 * 本地观看记录 / 视频收藏持久化
 *
 * 仅在未登录服务器(自定义源)模式下使用:服务端 API 不可达时,
 * store 的乐观更新原本会被回滚,导致观看历史为空。
 * 登录服务器后数据走 /api/playrecords、/api/favorites,不读写本文件。
 */
import type { PlayRecordMap, FavoriteMap } from '../types'

const LOCAL_PLAYRECORDS_KEY = 'playrecords_local_v1'
const LOCAL_FAVORITES_KEY = 'favorites_local_v1'

function readMap<T>(key: string): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : ({} as T)
  } catch {
    return {} as T
  }
}

function writeMap(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // 配额超限忽略
  }
}

/* ---- 观看记录 ---- */

export function getLocalPlayRecords(): PlayRecordMap {
  const map = readMap<PlayRecordMap>(LOCAL_PLAYRECORDS_KEY)
  return map && typeof map === 'object' ? map : {}
}

export function setLocalPlayRecord(key: string, record: PlayRecordMap[string]): void {
  const map = getLocalPlayRecords()
  map[key] = record
  writeMap(LOCAL_PLAYRECORDS_KEY, map)
}

export function removeLocalPlayRecord(key: string): void {
  const map = getLocalPlayRecords()
  delete map[key]
  writeMap(LOCAL_PLAYRECORDS_KEY, map)
}

export function clearLocalPlayRecords(): void {
  writeMap(LOCAL_PLAYRECORDS_KEY, {})
}

/* ---- 视频收藏 ---- */

export function getLocalFavorites(): FavoriteMap {
  const map = readMap<FavoriteMap>(LOCAL_FAVORITES_KEY)
  return map && typeof map === 'object' ? map : {}
}

export function setLocalFavorite(key: string, favorite: FavoriteMap[string]): void {
  const map = getLocalFavorites()
  map[key] = favorite
  writeMap(LOCAL_FAVORITES_KEY, map)
}

export function removeLocalFavorite(key: string): void {
  const map = getLocalFavorites()
  delete map[key]
  writeMap(LOCAL_FAVORITES_KEY, map)
}
