import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GetServerSideProps, NextApiRequest, NextApiResponse } from 'next';
import {
  ChevronDown,
  Clock3,
  Download,
  FolderOpen,
  Grid2X2,
  History,
  LogOut,
  Pencil,
  Play,
  Plus,
  Search,
  RotateCcw,
  Trash2,
  Upload,
  Map as MapIcon,
  Box,
} from 'lucide-react';

import styles from './projects.module.css';
import { CreatorModelLibrary } from '../../components/creator-model-library';
import { playerLoginURL, resolvePlayerServiceIdentity } from '../../server/player-service-client';
import {
  compatibilityDiagnostics,
  importResponseError,
  type DetailedImportError,
  type ImportDiagnostic,
} from '../../server/import-diagnostics';

type ProjectStatus = '草稿' | '已发布';
type MapSizePreset = 'small' | 'medium' | 'large' | 'huge';
type MapSizeChoice = MapSizePreset | 'custom';
type CompatibilityReport = {
  level: 'compatible' | 'warning' | 'error';
  summary: { warnings: number; errors: number; missingBlobCount: number };
  errors?: Array<{ code?: string; message: string }>;
  warnings?: Array<{ code?: string; message: string }>;
};

type LocalProject = {
  id: string;
  mapUuid: string;
  publicId: string;
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
  mapGroupId: string;
  mapRole: 'main' | 'submap';
  mainProjectId: string;
};

// 仅用于 BOX_UI_PREVIEW 的 Creator 首页布局验收，生产环境不会使用。
const previewProjects: LocalProject[] = [
  {
    id: 'preview-creator-arena',
    mapUuid: 'preview-creator-arena',
    publicId: 'preview-creator-arena',
    name: '竞技场：破晓行动',
    author: '测试创作者',
    description: '一张用于检查地图卡片、菜单与发布状态的示例地图。',
    cover: '/map-templates/arena-template.png',
    updatedAt: '2026-08-27T05:30:00.000Z',
    status: '已发布',
    latestRelease: 'v1.2.0',
    theme: 'sunset',
    mapGroupId: 'preview-creator-arena',
    mapRole: 'main',
    mainProjectId: 'preview-creator-arena',
  },
  {
    id: 'preview-creator-race',
    mapUuid: 'preview-creator-race',
    publicId: 'preview-creator-race',
    name: '极速赛道',
    author: '测试创作者',
    description: '用于检查草稿状态、搜索与地图操作入口。',
    cover: '/map-templates/raceway-template.png',
    updatedAt: '2026-08-26T03:15:00.000Z',
    status: '草稿',
    theme: 'ocean',
    mapGroupId: 'preview-creator-race',
    mapRole: 'main',
    mainProjectId: 'preview-creator-race',
  },
  {
    id: 'preview-creator-arena-lobby',
    mapUuid: 'preview-creator-arena-lobby',
    publicId: 'preview-creator-arena-lobby',
    name: '准备大厅',
    author: '测试创作者',
    description: '进入对局前的匹配与队伍准备区域。',
    cover: '/map-templates/blank-template.png',
    updatedAt: '2026-08-27T05:20:00.000Z',
    status: '已发布',
    latestRelease: 'v1.2.0',
    theme: 'violet',
    mapGroupId: 'preview-creator-arena',
    mapRole: 'submap',
    mainProjectId: 'preview-creator-arena',
  },
  {
    id: 'preview-creator-arena-training',
    mapUuid: 'preview-creator-arena-training',
    publicId: 'preview-creator-arena-training',
    name: '训练场',
    author: '测试创作者',
    description: '用于测试武器、移动和战斗规则。',
    cover: '/map-templates/arena-template.png',
    updatedAt: '2026-08-27T05:10:00.000Z',
    status: '草稿',
    theme: 'forest',
    mapGroupId: 'preview-creator-arena',
    mapRole: 'submap',
    mainProjectId: 'preview-creator-arena',
  },
  {
    id: 'preview-creator-arena-results',
    mapUuid: 'preview-creator-arena-results',
    publicId: 'preview-creator-arena-results',
    name: '结算大厅',
    author: '测试创作者',
    description: '展示对局结果与玩家奖励。',
    cover: '/map-templates/raceway-template.png',
    updatedAt: '2026-08-27T05:00:00.000Z',
    status: '草稿',
    theme: 'ocean',
    mapGroupId: 'preview-creator-arena',
    mapRole: 'submap',
    mainProjectId: 'preview-creator-arena',
  },
];

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
  details?: ImportDiagnostic[];
};

type ImportMode = 'independent' | 'submap';
type ProjectExportScope = 'map' | 'group';

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

type AssetDistributionConfiguration = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  cdnBaseUrl: string;
  hasSecretAccessKey: boolean;
};

const snapshotReasonLabels: Record<string, string> = {
  automatic: '自动保存',
  launch: '打开工程',
  export: '导出工程',
  publish: '发布作品',
  manual: '手动快照',
  'before-restore': '恢复前备份',
};

const mapSizeOptions: Array<{ id: MapSizePreset; label: string; dimensions: string }> = [
  { id: 'small', label: '小', dimensions: '32×32×32' },
  { id: 'medium', label: '中', dimensions: '64×128×64' },
  { id: 'large', label: '大', dimensions: '128×128×128' },
  { id: 'huge', label: '超大', dimensions: '256×64×256' },
];

