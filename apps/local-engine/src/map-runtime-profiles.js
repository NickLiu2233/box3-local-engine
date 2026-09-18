'use strict'

// Profiles apply only to published Play maps. Published-world metadata remains
// immutable; the stable permanent map ID is the lookup key.
const PROFILE_VERSION = 1
const profileMode = new Set(['play'])
const permanentMapIdPattern = /^[a-z0-9][a-z0-9-]{0,62}$/

function positiveInteger(value, name, { minimum = 1, maximum } = {}) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < minimum || (maximum && parsed > maximum)) {
    throw new Error(`${name} 必须是 ${minimum}${maximum ? ` 到 ${maximum}` : ' 以上'}的整数`)
  }
  return parsed
}

function normalizeMapRuntimeProfile(input = {}) {
  const permanentMapId = String(input.permanentMapId || '').trim()
  if (!permanentMapIdPattern.test(permanentMapId)) {
    throw new Error('地图永久 ID 格式无效')
  }
  const mode = String(input.mode || '').trim()
  if (!profileMode.has(mode)) throw new Error('地图容器配置仅支持游玩端')

  const cpuMilli = input.cpuMilli == null || input.cpuMilli === '' ? null : positiveInteger(input.cpuMilli, 'CPU 上限（m）', { minimum: 1, maximum: 128000 })
  const memoryMb = input.memoryMb == null || input.memoryMb === '' ? null : positiveInteger(input.memoryMb, '内存上限（MB）', { minimum: 64, maximum: 1048576 })

  return {
    permanentMapId,
    mode,
    playerLimit: positiveInteger(input.playerLimit, '人数上限', { maximum: 10000 }),
    roomLimit: positiveInteger(input.roomLimit, '房间上限', { maximum: 10000 }),
    idleTimeoutMs: positiveInteger(input.idleTimeoutMs, '无用户时存活时间（ms）', {
      minimum: 1000,
      maximum: 7 * 24 * 60 * 60 * 1000,
    }),
    // Having either hard resource value selects the container adapter. Both
    // values are optional so existing maps retain the low-overhead process
    // adapter without a migration.
    cpuMilli,
    memoryMb,
  }
}

function runtimeProfileKey({ permanentMapId, mode }) {
  return `${mode}:${permanentMapId}`
}

function resolveMapRuntimeProfile(document, { permanentMapId, mode }, defaults = {}) {
  if (mode !== 'play') {
    return {
      playerLimit: defaults.playerLimit,
      roomLimit: defaults.roomLimit,
      idleTimeoutMs: defaults.idleTimeoutMs,
      cpuMilli: null,
      memoryMb: null,
      isolation: 'process',
    }
  }
  const profiles = Array.isArray(document?.profiles) ? document.profiles : []
  const profile = profiles.find(
    (candidate) => candidate?.permanentMapId === permanentMapId && candidate?.mode === mode,
  )
  const normalized = profile ? normalizeMapRuntimeProfile(profile) : null
  return {
    playerLimit: normalized?.playerLimit ?? defaults.playerLimit,
    roomLimit: normalized?.roomLimit ?? defaults.roomLimit,
    idleTimeoutMs: normalized?.idleTimeoutMs ?? defaults.idleTimeoutMs,
    cpuMilli: normalized?.cpuMilli ?? null,
    memoryMb: normalized?.memoryMb ?? null,
    isolation: normalized?.cpuMilli || normalized?.memoryMb ? 'container' : 'process',
  }
}

module.exports = {
  PROFILE_VERSION,
  normalizeMapRuntimeProfile,
  resolveMapRuntimeProfile,
  runtimeProfileKey,
}
