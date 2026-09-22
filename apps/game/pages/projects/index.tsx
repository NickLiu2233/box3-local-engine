import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { GetServerSideProps, NextApiRequest, NextApiResponse } from 'next';
import { IntlProvider } from 'react-intl';
import {
  Grid2X2,
  Play,
  Map as MapIcon,
  Box,
} from 'lucide-react';
import styles from './projects.module.css';
import {
  customMapSizeMessage,
  nextReleaseVersion,
} from '../../components/project-management/project-presentation';
import zhMessages from '../../i18n/zh.json';
import { CreatorModelLibrary } from '../../components/creator-model-library';
import {
  PlayerAccount,
  type PlayerAccountIdentity,
  type PlayerProfileChanges,
} from '../../components/player-account/player-account';
import { playerLoginURL, requestPlayerServiceIp, resolvePlayerServiceIdentity } from '../../server/player-service-client';
import type {
  AssetDistributionConfiguration,
  CompatibilityReport,
  LocalProject,
  MapSizeChoice,
  ProjectsPageProps,
  PublishProgress,
  WorkCenterView,
} from '../../components/project-management/project-types';
import { ProjectCard } from '../../components/project-management/project-card';
import { ProjectCatalog } from '../../components/project-management/project-catalog';
import { ProjectProgressDialogs } from '../../components/project-management/project-progress-dialogs';
import { ProjectExportChoiceDialog, ProjectImportChoiceDialog } from '../../components/project-management/project-choice-dialogs';
import { ProjectRecoveryDialog } from '../../components/project-management/project-recovery-dialog';
import { ProjectEditorDialog, type ProjectEditorController } from '../../components/project-management/project-editor-dialog';
import { useProjectTransfer } from '../../components/project-management/use-project-transfer';
import { useProjectRecovery } from '../../components/project-management/use-project-recovery';
import { useProjectCatalog } from '../../components/project-management/use-project-catalog';

export const getServerSideProps: GetServerSideProps<ProjectsPageProps> = async ({ req, res, query }) => {
  if (['play', 'player-service'].includes(process.env.BOX_DEPLOYMENT_MODE || '')) {
    return { notFound: true };
  }
  try {
    const { identity } = await resolvePlayerServiceIdentity(
      req as NextApiRequest,
      res as NextApiResponse,
      requestPlayerServiceIp(req as NextApiRequest),
    );
    if (!identity.creatorAccess) {
      return { redirect: { destination: '/creator-access-required', permanent: false } };
    }
    return {
      props: {
        voxaUrl: (process.env.VOXA_URL || '').replace(/\/$/, ''),
        initialView: query.view === 'models' ? 'models' : 'maps',
        uiPreview: false,
        creator: {
          displayName: identity.displayName,
          username: identity.username,
          userId: identity.userId,
          boxId: identity.boxId,
          avatarSkinId: identity.avatarSkinId,
          creatorPermissions: [...identity.creatorPermissions],
        },
      },
    };
  } catch {
    return { redirect: { destination: playerLoginURL('creator'), permanent: false } };
  }
};

