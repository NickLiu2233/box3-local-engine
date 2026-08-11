import type { GetServerSideProps } from 'next';
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Archive,
  ArrowLeft,
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
  services: Array<{
    id: string;
    name: string;
    state: HealthState;
    configured: boolean;
    detail: string;
    latencyMs?: number;
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
      edit: { phase: string; percent: number; message: string };
      play: { phase: string; percent: number; message: string };
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

function runtimeLabel(phase: string) {
  if (phase === 'ready') return '运行中';
  if (phase === 'idle') return '未启动';
  if (phase === 'unavailable') return '管理服务不可用';
  if (phase === 'error') return '启动失败';
  if (phase === 'starting' || phase === 'loading') return '启动中';
  return phase || '未知';
}

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.BOX_DEPLOYMENT_MODE === 'play') return { notFound: true };
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
          <article><Activity /><div><strong>{data?.projects.runtimes.filter((item) => item.edit.phase === 'ready' || item.play.phase === 'ready').length ?? '—'}</strong><span>活跃工程</span></div></article>
          <article><Archive /><div><strong>{data ? data.projects.snapshots + data.projects.backups : '—'}</strong><span>可恢复版本</span></div></article>
          <article><HardDrive /><div><strong>{data ? `${diskPercent}%` : '—'}</strong><span>磁盘已使用</span></div></article>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelTitle}><Server size={18} /><div><h2>基础服务</h2><p>未启用的可选服务不会影响整体状态。</p></div></div>
          <div className={styles.serviceGrid}>
            {data?.services.map((service) => (
              <div className={styles.service} key={service.id}>
                <Database size={18} />
                <div><strong>{service.name}</strong><span>{service.detail}{service.latencyMs !== undefined ? ` · ${service.latencyMs} ms` : ''}</span></div>
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
                <div><strong>{runtime.projectName}</strong><code>{runtime.projectId}</code></div>
                <span><small>编辑</small>{runtimeLabel(runtime.edit.phase)}</span>
                <span><small>游玩</small>{runtimeLabel(runtime.play.phase)}</span>
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
