import fs from 'fs';
import net from 'net';
import path from 'path';

import { getLocalProjectManager } from './local-project-manager';

export type HealthState = 'healthy' | 'warning' | 'unhealthy' | 'disabled';

type ServiceHealth = {
  id: string;
  name: string;
  state: HealthState;
  configured: boolean;
  detail: string;
  latencyMs?: number;
};

function safeError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : '';
  return code || '连接失败';
}

async function probeTcp(host: string, port: number, timeoutMs = 1500) {
  const startedAt = Date.now();
  return new Promise<number>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const finish = (error?: Error) => {
      socket.removeAllListeners();
      socket.destroy();
      if (error) reject(error);
      else resolve(Date.now() - startedAt);
    };
    socket.setTimeout(timeoutMs, () => finish(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
    socket.once('connect', () => finish());
    socket.once('error', finish);
  });
}

async function tcpService(
  id: string,
  name: string,
  configured: boolean,
  host: string,
  port: number,
  disabledDetail: string,
): Promise<ServiceHealth> {
  if (!configured) return { id, name, configured: false, state: 'disabled', detail: disabledDetail };
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    return { id, name, configured: true, state: 'unhealthy', detail: '配置无效' };
  }
  try {
    const latencyMs = await probeTcp(host, port);
    return { id, name, configured: true, state: 'healthy', detail: '连接正常', latencyMs };
  } catch (error) {
    return { id, name, configured: true, state: 'unhealthy', detail: safeError(error) };
  }
}

async function voxaHealth(): Promise<ServiceHealth> {
  const raw = process.env.VOXA_INTERNAL_URL || process.env.VOXA_URL || '';
  if (!raw) return { id: 'voxa', name: 'VOXA', configured: false, state: 'disabled', detail: '未配置' };
  try {
    const url = new URL('/api/health-check', raw.endsWith('/') ? raw : `${raw}/`);
    const startedAt = Date.now();
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) throw Object.assign(new Error('bad response'), { code: `HTTP_${response.status}` });
    return {
      id: 'voxa',
      name: 'VOXA',
      configured: true,
      state: 'healthy',
      detail: '服务正常',
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return { id: 'voxa', name: 'VOXA', configured: true, state: 'unhealthy', detail: safeError(error) };
  }
}

function endpointFromUrl(value: string, defaultPort: number) {
  try {
    const parsed = new URL(value);
    return { host: parsed.hostname, port: Number(parsed.port || defaultPort), valid: true };
  } catch {
    return { host: '', port: 0, valid: false };
  }
}

async function serviceHealth() {
  const databaseUrl = process.env.BOX_DATABASE_URL || '';
  const database = endpointFromUrl(databaseUrl, 5432);
  const redisHost = process.env.REDIS_HOST || '';
  const rabbitUrl = process.env.RABBITMQ_HOST_URL || '';
  const rabbit = endpointFromUrl(rabbitUrl, 5672);
  return Promise.all([
    voxaHealth(),
    tcpService(
      'postgres',
      'PostgreSQL',
      Boolean(databaseUrl),
      database.host,
      database.port,
      '当前使用本地文件存储',
    ),
    tcpService('redis', 'Redis', Boolean(redisHost), redisHost, Number(process.env.REDIS_PORT || 6379), '未启用'),
    tcpService('rabbitmq', 'RabbitMQ', Boolean(rabbitUrl), rabbit.host, rabbit.port, '未启用'),
  ]);
}

async function runtimeStatus(projectId: string, mode: 'edit' | 'play') {
  const port = Number(mode === 'edit'
    ? process.env.BOX_EDIT_RUNTIME_PORT || process.env.BOX_EDIT_SERVER_PORT || 9967
    : process.env.BOX_PLAY_RUNTIME_PORT || process.env.BOX_SERVER_PORT || 9966);
  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/${encodeURIComponent(projectId)}/__local_runtime/status`,
      { signal: AbortSignal.timeout(1500) },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error('bad response'), { code: `HTTP_${response.status}` });
    return {
      mode,
      phase: typeof data.phase === 'string' ? data.phase : 'unknown',
      percent: Number(data.percent || 0),
      message: typeof data.message === 'string' ? data.message : '',
    };
  } catch (error) {
    return { mode, phase: 'unavailable', percent: 0, message: safeError(error) };
  }
}

export async function getSystemStatus() {
  const manager = getLocalProjectManager();
  const projects = manager.listProjects();
  const [services, runtimePairs] = await Promise.all([
    serviceHealth(),
    Promise.all(projects.map(async (project) => ({
      projectId: project.id,
      projectName: project.name,
      edit: await runtimeStatus(project.id, 'edit'),
      play: await runtimeStatus(project.id, 'play'),
    }))),
  ]);
  const diskTarget = fs.existsSync(manager.projectsRoot) ? manager.projectsRoot : path.dirname(manager.projectsRoot);
  const stat = fs.statfsSync(diskTarget);
  const totalBytes = stat.blocks * stat.bsize;
  const freeBytes = stat.bavail * stat.bsize;
  const snapshots = projects.reduce((total, project) => {
    try { return total + manager.listProjectSnapshots(project.id).length; }
    catch { return total; }
  }, 0);
  const backups = projects.reduce((total, project) => {
    try { return total + manager.listProjectBackups(project.id).length; }
    catch { return total; }
  }, 0);
  const latestBackups = projects.flatMap((project) => {
    try {
      return manager.listProjectBackups(project.id).map((backup) => ({ ...backup, projectName: project.name }));
    } catch {
      return [];
    }
  }).sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 10);
  const diskState: HealthState = freeBytes < 1024 ** 3 || freeBytes / Math.max(totalBytes, 1) < 0.05
    ? 'warning'
    : 'healthy';
  const hasFailure = services.some((service) => service.configured && service.state === 'unhealthy');
  const backupStatus = manager.readBackupStatus();
  return {
    status: hasFailure || diskState === 'warning' || backupStatus.state === 'warning' ? 'warning' : 'healthy',
    checkedAt: new Date().toISOString(),
    services,
    disk: { state: diskState, totalBytes, freeBytes, projectsPath: manager.projectsRoot },
    projects: { count: projects.length, snapshots, backups, latestBackups, runtimes: runtimePairs },
    backup: { configuration: manager.getBackupConfiguration(), status: backupStatus },
  };
}