function customMapSizeMessage(dimensions: [number, number, number]) {
  const [width, height, length] = dimensions;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    !Number.isInteger(length) ||
    width < 16 ||
    width > 1024 ||
    height < 16 ||
    height > 128 ||
    length < 16 ||
    length > 1024 ||
    dimensions.some((axis) => axis % 16 !== 0)
  ) {
    return { level: 'error' as const, text: '宽、长为 16–1024，高为 16–128，且均需是 16 的倍数。' };
  }
  const voxels = width * height * length;
  if (voxels > 1024 * 128 * 1024) {
    return { level: 'error' as const, text: '地图尺寸超过支持上限。请缩小地图尺寸。' };
  }
  if (voxels > 64 * 1024 * 1024) {
    return { level: 'warning' as const, text: '超大地图：首次创建和打开会很慢，建议使用 16 GB 以上内存。' };
  }
  if (voxels > 16 * 1024 * 1024) {
    return { level: 'warning' as const, text: '此地图较大，加载和编辑会占用更多内存，建议使用 8 GB 以上内存。' };
  }
  return { level: 'normal' as const, text: `约 ${(voxels / 1024 / 1024).toFixed(voxels >= 1024 * 1024 ? 1 : 2)} M 体素，适合常规本地编辑。` };
}

function defaultMapCover() {
  return '/map-templates/blank-template.png';
}

