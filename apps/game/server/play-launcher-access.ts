import fs from 'fs'
import path from 'path'
import { getPlayWorlds, type PlayWorld } from './play-worlds'

const SETTINGS_FILE = 'player-launcher-access.json'

export type PlayLauncherAccessSettings = {
  enabled: boolean
  updatedAt?: string
}

function libraryRoot() {
  const root = String(process.env.BOX_PLAY_LIBRARY_PATH || '').trim()
  if (!root) throw new Error('游玩地图库未配置')
  return root
}

function settingsPath() {
  return path.join(libraryRoot(), SETTINGS_FILE)
}

function atomicWrite(file: string, value: unknown) {
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  fs.renameSync(temporary, file)
}

/** Online map discovery and downloads are opt-in, independent of browser cache. */
export function getPlayLauncherAccessSettings(): PlayLauncherAccessSettings {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) as Partial<PlayLauncherAccessSettings>
    return {
      enabled: raw.enabled === true,
      ...(typeof raw.updatedAt === 'string' ? { updatedAt: raw.updatedAt } : {}),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { enabled: false }
    throw new Error(`无法读取玩家启动器访问设置：${(error as Error).message}`)
  }
}

export function updatePlayLauncherAccessSettings(enabled: unknown): PlayLauncherAccessSettings {
  if (typeof enabled !== 'boolean') throw new Error('enabled 必须是布尔值')
  const next = { enabled, updatedAt: new Date().toISOString() }
  atomicWrite(settingsPath(), next)
  return next
}

/** Launcher discovery presents open, top-level maps; submaps stay in their parent package. */
export function getPlayerLauncherWorlds(): PlayWorld[] {
  return getPlayWorlds().filter((world) => world.playEnabled && world.mapRole !== 'submap')
}
