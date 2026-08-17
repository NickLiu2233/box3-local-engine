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
  startedAt: number;
  updatedAt: number;
};
type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'box-migrator-theme';
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
  const [pollWarning, setPollWarning] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    if (savedTheme === 'system' || savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
  }, []);

  function cycleTheme() {
    const nextTheme: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_KEY, nextTheme);
  }

  useEffect(() => {
    if (!job || job.status !== 'running') return;
    let stopped = false;
    let timer = 0;
    const poll = async () => {
      try {
        const response = await fetch(`/api/migration?id=${encodeURIComponent(job.id)}`, { cache: 'no-store' });
        const body = await response.json();
        if (response.status === 404) {
          if (!stopped) {
            setPollWarning('');
            setJob((previous) => previous && ({
              ...previous,
              status: 'failed',
              error: body.message || '迁移任务不存在，请重新开始',
            }));
          }
          stopped = true;
          return;
        }
        if (!response.ok) throw new Error(body.message || '无法读取迁移状态');
        if (!stopped) {
          setPollWarning('');
          setJob(body.job);
        }
      } catch (error) {
        if (!stopped) setPollWarning((error as Error).message || '状态连接暂时中断，正在重试');
      } finally {
        if (!stopped) timer = window.setTimeout(poll, 1000);
      }
    };
    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [job?.id, job?.status]);

  useEffect(() => {
    if (!job || job.status !== 'running') return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setJob(undefined);
    setPollWarning('');
    try {
      const response = await fetch('/api/migration', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hash, mapId: Number(mapId), mode, projectName }) });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `迁移失败（HTTP ${response.status}）`);
      }
      const body = await response.json();
      setJob(body.job);
    } catch (error) {
      const now = Date.now();
      setJob({ id: '', status: 'failed', stage: '', blobCount: 0, totalBytes: 0, discoveredCount: 0, traversedCount: 0, skippedCount: 0, skippedBlobs: [], activeDownloadCount: 0, detail: '', error: (error as Error).message, startedAt: now, updatedAt: now });
    } finally {
      setBusy(false);
    }
  }

  const themeLabel = theme === 'system' ? '跟随系统' : theme === 'light' ? '亮色' : '暗色';

  return <>
    <Head><title>BOX 云端工程迁移器</title><meta name="description" content="将云端工程 hash 导出为 Local Engine 创作工程" /></Head>
    <div className={styles.themeRoot} data-theme={theme}>
      <main className={styles.adminShell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <span>BOX</span>
            <div><strong>云端迁移</strong><small>MIGRATION TOOL</small></div>
          </div>
          <nav aria-label="迁移器导航">
            <div className={styles.navActive}>
              <span className={styles.navIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" /></svg></span>
              <div><strong>创建迁移任务</strong><small>从云端生成本地工程</small></div>
            </div>
          </nav>
          <div className={styles.stageSummary}>
            <span>迁移流程</span>
            <ol>{stages.map(([, label], index) => <li key={label}><i>{index + 1}</i>{label}</li>)}</ol>
          </div>
          <div className={styles.sidebarFooter}><span className={styles.healthDot} /><span><strong>迁移服务就绪</strong><small>任务在服务端安全执行</small></span></div>
        </aside>

        <section className={styles.workspace}>
          <header className={styles.header}>
            <div>
              <div className={styles.pageContext}><span>本地工具</span><b>/</b><strong>云端迁移</strong></div>
              <div className={styles.titleRow}><h1>迁移云端工程</h1><span>离线工程包</span></div>
              <p>解析云端地图的当前工程数据，生成可直接导入 Local Engine 的创作工程。</p>
            </div>
            <button className={styles.themeButton} type="button" title={`当前主题：${themeLabel}（点击切换）`} aria-label={`切换界面主题，当前为${themeLabel}`} onClick={cycleTheme}>
              {theme === 'light' ? <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
                : theme === 'dark' ? <svg viewBox="0 0 24 24"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" /></svg>
                  : <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>}
            </button>
          </header>

          <div className={styles.contentGrid}>
            <section className={styles.dataPanel}>
              <div className={styles.panelHeading}><div><span>迁移设置</span><h2>工程来源</h2><p>填写地图信息后，迁移任务将在后台持续执行。</p></div><b>01</b></div>
              <form onSubmit={submit} className={styles.form}>
                <div className={styles.formGrid}>
                  <label><span>云端地图 ID <em>必填</em></span><input value={mapId} onChange={(event) => setMapId(event.target.value.replace(/\D/g, ''))} placeholder="例如 50259290" required inputMode="numeric" pattern="[1-9][0-9]*" /></label>
                  <label><span>工程模式</span><select value={mode} onChange={(event) => setMode(event.target.value === 'play' ? 'play' : 'edit')}><option value="edit">编辑版本（推荐）</option><option value="play">当前发布版本</option></select></label>
                  <label><span>Permission Hash <small>可选，用于核对</small></span><input value={hash} onChange={(event) => setHash(event.target.value.trim())} placeholder="Qm…" pattern="Qm[1-9A-HJ-NP-Za-km-z]{44}" /></label>
                  <label><span>本地工程名称 <small>可选</small></span><input value={projectName} onChange={(event) => setProjectName(event.target.value)} maxLength={80} placeholder="云端迁移地图" /></label>
                </div>
                <div className={styles.formFooter}>
                  <span>迁移期间可以留在本页查看实时进度。</span>
                  <button className={styles.primaryButton} disabled={busy || job?.status === 'running'}>{busy || job?.status === 'running' ? '正在迁移…' : '生成创作工程'}</button>
                </div>
              </form>
            </section>

            <aside className={styles.dataPanel}>
              <div className={styles.panelHeading}><div><span>迁移说明</span><h2>工程包内容</h2><p>打包范围与安全边界。</p></div><b>02</b></div>
              <div className={styles.scopeList}>
                <article><i className={styles.scopeIncluded}>✓</i><div><strong>完整离线快照</strong><p>工程组、实体、地形、UI、图片、音频、完整脚本、项目模型、共享皮肤与默认皮肤。</p></div></article>
                <article><i>—</i><div><strong>不包含平台账号数据</strong><p>不会导出账号令牌、成员与协作权限、评论、分析数据或历史版本。</p></div></article>
                <article><i className={styles.scopeSafe}>✓</i><div><strong>令牌不会写入工程包</strong><p>后端访问令牌仅保存在迁移器服务端环境变量中。</p></div></article>
              </div>
            </aside>
          </div>

          {job && <section className={`${styles.statusPanel} ${job.status === 'completed' ? styles.ok : ''} ${job.status === 'failed' ? styles.failed : ''}`} role="status" aria-live="polite">
            <div className={styles.statusHeader}>
              <div><span>任务状态</span><h2>{job.status === 'failed' ? '迁移失败' : job.status === 'completed' ? (job.skippedCount ? '迁移完成，部分资源已跳过' : '迁移完成') : job.detail}</h2></div>
              <span className={styles.statusBadge}>{job.status === 'running' ? '运行中' : job.status === 'completed' ? '已完成' : '失败'}</span>
            </div>
            <div className={styles.statusBody}>
              {job.status === 'running' && <div className={`${styles.activity} ${clock - (job.updatedAt || job.startedAt) > 30_000 ? styles.activitySlow : ''}`}>
                <span>已运行 <b>{Math.max(0, Math.floor((clock - job.startedAt) / 1000))} 秒</b></span>
                <span>最近进度 <b>{Math.max(0, Math.floor((clock - (job.updatedAt || job.startedAt)) / 1000))} 秒前</b></span>
                {pollWarning && <span className={styles.warningText}>状态连接异常：{pollWarning}，正在自动重试</span>}
                {!pollWarning && clock - (job.updatedAt || job.startedAt) > 30_000 && <span className={styles.warningText}>当前云端节点响应较慢，任务仍在运行，不会被误删</span>}
              </div>}
              <div className={styles.steps}>
                {stages.map(([key, label], index) => <div key={key} className={`${styles.step} ${index <= stageRank(job.stage) ? styles.stepActive : ''} ${key === job.stage && job.status === 'running' ? styles.stepCurrent : ''}`}>
                  <i>{index + 1}</i><span>{label}</span>
                </div>)}
              </div>
              <div className={styles.metrics}>
                <article><small>已发现</small><b>{job.discoveredCount || 0}</b></article>
                <article><small>已解析</small><b>{job.traversedCount || 0}</b></article>
                <article><small>已下载</small><b>{job.blobCount}</b></article>
                <article><small>已跳过</small><b>{job.skippedCount || 0}</b></article>
                <article><small>并发请求</small><b>{job.activeDownloadCount || 0}</b></article>
                <article><small>下载大小</small><b>{formatBytes(job.totalBytes)}</b></article>
              </div>
              {(job.currentHash || job.parentHash || job.source) && <div className={styles.trace}>
                {job.currentHash && <div><span>当前资源</span><code>{job.currentHash}</code></div>}
                {job.parentHash && <div><span>引用来源</span><code>{job.parentHash}</code></div>}
                {job.source && <div><span>下载节点</span><code>{job.source}{job.attempt && job.attempt > 1 ? ` · 第 ${job.attempt} 次尝试` : ''}</code></div>}
              </div>}
              {job.status === 'failed' && <p className={styles.errorText}>{job.error}</p>}
              {!!job.skippedBlobs?.length && <details className={styles.skipped} open={job.status === 'completed'}>
                <summary>{job.skippedBlobs.length} 个资源下载失败，已跳过</summary>
                <div>{job.skippedBlobs.map((item) => <article key={item.hash}>
                  <code>{item.hash}</code>
                  {item.parentHash && <small>引用来源：{item.parentHash}</small>}
                  <small>{item.reason}</small>
                </article>)}</div>
              </details>}
              {job.status === 'completed' && <div className={styles.completeActions}><span>{job.blobCount} 个资源 · 跳过 {job.skippedCount || 0} 个 · {formatBytes(job.totalBytes)}</span><a className={styles.download} href={`/api/download?id=${encodeURIComponent(job.id)}`}>下载 {job.filename || '.boxproject'}</a></div>}
            </div>
          </section>}
        </section>
      </main>
    </div>
  </>;
}