function formatBytes(value: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function formatProjectUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

type WorkCenterView = 'maps' | 'models';
type ProjectsPageProps = {
  voxaUrl: string;
  initialView: WorkCenterView;
  uiPreview: boolean;
  creator: {
    displayName: string;
    username: string;
  };
};

export const getServerSideProps: GetServerSideProps<ProjectsPageProps> = async ({ req, res, query }) => {
  if (['play', 'player-service'].includes(process.env.BOX_DEPLOYMENT_MODE || '')) {
    return { notFound: true };
  }
  // Preview fixtures are intentionally disabled outside temporary UI work;
  // configuration alone must never bypass Creator authentication.
  const uiPreview = false;
  let creator: ProjectsPageProps['creator'];
  if (uiPreview) {
    creator = { displayName: '测试创作者', username: 'creator-preview' };
  } else {
    try {
      const { identity } = await resolvePlayerServiceIdentity(
        req as NextApiRequest,
        // The response is passed through so the player-service can renew its session cookie.
        // Next's server-side response implements the same header contract as NextApiResponse.
        res as NextApiResponse,
        req.socket.remoteAddress || '',
      );
      creator = { displayName: identity.displayName, username: identity.username };
    } catch {
      return { redirect: { destination: playerLoginURL('creator'), permanent: false } };
    }
  }
  return {
    props: {
      voxaUrl: (process.env.VOXA_URL || '').replace(/\/$/, ''),
      initialView: query.view === 'models' ? 'models' : 'maps',
      uiPreview,
      creator,
    },
  };
};

export default function ProjectsPage({ voxaUrl, initialView, uiPreview, creator }: ProjectsPageProps) {
  const [activeView, setActiveView] = useState<WorkCenterView>(initialView);
  const [projects, setProjects] = useState<LocalProject[]>(() => uiPreview ? previewProjects : []);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'全部' | ProjectStatus>('全部');
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuProject, setMenuProject] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [dialog, setDialog] = useState<'create' | 'submap' | 'delete' | 'details' | 'publish' | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectPublicId, setProjectPublicId] = useState('');
  const [projectAuthor, setProjectAuthor] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectCover, setProjectCover] = useState('');
  const [mapSize, setMapSize] = useState<MapSizeChoice>('medium');
  const [customMapSize, setCustomMapSize] = useState<[number, number, number]>([64, 128, 64]);
  const [dialogError, setDialogError] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('independent');
  const [importTargetMainId, setImportTargetMainId] = useState('');
  const [releaseVersion, setReleaseVersion] = useState('v1.0.0');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [assetMode, setAssetMode] = useState<'local' | 'oss'>('local');
  const [assetConfig, setAssetConfig] = useState<AssetDistributionConfiguration>({
    endpoint: '', bucket: '', region: 'auto', accessKeyId: '', secretAccessKey: '', cdnBaseUrl: '', hasSecretAccessKey: false,
  });
  const [savingAssetConfig, setSavingAssetConfig] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<LocalProject | null>(
    null,
  );
  const [notice, setNotice] = useState('');
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportChoiceProject, setExportChoiceProject] = useState<LocalProject | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [publishProgress, setPublishProgress] = useState<PublishProgress | null>(null);
  const [recoveryProject, setRecoveryProject] = useState<LocalProject | null>(null);
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const customSizeFeedback = mapSize === 'custom' ? customMapSizeMessage(customMapSize) : null;
  const updateCustomMapSize = (index: 0 | 1 | 2, value: string) => {
    setCustomMapSize((current) => {
      const next = [...current] as [number, number, number];
      next[index] = Number(value);
      return next;
    });
  };

  const logoutCreator = async () => {
    setAccountOpen(false);
    if (uiPreview) {
      setNotice('预览模式：已模拟退出登录。');
      return;
    }
    setLoggingOut(true);
    try {
      const response = await fetch('/api/creator-logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('退出登录失败，请稍后重试');
      window.location.assign('/projects');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '退出登录失败，请稍后重试');
    } finally {
      setLoggingOut(false);
    }
  };
  const creatorName = creator.displayName || creator.username || '已登录用户';

  const switchView = (view: WorkCenterView) => {
    setActiveView(view);
    const url = view === 'models' ? '/projects?view=models' : '/projects';
    window.history.replaceState(window.history.state, '', url);
  };

  useEffect(() => {
    const handleHistory = () => {
      setActiveView(new URLSearchParams(window.location.search).get('view') === 'models' ? 'models' : 'maps');
    };
    window.addEventListener('popstate', handleHistory);
    return () => window.removeEventListener('popstate', handleHistory);
  }, []);

  const refreshProjects = useCallback(async () => {
    if (uiPreview) {
      setProjects(previewProjects);
      return;
    }
    const response = await fetch('/api/local-projects');
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '无法读取本地作品');
    setProjects(data.projects);
  }, [uiPreview]);

  useEffect(() => {
    refreshProjects().catch((error) => setNotice(error.message));
  }, [refreshProjects]);

  const visibleProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = projects.filter(
      (project) =>
        (status === '全部' || project.status === status) &&
        (!normalized ||
          project.name.toLowerCase().includes(normalized) ||
          project.description.toLowerCase().includes(normalized)),
    );
    const order = new Map(projects.map((project, index) => [project.id, index]));
    return filtered.sort((left, right) => {
      const leftGroup = left.mainProjectId || left.id;
      const rightGroup = right.mainProjectId || right.id;
      if (leftGroup !== rightGroup) {
        return (order.get(leftGroup) ?? order.get(left.id) ?? 0) -
          (order.get(rightGroup) ?? order.get(right.id) ?? 0);
      }
      if (left.mapRole !== right.mapRole) return left.mapRole === 'main' ? -1 : 1;
      return (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
    });
  }, [projects, query, status]);
  const isFiltering = Boolean(query.trim()) || status !== '全部';
  const singleMapProjects = useMemo(
    () =>
      visibleProjects.filter(
        (project) =>
          project.mapRole === 'main' &&
          !projects.some(
            (candidate) =>
              candidate.mapRole === 'submap' && candidate.mainProjectId === project.id,
          ),
      ),
    [projects, visibleProjects],
  );
  const multiMapGroups = useMemo(
    () =>
      projects
        .filter(
          (project) =>
            project.mapRole === 'main' &&
            projects.some(
              (candidate) =>
                candidate.mapRole === 'submap' && candidate.mainProjectId === project.id,
            ),
        )
        .map((main) => ({
          main,
          projects: visibleProjects.filter((project) => project.mainProjectId === main.id),
          submapCount: projects.filter(
            (project) => project.mapRole === 'submap' && project.mainProjectId === main.id,
          ).length,
        }))
        .filter((group) => group.projects.length > 0),
    [projects, visibleProjects],
  );
  const mainProjects = useMemo(
    () => projects.filter((project) => project.mapRole === 'main'),
    [projects],
  );

  const openCreateDialog = () => {
    setSelectedProject(null);
    setProjectName('');
    setProjectPublicId('');
    setProjectAuthor('');
    setProjectDescription('');
    setProjectCover('');
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

  const chooseProjectFile = (file: File) => {
    setPendingImportFile(file);
    setImportMode('independent');
    setImportTargetMainId(mainProjects[0]?.id || '');
  };

  const importProjectFile = async (
    file: File,
    mode: ImportMode,
    targetMainProjectId = '',
  ) => {
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
      const data = await new Promise<{ project?: LocalProject; message?: string; details?: ImportDiagnostic[] }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        const parameters = new URLSearchParams({ mode });
        if (mode === 'submap') parameters.set('targetMainProjectId', targetMainProjectId);
        request.open('POST', `/api/local-projects/import?${parameters.toString()}`);
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
          let result: { project?: LocalProject; message?: string; details?: ImportDiagnostic[] } = {};
          try { result = JSON.parse(request.responseText || '{}'); } catch { /* handled below */ }
          if (request.status >= 200 && request.status < 300) resolve(result);
          else reject(importResponseError(result, request.status, '导入工程失败'));
        };
        request.send(file);
      });
      await refreshProjects();
      const report = data.project?.compatibility;
      const details = compatibilityDiagnostics(report);
      setImportProgress({
        filename: file.name,
        phase: 'done',
        percent: 100,
        sent: file.size,
        total: file.size,
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
        projectName: data.project?.name,
        details,
      });
      const location = mode === 'submap'
        ? `，已成为“${mainProjects.find((project) => project.id === targetMainProjectId)?.name || targetMainProjectId}”的副地图`
        : '，原地图组主副关系已保留';
      setNotice(report && (report.summary.warnings || report.summary.errors)
        ? `工程已导入：${data.project?.name || file.name}${location}；兼容性检查发现 ${report.summary.errors} 个错误、${report.summary.warnings} 个提醒`
        : `工程已导入：${data.project?.name || file.name}${location}；兼容性检查通过`);
    } catch (error) {
      setImportProgress((current) => ({
        filename: file.name,
        phase: 'error',
        percent: current?.percent || 0,
        sent: current?.sent || 0,
        total: current?.total || file.size,
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
        message: error instanceof Error ? error.message : '导入工程失败',
        details: (error as Partial<DetailedImportError>)?.details || [],
      }));
    } finally {
      window.clearInterval(timer);
    }
  };

  const confirmProjectImport = () => {
    if (!pendingImportFile) return;
    if (importMode === 'submap' && !importTargetMainId) {
      setNotice('请先选择副地图所属的主地图');
      return;
    }
    const file = pendingImportFile;
    const mode = importMode;
    const targetMainProjectId = importTargetMainId;
    setPendingImportFile(null);
    void importProjectFile(file, mode, targetMainProjectId);
  };

  const openDetailsDialog = (project: LocalProject) => {
    setMenuProject(null);
    setSelectedProject(project);
    setProjectName(project.name);
    setProjectPublicId(project.publicId || project.id);
    setProjectAuthor(project.author || '');
    setProjectDescription(project.description || '');
    setProjectCover(project.cover || '');
    setDialogError('');
    setDialog('details');
  };

  const openPublishDialog = (project: LocalProject) => {
    setMenuProject(null);
    setSelectedProject(
      projects.find((entry) => entry.id === project.mainProjectId) || project,
    );
    setReleaseVersion('v1.0.0');
    setReleaseNotes('');
    setAssetMode('local');
    setDialogError('');
    setDialog('publish');
    void fetch('/api/local-projects/asset-distribution')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || '无法读取 OSS 配置');
        setAssetConfig((current) => ({ ...current, ...(data.configuration || {}), secretAccessKey: '' }));
      })
      .catch((error) => setDialogError(error.message));
  };

  const openExportDialog = (project: LocalProject) => {
    setMenuProject(null);
    setExportChoiceProject(project);
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
          const reports = Array.isArray(data.release.releases)
            ? data.release.releases.map((release: { compatibility?: CompatibilityReport }) => release.compatibility).filter(Boolean) as CompatibilityReport[]
            : [];
          compatibility = reports.length ? {
            level: reports.some((report) => report.level === 'error')
              ? 'error'
              : reports.some((report) => report.level === 'warning') ? 'warning' : 'compatible',
            summary: reports.reduce((summary, report) => ({
              warnings: summary.warnings + report.summary.warnings,
              errors: summary.errors + report.summary.errors,
              missingBlobCount: summary.missingBlobCount + report.summary.missingBlobCount,
            }), { warnings: 0, errors: 0, missingBlobCount: 0 }),
          } : undefined;
        } else if (!String(data.message || '').includes('Release already exists')) {
          throw new Error(data.message || '生成游戏包版本失败');
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
          ? `游戏包 ${publishedVersion} 已导出，包含 ${mapCount} 张地图；兼容性检查发现 ${compatibility.summary.errors} 个错误、${compatibility.summary.warnings} 个提醒`
          : `游戏包 ${publishedVersion} 已导出，包含 ${mapCount} 张地图；兼容性检查通过`);
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
      const response = await fetch(`/api/local-projects/${encodeURIComponent(selectedProject.mainProjectId)}/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name,
          description: projectDescription,
          mapSize: mapSize === 'custom' ? customMapSize : mapSize,
        }),
      });
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
    window.open(
      `/e/${encodeURIComponent(project.id)}`,
      '_blank',
      'noopener',
    );
  };

  const exportProjectFile = async (project: LocalProject, scope: ProjectExportScope) => {
    if (exportProgress && exportProgress.phase !== 'done' && exportProgress.phase !== 'error') return;
    setMenuProject(null);
    setExportChoiceProject(null);
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
      const response = await fetch(`/api/local-projects/${encodeURIComponent(project.id)}/export?scope=${scope}`);
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
      setNotice(`${scope === 'map' ? '本地图工程' : '地图组工程'}已导出：${filename}`);
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

  const renderProjectCard = (project: LocalProject) => {
    const mainProject = project.mapRole === 'submap'
      ? projects.find((entry) => entry.id === project.mainProjectId)
      : null;
    return <article
      className={`${styles.card} ${project.mapRole === 'submap' ? styles.submapCard : styles.mainMapCard} ${menuProject === project.id ? styles.cardMenuOpen : ''}`}
      key={project.id}
    >
      <button
        type="button"
        className={styles.cardLink}
        aria-label={`编辑地图 ${project.name}`}
        onClick={() => openProjectEditor(project)}
      />
      <div className={`${styles.cover} ${styles[`cover${project.theme}`]}`}>
        <img
          className={project.cover ? undefined : styles.templateCover}
          src={project.cover || defaultMapCover()}
          alt=""
        />
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardHeading}>
          <div>
            <div className={styles.projectTitle}>
              <h2>{project.name}</h2>
            </div>
            {mainProject && <span className={styles.projectParent}>属于 {mainProject.name}</span>}
            <span className={styles.projectAuthor}>作者：{project.author || '未署名'}</span>
            <p>{project.description || '未填写简介'}</p>
          </div>
          <div
            className={styles.menuWrap}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className={styles.moreButton}
              onClick={() => setMenuProject(menuProject === project.id ? null : project.id)}
              aria-label={`${project.name} 的更多操作`}
              aria-expanded={menuProject === project.id}
              aria-haspopup="menu"
            >
              <span className={styles.menuDots} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>
            {menuProject === project.id && (
              <div className={styles.menu} role="menu">
                <button role="menuitem" onClick={() => openDetailsDialog(project)}>
                  <Pencil size={15} /> 编辑信息
                </button>
                {project.mapRole === 'main' && (
                  <button role="menuitem" onClick={() => openSubmapDialog(project)}>
                    <Plus size={15} /> 新建副地图
                  </button>
                )}
                <button
                  role="menuitem"
                  disabled={Boolean(exportProgress && exportProgress.phase !== 'done' && exportProgress.phase !== 'error')}
                  onClick={() => openExportDialog(project)}
                >
                  <Download size={15} /> 导出
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
          <span><Clock3 size={14} /> {project.latestRelease ? `${project.latestRelease}${project.latestReleaseNotes ? ` · ${project.latestReleaseNotes}` : ''}` : formatProjectUpdatedAt(project.updatedAt)}</span>
          {project.isEngineWorld && <span className={styles.cardActions}><span className={styles.defaultTag}>默认世界</span></span>}
        </div>
      </div>
    </article>;
  };

  return (
    <main
      className={`${styles.page} boxWorkCenter creatorWorkCenter`}
      onClick={() => {
        setMenuProject(null)
        setFilterOpen(false)
        setAccountOpen(false)
      }}
    >
      <header className={styles.header}>
        <a className={styles.brand} href="/projects" aria-label="BOX Local Engine">
          <img className={styles.brandMark} src="/logo512.png" alt="" aria-hidden="true" />
          <span>BOX3 Engine</span>
        </a>
        <div className={styles.headerActions} onClick={(event) => event.stopPropagation()}>
          <div className={styles.accountMenuWrap}>
            <button
              type="button"
              className={styles.accountTrigger}
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
            >
              <span className={styles.accountName}>{creatorName}</span>
            </button>
            {accountOpen && (
              <div className={styles.accountMenu} role="menu">
                <button type="button" role="menuitem" onClick={() => void logoutCreator()} disabled={loggingOut}>
                  <LogOut size={15} /> {loggingOut ? '正在退出…' : '退出登录'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className={styles.content} aria-label="创作中心">
        <nav className={styles.workCenterTabs} aria-label="作品分类">
          <button
            type="button"
            aria-current={activeView === 'maps' ? 'page' : undefined}
            className={activeView === 'maps' ? styles.workCenterTabActive : undefined}
            onClick={() => switchView('maps')}
          >
            <MapIcon size={17} />
            <strong>地图列表</strong>
          </button>
          <button
            type="button"
            aria-current={activeView === 'models' ? 'page' : undefined}
            className={activeView === 'models' ? styles.workCenterTabActive : undefined}
            onClick={() => switchView('models')}
          >
            <Box size={17} />
            <strong>模型列表</strong>
          </button>
        </nav>

        {activeView === 'maps' ? <>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionSummary}>
            <strong>地图作品</strong>
            <span>{projects.length} 个地图</span>
          </div>
          <div className={styles.sectionActions}>
            <button className={styles.importButton} disabled={Boolean(importProgress && importProgress.phase !== 'done' && importProgress.phase !== 'error')} onClick={() => importInputRef.current?.click()}>
              <Upload size={16} /> 导入工程
            </button>
            <input ref={importInputRef} className={styles.hiddenFileInput} type="file" accept=".boxproject,.tar.gz,application/gzip" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) chooseProjectFile(file); }} />
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
        </div>
        {notice && <div className={styles.notice} role="status">{notice}</div>}
        {visibleProjects.length ? (
          <div className={styles.mapCategories}>
            {singleMapProjects.length > 0 && (
              <section className={styles.mapCategory} aria-labelledby="single-maps-title">
                <header className={styles.mapCategoryHeader}>
                  <strong id="single-maps-title">单地图</strong>
                  <span>{singleMapProjects.length} 张地图</span>
                </header>
                <div className={styles.grid}>{singleMapProjects.map(renderProjectCard)}</div>
              </section>
            )}
            {multiMapGroups.length > 0 && (
              <section className={styles.mapCategory} aria-labelledby="map-groups-title">
                <header className={styles.mapCategoryHeader}>
                  <strong id="map-groups-title">地图组</strong>
                  <span>{multiMapGroups.length} 个地图组</span>
                </header>
                <div className={styles.mapGroupList}>
                  {multiMapGroups.map((group) => {
                    const submaps = group.projects.filter((project) => project.mapRole === 'submap');
                    return (
                      <section className={styles.mapGroupOverview} key={group.main.id}>
                        <div className={styles.mapGroupOverviewHead}>
                          {renderProjectCard(group.main)}
                          <div className={styles.mapGroupSubmaps}>
                            <div className={styles.mapGroupSubmapsHeader}>
                              <strong>副地图</strong>
                              <span>{group.submapCount} 张</span>
                            </div>
                            <div className={styles.mapGroupMiniGrid}>{submaps.map(renderProjectCard)}</div>
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            )}
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
        </> : <CreatorModelLibrary voxaUrl={voxaUrl} />}
      </section>

      {pendingImportFile && (
        <div className={styles.dialogBackdrop} role="presentation" onMouseDown={() => setPendingImportFile(null)}>
          <section className={`${styles.dialog} ${styles.importChoiceDialog}`} role="dialog" aria-modal="true" aria-labelledby="import-choice-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.dialogIcon}><Upload size={22} /></div>
            <h2 id="import-choice-title">选择工程归属</h2>
            <p className={styles.importFilename}>{pendingImportFile.name}</p>
            <div className={styles.importModeList} role="radiogroup" aria-label="工程导入方式">
              <button
                type="button"
                role="radio"
                aria-checked={importMode === 'independent'}
                className={importMode === 'independent' ? styles.importModeSelected : undefined}
                onClick={() => setImportMode('independent')}
              >
                <span className={styles.importModeRadio} aria-hidden="true" />
                <span>
                  <strong>作为独立地图组</strong>
                  <small>导入工程包中的全部地图，并完整保留原来的主地图和副地图关系。</small>
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={importMode === 'submap'}
                aria-disabled={mainProjects.length === 0}
                disabled={mainProjects.length === 0}
                className={importMode === 'submap' ? styles.importModeSelected : undefined}
                onClick={() => setImportMode('submap')}
              >
                <span className={styles.importModeRadio} aria-hidden="true" />
                <span>
                  <strong>成为现有地图的副地图</strong>
                  <small>导入当初点击导出的那张地图，并使用目标地图组的共享资源库。</small>
                </span>
              </button>
            </div>
            {importMode === 'submap' && (
              <label className={styles.importTargetLabel} htmlFor="import-target-main">
                所属主地图
                <select id="import-target-main" value={importTargetMainId} onChange={(event) => setImportTargetMainId(event.target.value)}>
                  {mainProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
            )}
            {mainProjects.length === 0 && <p className={styles.importHint}>当前还没有可接收副地图的主地图，请先作为独立地图组导入。</p>}
            <div className={styles.dialogActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setPendingImportFile(null)}>取消</button>
              <button type="button" className={styles.confirmButton} disabled={importMode === 'submap' && !importTargetMainId} onClick={confirmProjectImport}>开始导入</button>
            </div>
          </section>
        </div>
      )}

      {exportChoiceProject && (
        <div className={styles.dialogBackdrop} role="presentation" onMouseDown={() => setExportChoiceProject(null)}>
          <section className={`${styles.dialog} ${styles.importChoiceDialog}`} role="dialog" aria-modal="true" aria-labelledby="export-choice-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.dialogIcon}><Download size={22} /></div>
            <h2 id="export-choice-title">导出</h2>
            <p className={styles.importFilename}>{exportChoiceProject.name}</p>
            <div className={`${styles.importModeList} ${styles.exportChoiceList}`}>
              <button type="button" onClick={() => void exportProjectFile(exportChoiceProject, 'map')}>
                <Download size={18} aria-hidden="true" />
                <span>
                  <strong>导出本地图工程</strong>
                  <small>只包含当前地图，导出为可重新导入创作端的 .boxproject 文件。</small>
                </span>
              </button>
              {exportChoiceProject.mapRole === 'main' && <>
                <button type="button" onClick={() => void exportProjectFile(exportChoiceProject, 'group')}>
                  <Grid2X2 size={18} aria-hidden="true" />
                  <span>
                    <strong>导出地图组工程</strong>
                    <small>包含主地图、全部副地图及地图组共享资源，导出为一个 .boxproject 文件。</small>
                  </span>
                </button>
                <button type="button" onClick={() => { const project = exportChoiceProject; setExportChoiceProject(null); openPublishDialog(project); }}>
                  <Play size={18} aria-hidden="true" />
                  <span>
                    <strong>导出游戏包</strong>
                    <small>生成供游玩端导入的 .boxplay 文件，包含主地图和全部副地图。</small>
                  </span>
                </button>
              </>}
            </div>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setExportChoiceProject(null)}>取消</button>
            </div>
          </section>
        </div>
      )}

      {dialog && (
        <div className={styles.dialogBackdrop} role="presentation" onMouseDown={() => { if (!submitting) setDialog(null); }}>
          <form className={`${styles.dialog} ${dialog === 'publish' ? styles.releaseDialog : ''} ${dialog === 'details' ? styles.detailsDialog : ''}`} onSubmit={(event) => {
            if (submitting) {
              event.preventDefault();
              return;
            }
            setSubmitting(true);
            submitProject(event)
              .catch((error) => setDialogError(error.message))
              .finally(() => setSubmitting(false));
          }} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.dialogHeading}>
              <div className={styles.dialogIcon}><Grid2X2 size={22} /></div>
              <div>
                <h2>{dialog === 'create' ? '新建地图组' : dialog === 'submap' ? '创建副地图' : dialog === 'details' ? '编辑信息' : dialog === 'delete' ? '删除作品' : '导出游戏包'}</h2>
                {dialog === 'details' && <p>管理地图资料、玩家访问链接与展示封面</p>}
              </div>
            </div>
            {dialog === 'delete' && <p>{selectedProject?.mapRole === 'main' ? `将删除整个地图组“${selectedProject?.name}”及其全部副地图，删除后无法恢复。` : `将删除副地图“${selectedProject?.name}”，删除后无法恢复。`}</p>}
            {(dialog === 'create' || dialog === 'submap' || dialog === 'details') && <>
                <div className={styles.dialogFields}>
                  <div className={styles.fieldGroup}>
                  <label htmlFor="project-name">作品名称</label>
                  <input id="project-name" autoFocus maxLength={40} value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="例如：我的冒险世界" />
                  </div>
                  {(dialog === 'create' || dialog === 'submap') && <>
                    <div className={styles.mapSizeField}>
                      <div className={styles.mapChoiceLabel}>
                        <label>地图尺寸</label>
                        <span>宽 × 高 × 长</span>
                      </div>
                      <div className={styles.mapSizeOptions} role="radiogroup" aria-label="地图尺寸">
                        {mapSizeOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={mapSize === option.id}
                            className={mapSize === option.id ? styles.mapChoiceSelected : undefined}
                            onClick={() => setMapSize(option.id)}
                          >
                            <strong>{option.label}</strong>
                            <small>{option.dimensions}</small>
                          </button>
                        ))}
                        <button
                          type="button"
                          role="radio"
                          aria-checked={mapSize === 'custom'}
                          className={mapSize === 'custom' ? styles.mapChoiceSelected : undefined}
                          onClick={() => setMapSize('custom')}
                        >
                          <strong>自定义</strong>
                          <small>自行设置</small>
                        </button>
                      </div>
                      {mapSize === 'custom' && customSizeFeedback && (
                        <div className={styles.customMapSize}>
                          <div className={styles.customMapSizeGrid}>
                            <label>
                              宽
                              <input type="number" min={16} max={1024} step={16} value={customMapSize[0]} onChange={(event) => updateCustomMapSize(0, event.target.value)} />
                            </label>
                            <label>
                              高
                              <input type="number" min={16} max={128} step={16} value={customMapSize[1]} onChange={(event) => updateCustomMapSize(1, event.target.value)} />
                            </label>
                            <label>
                              长
                              <input type="number" min={16} max={1024} step={16} value={customMapSize[2]} onChange={(event) => updateCustomMapSize(2, event.target.value)} />
                            </label>
                          </div>
                          <p className={`${styles.customMapSizeHint} ${styles[`customMapSizeHint${customSizeFeedback.level}`]}`}>{customSizeFeedback.text}</p>
                        </div>
                      )}
                    </div>
                  </>}
                  {dialog === 'details' && <>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="project-map-uuid">地图 ID</label>
                    <input
                      id="project-map-uuid"
                      value={selectedProject?.mapUuid || ''}
                      readOnly
                      aria-readonly="true"
                    />
                    <small className={styles.fieldHint}>永久 UUID，用于地图存档隔离，创建后不可修改</small>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="project-public-id">访问 ID</label>
                    <input
                      id="project-public-id"
                      maxLength={63}
                      spellCheck={false}
                      value={projectPublicId}
                      onChange={(event) => setProjectPublicId(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="例如：my-adventure"
                    />
                    <small className={styles.fieldHint}>玩家链接：/p/{projectPublicId || '访问-id'} · 可以修改，全部项目中必须唯一</small>
                  </div>
                </>}
                {(dialog === 'create' || (dialog === 'details' && selectedProject?.mapRole !== 'submap')) && <div className={styles.fieldGroup}>
                  <label htmlFor="project-author">作者</label>
                  <input id="project-author" maxLength={80} value={projectAuthor} onChange={(event) => setProjectAuthor(event.target.value)} placeholder="填写地图作者" />
                </div>}
                <div className={styles.fieldGroup}>
                  <label htmlFor="project-description">简介</label>
                  <textarea id="project-description" maxLength={300} value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} placeholder="简单介绍这张地图" />
                  <small className={styles.characterCount}>{projectDescription.length} / 300</small>
                </div>
                {dialog === 'details' && <div className={styles.fieldGroup}>
                  <label htmlFor="project-cover">封面</label>
                  <div className={styles.coverPickerRow}>
                    <div className={styles.coverPreview}>
                      <img
                        src={projectCover || defaultMapCover()}
                        alt={projectCover ? '当前地图封面' : '默认地图封面'}
                      />
                    </div>
                    <label className={styles.coverPicker} htmlFor="project-cover">
                      <Upload size={17} aria-hidden="true" />
                      <span>
                        <strong>{projectCover ? '更换封面' : '选择封面'}</strong>
                        <small>PNG、JPG 或 WebP，最大 1.4MB</small>
                      </span>
                    </label>
                    <input className={styles.coverFileInput} id="project-cover" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1400000) { setDialogError('封面图片不能超过 1.4MB'); return; } const reader = new FileReader(); reader.onload = () => { setProjectCover(String(reader.result)); setDialogError(''); }; reader.readAsDataURL(file); }} />
                  </div>
                </div>}
              </div>
              {dialog === 'submap' && <p>副地图拥有独立地形和实体，并归属于“{selectedProject?.name}”地图组。</p>}
            </>}
            {dialog === 'publish' && <>
              <p>主地图和全部副地图将使用同一版本号，合并为一个可一次导入游玩端的游戏包。</p>
              <label htmlFor="release-version">版本号</label>
              <input id="release-version" autoFocus value={releaseVersion} onChange={(event) => setReleaseVersion(event.target.value)} placeholder="v1.0.0" />
              <label htmlFor="release-notes">更新说明</label>
              <textarea id="release-notes" maxLength={500} value={releaseNotes} onChange={(event) => setReleaseNotes(event.target.value)} />
              <div className={styles.assetModeOptions} role="radiogroup" aria-label="资源发布方式">
                <label className={assetMode === 'local' ? styles.assetModeSelected : undefined}>
                  <input type="radio" name="asset-mode" checked={assetMode === 'local'} onChange={() => setAssetMode('local')} />
                  <span><strong>仅本地资源</strong><small>包最大，但完全离线。</small></span>
                </label>
                <label className={assetMode === 'oss' ? styles.assetModeSelected : undefined}>
                  <input type="radio" name="asset-mode" checked={assetMode === 'oss'} onChange={() => setAssetMode('oss')} />
                  <span><strong>仅引用 OSS</strong><small>包最小、加载最快；请勿删除已上传资源。</small></span>
                </label>
              </div>
              {assetMode === 'oss' && <div className={styles.assetConfigFields}>
                <small className={styles.fieldHint}>凭证只保存到本机 Creator，不会写进游玩包或发送给服主。</small>
                <div className={styles.fieldGroup}><label htmlFor="asset-cdn">资源公开地址</label><input id="asset-cdn" value={assetConfig.cdnBaseUrl} placeholder="https://cdn.example.com" onChange={(event) => setAssetConfig((value) => ({ ...value, cdnBaseUrl: event.target.value }))} /></div>
                <div className={styles.fieldGroup}><label htmlFor="asset-endpoint">S3 Endpoint</label><input id="asset-endpoint" value={assetConfig.endpoint} placeholder="https://s3.example.com" onChange={(event) => setAssetConfig((value) => ({ ...value, endpoint: event.target.value }))} /></div>
                <div className={styles.assetConfigGrid}>
                  <div className={styles.fieldGroup}><label htmlFor="asset-bucket">Bucket</label><input id="asset-bucket" value={assetConfig.bucket} onChange={(event) => setAssetConfig((value) => ({ ...value, bucket: event.target.value }))} /></div>
                  <div className={styles.fieldGroup}><label htmlFor="asset-region">Region</label><input id="asset-region" value={assetConfig.region} placeholder="auto" onChange={(event) => setAssetConfig((value) => ({ ...value, region: event.target.value }))} /></div>
                </div>
                <div className={styles.fieldGroup}><label htmlFor="asset-key">Access Key</label><input id="asset-key" value={assetConfig.accessKeyId} onChange={(event) => setAssetConfig((value) => ({ ...value, accessKeyId: event.target.value }))} /></div>
                <div className={styles.fieldGroup}><label htmlFor="asset-secret">Secret Key</label><input id="asset-secret" type="password" autoComplete="new-password" placeholder={assetConfig.hasSecretAccessKey ? '留空则沿用已保存的密钥' : ''} value={assetConfig.secretAccessKey} onChange={(event) => setAssetConfig((value) => ({ ...value, secretAccessKey: event.target.value }))} /></div>
                <div className={styles.assetConfigActions}>
                  <small>保存配置不会上传资源；只有“开始导出”才会上传本次游戏包需要的缺失资源。</small>
                  <button type="button" className={styles.assetConfigSaveButton} disabled={savingAssetConfig || submitting} onClick={() => void saveAssetConfiguration()}>
                    {savingAssetConfig ? '正在保存…' : '保存配置'}
                  </button>
                </div>
              </div>}
            </>}
            {dialogError && <p className={styles.dialogError} role="alert">{dialogError}</p>}
            <div className={styles.dialogActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setDialog(null)}>取消</button>
              <button type="submit" className={dialog === 'delete' ? styles.deleteConfirm : styles.confirmButton} disabled={submitting || ((dialog === 'create' || dialog === 'submap' || dialog === 'details') ? !projectName.trim() || (dialog === 'details' && !projectPublicId.trim()) : dialog === 'publish' ? !releaseVersion.trim() : false)}>
                {submitting ? '处理中…' : dialog === 'create' ? '创建地图组' : dialog === 'submap' ? '创建副地图' : dialog === 'details' ? '保存' : dialog === 'delete' ? '删除' : '开始导出'}
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
            {importProgress.details?.length ? (
              <div className={styles.importDiagnostics} role="log" aria-label="导入检查详情">
                <div className={styles.importDiagnosticsHeader}>
                  <strong>检查详情</strong>
                  <span>
                    {importProgress.details.filter((detail) => detail.level === 'error').length} 个错误 ·{' '}
                    {importProgress.details.filter((detail) => detail.level === 'warning').length} 个提醒
                  </span>
                </div>
                <ul>
                  {importProgress.details.map((detail, index) => (
                    <li key={`${detail.level}-${detail.code || 'detail'}-${index}`} data-level={detail.level}>
                      <span>{detail.level === 'error' ? '错误' : '提醒'}</span>
                      <p>{detail.message}</p>
                      {detail.code ? <code>{detail.code}</code> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
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
                    ? '正在创建整组只读版本'
                  : publishProgress.phase === 'packing'
                    ? '正在生成地图组游玩包'
                    : publishProgress.phase === 'downloading'
                      ? '正在下载地图组游玩包'
                      : publishProgress.phase === 'done'
                        ? '地图组游玩包导出完成'
                        : '地图组游玩包导出失败'}
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
                      ? `正在为主地图和全部副地图生成不可变快照 · ${publishProgress.elapsedSeconds}s`
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
