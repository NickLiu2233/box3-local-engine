import fs from 'fs';
import { randomUUID } from 'crypto';
import { generateProjectArchive, type GeneratedProject, type MigrationProgress } from './export-project';

type JobStatus = 'running' | 'completed' | 'failed';
export type MigrationJob = MigrationProgress & {
  id: string;
  status: JobStatus;
  error?: string;
  result?: GeneratedProject;
  expiresAt: number;
};

// Next.js compiles each API route into its own module bundle. A module-scoped
// Map would therefore be different for /api/migration and /api/download.
// Keep the short-lived job registry on the Node process global instead.
type MigrationJobGlobal = typeof globalThis & {
  __boxMigratorJobs?: Map<string, MigrationJob>;
};
const migrationGlobal = globalThis as MigrationJobGlobal;
const jobs = migrationGlobal.__boxMigratorJobs ?? new Map<string, MigrationJob>();
migrationGlobal.__boxMigratorJobs = jobs;
const RETENTION_MS = 15 * 60 * 1000;

function cleanExpiredJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (job.expiresAt > now) continue;
    if (job.result) fs.rmSync(job.result.archivePath, { force: true });
    jobs.delete(id);
  }
}

export function startMigration(input: { hash: string; projectName?: string }) {
  cleanExpiredJobs();
  const id = randomUUID();
  const job: MigrationJob = {
    id, status: 'running', stage: 'validating', blobCount: 0, totalBytes: 0,
    discoveredCount: 0, traversedCount: 0, skippedCount: 0, skippedBlobs: [], activeDownloadCount: 0,
    detail: '迁移任务已创建，正在连接云端…', expiresAt: Date.now() + RETENTION_MS,
  };
  jobs.set(id, job);
  void generateProjectArchive(input, (progress) => Object.assign(job, progress, { expiresAt: Date.now() + RETENTION_MS }))
    .then((result) => Object.assign(job, { status: 'completed' as const, result, detail: '迁移完成，工程包已准备好下载。', expiresAt: Date.now() + RETENTION_MS }))
    .catch((error) => Object.assign(job, { status: 'failed' as const, error: (error as Error).message || '迁移失败', detail: '迁移未完成。', expiresAt: Date.now() + RETENTION_MS }));
  return publicJob(job);
}

function publicJob(job: MigrationJob) {
  const { result, ...publicFields } = job;
  return result ? { ...publicFields, filename: result.filename } : publicFields;
}

export function getMigration(id: string) {
  cleanExpiredJobs();
  const job = jobs.get(id);
  return job ? publicJob(job) : undefined;
}

export function takeMigrationArchive(id: string) {
  cleanExpiredJobs();
  const job = jobs.get(id);
  if (!job?.result || job.status !== 'completed') return undefined;
  return job.result;
}

export function finishMigrationDownload(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  if (job.result) fs.rmSync(job.result.archivePath, { force: true });
  jobs.delete(id);
}
