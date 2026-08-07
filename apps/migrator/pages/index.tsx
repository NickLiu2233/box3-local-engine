import { FormEvent, useEffect, useState } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

type Job = {
  id: string;
  status: 'running' | 'completed' | 'failed';
  stage: string;
  blobCount: number;
  totalBytes: number;
  discoveredCount: number;
  traversedCount: number;
  skippedCount: number;
  skippedBlobs: Array<{ hash: string; parentHash?: string; reason: string }>;
  activeDownloadCount: number;
  detail: string;
  currentHash?: string;
  parentHash?: string;
  source?: string;
  attempt?: number;
  error?: string;
  filename?: string;
};
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const stages = [
  ['validating', '验证权限'],
  ['backend', '读取后端'],
  ['resolving', '定位 master'],
  ['scanning', '解析引用'],
  ['downloading', '下载资源'],
  ['packaging', '生成工程包'],
] as const;
const stageRank = (stage: string) => Math.max(0, stages.findIndex(([key]) => key === stage));

export default function Home() {
  const [hash, setHash] = useState('');
  const [mapId, setMapId] = useState('');
  const [mode, setMode] = useState<'edit' | 'play'>('edit');
  const [projectName, setProjectName] = useState('');
  const [job, setJob] = useState<Job>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!job || job.status !== 'running') return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/migration?id=${encodeURIComponent(job.id)}`, { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || '无法读取迁移状态');
        setJob(body.job);
      } catch (error) {
        setJob((previous) => previous && ({ ...previous, status: 'failed', error: (error as Error).message }));
      }
    }, 700);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setJob(undefined);
    try {
      const response = await fetch('/api/migration', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hash, mapId: Number(mapId), mode, projectName }) });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `迁移失败（HTTP ${response.status}）`);
      }
      const body = await response.json();
      setJob(body.job);
    } catch (error) {
      setJob({ id: '', status: 'failed', stage: '', blobCount: 0, totalBytes: 0, discoveredCount: 0, traversedCount: 0, skippedCount: 0, skippedBlobs: [], activeDownloadCount: 0, detail: '', error: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return <><Head><title>BOX 云端工程迁移器</title><meta name="description" content="将云端工程 hash 导出为 Local Engine 创作工程" /></Head><main className={styles.main}>
    <section className={styles.panel}><p className={styles.eyebrow}>LOCAL ENGINE / MIGRATION</p><h1>把完整云端地图带回本地。</h1><p className={styles.intro}>输入云端地图 ID，迁移器会通过生产环境引擎后端解析当前工程，并封装工程组、实体、地形、UI、图库、音频、完整脚本、项目模型和皮肤。导入后无需访问云端。</p>
      <form onSubmit={submit} className={styles.form}>
        <label>云端地图 ID<input value={mapId} onChange={(event) => setMapId(event.target.value.replace(/\D/g, ''))} placeholder="例如 50259290" required inputMode="numeric" pattern="[1-9][0-9]*" /></label>
        <label>工程模式<select value={mode} onChange={(event) => setMode(event.target.value === 'play' ? 'play' : 'edit')}><option value="edit">编辑版本（推荐）</option><option value="play">当前发布版本</option></select></label>
        <label>校验 permission hash <span>可选；填写后会与后端结果核对</span><input value={hash} onChange={(event) => setHash(event.target.value.trim())} placeholder="Qm…" pattern="Qm[1-9A-HJ-NP-Za-km-z]{44}" /></label>
        <label>本地工程名称 <span>可选</span><input value={projectName} onChange={(event) => setProjectName(event.target.value)} maxLength={80} placeholder="云端迁移地图" /></label>
        <button disabled={busy || job?.status === 'running'}>{busy || job?.status === 'running' ? '正在迁移…' : '生成创作工程'}</button>
      </form>
      {job && <div className={`${styles.status} ${job.status === 'completed' ? styles.ok : ''} ${job.status === 'failed' ? styles.failed : ''}`} role="status">
        <div className={styles.statusTitle}>
          <strong>{job.status === 'failed' ? '迁移失败' : job.status === 'completed' ? (job.skippedCount ? '迁移完成（部分资源已跳过）' : '迁移完成') : job.detail}</strong>
          {job.status === 'running' && <span className={styles.pulse}>运行中</span>}
        </div>
        <div className={styles.steps}>
          {stages.map(([key, label], index) => <div key={key} className={`${styles.step} ${index <= stageRank(job.stage) ? styles.stepActive : ''} ${key === job.stage && job.status === 'running' ? styles.stepCurrent : ''}`}>
            <i>{index + 1}</i><span>{label}</span>
          </div>)}
        </div>
        <div className={styles.metrics}>
          <div><small>已发现</small><b>{job.discoveredCount || 0}</b></div>
          <div><small>已解析</small><b>{job.traversedCount || 0}</b></div>
          <div><small>已下载</small><b>{job.blobCount}</b></div>
          <div><small>已跳过</small><b>{job.skippedCount || 0}</b></div>
          <div><small>并发请求</small><b>{job.activeDownloadCount || 0}</b></div>
          <div><small>下载大小</small><b>{formatBytes(job.totalBytes)}</b></div>
        </div>
        {(job.currentHash || job.parentHash || job.source) && <div className={styles.trace}>
          {job.currentHash && <div><span>当前资源</span><code>{job.currentHash}</code></div>}
          {job.parentHash && <div><span>引用来源</span><code>{job.parentHash}</code></div>}
          {job.source && <div><span>下载节点</span><code>{job.source}{job.attempt && job.attempt > 1 ? ` · 第 ${job.attempt} 次尝试` : ''}</code></div>}
        </div>}
        {job.status === 'failed' && <span className={styles.errorText}>{job.error}</span>}
        {!!job.skippedBlobs?.length && <details className={styles.skipped} open={job.status === 'completed'}>
          <summary>{job.skippedBlobs.length} 个资源下载失败，已跳过</summary>
          <div>{job.skippedBlobs.map((item) => <article key={item.hash}>
            <code>{item.hash}</code>
            {item.parentHash && <small>引用来源：{item.parentHash}</small>}
            <small>{item.reason}</small>
          </article>)}</div>
        </details>}
        {job.status === 'completed' && <><span>{job.blobCount} 个资源 · 跳过 {job.skippedCount || 0} 个 · {formatBytes(job.totalBytes)}</span><a className={styles.download} href={`/api/download?id=${encodeURIComponent(job.id)}`}>下载 {job.filename || '.boxproject'}</a></>}
      </div>}
    </section>
    <aside className={styles.note}><strong>完整离线快照</strong><p>迁移工程当前版本、工程组数据、实体、地形、UI、图片、音频、脚本、项目模型、共享皮肤和默认皮肤。模型迁移状态和每项下载都会显示在进度中。</p><p>不会导出账号令牌、成员与协作权限、评论、分析数据或历史版本。后端令牌只保存在迁移器服务端环境变量中，不会进入工程包。</p></aside>
  </main></>;
}
