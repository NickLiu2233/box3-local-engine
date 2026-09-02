const DEFAULT_ENGINE_API_URL = 'https://code-api-pc.dao3.fun'

export type EngineMode = 'edit' | 'play'
export type ModelLookupInput = { modelType: 1 | 2 | 3; mapId?: number; mode?: EngineMode }

export type EngineScript = {
  hash?: string
  id: string
  lockedMapId?: number
  lockedMapTitle?: string
  name: string
  share?: boolean
  type?: number
}

export type EngineScriptList = {
  clientScripts: EngineScript[]
  serverScripts: EngineScript[]
}

export type EnginePhoto = {
  createdAt?: number
  hash: string
  id: string
  name: string
  previewImage?: string
  size?: number
  updateAt?: number
  updatedAt?: number
}

export type EngineModel = {
  animated?: boolean
  creativeMode?: number
  fileHash?: string
  modelFileHash?: string
  modelFileUrl?: string
  modelId: number
  modelName: string
  modelPreviewHash?: string
  modelPreviewUrl?: string
  modelType?: number
  projectFileHash?: string
  projectFileUrl?: string
  updatedAt?: string
}

type EnginePage<T> = { count?: number; rows?: T[] }
type EngineResponse<T> = { code?: number; data?: T; msg?: string; traceId?: string }

function positiveInteger(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] || '', 10)
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}

function apiBase() {
  return (process.env.BOX_MIGRATOR_ENGINE_API_URL?.trim() || DEFAULT_ENGINE_API_URL).replace(
    /\/$/,
    '',
  )
}

function apiHeaders() {
  const headers = new Headers({ accept: 'application/json' })
  const fixedKey = process.env.BOX_MIGRATOR_ENGINE_API_KEY?.trim()
  const authorization = process.env.BOX_MIGRATOR_ENGINE_AUTHORIZATION?.trim()
  if (fixedKey) headers.set('request-header-fixed-key', fixedKey)
  if (authorization) headers.set('authorization', authorization)
  return headers
}

function queryString(query: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const value = params.toString()
  return value ? `?${value}` : ''
}

export async function engineApiRequest<T>(
  pathname: string,
  query: Record<string, string | number | boolean | undefined> = {},
  method = 'GET',
): Promise<T> {
  const timeoutMs = positiveInteger('BOX_MIGRATOR_ENGINE_API_TIMEOUT_MS', 15_000)
  const url = `${apiBase()}${pathname}${queryString(query)}`
  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: apiHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    throw new Error(
      `引擎后端请求失败 ${pathname}：${error instanceof Error ? error.message : String(error)}`,
    )
  }
  const body = (await response.json().catch(() => undefined)) as EngineResponse<T> | undefined
  if (!response.ok) {
    throw new Error(
      `引擎后端请求失败 ${pathname}（HTTP ${response.status}${body?.msg ? `：${body.msg}` : ''}）`,
    )
  }
  const code = body?.code
  if (!body || (code !== undefined && code !== 0 && (code < 200 || code >= 300))) {
    throw new Error(`引擎后端返回异常 ${pathname}${body?.msg ? `：${body.msg}` : ''}`)
  }
  return body.data as T
}

export function resolveMapHash(mapId: number, mode: EngineMode) {
  return engineApiRequest<string>('/engine/map/hash', { mapId, mode })
}

export async function resolveModel(modelId: number, input: ModelLookupInput) {
  const pageSize = 100
  const maxPages = positiveInteger('BOX_MIGRATOR_MODEL_LOOKUP_PAGES', 20)
  for (let page = 0; page < maxPages; page += 1) {
    const result = await engineApiRequest<EnginePage<EngineModel>>('/engine/models', {
      modelType: input.modelType,
      mapId: input.mapId,
      containerMode: input.mode === 'play' ? 'play' : 'edit',
      limit: pageSize,
      offset: page * pageSize,
    })
    const model = (result.rows || []).find((entry) => Number(entry.modelId) === modelId)
    if (model) return model
    if (
      (result.rows || []).length < pageSize ||
      (result.count !== undefined && (page + 1) * pageSize >= result.count)
    )
      break
  }
  throw new Error('在所选模型库中找不到该模型 ID')
}

export function searchModels(input: {
  modelName: string
  modelType: 1 | 2 | 3
  mapId?: number
  mode?: EngineMode
}) {
  return engineApiRequest<EnginePage<EngineModel>>('/engine/models', {
    modelType: input.modelType,
    modelName: input.modelName,
    mapId: input.mapId,
    containerMode: input.mode === 'play' ? 'play' : 'edit',
    limit: 50,
    offset: 0,
  })
}

