import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import {
  ChevronDown,
  Activity,
  Clock3,
  Download,
  FolderOpen,
  Grid2X2,
  History,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';

import styles from './projects.module.css';

type ProjectStatus = '草稿' | '已发布';
type CompatibilityReport = {
  level: 'compatible' | 'warning' | 'error';
  summary: { warnings: number; errors: number; missingBlobCount: number };
};

type LocalProject = {
  id: string;
  name: string;
  author: string;
  description: string;
  cover?: string;
  updatedAt: string;
  status: ProjectStatus;
  latestRelease?: string;
  latestReleaseNotes?: string;
  theme: 'sunset' | 'ocean' | 'forest' | 'violet';
  isEngineWorld?: boolean;
  compatibility?: CompatibilityReport;
};

type ExportProgress = {
  projectId: string;
  projectName: string;
  phase: 'packing' | 'downloading' | 'done' | 'error';
  percent: number;
  received: number;
  total: number;
  elapsedSeconds: number;
  filename?: string;
  message?: string;
};

type ImportProgress = {
  filename: string;
  phase: 'uploading' | 'processing' | 'done' | 'error';
  percent: number;
  sent: number;
  total: number;
  elapsedSeconds: number;
  projectName?: string;
  message?: string;
};

type PublishProgress = {
  projectName: string;
  version: string;
  phase: 'saving' | 'publishing' | 'packing' | 'downloading' | 'done' | 'error';
  percent: number;
  received: number;
  total: number;
  elapsedSeconds: number;
  filename?: string;
  message?: string;
};

type ProjectSnapshot = {
  name: string;
  reason: string;
  signature: string;
  createdAt: string;
  size: number;
};

const snapshotReasonLabels: Record<string, string> = {
  automatic: '自动保存',
  launch: '打开工程',
  export: '导出工程',
  publish: '发布作品',
  manual: '手动快照',
  'before-restore': '恢复前备份',
};

function formatBytes(value: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.BOX_DEPLOYMENT_MODE === 'play') {
    return { notFound: true };
  }
  return { props: {} };
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'全部' | ProjectStatus>('全部');
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuProject, setMenuProject] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'create' | 'delete' | 'details' | 'publish' | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectAuthor, setProjectAuthor] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectCover, setProjectCover] = useState('');
  const [dialogError, setDialogError] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const [releaseVersion, setReleaseVersion] = useState('v1.0.0');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<LocalProject | null>(
    null,
  );
  const [notice, setNotice] = useState('');
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [publishProgress, setPublishProgress] = useState<PublishProgress | null>(null);
  const [recoveryProject, setRecoveryProject] = useState<LocalProject | null>(null);
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  const refreshProjects = useCallback(async () => {
    const response = await fetch('/api/local-projects');
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '无法读取本地作品');
    setProjects(data.projects);
  }, []);

  useEffect(() => {
    refreshProjects().catch((error) => setNotice(error.message));
  }, [refreshProjects]);

  const visibleProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return projects.filter(
      (project) =>
        (status === '全部' || project.status === status) &&
        (!normalized ||
          project.name.toLowerCase().includes(normalized) ||
          project.description.toLowerCase().includes(normalized)),
    );
  }, [projects, query, status]);
  const isFiltering = Boolean(query.trim()) || status !== '全部';

  const openCreateDialog = () => {
    setSelectedProject(null);
    setProjectName('');
    setProjectAuthor('');
    setProjectDescription('');
    setProjectCover('');
    setDialogError('');
    setDialog('create');
  };

  const importProjectFile = async (file: File) => {
    if (importProgress && importProgress.phase !== 'done' && importProgress.phase !== 'error') return;
    setNotice('');
    const startedAt = Date.now();
    setImportProgress({
      filename: file.name,
      phase: 'uploading',
      percent: 0,
      sent: 0,
      total: file.size,
      elapsedSeconds: 0,
    });
    const timer = window.setInterval(() => {
      setImportProgress((current) => current && (current.phase === 'uploading' || current.phase === 'processing')
        ? { ...current, elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000) }
        : current);
    }, 500);
    try {
      const data = await new Promise<{ project?: LocalProject; message?: string }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', '/api/local-projects/import');
        request.setRequestHeader('Content-Type', 'application/octet-stream');
        request.upload.onprogress = (event) => {
          const total = event.lengthComputable ? event.total : file.size;
          const sent = event.loaded;
          setImportProgress((current) => current ? {
            ...current,
            phase: 'uploading',
            percent: total ? Math.min(70, (sent / total) * 70) : 0,
            sent,
            total,
            elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
          } : current);
        };
        request.upload.onload = () => {
          setImportProgress((current) => current ? {
            ...current,
            phase: 'processing',
            percent: 75,
            sent: file.size,
            total: file.size,
            elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
          } : current);
        };
        request.onerror = () => reject(new Error('无法连接创作端，工程包上传失败'));
        request.onabort = () => reject(new Error('导入已取消'));
        request.onload = () => {
          let result: { project?: LocalProject; message?: string } = {};
          try { result = JSON.parse(request.responseText || '{}'); } catch { /* handled below */ }
          if (request.status >= 200 && request.status < 300) resolve(result);
          else reject(new Error(result.message || `导入工程失败（HTTP ${request.status}）`));
        };
        request.send(file);
      });
      await refreshProjects();
      setImportProgress({
        filename: file.name,
        phase: 'done',
        percent: 100,
        sent: file.size,
        total: file.size,
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
        projectName: data.project?.name,
      });
      const report = data.project?.compatibility;
      setNotice(report && (report.summary.warnings || report.summary.errors)
        ? `工程已导入：${data.project?.name || file.name}；兼容性检查发现 ${report.summary.errors} 个错误、${report.summary.warnings} 个提醒`
        : `工程已导入：${data.project?.name || file.name}；兼容性检查通过`);
    } catch (error) {
      setImportProgress((current) => ({
        filename: file.name,
        phase: 'error',
        percent: current?.percent || 0,
        sent: current?.sent || 0,
        total: current?.total || file.size,
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
        message: error instanceof Error ? error.message : '导入工程失败',
      }));
    } finally {
      window.clearInterval(timer);
    }
  };

  const openDetailsDialog = (project: LocalProject) => {
    setMenuProject(null);
    setSelectedProject(project);
    setProjectName(project.name);
    setProjectAuthor(project.author || '');
    setProjectDescription(project.description || '');
    setProjectCover(project.cover || '');
    setDialogError('');
    setDialog('details');
  };

  const openPublishDialog = (project: LocalProject) => {
    setMenuProject(null);
    setSelectedProject(project);
    setReleaseVersion('v1.0.0');
    setReleaseNotes('');
    setDialogError('');
    setDialog('publish');
  };

  const openRecoveryDialog = async (project: LocalProject) => {
    setMenuProject(null);
    setRecoveryProject(project);
    setSnapshots([]);
    setSelectedSnapshot('');
    setRecoveryError('');
    setRecoveryLoading(true);
    try {
      const response = await fetch(`/api/local-projects/${encodeURIComponent(project.id)}/snapshots`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '无法读取工程恢复记录');
      const nextSnapshots = Array.isArray(data.snapshots) ? data.snapshots : [];
      setSnapshots(nextSnapshots);
      setSelectedSnapshot(nextSnapshots[0]?.name || '');
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : '无法读取工程恢复记录');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const restoreSnapshot = async () => {
    if (!recoveryProject || !selectedSnapshot || recoveryLoading) return;
    setRecoveryLoading(true);
    setRecoveryError('');
    try {
      const response = await fetch(`/api/local-projects/${encodeURIComponent(recoveryProject.id)}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: selectedSnapshot }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '工程版本恢复失败');
      setNotice(`已恢复 ${recoveryProject.name} 的历史版本；重新打开编辑器后生效`);
      setRecoveryProject(null);
      await refreshProjects();
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : '工程版本恢复失败');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const submitProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = projectName.trim();
    if ((dialog === 'create' || dialog === 'details') && !name) return;

    if (dialog === 'delete' && selectedProject) {
      await deleteProject(selectedProject);
      setDialog(null);
      return;
    }
    if (dialog === 'publish' && selectedProject) {
      const project = selectedProject;
      let publishedVersion = releaseVersion.trim();
      let compatibility: CompatibilityReport | undefined;
      const startedAt = Date.now();
      setDialog(null);
      setNotice('');
      setPublishProgress({
        projectName: project.name,
        version: publishedVersion,
        phase: 'saving',
        percent: 5,
        received: 0,
        total: 0,
        elapsedSeconds: 0,
      });
      const timer = window.setInterval(() => {
        setPublishProgress((current) => current && !['done', 'error'].includes(current.phase)
          ? {
            ...current,
            elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
            percent: current.phase === 'saving'
              ? Math.min(18, current.percent + 0.35)
              : current.phase === 'publishing'
                ? Math.min(38, current.percent + 0.25)
                : current.phase === 'packing'
                  ? Math.min(62, current.percent + 0.18)
                  : current.percent,
          }
          : current);
      }, 500);
      const publishPhaseTimer = window.setTimeout(() => {
        setPublishProgress((current) => current?.phase === 'saving'
          ? { ...current, phase: 'publishing', percent: Math.max(20, current.percent) }
          : current);
      }, 1200);
      try {
        const response = await fetch(`/api/local-projects/${project.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: publishedVersion, notes: releaseNotes }),
        });
        const data = await response.json();
        if (response.ok) {
          publishedVersion = data.release.version;
          compatibility = data.release.compatibility;
        } else if (!String(data.message || '').includes('Release already exists')) {
          throw new Error(data.message || '发布失败');
        }
        setPublishProgress((current) => current ? {
          ...current,
          phase: 'packing',
          percent: 42,
          version: publishedVersion,
        } : current);
        const packageResponse = await fetch(`/api/local-projects/${project.id}/package`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: publishedVersion }),
        });
        if (!packageResponse.ok) {
          const packageData = await packageResponse.json().catch(() => ({}));
          throw new Error(packageData.message || '导出游玩包失败');
        }
        const disposition = packageResponse.headers.get('Content-Disposition') || '';
        const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
        const filename = encodedName
          ? decodeURIComponent(encodedName)
          : `${project.name}_${project.id}_${publishedVersion}.boxplay`;
        const total = Number(packageResponse.headers.get('Content-Length') || 0);
        let received = 0;
        const chunks: Uint8Array[] = [];
        setPublishProgress((current) => current ? {
          ...current,
          phase: 'downloading',
          percent: 65,
          total,
          filename,
        } : current);
        if (packageResponse.body) {
          const reader = packageResponse.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            chunks.push(value);
            received += value.byteLength;
            setPublishProgress((current) => current ? {
              ...current,
              phase: 'downloading',
              percent: total ? 65 + Math.min(33, (received / total) * 33) : Math.min(96, 65 + chunks.length),
              received,
              total,
              elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
              filename,
            } : current);
          }
        } else {
          const value = new Uint8Array(await packageResponse.arrayBuffer());
          chunks.push(value);
          received = value.byteLength;
        }
        const blob = new Blob(chunks, { type: 'application/gzip' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setPublishProgress({
          projectName: project.name,
          version: publishedVersion,
          phase: 'done',
          percent: 100,
          received: received || blob.size,
          total: total || blob.size,
          elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
          filename,
        });
        setNotice(compatibility && (compatibility.summary.warnings || compatibility.summary.errors)
          ? `已发布并导出游玩包 ${publishedVersion}；兼容性检查发现 ${compatibility.summary.errors} 个错误、${compatibility.summary.warnings} 个提醒`
          : `已发布并导出游玩包 ${publishedVersion}；兼容性检查通过`);
        await refreshProjects();
      } catch (error) {
        setPublishProgress((current) => ({
          projectName: project.name,
          version: publishedVersion,
          phase: 'error',
          percent: current?.percent || 0,
          received: current?.received || 0,
          total: current?.total || 0,
          elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
          filename: current?.filename,
          message: error instanceof Error ? error.message : '导出游玩包失败',
        }));
      } finally {
        window.clearInterval(timer);
        window.clearTimeout(publishPhaseTimer);
      }
      return;
    } else if (dialog === 'details' && selectedProject) {
      const response = await fetch(`/api/local-projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, author: projectAuthor, description: projectDescription, cover: projectCover }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '重命名失败');
      setNotice('作品名称已保存');
    } else {
      const id = `project-${Date.now().toString(36)}`;
      const response = await fetch('/api/local-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, author: projectAuthor, description: projectDescription }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '创建作品失败');
      setNotice('作品已创建');
    }
    setDialog(null);
    await refreshProjects();
  };

  const deleteProject = async (project: LocalProject) => {
    setMenuProject(null);
    if (project.isEngineWorld) return;
    const response = await fetch(`/api/local-projects/${project.id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || '删除作品失败');
    }
    setNotice('工程及其本地发布版本已删除');
    await refreshProjects();
  };

  const openDeleteDialog = (project: LocalProject) => {
    setMenuProject(null);
    if (project.isEngineWorld) return;
    setSelectedProject(project);
    setDialogError('');
    setDialog('delete');
  };

  const copyProjectCommand = (project: LocalProject, mode: 'edit' | 'play') => {
    // Match boxes' navigation model: open the engine route immediately and
    // let its built-in Connecting flow own the whole startup lifecycle. The
    // local runtime allocation is started in parallel and deduplicated by the
    // edit library, so there is no separate loading page before the editor.
    void fetch(`/api/local-projects/${encodeURIComponent(project.id)}/runtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    }).catch(() => undefined);
    window.open(
      mode === 'edit' ? `/e/${encodeURIComponent(project.id)}` : `/p/${encodeURIComponent(project.id)}`,
      '_blank',
      'noopener',
    );
  };

  const exportProjectFile = async (project: LocalProject) => {
    if (exportProgress && exportProgress.phase !== 'done' && exportProgress.phase !== 'error') return;
    setMenuProject(null);
    setNotice('');
    const startedAt = Date.now();
    setExportProgress({
      projectId: project.id,
      projectName: project.name,
      phase: 'packing',
      percent: 8,
      received: 0,
      total: 0,
      elapsedSeconds: 0,
    });
    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setExportProgress((current) => current?.projectId === project.id && current.phase === 'packing'
        ? { ...current, elapsedSeconds, percent: Math.min(30, 8 + elapsedSeconds * 0.6) }
        : current);
    }, 500);
    try {
      const response = await fetch(`/api/local-projects/${project.id}/export`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || '导出工程失败');
      }
      const disposition = response.headers.get('Content-Disposition') || '';
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
      const filename = encodedName
        ? decodeURIComponent(encodedName)
        : `${project.name}_${project.id}.boxproject`;
      const total = Number(response.headers.get('Content-Length') || 0);
      let received = 0;
      const chunks: Uint8Array[] = [];
      setExportProgress((current) => current ? {
        ...current,
        phase: 'downloading',
        percent: 35,
        total,
        filename,
      } : current);
      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.byteLength;
            const percent = total
              ? 35 + Math.min(60, (received / total) * 60)
              : Math.min(92, 35 + chunks.length);
            setExportProgress((current) => current ? {
              ...current,
              phase: 'downloading',
              percent,
              received,
              total,
              elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
              filename,
            } : current);
          }
        }
      } else {
        const value = new Uint8Array(await response.arrayBuffer());
        chunks.push(value);
        received = value.byteLength;
      }
      const blob = new Blob(chunks, { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportProgress({
        projectId: project.id,
        projectName: project.name,
        phase: 'done',
        percent: 100,
        received: received || blob.size,
        total: total || blob.size,
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
        filename,
      });
      setNotice(`工程包已导出：${filename}`);
    } catch (error) {
      setExportProgress((current) => ({
        projectId: project.id,
        projectName: project.name,
        phase: 'error',
        percent: current?.percent || 0,
        received: current?.received || 0,
        total: current?.total || 0,
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
        message: error instanceof Error ? error.message : '导出工程失败',
      }));
    } finally {
      window.clearInterval(timer);
    }
  };

  return (
    <main className={styles.page} onClick={() => { setMenuProject(null); setFilterOpen(false); }}>
      <header className={styles.header}>
        <a className={styles.brand} href="/projects" aria-label="BOX Local Engine">
          <span className={styles.brandMark} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>BOX</span>
          <em>LOCAL</em>
        </a>
        <div className={styles.headerActions}>
          <span className={styles.localBadge}>
            <span className={styles.statusDot} />
            本地模式
          </span>
          <button className={styles.avatar} aria-label="本地创作者">L</button>
        </div>
      </header>

      <section className={styles.content} aria-labelledby="page-title">
        <div className={styles.titleRow}>
          <div>
            <h1 id="page-title">作品</h1>
          </div>
          <div className={styles.titleActions}>
            <a className={styles.importButton} href="/system">
              <Activity size={16} /> 运行状态
            </a>
            <button className={styles.importButton} disabled={Boolean(importProgress && importProgress.phase !== 'done' && importProgress.phase !== 'error')} onClick={() => importInputRef.current?.click()}>
              <Upload size={16} /> 导入工程
            </button>
            <input ref={importInputRef} className={styles.hiddenFileInput} type="file" accept=".boxproject,.tar.gz,application/gzip" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) void importProjectFile(file); }} />
            <button className={styles.createButton} onClick={openCreateDialog}>
              <Plus size={18} strokeWidth={2.5} />
              新建作品
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索作品"
              aria-label="搜索作品"
            />
          </label>
          <div className={styles.filterWrap} onClick={(event) => event.stopPropagation()}>
            <button
              className={styles.filter}
              type="button"
              onClick={() => setFilterOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={filterOpen}
            >
              <span>状态</span><strong>{status}</strong><ChevronDown size={15} aria-hidden="true" />
            </button>
            {filterOpen && <div className={styles.filterMenu} role="listbox" aria-label="作品状态">
              {(['全部', '草稿', '已发布'] as const).map((option) => <button
                key={option}
                type="button"
                role="option"
                aria-selected={status === option}
                className={status === option ? styles.selectedFilter : undefined}
                onClick={() => { setStatus(option); setFilterOpen(false); }}
              >{option}</button>)}
            </div>}
          </div>
          <span className={styles.count}>{visibleProjects.length} 个作品</span>
        </div>
        {notice && <div className={styles.notice} role="status">{notice}</div>}
        {visibleProjects.length ? (
          <div className={styles.grid}>
            {visibleProjects.map((project) => (
              <article className={styles.card} key={project.id}>
                <div className={`${styles.cover} ${styles[`cover${project.theme}`]}`}>
                  {project.cover && <img src={project.cover} alt="" />}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeading}>
                    <div>
                      <div className={styles.projectTitle}>
                        <h2>{project.name}</h2>
                        <span className={`${styles.projectStatus} ${project.status === '已发布' ? styles.published : ''}`}>{project.status}</span>
                      </div>
                      <span className={styles.projectAuthor}>作者：{project.author || '未署名'}</span>
                      <p>{project.description || '未填写简介'}</p>
                    </div>
                    <div className={styles.menuWrap} onClick={(event) => event.stopPropagation()}>
                      <button
                        className={styles.moreButton}
                        onClick={() => setMenuProject(menuProject === project.id ? null : project.id)}
                        aria-label={`${project.name} 的更多操作`}
                        aria-expanded={menuProject === project.id}
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {menuProject === project.id && (
                        <div className={styles.menu} role="menu">
                          <button role="menuitem" onClick={() => openDetailsDialog(project)}>
                            <Pencil size={15} /> 编辑信息
                          </button>
                          <button role="menuitem" onClick={() => openPublishDialog(project)}>
                            <Play size={15} /> 发布为游玩包
                          </button>
                          <button
                            role="menuitem"
                            disabled={Boolean(exportProgress && exportProgress.phase !== 'done' && exportProgress.phase !== 'error')}
                            onClick={() => void exportProjectFile(project)}
                          >
                            <Download size={15} /> 导出可编辑工程
                          </button>
                          <button role="menuitem" onClick={() => void openRecoveryDialog(project)}>
                            <History size={15} /> 恢复历史版本
                          </button>
                          <button
                            role="menuitem"
                            className={styles.deleteAction}
                            disabled={project.isEngineWorld}
                            title={project.isEngineWorld ? '默认世界不能删除' : undefined}
                            onClick={() => openDeleteDialog(project)}
                          >
                            <Trash2 size={15} /> 删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.cardFooter}>
                    <span><Clock3 size={14} /> {project.latestRelease ? `${project.latestRelease}${project.latestReleaseNotes ? ` · ${project.latestReleaseNotes}` : ''}` : project.updatedAt}</span>
                    <span className={styles.cardActions}>
                      {project.isEngineWorld && <span className={styles.defaultTag}>默认世界</span>}
                      <button onClick={() => copyProjectCommand(project, 'edit')}><Pencil size={14} /> 编辑</button>
                      <button onClick={() => copyProjectCommand(project, 'play')}><Play size={14} fill="currentColor" /> 游玩</button>
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div><FolderOpen size={26} /></div>
            <h2>{isFiltering ? '没有找到匹配作品' : '还没有作品'}</h2>
            {isFiltering && <button className={styles.secondaryButton} onClick={() => { setQuery(''); setStatus('全部'); }}>
              清除筛选
            </button>}
          </div>
        )}

      </section>

      {dialog && (
        <div className={styles.dialogBackdrop} role="presentation" onMouseDown={() => { if (!submitting) setDialog(null); }}>
          <form className={`${styles.dialog} ${dialog === 'publish' ? styles.releaseDialog : ''}`} onSubmit={(event) => {
            if (submitting) {
              event.preventDefault();
              return;
            }
            setSubmitting(true);
            submitProject(event)
              .catch((error) => setDialogError(error.message))
              .finally(() => setSubmitting(false));
          }} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.dialogIcon}><Grid2X2 size={22} /></div>
            <h2>{dialog === 'create' ? '新建作品' : dialog === 'details' ? '编辑信息' : dialog === 'delete' ? '删除作品' : '发布为游玩包'}</h2>
            {dialog === 'delete' && <p>删除后无法恢复。</p>}
            {(dialog === 'create' || dialog === 'details') && <>
              <label htmlFor="project-name">作品名称</label>
              <input id="project-name" autoFocus maxLength={40} value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="例如：我的冒险世界" />
              <label htmlFor="project-author">作者</label>
              <input id="project-author" maxLength={80} value={projectAuthor} onChange={(event) => setProjectAuthor(event.target.value)} />
              <label htmlFor="project-description">简介</label>
              <textarea id="project-description" maxLength={300} value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} />
              {dialog === 'details' && <><label htmlFor="project-cover">封面</label><input id="project-cover" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1400000) { setDialogError('封面图片不能超过 1.4MB'); return; } const reader = new FileReader(); reader.onload = () => { setProjectCover(String(reader.result)); setDialogError(''); }; reader.readAsDataURL(file); }} /></>}
            </>}
            {dialog === 'publish' && <>
              <label htmlFor="release-version">版本号</label>
              <input id="release-version" autoFocus value={releaseVersion} onChange={(event) => setReleaseVersion(event.target.value)} placeholder="v1.0.0" />
              <label htmlFor="release-notes">更新说明</label>
              <textarea id="release-notes" maxLength={500} value={releaseNotes} onChange={(event) => setReleaseNotes(event.target.value)} />
              <ReleaseFlow project={selectedProject} version={releaseVersion || 'v1.0.0'} />
            </>}
            {dialogError && <p className={styles.dialogError} role="alert">{dialogError}</p>}
            <div className={styles.dialogActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setDialog(null)}>取消</button>
              <button type="submit" className={dialog === 'delete' ? styles.deleteConfirm : styles.confirmButton} disabled={submitting || ((dialog === 'create' || dialog === 'details') ? !projectName.trim() : dialog === 'publish' ? !releaseVersion.trim() : false)}>
                {submitting ? '处理中…' : dialog === 'create' ? '创建作品' : dialog === 'details' ? '保存' : dialog === 'delete' ? '删除' : '发布为游玩包'}
              </button>
            </div>
          </form>
        </div>
      )}
      {recoveryProject && (
        <div className={styles.dialogBackdrop} role="presentation" onMouseDown={() => { if (!recoveryLoading) setRecoveryProject(null); }}>
          <section className={`${styles.dialog} ${styles.recoveryDialog}`} role="dialog" aria-modal="true" aria-labelledby="recovery-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.dialogIcon}><History size={22} /></div>
            <h2 id="recovery-title">恢复历史版本</h2>
            <p>{recoveryProject.name} · 最多保留最近 5 个有效快照。恢复前会保留当前版本。</p>
            {recoveryLoading && snapshots.length === 0 ? (
              <div className={styles.recoveryEmpty}>正在读取恢复记录…</div>
            ) : snapshots.length ? (
              <div className={styles.snapshotList} role="radiogroup" aria-label="可恢复版本">
                {snapshots.map((snapshot) => (
                  <button
                    key={snapshot.name}
                    type="button"
                    role="radio"
                    aria-checked={selectedSnapshot === snapshot.name}
                    className={selectedSnapshot === snapshot.name ? styles.snapshotSelected : undefined}
                    onClick={() => setSelectedSnapshot(snapshot.name)}
                  >
                    <span>
                      <strong>{snapshotReasonLabels[snapshot.reason] || snapshot.reason}</strong>
                      <small>{new Date(snapshot.createdAt).toLocaleString()} · {formatBytes(snapshot.size)}</small>
                    </span>
                    <code>{snapshot.signature.slice(0, 8)}</code>
                  </button>
                ))}
              </div>
            ) : !recoveryError ? (
              <div className={styles.recoveryEmpty}>该工程还没有可恢复的历史版本。打开、导出或发布后会自动生成快照。</div>
            ) : null}
            {recoveryError && <p className={styles.dialogError} role="alert">{recoveryError}</p>}
            <div className={styles.dialogActions}>
              <button type="button" className={styles.cancelButton} disabled={recoveryLoading} onClick={() => setRecoveryProject(null)}>取消</button>
              <button type="button" className={styles.confirmButton} disabled={!selectedSnapshot || recoveryLoading} onClick={() => void restoreSnapshot()}>
                <RotateCcw size={15} /> {recoveryLoading ? '正在恢复…' : '恢复所选版本'}
              </button>
            </div>
          </section>
        </div>
      )}
      {exportProgress && (
        <div className={styles.exportBackdrop} role="presentation">
          <section className={styles.exportDialog} role="dialog" aria-modal="true" aria-labelledby="export-title">
            <div className={`${styles.exportIcon} ${exportProgress.phase === 'done' ? styles.exportIconDone : exportProgress.phase === 'error' ? styles.exportIconError : ''}`}>
              <Download size={22} />
            </div>
            <h2 id="export-title">
              {exportProgress.phase === 'packing'
                ? '正在生成工程包'
                : exportProgress.phase === 'downloading'
                  ? '正在下载工程包'
                  : exportProgress.phase === 'done'
                    ? '导出完成'
                    : '导出失败'}
            </h2>
            <p className={styles.exportProjectName}>{exportProgress.projectName}</p>
            <div className={styles.exportProgressTrack} aria-label="导出进度">
              <span style={{ width: `${exportProgress.percent}%` }} />
            </div>
            <div className={styles.exportProgressMeta}>
              <strong>{Math.round(exportProgress.percent)}%</strong>
              <span>
                {exportProgress.phase === 'packing'
                  ? `正在整理、校验并压缩工程文件 · ${exportProgress.elapsedSeconds}s`
                  : exportProgress.phase === 'downloading'
                    ? `${formatBytes(exportProgress.received)} / ${exportProgress.total ? formatBytes(exportProgress.total) : '计算中'} · ${exportProgress.elapsedSeconds}s`
                    : exportProgress.phase === 'done'
                      ? `${exportProgress.filename} · ${formatBytes(exportProgress.total)}`
                      : exportProgress.message}
              </span>
            </div>
            {(exportProgress.phase === 'done' || exportProgress.phase === 'error') && (
              <button className={styles.exportCloseButton} type="button" onClick={() => setExportProgress(null)}>
                {exportProgress.phase === 'done' ? '完成' : '关闭'}
              </button>
            )}
          </section>
        </div>
      )}
      {importProgress && (
        <div className={styles.exportBackdrop} role="presentation">
          <section className={styles.exportDialog} role="dialog" aria-modal="true" aria-labelledby="import-title">
            <div className={`${styles.exportIcon} ${importProgress.phase === 'done' ? styles.exportIconDone : importProgress.phase === 'error' ? styles.exportIconError : ''}`}>
              <Upload size={22} />
            </div>
            <h2 id="import-title">
              {importProgress.phase === 'uploading'
                ? '正在上传工程包'
                : importProgress.phase === 'processing'
                  ? '正在导入工程'
                  : importProgress.phase === 'done'
                    ? '导入完成'
                    : '导入失败'}
            </h2>
            <p className={styles.exportProjectName}>{importProgress.projectName || importProgress.filename}</p>
            <div className={styles.exportProgressTrack} aria-label="导入进度">
              <span style={{ width: `${importProgress.percent}%` }} />
            </div>
            <div className={styles.exportProgressMeta}>
              <strong>{Math.round(importProgress.percent)}%</strong>
              <span>
                {importProgress.phase === 'uploading'
                  ? `${formatBytes(importProgress.sent)} / ${formatBytes(importProgress.total)} · ${importProgress.elapsedSeconds}s`
                  : importProgress.phase === 'processing'
                    ? `正在解压、校验并写入本地工程 · ${importProgress.elapsedSeconds}s`
                    : importProgress.phase === 'done'
                      ? `${formatBytes(importProgress.total)} · 用时 ${importProgress.elapsedSeconds}s`
                      : importProgress.message}
              </span>
            </div>
            {(importProgress.phase === 'done' || importProgress.phase === 'error') && (
              <button className={styles.exportCloseButton} type="button" onClick={() => setImportProgress(null)}>
                {importProgress.phase === 'done' ? '完成' : '关闭'}
              </button>
            )}
          </section>
        </div>
      )}
      {publishProgress && (
        <div className={styles.exportBackdrop} role="presentation">
          <section className={styles.exportDialog} role="dialog" aria-modal="true" aria-labelledby="publish-progress-title">
            <div className={`${styles.exportIcon} ${publishProgress.phase === 'done' ? styles.exportIconDone : publishProgress.phase === 'error' ? styles.exportIconError : ''}`}>
              <Play size={22} fill={publishProgress.phase === 'done' ? 'currentColor' : 'none'} />
            </div>
            <h2 id="publish-progress-title">
              {publishProgress.phase === 'saving'
                ? '正在保存工程'
                : publishProgress.phase === 'publishing'
                  ? '正在创建只读版本'
                  : publishProgress.phase === 'packing'
                    ? '正在生成游玩包'
                    : publishProgress.phase === 'downloading'
                      ? '正在下载游玩包'
                      : publishProgress.phase === 'done'
                        ? '游玩包导出完成'
                        : '游玩包导出失败'}
            </h2>
            <p className={styles.exportProjectName}>{publishProgress.projectName} · {publishProgress.version}</p>
            <div className={styles.exportProgressTrack} aria-label="游玩包导出进度">
              <span style={{ width: `${publishProgress.percent}%` }} />
            </div>
            <div className={styles.exportProgressMeta}>
              <strong>{Math.round(publishProgress.percent)}%</strong>
              <span>
                {publishProgress.phase === 'saving'
                  ? `正在同步编辑器中的最新修改 · ${publishProgress.elapsedSeconds}s`
                  : publishProgress.phase === 'publishing'
                    ? `正在生成不可变世界快照 · ${publishProgress.elapsedSeconds}s`
                    : publishProgress.phase === 'packing'
                      ? `正在收集运行资源并压缩 · ${publishProgress.elapsedSeconds}s`
                      : publishProgress.phase === 'downloading'
                        ? `${formatBytes(publishProgress.received)} / ${publishProgress.total ? formatBytes(publishProgress.total) : '计算中'} · ${publishProgress.elapsedSeconds}s`
                        : publishProgress.phase === 'done'
                          ? `${publishProgress.filename} · ${formatBytes(publishProgress.total)}`
                          : publishProgress.message}
              </span>
            </div>
            {(publishProgress.phase === 'done' || publishProgress.phase === 'error') && (
              <button className={styles.exportCloseButton} type="button" onClick={() => setPublishProgress(null)}>
                {publishProgress.phase === 'done' ? '完成' : '关闭'}
              </button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function ReleaseFlow({ project, version }: { project: LocalProject | null; version: string }) {
  return <div className={styles.releaseFlow} aria-label="发布产物流程">
    <div className={styles.flowSource}><small>源工程</small><strong>{project?.name || '作品'}</strong></div>
    <div className={styles.flowArrow}>→</div>
    <div className={styles.flowRelease}><small>只读版本</small><strong>{version}</strong></div>
  </div>;
}
