import fs from 'fs'
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
const positiveInteger = (name: string, fallback: number) => {
  const value = Number.parseInt(process.env[name] || '', 10)
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}
const resultRetentionMs = () => positiveInteger('BOX_MIGRATOR_RESULT_RETENTION_MS', 60 * 60 * 1000)

function cleanExpiredJobs() {
  const now = Date.now()
  for (const [id, job] of jobs) {
    // RETENTION is for completed archives and error details. A running job may
    // legitimately spend a long time in one cloud/backend operation without a
    // progress callback. Deleting it here used to turn that pause into the
    // misleading UI error "任务不存在或已过期" while the migration promise was
    // still alive in the background.
    if (job.status === 'running') continue
    if (job.expiresAt > now) continue
    if (job.result) fs.rmSync(job.result.archivePath, { force: true })
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
  void generateProjectArchive(input, (progress) => {
    const updatedAt = Date.now()
    Object.assign(job, progress, {
      updatedAt,
      expiresAt: updatedAt + resultRetentionMs(),
    })
  })
    .then((result) => {
      const updatedAt = Date.now()
      Object.assign(job, {
        status: 'completed' as const,
        result,
        detail: '迁移完成，工程包已准备好下载。',
        updatedAt,
        expiresAt: updatedAt + resultRetentionMs(),
      })
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
    })
  return publicJob(job)
}

function publicJob(job: MigrationJob) {
  const { result, ...publicFields } = job
  return result ? { ...publicFields, filename: result.filename } : publicFields
}

export function getMigration(id: string) {
  cleanExpiredJobs()
  const job = jobs.get(id)
  return job ? publicJob(job) : undefined
}

export function takeMigrationArchive(id: string) {
  cleanExpiredJobs()
  const job = jobs.get(id)
  if (!job?.result || job.status !== 'completed') return undefined
  return job.result
}

export function finishMigrationDownload(id: string) {
  const job = jobs.get(id)
  if (!job) return
  if (job.result) fs.rmSync(job.result.archivePath, { force: true })
  jobs.delete(id)
}
