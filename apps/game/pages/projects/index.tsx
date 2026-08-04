import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import {
  ChevronDown,
  Clock3,
  Download,
  FolderOpen,
  Grid2X2,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';

import styles from './projects.module.css';

type ProjectStatus = '草稿' | '已发布';

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
};

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
  const [, setNotice] = useState('');

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
    const response = await fetch('/api/local-projects/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '导入工程失败');
    await refreshProjects();
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
      let publishedVersion = releaseVersion.trim();
      const response = await fetch(`/api/local-projects/${selectedProject.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: releaseVersion.trim(), notes: releaseNotes }),
      });
      const data = await response.json();
      if (response.ok) {
        publishedVersion = data.release.version;
      } else if (!String(data.message || '').includes('Release already exists')) {
        throw new Error(data.message || '发布失败');
      }
      const packageResponse = await fetch(`/api/local-projects/${selectedProject.id}/package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: publishedVersion }),
      });
      const packageData = await packageResponse.json();
      if (!packageResponse.ok) throw new Error(packageData.message || '导出分发包失败');
      setNotice(`已发布并导出 ${publishedVersion}`);
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

  const copyProjectCommand = async (project: LocalProject, mode: 'edit' | 'play') => {
    const tab = window.open('', '_blank');
    const response = await fetch(`/api/local-projects/${project.id}/runtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const data = await response.json();
    if (!response.ok) {
      tab?.close();
      throw new Error(data.message || '启动作品失败');
    }
    if (tab) tab.location.assign(mode === 'edit' ? data.editUrl : data.playUrl);
    else window.location.assign(mode === 'edit' ? data.editUrl : data.playUrl);
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
            <button className={styles.importButton} onClick={() => importInputRef.current?.click()}>
              <Upload size={16} /> 导入工程
            </button>
            <input ref={importInputRef} className={styles.hiddenFileInput} type="file" accept=".boxproject,.tar.gz,application/gzip" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) importProjectFile(file).catch((error) => setNotice(error.message)); }} />
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
                          <button role="menuitem" onClick={() => { window.location.assign(`/api/local-projects/${project.id}/export`); }}>
                            <Download size={15} /> 导出可编辑工程
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
