import * as fs from 'node:fs'
import * as path from 'node:path'

export interface RecentPlayerMap {
  serverId: string
  permanentMapId: string
  accessId: string
  name: string
  releaseVersion: string
  playedAt: number
}

interface ServerLabels {
  maps: Record<string, { name: string; publicId?: string; releaseVersion?: string }>
  recent?: RecentPlayerMap
}

function safeText(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) : ''
}

/** Small public-name/recent-play index only; all map resources remain in CacheStorage. */
export function createMapLabels(filename: string) {
  let labels: Record<string, ServerLabels> = {}
  try {
    const stored = JSON.parse(fs.readFileSync(filename, 'utf8')) as Record<string, unknown>
    for (const [serverId, value] of Object.entries(stored)) {
      if (!value || typeof value !== 'object') continue
      const entry = value as { maps?: Record<string, unknown>; recent?: RecentPlayerMap }
      const oldMap = value as Record<string, unknown>
      const maps: ServerLabels['maps'] = {}
      for (const [mapId, mapValue] of Object.entries(entry.maps || oldMap)) {
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(mapId) || ['__proto__', 'constructor', 'prototype'].includes(mapId)) continue
        const record = typeof mapValue === 'string' ? { name: mapValue } : mapValue as Record<string, unknown>
        const name = safeText(record?.name, 80)
        if (name) maps[mapId] = { name, publicId: safeText(record?.publicId, 64), releaseVersion: safeText(record?.releaseVersion, 128) }
      }
      const recent = entry.recent
      labels[serverId] = {
        maps,
        ...(recent && typeof recent === 'object' && /^[A-Za-z0-9_-]{1,128}$/.test(recent.permanentMapId)
          ? { recent: { ...recent, name: safeText(recent.name, 80), accessId: safeText(recent.accessId, 64), releaseVersion: safeText(recent.releaseVersion, 128), playedAt: Number(recent.playedAt) || 0 } }
          : {}),
      }
    }
  } catch {
    /* Existing caches may predate this index. */
  }
  function persist(): void {
    fs.mkdirSync(path.dirname(filename), { recursive: true })
    fs.writeFileSync(filename, JSON.stringify(labels), { mode: 0o600 })
  }

  return {
    remember(serverId: string, maps: Array<{ permanentMapId?: string; publicId?: string; name?: string; version?: string }>): void {
      const names = labels[serverId]?.maps || {}
      for (const map of maps.slice(0, 1000)) {
        if (
          !map ||
          typeof map !== 'object' ||
          ['__proto__', 'constructor', 'prototype'].includes(map.permanentMapId || '')
        )
          continue
        if (
          typeof map.permanentMapId === 'string' &&
          /^[A-Za-z0-9_-]{1,128}$/.test(map.permanentMapId) &&
          typeof map.name === 'string'
        ) {
          names[map.permanentMapId] = {
            name: safeText(map.name, 80),
            publicId: safeText(map.publicId, 64),
            releaseVersion: safeText(map.version, 128),
          }
        }
      }
      labels[serverId] = { ...labels[serverId], maps: names }
      persist()
    },
    rememberPlayed(serverId: string, map: Omit<RecentPlayerMap, 'playedAt' | 'serverId'>): void {
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(map.permanentMapId) || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(map.accessId)) return
      labels[serverId] = { ...labels[serverId], maps: labels[serverId]?.maps || {}, recent: { ...map, serverId, name: safeText(map.name, 80), releaseVersion: safeText(map.releaseVersion, 128), playedAt: Date.now() } }
      persist()
    },
    recent(serverId: string): RecentPlayerMap | null { return labels[serverId]?.recent || null },
    nameIndex(serverId: string): Map<string, string> {
      return new Map(Object.entries(labels[serverId]?.maps || {}).map(([mapId, item]) => [mapId, item.name]))
    },
    forget(serverId: string): void {
      delete labels[serverId]
      try { persist() } catch { /* A public-name index must not prevent server removal. */ }
    },
    name(serverId: string, mapId: string): string {
      return labels[serverId]?.maps[mapId]?.name || `地图 ${mapId}`
    },
  }
}
