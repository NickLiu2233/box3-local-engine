import type { GetServerSideProps } from 'next';
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Archive,
  ArrowLeft,
  CircleAlert,
  Clock3,
  Cpu,
  Database,
  Download,
  FolderCog,
  HardDrive,
  RefreshCw,
  Server,
} from 'lucide-react';

import styles from './system.module.css';

type HealthState = 'healthy' | 'warning' | 'unhealthy' | 'disabled';
type SystemStatus = {
  status: 'healthy' | 'warning';
  checkedAt: string;
  creator: {
    state: 'healthy';
    detail: string;
    version: string;
    deploymentMode: string;
    nodeVersion: string;
    pid: number;
    uptimeSeconds: number;
    hostname: string;
    memory: { rssBytes: number; heapUsedBytes: number; heapTotalBytes: number };
    ports: { web: number; edit: number; play: number };
  };
  services: Array<{
    id: string;
    name: string;
    state: HealthState;
    configured: boolean;
    detail: string;
    latencyMs?: number;
    endpoint?: string;
    check: 'http' | 'tcp';
  }>;
  disk: { state: HealthState; totalBytes: number; freeBytes: number; projectsPath: string };
  projects: {
    count: number;
    snapshots: number;
    backups: number;
    latestBackups: Array<{
      projectId: string;
      projectName: string;
      name: string;
      createdAt: string;
      size: number;
      reason: string;
    }>;
    runtimes: Array<{
      projectId: string;
      projectName: string;
      edit: RuntimeStatus;
      play: RuntimeStatus;
    }>;
  };
  backup: {
    configuration: {
      enabled: boolean;
      intervalMinutes: number;
      retentionCount: number;
      retentionDays: number;
      backupRoot: string;
    };
    status: {
      state: string;
      lastStartedAt: string;
      lastCompletedAt: string;
      completedProjects: number;
      totalProjects: number;
      created: number;
      skipped: number;
      failed: Array<{ projectId: string; projectName: string; message: string }>;
    };
  };
  diagnostics: Array<{ severity: 'warning' | 'error'; source: string; message: string }>;
};

type RuntimeStatus = {
  phase: string;
  percent: number;
  message: string;
  port?: number;
  pid?: number;
  startedAt: string;
  updatedAt: string;
  latencyMs?: number;
};

const stateLabels: Record<HealthState, string> = {
  healthy: '正常',
  warning: '注意',
  unhealthy: '异常',
  disabled: '未启用',
};