export default function ProjectsPage({
  voxaUrl,
  initialView,
  uiPreview,
  creator,
}: ProjectsPageProps) {
  const [activeView, setActiveView] = useState<WorkCenterView>(initialView);
  const [creatorPermissions, setCreatorPermissions] = useState<string[]>(
    creator.creatorPermissions,
  );
  const [menuProject, setMenuProject] = useState<string | null>(null);
  const [creatorIdentity, setCreatorIdentity] = useState<PlayerAccountIdentity>(creator);
  const [dialog, setDialog] = useState<
    'create' | 'submap' | 'delete' | 'details' | 'publish' | null
  >(null);
  const [projectName, setProjectName] = useState('');
  const [projectPublicId, setProjectPublicId] = useState('');
  const [projectAuthor, setProjectAuthor] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectCover, setProjectCover] = useState('');
  const [projectLoadingCover, setProjectLoadingCover] = useState('');
  const [mapSize, setMapSize] = useState<MapSizeChoice>('medium');
  const [customMapSize, setCustomMapSize] = useState<[number, number, number]>([64, 128, 64]);
  const [dialogError, setDialogError] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const [releaseVersion, setReleaseVersion] = useState('v1.0.0');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [assetMode, setAssetMode] = useState<'local' | 'oss'>('local');
  const [assetConfig, setAssetConfig] = useState<AssetDistributionConfiguration>({
    endpoint: '',
    bucket: '',
    region: 'auto',
    accessKeyId: '',
    secretAccessKey: '',
    cdnBaseUrl: '',
    hasSecretAccessKey: false,
  });
  const [savingAssetConfig, setSavingAssetConfig] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<LocalProject | null>(null);
  const [notice, setNotice] = useState('');
  const [publishProgress, setPublishProgress] = useState<PublishProgress | null>(null);
  const customSizeFeedback = mapSize === 'custom' ? customMapSizeMessage(customMapSize) : null;
  const updateCustomMapSize = (index: 0 | 1 | 2, value: string) => {
    setCustomMapSize((current) => {
      const next = [...current] as [number, number, number];
      next[index] = Number(value);
      return next;
    });
  };

  const logoutCreator = async () => {
    if (uiPreview) {
      setNotice('预览模式：已模拟退出登录。');
      return;
    }
    const response = await fetch('/api/creator-logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (!response.ok) throw new Error('退出登录失败，请稍后重试');
    window.location.assign('/projects');
  };

  const saveCreatorProfile = async (changes: PlayerProfileChanges) => {
    if (uiPreview) {
      setCreatorIdentity((current) => ({ ...current, ...changes }));
      setNotice('资料已保存');
      return;
    }
    const response = await fetch('/api/creator-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '资料保存失败');
    setCreatorIdentity((current) => ({
      ...current,
      displayName: data.player?.displayName || changes.displayName,
      avatarSkinId: data.player?.avatarSkinId || changes.avatarSkinId,
    }));
    setNotice('资料已保存');
  };

  const switchView = async (view: WorkCenterView) => {
    if (view === 'models' && !uiPreview) {
      try {
        const response = await fetch('/api/creator-permissions', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && Array.isArray(data.creatorPermissions)) {
          setCreatorPermissions(data.creatorPermissions.map(String));
        }
      } catch {
        // The model API will surface a concrete message if the service is unavailable.
      }
    }
    setActiveView(view);
    const url = view === 'models' ? '/projects?view=models' : '/projects';
    window.history.replaceState(window.history.state, '', url);
  };

  useEffect(() => {
    const handleHistory = () => {
      setActiveView(
        new URLSearchParams(window.location.search).get('view') === 'models' ? 'models' : 'maps',
      );
    };
    window.addEventListener('popstate', handleHistory);
    return () => window.removeEventListener('popstate', handleHistory);
  }, []);

  const catalog = useProjectCatalog({ uiPreview, setNotice });
  const { projects, mainProjects, refresh: refreshProjects } = catalog;
  const transfer = useProjectTransfer({
    mainProjects,
    refreshProjects,
    setNotice,
    closeProjectMenu: () => setMenuProject(null),
  });
  const {
    pendingImportFile, importMode, importTargetMainId, importProgress,
    exportProgress, exportChoiceProject, chooseProjectFile, confirmProjectImport,
    openExportDialog, exportProjectFile, setPendingImportFile, setImportMode,
    setImportTargetMainId, setImportProgress, setExportProgress, setExportChoiceProject,
  } = transfer;
  const recovery = useProjectRecovery({
    refreshProjects,
    setNotice,
    closeProjectMenu: () => setMenuProject(null),
  });

  const openCreateDialog = () => {
    setSelectedProject(null);
    setProjectName('');
    setProjectPublicId('');
    setProjectAuthor('');
    setProjectDescription('');
    setProjectCover('');
    setProjectLoadingCover('');
    setMapSize('medium');
    setCustomMapSize([64, 128, 64]);
    setDialogError('');
    setDialog('create');
  };

  const openSubmapDialog = (project: LocalProject) => {
    setMenuProject(null);
    setSelectedProject(project);
    setProjectName('');
    setProjectPublicId('');
    setProjectDescription('');
    setMapSize('medium');
    setCustomMapSize([64, 128, 64]);
    setDialogError('');
    setDialog('submap');
  };

  const openDetailsDialog = (project: LocalProject) => {
    setMenuProject(null);
    setSelectedProject(project);
    setProjectName(project.name);
    setProjectPublicId(project.publicId || project.id);
    setProjectAuthor(project.author || '');
    setProjectDescription(project.description || '');
    setProjectCover(project.cover || '');
    setProjectLoadingCover(project.loadingCover || '');
    setDialogError('');
    setDialog('details');
  };

  const openPublishDialog = (project: LocalProject) => {
    setMenuProject(null);
    const mainProject = projects.find((entry) => entry.id === project.mainProjectId) || project;
    setSelectedProject(mainProject);
    setReleaseVersion(nextReleaseVersion(mainProject.latestRelease));
    setReleaseNotes('');
    setAssetMode('local');
    setDialogError('');
    setDialog('publish');
    void fetch('/api/local-projects/asset-distribution')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || '无法读取 OSS 配置');
        setAssetConfig((current) => ({
          ...current,
          ...(data.configuration || {}),
          secretAccessKey: '',
        }));
      })
      .catch((error) => setDialogError(error.message));
  };

  const persistAssetConfiguration = async () => {
    const response = await fetch('/api/local-projects/asset-distribution', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assetConfig),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || '无法保存 OSS 资源分发设置');
    }
    setAssetConfig((current) => ({
      ...current,
      ...(data.configuration || {}),
      secretAccessKey: '',
    }));
  };

  const saveAssetConfiguration = async () => {
    if (savingAssetConfig || submitting) return;
    setSavingAssetConfig(true);
    setDialogError('');
    try {
      await persistAssetConfiguration();
      setNotice('OSS 配置已保存到本机；尚未上传任何资源。');
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : '无法保存 OSS 资源分发设置');
    } finally {
      setSavingAssetConfig(false);
    }
  };

  const submitProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = projectName.trim();
    if ((dialog === 'create' || dialog === 'submap' || dialog === 'details') && !name) return;

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
      if (assetMode === 'oss') {
        await persistAssetConfiguration();
      }
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
        setPublishProgress((current) =>
          current && !['done', 'error'].includes(current.phase)
            ? {
                ...current,
                elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
                percent:
                  current.phase === 'saving'
                    ? Math.min(18, current.percent + 0.35)
                    : current.phase === 'publishing'
                      ? Math.min(38, current.percent + 0.25)
                      : current.phase === 'packing'
                        ? Math.min(62, current.percent + 0.18)
                        : current.percent,
              }
            : current,
        );
      }, 500);
      const publishPhaseTimer = window.setTimeout(() => {
        setPublishProgress((current) =>
          current?.phase === 'saving'
            ? { ...current, phase: 'publishing', percent: Math.max(20, current.percent) }
            : current,
        );
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
          const reports = Array.isArray(data.release.releases)
            ? (data.release.releases
                .map((release: { compatibility?: CompatibilityReport }) => release.compatibility)
                .filter(Boolean) as CompatibilityReport[])
            : [];
          compatibility = reports.length
            ? {
                level: reports.some((report) => report.level === 'error')
                  ? 'error'
                  : reports.some((report) => report.level === 'warning')
                    ? 'warning'
                    : 'compatible',
                summary: reports.reduce(
                  (summary, report) => ({
                    warnings: summary.warnings + report.summary.warnings,
                    errors: summary.errors + report.summary.errors,
                    missingBlobCount: summary.missingBlobCount + report.summary.missingBlobCount,
                  }),
                  { warnings: 0, errors: 0, missingBlobCount: 0 },
                ),
              }
            : undefined;
        } else {
          throw new Error(data.message || '生成游戏包版本失败');
        }
        setPublishProgress((current) =>
          current
            ? {
                ...current,
                phase: 'packing',
                percent: 42,
                version: publishedVersion,
              }
            : current,
        );
        const packageResponse = await fetch(`/api/local-projects/${project.id}/package`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: publishedVersion, assetMode }),
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
        const mapCount = Number(packageResponse.headers.get('X-Box-Map-Count') || 1);
        let received = 0;
        const chunks: Uint8Array[] = [];
        setPublishProgress((current) =>
          current
            ? {
                ...current,
                phase: 'downloading',
                percent: 65,
                total,
                filename,
              }
            : current,
        );
        if (packageResponse.body) {
          const reader = packageResponse.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            chunks.push(value);
            received += value.byteLength;
            setPublishProgress((current) =>
              current
                ? {
                    ...current,
                    phase: 'downloading',
                    percent: total
                      ? 65 + Math.min(33, (received / total) * 33)
                      : Math.min(96, 65 + chunks.length),
                    received,
                    total,
                    elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
                    filename,
                  }
                : current,
            );
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
        setNotice(
          compatibility && (compatibility.summary.warnings || compatibility.summary.errors)
            ? `游戏包 ${publishedVersion} 已导出，包含 ${mapCount} 张地图；兼容性检查发现 ${compatibility.summary.errors} 个错误、${compatibility.summary.warnings} 个提醒`
            : `游戏包 ${publishedVersion} 已导出，包含 ${mapCount} 张地图；兼容性检查通过`,
        );
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
    } else if (dialog === 'submap' && selectedProject) {
      const id = `${selectedProject.mainProjectId}-map-${Date.now().toString(36)}`.slice(0, 63);
      const response = await fetch(
        `/api/local-projects/${encodeURIComponent(selectedProject.mainProjectId)}/maps`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            name,
            description: projectDescription,
            mapSize: mapSize === 'custom' ? customMapSize : mapSize,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '创建副地图失败');
      setNotice(`副地图“${name}”已创建`);
    } else if (dialog === 'details' && selectedProject) {
      const response = await fetch(`/api/local-projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicId: projectPublicId,
          name,
          author: selectedProject.mapRole === 'submap' ? undefined : projectAuthor,
          description: projectDescription,
          cover: projectCover,
          loadingCover: projectLoadingCover,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '重命名失败');
      setNotice(`地图信息已保存，玩家链接为 /p/${data.project.publicId}`);
    } else {
      const id = `project-${Date.now().toString(36)}`;
      const response = await fetch('/api/local-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name,
          author: projectAuthor,
          description: projectDescription,
          mapSize: mapSize === 'custom' ? customMapSize : mapSize,
        }),
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

  const openProjectEditor = (project: LocalProject) => {
    // Match boxes' navigation model: open the engine route immediately and
    // let its built-in Connecting flow own the whole startup lifecycle. The
    // local runtime allocation is started in parallel and deduplicated by the
    // edit library, so there is no separate loading page before the editor.
    void fetch(`/api/local-projects/${encodeURIComponent(project.id)}/runtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'edit' }),
    }).catch(() => undefined);
    window.open(`/e/${encodeURIComponent(project.id)}`, '_blank', 'noopener');
  };

  const renderProjectCard = (project: LocalProject) => {
    return (
      <ProjectCard
        key={project.id}
        project={project}
        projects={projects}
        menuProject={menuProject}
        exportProgress={exportProgress}
        setMenuProject={setMenuProject}
        openEditor={openProjectEditor}
        editDetails={openDetailsDialog}
        createSubmap={openSubmapDialog}
        exportProject={openExportDialog}
        recoverProject={(target) => void recovery.open(target)}
        deleteProject={openDeleteDialog}
      />
    );
  };

  const editorController: ProjectEditorController = {
    dialog,
    submitting,
    selectedProject,
    projectName,
    projectPublicId,
    projectAuthor,
    projectDescription,
    projectCover,
    projectLoadingCover,
    mapSize,
    customMapSize,
    customSizeFeedback,
    releaseVersion,
    releaseNotes,
    assetMode,
    assetConfig,
    savingAssetConfig,
    dialogError,
    setDialog,
    setSubmitting,
    setDialogError,
    setProjectName,
    setProjectPublicId,
    setProjectAuthor,
    setProjectDescription,
    setProjectCover,
    setProjectLoadingCover,
    setMapSize,
    updateCustomMapSize,
    setReleaseVersion,
    setReleaseNotes,
    setAssetMode,
    setAssetConfig,
    submitProject,
    saveAssetConfiguration,
  };

  return (
    <main
      className={`${styles.page} boxWorkCenter creatorWorkCenter`}
      onClick={() => {
        setMenuProject(null);
        catalog.setFilterOpen(false);
      }}
    >
      <header className={styles.header}>
        <a className={styles.brand} href="/projects" aria-label="BOX Local Engine">
          <img className={styles.brandMark} src="/logo512.png" alt="" aria-hidden="true" />
          <span>BOX3 Engine</span>
        </a>
        <div className={styles.headerActions} onClick={(event) => event.stopPropagation()}>
          <IntlProvider locale="zh-CN" messages={zhMessages}>
            <PlayerAccount
              identity={creatorIdentity}
              onSave={saveCreatorProfile}
              onLogout={logoutCreator}
            />
          </IntlProvider>
        </div>
      </header>

      <section className={styles.content} aria-label="创作中心">
        <nav className={styles.workCenterTabs} aria-label="作品分类">
          <button
            type="button"
            aria-current={activeView === 'maps' ? 'page' : undefined}
            className={activeView === 'maps' ? styles.workCenterTabActive : undefined}
            onClick={() => void switchView('maps')}
          >
            <MapIcon size={17} />
            <strong>地图列表</strong>
          </button>
          <button
            type="button"
            aria-current={activeView === 'models' ? 'page' : undefined}
            className={activeView === 'models' ? styles.workCenterTabActive : undefined}
            onClick={() => void switchView('models')}
          >
            <Box size={17} />
            <strong>模型列表</strong>
          </button>
        </nav>

        {activeView === 'maps' ? (
          <ProjectCatalog
            catalog={catalog}
            notice={notice}
            importProgress={importProgress}
            importInputRef={importInputRef}
            chooseProjectFile={chooseProjectFile}
            openCreateDialog={openCreateDialog}
            renderProjectCard={renderProjectCard}
          />
        ) : (
          <CreatorModelLibrary
            voxaUrl={voxaUrl}
            canManageModels={creatorPermissions.includes('models.manage')}
          />
        )}
      </section>

      <ProjectImportChoiceDialog
        file={pendingImportFile}
        mode={importMode}
        targetMainId={importTargetMainId}
        mainProjects={mainProjects}
        close={() => setPendingImportFile(null)}
        setMode={setImportMode}
        setTargetMainId={setImportTargetMainId}
        confirm={confirmProjectImport}
      />
      <ProjectExportChoiceDialog
        project={exportChoiceProject}
        close={() => setExportChoiceProject(null)}
        exportProject={(project, scope) => void exportProjectFile(project, scope)}
        publishProject={(project) => {
          setExportChoiceProject(null);
          openPublishDialog(project);
        }}
      />
      <ProjectEditorDialog controller={editorController} />
      <ProjectRecoveryDialog
        project={recovery.project}
        snapshots={recovery.snapshots}
        selectedSnapshot={recovery.selectedSnapshot}
        loading={recovery.loading}
        error={recovery.error}
        close={recovery.close}
        select={recovery.select}
        restore={() => void recovery.restore()}
      />
      <ProjectProgressDialogs
        exportProgress={exportProgress}
        importProgress={importProgress}
        publishProgress={publishProgress}
        closeExport={() => setExportProgress(null)}
        closeImport={() => setImportProgress(null)}
        closePublish={() => setPublishProgress(null)}
      />
      <footer className={styles.creatorFooter}>
        <span>
          引擎开发：<strong>深圳奇梦岛科技有限公司</strong>
        </span>
        <span>本地部署服务由服主独立运营，服主应对地图内容、用户行为与数据管理负责。</span>
      </footer>
    </main>
  );
}
