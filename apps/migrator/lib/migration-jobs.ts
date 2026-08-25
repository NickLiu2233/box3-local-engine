import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import {
  generateProjectArchive,
  type GeneratedProject,
  type MigrationProgress,
} from './export-project'

type JobStatus = 'running' | 'completed' | 'failed'
export type MigrationJob = MigrationProgress & {
  id: string
  status: JobStatus
  error?: string
  result?: GeneratedProject
  startedAt: number
  updatedAt: number
  expiresAt: number
}

// Next.js compiles each API route into its own module bundle. A module-scoped
// Map would therefore be different for /api/migration and /api/download.
// Keep the short-lived job registry on the Node process global instead.
type MigrationJobGlobal = typeof globalThis & {
  __boxMigratorJobs?: Map<string, MigrationJob>
}
const migrationGlobal = globalThis as MigrationJobGlobal
const jobs = migrationGlobal.__boxMigratorJobs ?? new Map<string, MigrationJob>()
migrationGlobal.__boxMigratorJobs = jobs
const JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const positiveInteger = (name: string, fallback: number) => {
  const value = Number.parseInt(process.env[name] || '', 10)
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}
const resultRetentionMs = () => positiveInteger('BOX_MIGRATOR_RESULT_RETENTION_MS', 60 * 60 * 1000)

function jobDirectory() {
  const cacheRoot = process.env.BOX_MIGRATOR_CACHE_DIR?.trim()
    ? path.resolve(process.env.BOX_MIGRATOR_CACHE_DIR)
    : path.join(os.tmpdir(), 'box-migrator-cache')
  return path.join(cacheRoot, 'jobs')
}

function jobRecordPath(id: string) {
  return JOB_ID_PATTERN.test(id) ? path.join(jobDirectory(), `${id}.json`) : undefined
}

function jobArchivePath(id: string) {
  return JOB_ID_PATTERN.test(id) ? path.join(jobDirectory(), `${id}.boxproject`) : undefined
}

function removeJobFiles(id: string, archivePath?: string) {
  const recordPath = jobRecordPath(id)
  const storedArchivePath = jobArchivePath(id)
  if (recordPath) fs.rmSync(recordPath, { force: true })
  if (storedArchivePath) fs.rmSync(storedArchivePath, { force: true })
  if (archivePath && archivePath !== storedArchivePath) fs.rmSync(archivePath, { force: true })
}

function persistJob(job: MigrationJob) {
  const recordPath = jobRecordPath(job.id)
  if (!recordPath) throw new Error('迁移任务 ID 无效')
  fs.mkdirSync(path.dirname(recordPath), { recursive: true })
  const temporaryPath = `${recordPath}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(job)}\n`, { mode: 0o600 })
    fs.renameSync(temporaryPath, recordPath)
  } finally {
    fs.rmSync(temporaryPath, { force: true })
  }
}

function readPersistedJob(id: string) {
  const recordPath = jobRecordPath(id)
  if (!recordPath) return undefined
  try {
    const candidate = JSON.parse(fs.readFileSync(recordPath, 'utf8')) as MigrationJob
    if (
      candidate.id !== id ||
      (candidate.status !== 'running' &&
        candidate.status !== 'completed' &&
        candidate.status !== 'failed')
    ) {
      removeJobFiles(id)
      return undefined
    }
    if (candidate.result) {
      const archivePath = jobArchivePath(id)
      if (!archivePath || !fs.existsSync(archivePath)) {
        removeJobFiles(id)
        return undefined
      }
      candidate.result.archivePath = archivePath
    }
    jobs.set(id, candidate)
    return candidate
  } catch {
    removeJobFiles(id)
    return undefined
  }
}

function findJob(id: string) {
  return jobs.get(id) ?? readPersistedJob(id)
}

function persistArchive(id: string, result: GeneratedProject) {
  const archivePath = jobArchivePath(id)
  if (!archivePath) throw new Error('迁移任务 ID 无效')
  fs.mkdirSync(path.dirname(archivePath), { recursive: true })
  fs.copyFileSync(result.archivePath, archivePath)
  fs.rmSync(result.archivePath, { force: true })
  return { ...result, archivePath }
}

function cleanExpiredJobs() {
  const now = Date.now()
  const candidateIds = new Set(jobs.keys())
  try {
    for (const name of fs.readdirSync(jobDirectory())) {
      if (name.endsWith('.json')) candidateIds.add(name.slice(0, -'.json'.length))
    }
  } catch {
    // The first migration has not created the cache directory yet.
  }
  for (const id of candidateIds) {
    const job = findJob(id)
    if (!job) continue
    // RETENTION is for completed archives and error details. A running job may
    // legitimately spend a long time in one cloud/backend operation without a
    // progress callback. Deleting it here used to turn that pause into the
    // misleading UI error "任务不存在或已过期" while the migration promise was
    // still alive in the background.
    if (job.status === 'running') continue
    if (job.expiresAt > now) continue
    removeJobFiles(id, job.result?.archivePath)
    jobs.delete(id)
  }
}

export function startMigration(input: {
  hash?: string
  mapId?: number
  mode?: 'edit' | 'play'
  projectName?: string
}) {
  cleanExpiredJobs()
  const id = randomUUID()
  const now = Date.now()
  const job: MigrationJob = {
    id,
    status: 'running',
    stage: 'validating',
    blobCount: 0,
    totalBytes: 0,
    discoveredCount: 0,
    traversedCount: 0,
    skippedCount: 0,
    skippedBlobs: [],
    activeDownloadCount: 0,
    detail: '迁移任务已创建，正在连接云端…',
    startedAt: now,
    updatedAt: now,
    // Ignored while status is running. Keeping a numeric value preserves the
    // existing response shape for older migrator pages.
    expiresAt: now + resultRetentionMs(),
  }
  jobs.set(id, job)
  persistJob(job)
  void generateProjectArchive(input, (progress) => {
    const updatedAt = Date.now()
    Object.assign(job, progress, {
      updatedAt,
      expiresAt: updatedAt + resultRetentionMs(),
    })
    persistJob(job)
  })
    .then((result) => {
      const updatedAt = Date.now()
      Object.assign(job, {
        status: 'completed' as const,
        result: persistArchive(id, result),
        detail: '迁移完成，工程包已准备好下载。',
        updatedAt,
        expiresAt: updatedAt + resultRetentionMs(),
      })
      persistJob(job)
    })
    .catch((error) => {
      const updatedAt = Date.now()
      Object.assign(job, {
        status: 'failed' as const,
        error: (error as Error).message || '迁移失败',
        detail: '迁移未完成。',
        updatedAt,
        expiresAt: updatedAt + resultRetentionMs(),
      })
      persistJob(job)
    })
  return publicJob(job)
}

function publicJob(job: MigrationJob) {
  const { result, ...publicFields } = job
  return result ? { ...publicFields, filename: result.filename } : publicFields
}

export function getMigration(id: string) {
  cleanExpiredJobs()
  const job = findJob(id)
  return job ? publicJob(job) : undefined
}

export function takeMigrationArchive(id: string) {
  cleanExpiredJobs()
  const job = findJob(id)
  if (!job?.result || job.status !== 'completed') return undefined
  return job.result
}

export function finishMigrationDownload(id: string) {
  const job = findJob(id)
  removeJobFiles(id, job?.result?.archivePath)
  jobs.delete(id)
}