function formatBytes(value: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function formatTime(value: string) {
  return value ? new Date(value).toLocaleString() : '尚未执行';
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} 秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时 ${Math.floor((seconds % 3600) / 60)} 分钟`;
  return `${Math.floor(seconds / 86400)} 天 ${Math.floor((seconds % 86400) / 3600)} 小时`;
}

function runtimeLabel(phase: string) {
  if (phase === 'ready') return '运行中';
  if (phase === 'idle') return '未启动';
  if (phase === 'unavailable') return '管理服务不可用';
  if (phase === 'error') return '启动失败';
  if (phase === 'starting' || phase === 'loading') return '启动中';
  return phase || '未知';
}

function runtimeState(phase: string): HealthState {
  if (phase === 'ready') return 'healthy';
  if (phase === 'starting' || phase === 'loading') return 'warning';
  if (phase === 'error' || phase === 'unavailable') return 'unhealthy';
  return 'disabled';
}

function RuntimeCell({ label, status }: { label: string; status: RuntimeStatus }) {
  const state = runtimeState(status.phase);
  const showProgress = status.phase === 'starting' || status.phase === 'loading';
  return (
    <div className={styles.runtimeCell}>
      <div className={styles.runtimeCellTop}>
        <small>{label}</small>
        <em className={styles[`state_${state}`]}>{runtimeLabel(status.phase)}</em>
      </div>
      <p>{status.message || '暂无运行信息'}</p>
      {showProgress && <div className={styles.runtimeProgress}><span style={{ width: `${Math.max(4, status.percent)}%` }} /></div>}
      <div className={styles.runtimeMeta}>
        {status.pid ? <span>PID {status.pid}</span> : null}
        {status.port ? <span>端口 {status.port}</span> : null}
        {status.latencyMs !== undefined ? <span>探测 {status.latencyMs} ms</span> : null}
        {status.startedAt ? <span>启动于 {formatTime(status.startedAt)}</span> : null}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  if (process.env.BOX_DEPLOYMENT_MODE === 'play') return { notFound: true };
  const { hasAuthenticatedPlayer, playerAccountURL } = await import('../../server/player-service-client');
  if (!await hasAuthenticatedPlayer(req.headers.cookie || '', req.socket.remoteAddress || '', String(req.headers['user-agent'] || ''))) {
    return { redirect: { destination: playerAccountURL('creator'), permanent: false } };
  }
  return { props: {} };
};

export default function SystemPage() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupBusy, setBackupBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch('/api/system/status', { cache: 'no-store' });
      const next = await response.json();
      if (!response.ok) throw new Error(next.message || '无法读取运行状态');
      setData(next);
      setError('');
      if (next.backup.status.state !== 'running') setBackupBusy(false);
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function createBackup() {
    setBackupBusy(true);
    setError('');
    try {
      const response = await fetch('/api/system/backups', { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || '无法开始备份');
      window.setTimeout(() => void refresh(true), 800);
    } catch (nextError) {
      setBackupBusy(false);
      setError((nextError as Error).message);
    }
  }

  const backup = data?.backup;
  const backupRunning = backupBusy || backup?.status.state === 'running';
  const diskUsed = data ? Math.max(0, data.disk.totalBytes - data.disk.freeBytes) : 0;
  const diskPercent = data?.disk.totalBytes ? Math.round((diskUsed / data.disk.totalBytes) * 100) : 0;
  const activeRuntimes = data?.projects.runtimes.reduce(
    (count, item) => count + Number(item.edit.phase === 'ready') + Number(item.play.phase === 'ready'),
    0,
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.back} href="/projects"><ArrowLeft size={17} /> 返回作品</a>
        <span className={styles.brand}>BOX <em>LOCAL</em></span>
        <span className={`${styles.overall} ${data?.status === 'warning' ? styles.warning : ''}`}>
          <span />{data?.status === 'warning' ? '需要检查' : '运行正常'}
        </span>
      </header>

      <section className={styles.content}>
        <div className={styles.titleRow}>
          <div>
            <p>LOCAL ENGINE</p>
            <h1>运行状态</h1>
            <span>集中检查本地服务、工程运行时、磁盘和备份，不会显示密码或连接密钥。</span>
          </div>
          <button onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} className={loading ? styles.spinning : ''} /> 刷新
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.summaryGrid}>
          <article><FolderCog /><div><strong>{data?.projects.count ?? '—'}</strong><span>本地工程</span></div></article>
          <article><Activity /><div><strong>{activeRuntimes ?? '—'}</strong><span>活跃运行时</span></div></article>
          <article><Archive /><div><strong>{data ? data.projects.snapshots + data.projects.backups : '—'}</strong><span>可恢复版本</span></div></article>
          <article><HardDrive /><div><strong>{data ? `${diskPercent}%` : '—'}</strong><span>磁盘已使用</span></div></article>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelTitle}><Cpu size={18} /><div><h2>创作端</h2><p>当前网页服务进程与本地运行时入口。</p></div></div>
          {data?.creator ? (
            <div className={styles.creatorGrid}>
              <div className={styles.creatorPrimary}>
                <span className={styles.creatorState}><i />{data.creator.detail}</span>
                <strong>Local Engine {data.creator.version}</strong>
                <small>{data.creator.nodeVersion} · PID {data.creator.pid} · {data.creator.deploymentMode}</small>
              </div>
              <div><span>持续运行</span><strong><Clock3 size={14} />{formatDuration(data.creator.uptimeSeconds)}</strong></div>
              <div><span>进程内存</span><strong>{formatBytes(data.creator.memory.rssBytes)}</strong><small>堆 {formatBytes(data.creator.memory.heapUsedBytes)} / {formatBytes(data.creator.memory.heapTotalBytes)}</small></div>
              <div><span>服务端口</span><strong>Web {data.creator.ports.web}</strong><small>编辑 {data.creator.ports.edit} · 游玩 {data.creator.ports.play}</small></div>
              <div><span>运行节点</span><strong title={data.creator.hostname}>{data.creator.hostname}</strong><small>状态每 5 秒自动刷新</small></div>
            </div>
          ) : <div className={styles.loading}>正在读取创作端状态…</div>}
        </section>

        {!!data?.diagnostics.length && (
          <section className={`${styles.panel} ${styles.diagnosticsPanel}`}>
            <div className={styles.panelTitle}><CircleAlert size={18} /><div><h2>需要处理</h2><p>这里只显示会影响使用的异常，未启用的可选服务不会出现。</p></div></div>
            <div className={styles.diagnosticList}>
              {data.diagnostics.map((item, index) => (
                <div key={`${item.source}:${index}`}>
                  <span>{item.source}</span><p>{item.message}</p><em>{item.severity === 'error' ? '异常' : '注意'}</em>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.panel}>
          <div className={styles.panelTitle}><Server size={18} /><div><h2>基础服务</h2><p>未启用的可选服务不会影响整体状态。</p></div></div>
          <div className={styles.serviceGrid}>
            {data?.services.map((service) => (
              <div className={styles.service} key={service.id}>
                <Database size={18} />
                <div><strong>{service.name}</strong><span>{service.detail}{service.latencyMs !== undefined ? ` · ${service.latencyMs} ms` : ''}</span><small>{service.endpoint ? `${service.check.toUpperCase()} · ${service.endpoint}` : service.configured ? service.check.toUpperCase() : '可选依赖'}</small></div>
                <em className={styles[`state_${service.state}`]}>{stateLabels[service.state]}</em>
              </div>
            )) || <div className={styles.loading}>正在检查服务…</div>}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelTitle}><Activity size={18} /><div><h2>工程运行时</h2><p>这里只读取状态，不会为了检查而启动工程。</p></div></div>
          <div className={styles.runtimeList}>
            {data?.projects.runtimes.length ? data.projects.runtimes.map((runtime) => (
              <div className={styles.runtime} key={runtime.projectId}>
                <div className={styles.runtimeIdentity}><strong>{runtime.projectName}</strong><code>{runtime.projectId}</code></div>
                <RuntimeCell label="编辑" status={runtime.edit} />
                <RuntimeCell label="游玩" status={runtime.play} />
              </div>
            )) : <div className={styles.loading}>暂无本地工程</div>}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.backupHeader}>
            <div className={styles.panelTitle}><Archive size={18} /><div><h2>工程备份</h2><p>使用可直接导入的 .boxproject 格式，并执行工程完整性检查。</p></div></div>
            <button className={styles.backupButton} onClick={() => void createBackup()} disabled={backupRunning}>
              <Archive size={15} /> {backupRunning ? '正在备份…' : '立即备份全部工程'}
            </button>
          </div>
          {backupRunning && backup && (
            <div className={styles.progress}><span style={{ width: `${backup.status.totalProjects ? (backup.status.completedProjects / backup.status.totalProjects) * 100 : 5}%` }} /></div>
          )}
          <div className={styles.backupGrid}>
            <div><span>自动备份</span><strong>{backup?.configuration.enabled ? `每 ${backup.configuration.intervalMinutes} 分钟` : '未启用'}</strong></div>
            <div><span>保留策略</span><strong>{backup ? `${backup.configuration.retentionCount} 份 / ${backup.configuration.retentionDays} 天` : '—'}</strong></div>
            <div><span>最近完成</span><strong>{formatTime(backup?.status.lastCompletedAt || '')}</strong></div>
            <div><span>备份位置</span><strong title={backup?.configuration.backupRoot}>{backup?.configuration.backupRoot || '—'}</strong></div>
          </div>
          {!!backup?.status.failed.length && (
            <div className={styles.backupErrors}>
              {backup.status.failed.map((failure) => <p key={failure.projectId}><strong>{failure.projectName}</strong>：{failure.message}</p>)}
            </div>
          )}
          {!!data?.projects.latestBackups.length && (
            <div className={styles.backupList}>
              <h3>最近备份</h3>
              {data.projects.latestBackups.map((item) => (
                <div key={`${item.projectId}:${item.name}`}>
                  <span><strong>{item.projectName}</strong><small>{new Date(item.createdAt).toLocaleString()} · {formatBytes(item.size)}</small></span>
                  <a
                    href={`/api/system/backups/${encodeURIComponent(item.projectId)}/${encodeURIComponent(item.name)}`}
                    title="下载可导入工程包"
                  ><Download size={14} /> 下载</a>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.diskPanel}>
          <HardDrive size={18} />
          <div><strong>工程磁盘</strong><span>{data ? `${formatBytes(data.disk.freeBytes)} 可用，共 ${formatBytes(data.disk.totalBytes)}` : '正在读取…'}</span></div>
          <div className={styles.diskTrack}><span style={{ width: `${diskPercent}%` }} /></div>
        </section>
        {data && <p className={styles.checkedAt}>最后检查：{new Date(data.checkedAt).toLocaleString()}</p>}
      </section>
    </main>
  );
}