export function getMapGroupProject(mapId: number, mode: EngineMode) {
  return engineApiRequest<Record<string, string>>('/engine/map-group-project', { mapId, mode })
}

export async function migrateMapGroupProject(mapId: number) {
  // Match Boxes' edit-server startup behavior. The cloud migration endpoint
  // uses a short-lived map-group lock, so a concurrent editor must not make a
  // read-only export fail on its first response.
  const maxAttempts = positiveInteger('BOX_MIGRATOR_MAP_GROUP_MIGRATION_RETRIES', 10)
  const retryDelayMs = positiveInteger('BOX_MIGRATOR_MAP_GROUP_MIGRATION_RETRY_DELAY_MS', 5_000)
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await engineApiRequest<null>('/engine/map-group-project/migration', { mapId })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const lockFailed = /\block failed\b/i.test(message)
      if (!lockFailed) throw error
      if (attempt >= maxAttempts) {
        throw new Error(
          `云端地图组仍被占用，已重试 ${maxAttempts} 次。请关闭该地图的云端编辑器后再试。原始错误：${message}`,
        )
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    }
  }
  throw new Error('云端地图组迁移重试意外结束')
}

export function migratePlayPictures(mapId: number) {
  return engineApiRequest<string>('/engine/map-group-project/picture/migration', { mapId })
}

export function getScripts(mapId: number, mode: EngineMode) {
  return engineApiRequest<EngineScriptList>('/engine/script/list', { mapId, mode })
}

export function getPhotos(mapId: number) {
  return engineApiRequest<EnginePhoto[]>('/engine/photo/list', { mapId })
}

export function getDefaultSkin(mapId: number, mode: EngineMode) {
  return engineApiRequest<EngineModel | null>('/engine/model/skin/default', { mapId, mode })
}

async function getAllModels(
  mapId: number,
  mode: EngineMode,
  modelType: number,
  creativeMode: number,
) {
  const limit = 100
  const rows: EngineModel[] = []
  for (let offset = 0; ; offset += limit) {
    const page = await engineApiRequest<EnginePage<EngineModel>>('/engine/models', {
      modelType,
      creativeMode,
      containerMode: mode,
      mapId,
      offset,
      limit,
      orderBy: 0,
    })
    const batch = Array.isArray(page?.rows) ? page.rows : []
    rows.push(...batch)
    if (batch.length < limit || (typeof page?.count === 'number' && rows.length >= page.count))
      break
  }
  return rows
}

export function getProjectModels(mapId: number, mode: EngineMode) {
  return getAllModels(mapId, mode, 2, 1)
}

export function getProjectSkins(mapId: number, mode: EngineMode) {
  return getAllModels(mapId, mode, 3, 2)
}

export async function migrateProjectModels(mapId: number, onState?: (state: number) => void) {
  const maxPolls = positiveInteger('BOX_MIGRATOR_MODEL_MIGRATION_POLLS', 60)
  for (let poll = 0; poll < maxPolls; poll += 1) {
    const state = await engineApiRequest<number>(
      '/engine/model/project-shared/migration',
      { mapId },
      'POST',
    )
    onState?.(state)
    if (state === 2) return
    if (state === 3) throw new Error('云端项目模型迁移失败')
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('云端项目模型迁移超时')
}

export type CloudEngineData = {
  defaultSkin: EngineModel | null
  groupProject: Record<string, string>
  models: EngineModel[]
  photos: EnginePhoto[]
  scripts: EngineScriptList
  skins: EngineModel[]
}

export async function getCloudEngineData(
  mapId: number,
  mode: EngineMode,
): Promise<CloudEngineData> {
  const [groupProject, scripts, photos, defaultSkin, models, skins] = await Promise.all([
    getMapGroupProject(mapId, mode),
    getScripts(mapId, mode),
    getPhotos(mapId),
    getDefaultSkin(mapId, mode),
    getProjectModels(mapId, mode),
    getProjectSkins(mapId, mode),
  ])
  const resolvedGroupProject = groupProject || {}
  if (mode === 'play' && !resolvedGroupProject.pictureAssets) {
    const pictureAssets = await migratePlayPictures(mapId)
    if (pictureAssets) resolvedGroupProject.pictureAssets = pictureAssets
  }
  return {
    groupProject: resolvedGroupProject,
    scripts: scripts || { clientScripts: [], serverScripts: [] },
    photos: Array.isArray(photos) ? photos : [],
    defaultSkin: defaultSkin || null,
    models,
    skins,
  }
}
