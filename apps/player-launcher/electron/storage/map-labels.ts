import * as fs from 'node:fs'
import * as path from 'node:path'

/** Small name index only; all map resources remain in Chromium CacheStorage. */
export function createMapLabels(filename: string) {
  let labels: Record<string, Record<string, string>> = {}
  try {
    labels = JSON.parse(fs.readFileSync(filename, 'utf8'))
  } catch {
    /* Existing caches may predate this index. */
  }
  return {
    remember(serverId: string, maps: Array<{ permanentMapId?: string; name?: string }>): void {
      const names = { ...labels[serverId] }
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
          names[map.permanentMapId] = map.name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 80)
        }
      }
      labels[serverId] = names
      fs.mkdirSync(path.dirname(filename), { recursive: true })
      fs.writeFileSync(filename, JSON.stringify(labels), { mode: 0o600 })
    },
    name(serverId: string, mapId: string): string {
      return labels[serverId]?.[mapId] || `地图 ${mapId}`
    },
  }
}
