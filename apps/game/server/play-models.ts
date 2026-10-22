import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { compareVoxaPlayVersions, decodeVoxaPlay, encodeVoxaPlay } from '@box/voxa-project'
import type { PlayModel } from '@box/apis'

const fingerprints = new Map<string, { modified: number; bytes: number; hash: string }>()
function contentHash(file: string, stored: unknown) {
  if (typeof stored === 'string' && /^[a-f0-9]{64}$/.test(stored)) return stored
  const stat = fs.statSync(file)
  const previous = fingerprints.get(file)
  if (previous?.modified === stat.mtimeMs && previous.bytes === stat.size) return previous.hash
  const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  fingerprints.set(file, { modified: stat.mtimeMs, bytes: stat.size, hash })
  return hash
}

function root() {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'play' || !process.env.BOX_PLAY_LIBRARY_PATH)
    throw new Error('模型预览库未开启')
  return path.join(path.resolve(process.env.BOX_PLAY_LIBRARY_PATH), '.model-previews')
}
function directory(id: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))
    throw new Error('模型预览不存在')
  return path.join(root(), id)
}
function previewURL(id: string) {
  const base = process.env.BOX_PLAY_PUBLIC_URL || process.env.BOX_SERVER_PUBLIC_URL || ''
  return `${/^https?:\/\//.test(base) ? base.replace(/\/$/, '') : ''}/models/${id}`
}
export function getPlayModel(id: string, publicOnly = false): PlayModel | undefined {
  const folder = directory(id)
  try {
    const entry = JSON.parse(fs.readFileSync(path.join(folder, 'entry.json'), 'utf8')) as PlayModel
    if (
      entry.id !== id ||
      (publicOnly && !entry.published) ||
      !fs.statSync(path.join(folder, 'preview.voxaplay')).isFile()
    )
      return undefined
    return {
      ...entry,
      contentHash: contentHash(path.join(folder, 'preview.voxaplay'), entry.contentHash),
      author: typeof entry.author === 'string' ? entry.author : '',
      version: typeof entry.version === 'string' && entry.version.trim() ? entry.version : 'v1.0.0',
      previewUrl: previewURL(id),
    }
  } catch {
    return undefined
  }
}
export function listPlayModels(publicOnly = false): PlayModel[] {
  const folder = root()
  if (!fs.existsSync(folder)) return []
  return fs
    .readdirSync(folder, { withFileTypes: true })
    .filter((item) => item.isDirectory() && /^[a-f0-9-]{36}$/.test(item.name))
    .flatMap((item) => {
      const entry = getPlayModel(item.name, publicOnly)
      return entry ? [entry] : []
    })
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt))
}
export function importPlayModel(bytes: Uint8Array): PlayModel {
  const bundle = decodeVoxaPlay(bytes)
  const existing = bundle.projectId ? getPlayModel(bundle.projectId) : undefined
  if (bundle.projectId) {
    const order = compareVoxaPlayVersions(bundle.version, existing?.version || bundle.version)
    if (existing && order <= 0)
      throw new Error(`模型“${existing.name}”导入版本 ${bundle.version} ${order === 0 ? '与当前版本相同' : '低于当前版本'}（${existing.version}），未覆盖`)
  }
  const canonical = encodeVoxaPlay(bundle.name, bundle.model, bundle.previewImage, bundle)
  const id = bundle.projectId || randomUUID(),
    destination = directory(id)
  fs.mkdirSync(root(), { recursive: true })
  const temporary = fs.mkdtempSync(path.join(root(), '.upload-'))
  const entry: PlayModel = {
    id,
    name: bundle.name,
    author: bundle.author,
    version: bundle.version,
    description: bundle.description,
    published: existing?.published ?? true,
    importedAt: new Date().toISOString(),
    bytes: canonical.length,
    contentHash: createHash('sha256').update(canonical).digest('hex'),
    animationCount: bundle.model.animations.length,
    nodeCount: bundle.model.nodes.length,
    previewUrl: previewURL(id),
  }
  if (bundle.previewImage) entry.previewImage = bundle.previewImage
  let backup: string | undefined
  try {
    fs.writeFileSync(path.join(temporary, 'preview.voxaplay'), canonical, { flag: 'wx' })
    fs.writeFileSync(path.join(temporary, 'entry.json'), JSON.stringify(entry), { flag: 'wx' })
    if (existing) {
      backup = path.join(root(), `.previous-${randomUUID()}`)
      fs.renameSync(destination, backup)
    }
    try {
      fs.renameSync(temporary, destination)
    } catch (error) {
      if (backup) fs.renameSync(backup, destination)
      throw error
    }
    fingerprints.delete(path.join(destination, 'preview.voxaplay'))
    if (backup) fs.rmSync(backup, { recursive: true, force: true })
    return entry
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
}
export function updatePlayModel(id: string, input: unknown): PlayModel {
  const entry = getPlayModel(id)
  if (!entry) throw new Error('模型预览不存在')
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('预览设置无效')
  const value = input as Record<string, unknown>
  for (const key of Object.keys(value))
    if (!['name', 'author', 'version', 'description', 'published'].includes(key))
      throw new Error('预览设置包含未知字段')
  if (value.name !== undefined) {
    if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 100)
      throw new Error('模型名称需为 1–100 字')
    entry.name = value.name.trim()
  }
  if (value.author !== undefined) {
    if (typeof value.author !== 'string' || value.author.length > 100)
      throw new Error('作者名称不能超过 100 字')
    entry.author = value.author.trim()
  }
  if (value.version !== undefined) {
    if (typeof value.version !== 'string' || !value.version.trim() || value.version.length > 50)
      throw new Error('版本需为 1–50 字')
    entry.version = value.version.trim()
  }
  if (value.description !== undefined) {
    if (typeof value.description !== 'string' || value.description.length > 2000)
      throw new Error('模型说明不能超过 2000 字')
    entry.description = value.description.trim()
  }
  if (value.published !== undefined) {
    if (typeof value.published !== 'boolean') throw new Error('发布状态无效')
    entry.published = value.published
  }
  const file = path.join(directory(id), 'entry.json'),
    temporary = `${file}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temporary, JSON.stringify(entry), { flag: 'wx' })
    fs.renameSync(temporary, file)
  } finally {
    fs.rmSync(temporary, { force: true })
  }
  return entry
}
export function deletePlayModel(id: string) {
  if (!getPlayModel(id)) throw new Error('模型预览不存在')
  fingerprints.delete(playModelFile(id))
  fs.rmSync(directory(id), { recursive: true })
}
export function playModelFile(id: string) {
  return path.join(directory(id), 'preview.voxaplay')
}
