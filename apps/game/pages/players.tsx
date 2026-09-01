import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Activity, AlertTriangle, Ban, ChevronRight, CircleUserRound, Clock3, Copy,
  Database, Download, FileClock, KeyRound, Laptop, LayoutDashboard, Link2,
  LogOut, Monitor, Moon, MoreHorizontal, Pencil, RefreshCw, Search, ShieldCheck,
  Sun, Tags, Trash2, UserCog, UserPlus, Users, X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PLAYER_ADMIN_CAPABILITY_META,
  PLAYER_ADMIN_GRANTABLE_CAPABILITIES,
  type PlayerAdminCapability,
} from '../shared/player-admin-policy';
import { describePlayerAdminAuditAction } from '../shared/player-admin-audit-catalog';
import {
  CREATOR_CAPABILITY_META,
  CREATOR_CAPABILITIES,
  type CreatorCapability,
} from '../shared/creator-policy';
import styles from './player-management.module.css';

const THEME_KEY = 'box-player-admin-theme';

type Player = {
  subjectId: string;
  userId: string;
  username: string;
  boxId: string;
  displayName: string;
  guest: boolean;
  userKey: string;
  role: 'player' | 'moderator' | 'admin';
  status: 'active' | 'banned';
  createdAt?: string;
  lastSeenAt?: string;
  registeredAt?: string;
  updatedAt?: string;
  firstSeenIp: string;
  lastSeenIp: string;
  registrationIp: string;
  lastLoginAt?: string;
  lastLoginIp: string;
  loginCount: number;
  activeSessionCount: number;
  adminNote: string;
  tags: string[];
  banReason: string;
  bannedAt?: string;
  bannedUntil?: string;
  adminPermissions: PlayerAdminCapability[];
  creatorAccess: boolean;
  creatorPermissions: CreatorCapability[];
};

type PlayerDetails = {
  player: Player;
  sessions: Array<{
    sessionId: string;
    createdAt: string;
    lastSeenAt: string;
    expiresAt: string;
    createdIp: string;
    lastSeenIp: string;
    userAgent: string;
    deviceHash: string;
    deviceId: string;
  }>;
  loginHistory: Array<{
    createdAt: string;
    ip: string;
    userAgent: string;
    deviceHash: string;
    deviceId: string;
  }>;
  adminHistory: Array<{
    id: string; action: string; actor: string; actorDisplayName: string;
    details: Record<string, unknown>; createdAt: string;
  }>;
  relatedAccounts: Array<{
    subjectId: string; displayName: string; username: string;
    sharedIp: string; lastSeenAt: string;
  }>;
  identityBans: Array<{
    id: string; kind: 'ip' | 'device'; displayValue: string; reason: string;
    bannedAt: string; bannedUntil?: string;
  }>;
};

type AdminOverview = {
  totals: {
    identities: number; users: number; guests: number; banned: number;
    activeSessions: number; activeLast24Hours: number; newLast7Days: number;
    loginsLast24Hours: number; uniqueLoginIpsLast7Days: number;
    failedLoginsLast24Hours: number;
    moderators: number; admins: number;
  };
  recentLogins: Array<{
    subjectId: string; displayName: string; username: string;
    ip: string; userAgent: string; createdAt: string;
  }>;
  recentAudits: Array<{
    id: string; action: string; subjectId: string;
    details: Record<string, unknown>; createdAt: string;
  }>;
  security: {
    topFailedIps: Array<{ ip: string; attempts: number; lastAttemptAt: string }>;
    sharedLoginIps: Array<{ ip: string; accounts: number; lastSeenAt: string }>;
    temporaryBansEndingSoon: number;
    expiredSessions: number;
  };
};

type AdminSection = 'overview' | 'players' | 'sessions' | 'bans' | 'roles' | 'audit';
type PlayerDetailTab = 'profile' | 'identity' | 'boxId' | 'sessions' | 'logins' | 'ban' | 'password' | 'related' | 'history' | 'danger';
type ConsoleTheme = 'system' | 'light' | 'dark';
type AdminActor = {
  displayName: string;
  role: 'moderator' | 'admin' | 'owner';
  subjectId?: string;
  credential: 'owner-session' | 'account';
  permissions: PlayerAdminCapability[];
};
type AdminAccount = {
  id: string;
  username: string;
  displayName: string;
  role: 'moderator' | 'admin';
  permissions: PlayerAdminCapability[];
  permissionGroupId?: string;
  permissionGroupName?: string;
  status: 'active' | 'disabled';
  lastLoginAt?: string;
  lastLoginIp?: string;
  loginCount?: number;
};
type PermissionGroup = {
  id: string;
  name: string;
  permissions: PlayerAdminCapability[];
  adminCount: number;
};
type AdminActivity = {
  id: string; kind: 'login' | 'admin'; action: string; actor: string;
  actorDisplayName: string; subjectId: string; displayName: string;
  username: string; ip: string; userAgent: string;
  details: Record<string, unknown>; createdAt: string;
};

type CreateUserForm = {
  username: string;
  displayName: string;
  password: string;
  boxId: string;
  tags: string;
  adminNote: string;
};

const emptyCreateUser: CreateUserForm = {
  username: '', displayName: '', password: '',
  boxId: '', tags: '', adminNote: '',
};

const emptyAdminAccount = {
  username: '',
  displayName: '',
  password: '',
  role: 'moderator' as AdminAccount['role'],
  permissionGroupId: '',
  status: 'active' as AdminAccount['status'],
};

const emptyPermissionGroup = {
  name: '',
  permissions: [] as PlayerAdminCapability[],
};

type PlayersPageProps = {
  returnUrl: string;
  returnLabel: string;
  initialSection: AdminSection;
};

const sectionMeta: Record<AdminSection, { title: string }> = {
  overview: { title: '运营概览' },
  players: { title: '玩家目录' },
  sessions: { title: '在线与会话' },
  bans: { title: '封禁管理' },
  roles: { title: '管理账号' },
  audit: { title: '安全与审计' },
};

const detailTabMeta: Record<PlayerDetailTab, { title: string }> = {
  profile: { title: '基本资料' },
  identity: { title: '身份档案' },
  boxId: { title: '神岛 ID' },
  sessions: { title: '会话设备' },
  logins: { title: '登录记录' },
  ban: { title: '封禁管理' },
  password: { title: '密码重置' },
  related: { title: '关联线索' },
  history: { title: '管理记录' },
  danger: { title: '删除身份' },
};

function parseSection(value: unknown): AdminSection {
  const section = Array.isArray(value) ? value[0] : value;
  return ['overview', 'players', 'sessions', 'bans', 'roles', 'audit'].includes(String(section))
    ? section as AdminSection
    : 'overview';
}

export const getServerSideProps: GetServerSideProps<PlayersPageProps> = async ({
  query,
  res,
}) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  const mode = process.env.BOX_DEPLOYMENT_MODE;
  if (mode !== 'player-service') {
    if (mode === 'play') return { notFound: true };
    const base = (process.env.BOX_PLAYER_SERVICE_PUBLIC_URL || 'http://127.0.0.1:3213').replace(/\/$/, '');
    return { redirect: { destination: `${base}/players?from=creator`, permanent: false } };
  }
  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  const creator = from === 'creator';
  return {
    props: {
      returnUrl: creator
        ? process.env.BOX_CREATOR_PUBLIC_URL || 'http://127.0.0.1:3002'
        : '',
      returnLabel: creator ? '返回创作端' : '',
      initialSection: parseSection(query.view),
    },
  };
};

function formatDate(value?: string) {
  if (!value) return '历史数据未记录';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value));
}

function displayIp(value?: string) {
  return value || '历史数据未记录';
}

function cookieValue(name: string) {
  if (typeof document === 'undefined') return '';
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie.split('; ').find((entry) => entry.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : '';
}

function adminHeaders(json = false): Record<string, string> {
  const csrf = cookieValue('box_local_admin_csrf');
  return {
    ...(csrf ? { 'X-Box-Admin-Csrf': csrf } : {}),
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function dateTimeLocalValue(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function temporaryBanUntil(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function playerBanMode(player: Player): 'active' | 'temporary' | 'permanent' {
  if (player.status !== 'banned') return 'active';
  return player.bannedUntil ? 'temporary' : 'permanent';
}

function deviceLabel(userAgent?: string) {
  if (!userAgent) return '未知设备';
  const system = /iPhone|iPad/.test(userAgent) ? 'iOS'
    : /Android/.test(userAgent) ? 'Android'
      : /Windows/.test(userAgent) ? 'Windows'
        : /Macintosh|Mac OS X/.test(userAgent) ? 'macOS'
          : /Linux/.test(userAgent) ? 'Linux' : '其他系统';
  const browser = /Edg\//.test(userAgent) ? 'Edge'
    : /Firefox\//.test(userAgent) ? 'Firefox'
      : /Chrome\//.test(userAgent) ? 'Chrome'
        : /Safari\//.test(userAgent) ? 'Safari' : '未知浏览器';
  return `${system} · ${browser}`;
}

function playerStatusLabel(player: Player) {
  if (player.status !== 'banned') return '正常';
  return player.bannedUntil ? `临时封禁` : '永久封禁';
}

function PlayerAvatar({ player, large = false }: { player: Player; large?: boolean }) {
  return <span className={large ? styles.largeAvatar : styles.avatar}>{player.displayName.slice(0, 1).toUpperCase()}</span>;
}

function PlayerName({ player }: { player: Player }) {
  return <div className={styles.playerCell}><PlayerAvatar player={player} /><span><strong>{player.displayName}</strong><small>{player.username ? `@${player.username}` : player.userKey}</small></span></div>;
}

function StatusBadge({ player }: { player: Player }) {
  return <span className={player.status === 'banned' ? styles.badStatus : styles.goodStatus}>{playerStatusLabel(player)}</span>;
}

function PlayerAdminBrand() {
  return <div className={styles.brand}><span>BOX</span><div><strong>玩家管理</strong><small>PLAYER SERVICE</small></div></div>;
}

function AdminDialogHeader({
  title,
  closeLabel,
  disabled,
}: {
  title: string;
  closeLabel: string;
  disabled: boolean;
}) {
  return (
    <header className={styles.dialogHeader}>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Close asChild>
        <button type="button" className={styles.iconButton} aria-label={closeLabel} disabled={disabled}><X size={16} /></button>
      </Dialog.Close>
    </header>
  );
}

export default function PlayersPage({ returnUrl, returnLabel, initialSection }: PlayersPageProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [section, setSection] = useState<AdminSection>(initialSection);
  const [detailTab, setDetailTab] = useState<PlayerDetailTab>('profile');
  const [selected, setSelected] = useState<Player | null>(null);
  const [details, setDetails] = useState<PlayerDetails | null>(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [actor, setActor] = useState<AdminActor | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('loading');
  const [loginOpen, setLoginOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUser, setCreateUser] = useState<CreateUserForm>(emptyCreateUser);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [ownerToken, setOwnerToken] = useState('');
  const [ownerRecoveryOpen, setOwnerRecoveryOpen] = useState(false);
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [createAdmin, setCreateAdmin] = useState(emptyAdminAccount);
  const [editingAdminId, setEditingAdminId] = useState('');
  const [permissionGroupOpen, setPermissionGroupOpen] = useState(false);
  const [editingPermissionGroupId, setEditingPermissionGroupId] = useState('');
  const [permissionGroupForm, setPermissionGroupForm] = useState(emptyPermissionGroup);
  const [identityFilter, setIdentityFilter] = useState<'all' | 'user' | 'banned'>(
    initialSection === 'bans' ? 'banned' : ['sessions', 'roles'].includes(initialSection) ? 'user' : 'all',
  );
  const [roleFilter, setRoleFilter] = useState<'all' | Player['role']>('all');
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online' | 'offline'>(
    initialSection === 'sessions' ? 'online' : 'all',
  );
  const [sort, setSort] = useState<'lastSeen' | 'registered' | 'displayName' | 'loginCount'>('lastSeen');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [activityKind, setActivityKind] = useState<'all' | 'login' | 'admin'>('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [newPassword, setNewPassword] = useState('');
  // Creator and Play use the charcoal BOX3 surface by default. Keep the same
  // default here while preserving the user's existing theme selection.
  const [theme, setTheme] = useState<ConsoleTheme>('dark');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT';
      if (event.key === '/' && !typing && ['players', 'sessions', 'bans'].includes(section)) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        if (permissionGroupOpen && !busy.startsWith('permission-group')) {
          setPermissionGroupOpen(false);
        } else if (createAdminOpen && busy !== 'admin-save') {
          setCreateAdminOpen(false);
        } else if (createUserOpen && busy !== 'create-user') {
          setCreateUserOpen(false);
        } else if (selected) {
          setSelected(null);
          setDetails(null);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, createAdminOpen, createUserOpen, permissionGroupOpen, section, selected]);

  function cycleTheme() {
    const next: ConsoleTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
  }

  const navigateSection = useCallback((next: AdminSection) => {
    setSection(next);
    setPage(1);
    setSelectedIds([]);
    if (next === 'players') {
      setIdentityFilter('all');
      setRoleFilter('all');
      setOnlineFilter('all');
    } else if (next === 'sessions') {
      setIdentityFilter('user');
      setRoleFilter('all');
      setOnlineFilter('online');
    } else if (next === 'bans') {
      setIdentityFilter('banned');
      setRoleFilter('all');
      setOnlineFilter('all');
    } else if (next === 'roles') {
      setIdentityFilter('user');
      setRoleFilter('all');
      setOnlineFilter('all');
    }
    const query = { ...router.query };
    if (next === 'overview') delete query.view;
    else query.view = next;
    void router.replace({ pathname: '/players', query }, undefined, { shallow: true });
  }, [router]);

  useEffect(() => {
    if (!router.isReady) return;
    const next = parseSection(router.query.view);
    if (next === section) return;
    setSection(next);
    setPage(1);
    setSelectedIds([]);
    setIdentityFilter(next === 'bans' ? 'banned' : ['sessions', 'roles'].includes(next) ? 'user' : 'all');
    setOnlineFilter(next === 'sessions' ? 'online' : 'all');
    setRoleFilter('all');
  }, [router.isReady, router.query.view, section]);

  const load = useCallback(async () => {
    setBusy('loading');
    const verifyResponse = await fetch('/api/play-admin/verify', { cache: 'no-store' });
    const verifyData = await verifyResponse.json().catch(() => ({}));
    if (!verifyResponse.ok) {
      setActor(null);
      setBusy('');
      setLoginOpen(true);
      throw new Error(verifyData.message || '请登录独立的玩家管理账号');
    }
    const verifiedActor = verifyData.actor || null;
    setActor(verifiedActor);
    setLoginOpen(false);
    const [playersResponse, overviewResponse] = await Promise.all([
      fetch(`/api/play-admin/players?${new URLSearchParams({
        search: appliedSearch,
        page: String(page),
        pageSize: '30',
        identity: identityFilter,
        role: roleFilter,
        online: onlineFilter,
        sort,
      })}`, { cache: 'no-store' }),
      fetch('/api/play-admin/players/overview', { cache: 'no-store' }),
    ]);
    const [playersData, overviewData] = await Promise.all([
      playersResponse.json(), overviewResponse.json(),
    ]);
    if (!playersResponse.ok || !overviewResponse.ok) {
      if (playersResponse.status === 401 || overviewResponse.status === 401) {
        setActor(null);
        setLoginOpen(true);
      }
      if (!playersResponse.ok) throw new Error(playersData.message || '无法读取玩家');
      throw new Error(overviewData.message || '无法读取玩家统计');
    }
    setPlayers(playersData.players);
    setTotal(playersData.total || 0);
    setPage(playersData.page || 1);
    setTotalPages(playersData.totalPages || 1);
    setOverview(overviewData);
    setBusy('');
  }, [appliedSearch, identityFilter, onlineFilter, page, roleFilter, sort]);

  async function loginAdmin() {
    if (!adminUsername || !adminPassword || busy === 'verify') return;
    setBusy('verify');
    setNotice('');
    try {
      const response = await fetch('/api/play-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '管理员登录失败');
      setActor(data.actor || null);
      setAdminPassword('');
      setLoginOpen(false);
      setBusy('');
      await load();
    } catch (error) {
      setBusy('');
      setNotice((error as Error).message);
    }
  }

  async function exchangeOwnerSession() {
    if (!ownerToken || busy === 'verify') return;
    setBusy('verify');
    setNotice('');
    try {
      const response = await fetch('/api/play-admin/owner-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '服主密钥验证失败');
      setOwnerToken('');
      setOwnerRecoveryOpen(false);
      setLoginOpen(false);
      await load();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function logoutAdmin() {
    setBusy('logout');
    setNotice('');
    try {
      const response = await fetch('/api/play-admin/logout', {
        method: 'POST',
        headers: adminHeaders(true),
        body: '{}',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 401) {
        throw new Error(data.message || '退出登录失败，请稍后重试');
      }
      setActor(null);
      setAdmins([]);
      setPermissionGroups([]);
      setLoginOpen(true);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  useEffect(() => {
    load().catch((error) => {
      setBusy('');
      setNotice(error.message);
    });
  }, [load]);

  const loadAdmins = useCallback(async () => {
    if (section !== 'roles' || actor?.role !== 'owner') return;
    const [adminsResponse, groupsResponse] = await Promise.all([
      fetch('/api/play-admin/admins', { cache: 'no-store' }),
      fetch('/api/play-admin/permission-groups', { cache: 'no-store' }),
    ]);
    const [adminsData, groupsData] = await Promise.all([
      adminsResponse.json().catch(() => ({})),
      groupsResponse.json().catch(() => ({})),
    ]);
    if (!adminsResponse.ok) throw new Error(adminsData.message || '无法读取管理账号');
    if (!groupsResponse.ok) throw new Error(groupsData.message || '无法读取权限组');
    setAdmins(adminsData.admins || []);
    setPermissionGroups(groupsData.groups || []);
  }, [actor?.role, section]);

  useEffect(() => {
    loadAdmins().catch((error) => setNotice(error.message));
  }, [loadAdmins]);

  function openAdminAccount(admin?: AdminAccount) {
    setEditingAdminId(admin?.id || '');
    setCreateAdmin(
      admin
        ? {
            username: admin.username,
            displayName: admin.displayName,
            password: '',
            role: admin.role,
            permissionGroupId: admin.permissionGroupId || '',
            status: admin.status,
          }
        : emptyAdminAccount,
    );
    setNotice('');
    setCreateAdminOpen(true);
  }

  async function submitAdminAccount() {
    const editing = Boolean(editingAdminId);
    if (
      !ownerAccess ||
      busy ||
      !createAdmin.username ||
      !createAdmin.displayName ||
      (!editing && createAdmin.password.length < 12) ||
      (editing && createAdmin.password.length > 0 && createAdmin.password.length < 12)
    ) return;
    setBusy('admin-save');
    setNotice('');
    try {
      const payload = editing
        ? {
            displayName: createAdmin.displayName,
            role: createAdmin.role,
            permissionGroupId: createAdmin.role === 'moderator'
              ? createAdmin.permissionGroupId
              : '',
            status: createAdmin.status,
            ...(createAdmin.password ? { password: createAdmin.password } : {}),
          }
        : createAdmin;
      const response = await fetch(
        editing ? `/api/play-admin/admins/${editingAdminId}` : '/api/play-admin/admins',
        {
        method: editing ? 'PATCH' : 'POST',
        headers: adminHeaders(true),
        body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `管理账号${editing ? '更新' : '创建'}失败`);
      setCreateAdminOpen(false);
      setEditingAdminId('');
      setCreateAdmin(emptyAdminAccount);
      await loadAdmins();
      setNotice(`管理账号“${data.admin.displayName}”已${editing ? '更新' : '创建'}`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  function openPermissionGroup(group?: PermissionGroup) {
    setEditingPermissionGroupId(group?.id || '');
    setPermissionGroupForm(
      group
        ? { name: group.name, permissions: [...group.permissions] }
        : emptyPermissionGroup,
    );
    setPermissionGroupOpen(true);
    setNotice('');
  }

  async function savePermissionGroup() {
    if (!ownerAccess || busy || !permissionGroupForm.name.trim()) return;
    const editing = Boolean(editingPermissionGroupId);
    setBusy('permission-group-save');
    setNotice('');
    try {
      const response = await fetch(
        editing
          ? `/api/play-admin/permission-groups/${editingPermissionGroupId}`
          : '/api/play-admin/permission-groups',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: adminHeaders(true),
          body: JSON.stringify(permissionGroupForm),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '权限组保存失败');
      setPermissionGroupOpen(false);
      setEditingPermissionGroupId('');
      setPermissionGroupForm(emptyPermissionGroup);
      await loadAdmins();
      setNotice(`权限组“${data.group.name}”已保存`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function removePermissionGroup(group: PermissionGroup) {
    if (
      !ownerAccess ||
      busy ||
      !confirm(`确定删除权限组“${group.name}”吗？已分配管理员将只保留查看权限。`)
    ) return;
    setBusy(`permission-group:${group.id}`);
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/permission-groups/${group.id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '权限组删除失败');
      await loadAdmins();
      setNotice(`权限组“${group.name}”已删除`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function removeAdminAccount(admin: AdminAccount) {
    if (!ownerAccess || busy || !confirm(`确定删除管理账号“${admin.displayName}”吗？`)) return;
    setBusy(`admin:${admin.id}`);
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/admins/${admin.id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '管理账号删除失败');
      await loadAdmins();
      setNotice(`管理账号“${admin.displayName}”已删除`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  const loadActivity = useCallback(async () => {
    if (!actor || section !== 'audit') return;
    setBusy('activity');
    const response = await fetch(`/api/play-admin/activity?${new URLSearchParams({
      kind: activityKind, search: activitySearch.trim(), page: String(activityPage), pageSize: '30',
    })}`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '无法读取安全审计');
    setActivity(data.events || []);
    setActivityPage(data.page || 1);
    setActivityTotalPages(data.totalPages || 1);
    setBusy('');
  }, [activityKind, activityPage, activitySearch, actor, section]);

  useEffect(() => {
    loadActivity().catch((error) => { setBusy(''); setNotice(error.message); });
  }, [loadActivity]);

  const stats = overview?.totals || {
    identities: players.length,
    users: players.filter((player) => !player.guest).length,
    guests: players.filter((player) => player.guest).length,
    banned: players.filter((player) => player.status === 'banned').length,
    activeSessions: 0, activeLast24Hours: 0, newLast7Days: 0,
    loginsLast24Hours: 0, failedLoginsLast24Hours: 0,
    uniqueLoginIpsLast7Days: 0, moderators: 0, admins: 0,
  };
  const displayedPlayers = players;
  const ownerAccess = actor?.role === 'owner';
  const hasCapability = (capability: PlayerAdminCapability) => ownerAccess
    || Boolean(actor?.permissions?.includes(capability));
  const canManageProfiles = hasCapability('players.manage');
  const canManageBans = hasCapability('players.ban');
  const canManageSessions = hasCapability('sessions.manage');
  const canManageIdentityBans = hasCapability('identity-bans.manage');
  const canCreatePlayers = hasCapability('players.create');
  const canExportPlayers = hasCapability('players.export');
  const canResetPasswords = hasCapability('passwords.reset');
  const canViewAudit = hasCapability('audit.view');
  const canSelectPlayers = canManageProfiles || canManageBans || canManageSessions;
  const canSelectCurrentSection = section === 'players'
    ? canSelectPlayers
    : section === 'sessions'
      ? canManageSessions
      : section === 'bans' && canManageBans;

  useEffect(() => {
    if (!actor) return;
    const forbidden = (section === 'roles' && !ownerAccess)
      || (section === 'audit' && !canViewAudit);
    if (forbidden) navigateSection('overview');
  }, [actor, canViewAudit, navigateSection, ownerAccess, section]);

  const searchPlaceholder = section === 'sessions' ? '搜索在线玩家、设备来源或身份 ID'
    : section === 'bans' ? '搜索被封禁玩家、标签或身份 ID'
      : section === 'roles' ? '搜索用户名、昵称或管理角色'
        : '搜索用户名、昵称、神岛 ID、标签或身份 ID';

  async function openDetails(player: Player, initialTab: PlayerDetailTab = 'profile') {
    setSelected(player);
    setDetailTab(initialTab);
    setDetails(null);
    setBusy('details');
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${player.subjectId}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '无法读取玩家详情');
      setDetails(data);
      setSelected(data.player);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  function closeDetails() {
    if (busy === 'save' || busy === 'boxId' || busy === 'delete') return;
    setSelected(null);
    setDetails(null);
  }

  async function copyValue(label: string, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} 已复制`);
    } catch {
      setNotice(`无法复制 ${label}，请手动选择文本`);
    }
  }

  async function saveChanges(changes: Record<string, unknown>, successMessage: string) {
    if (!selected) return;
    setBusy('save');
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'PATCH',
        headers: adminHeaders(true),
        body: JSON.stringify(changes),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '保存失败');
      setSelected(data.player);
      setDetails((current) => current ? { ...current, player: data.player } : current);
      await load();
      setNotice(successMessage);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  function saveProfile() {
    if (!selected || !canManageProfiles) return;
    return saveChanges({
      displayName: selected.displayName,
      adminNote: selected.adminNote,
      tags: selected.tags,
      ...(ownerAccess ? {
        creatorAccess: selected.creatorAccess,
        creatorPermissions: selected.creatorPermissions,
      } : {}),
    }, '玩家资料已保存');
  }

  function saveBan() {
    if (!selected || !canManageBans) return;
    return saveChanges({
      status: selected.status,
      banReason: selected.banReason,
      bannedUntil: selected.bannedUntil || '',
    }, selected.status === 'banned'
      ? '封禁已经生效：全部登录会话已撤销，正在通知运行中的地图断开该玩家。'
      : '封禁已经解除：该玩家可以重新登录并进入地图。');
  }

  async function saveBoxId() {
    if (!selected || !canManageProfiles) return;
    setBusy('boxId');
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'PATCH',
        headers: adminHeaders(true),
        body: JSON.stringify({ boxId: selected.boxId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '神岛 ID 绑定失败');
      setSelected(data.player);
      setDetails((current) => current ? { ...current, player: data.player } : current);
      await load();
      setNotice(data.player.boxId ? '神岛 ID 已绑定' : '神岛 ID 绑定已清除');
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function remove() {
    if (!selected || !confirm(`确定删除“${selected.displayName}”及其登录会话吗？`)) return;
    setBusy('delete');
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'DELETE', headers: adminHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '删除失败');
      setSelected(null);
      setDetails(null);
      await load();
      setNotice('玩家账号已删除；地图脚本中以 userKey 为键的存档不会被自动删除');
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function revokeSessions() {
    if (!selected || !canManageSessions || !confirm(`确定强制“${selected.displayName}”的全部设备退出登录并断开游戏连接吗？`)) return;
    setBusy('revoke');
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'POST',
        headers: adminHeaders(true),
        body: JSON.stringify({ action: 'revoke-sessions' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '强制下线失败');
      await openDetails(selected);
      await load();
      setNotice(`下线指令已发送，并撤销 ${data.revoked || 0} 个登录会话`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  function submitSearch() {
    setNotice('');
    setPage(1);
    setAppliedSearch(search.trim());
  }

  async function exportPlayers() {
    if (busy || !canExportPlayers) return;
    setBusy('export');
    setNotice('正在生成玩家 CSV，数据较多时可能需要几秒…');
    try {
      const query = new URLSearchParams({
        search: appliedSearch,
        identity: identityFilter,
        role: roleFilter,
        online: onlineFilter,
        sort,
      });
      const response = await fetch(`/api/play-admin/players/export?${query}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || '导出玩家数据失败');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `players-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      const exported = response.headers.get('X-BOX-Exported-Rows') || '0';
      const totalRows = response.headers.get('X-BOX-Total-Rows') || exported;
      setNotice(`已导出 ${exported} / ${totalRows} 条玩家记录`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function cleanupExpiredSessions() {
    const count = overview?.security.expiredSessions || 0;
    if (!ownerAccess || !count || !confirm(`确定清理 ${count} 条已经过期的会话记录吗？`)) return;
    setBusy('maintenance');
    setNotice('正在清理过期会话…');
    try {
      const response = await fetch('/api/play-admin/maintenance', {
        method: 'POST',
        headers: adminHeaders(true),
        body: JSON.stringify({ action: 'cleanup-expired-sessions' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '清理过期会话失败');
      await load();
      setNotice(`已清理 ${data.deleted || 0} 条过期会话记录`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function revokeSession(sessionId: string) {
    if (!selected || !canManageSessions || !confirm('确定撤销这个设备的登录会话吗？该设备会立即退出。')) return;
    setBusy(`session:${sessionId}`);
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'POST',
        headers: adminHeaders(true),
        body: JSON.stringify({ action: 'revoke-session', sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '撤销会话失败');
      await openDetails(selected);
      await load();
      setNotice('该设备会话已撤销，下线指令已发送');
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function banSource(kind: 'ip' | 'device', value: string, label: string) {
    if (!selected || !value || busy || !canManageIdentityBans) return;
    const duration = prompt(`封禁${label}的小时数（留空表示永久封禁，例如 24、72、168）`, '24');
    if (duration === null) return;
    const hours = duration.trim() ? Number(duration) : 0;
    if (duration.trim() && (!Number.isFinite(hours) || hours <= 0 || hours > 8760)) {
      setNotice('临时封禁时长必须在 1 小时到 1 年之间');
      return;
    }
    const reason = prompt(`请输入封禁${label}的原因（可以留空）`) || '';
    if (!confirm(`确定封禁${label}“${kind === 'device' ? value.slice(0, 16) : value}”吗？匹配的在线账号会立即下线。`)) return;
    setBusy(`ban-source:${kind}`);
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'POST',
        headers: adminHeaders(true),
        body: JSON.stringify({
          action: kind === 'ip' ? 'ban-ip' : 'ban-device',
          value,
          reason,
          bannedUntil: hours ? temporaryBanUntil(hours) : '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `封禁${label}失败`);
      await openDetails(selected, 'ban');
      await load();
      setNotice(`${label}封禁已生效，撤销 ${data.affectedSessions || 0} 个会话，影响 ${data.affectedPlayers || 0} 位在线玩家`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function unbanSource(banId: string, label: string) {
    if (!selected || busy || !canManageIdentityBans || !confirm(`确定解除这个${label}封禁吗？`)) return;
    setBusy(`unban-source:${banId}`);
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'POST', headers: adminHeaders(true),
        body: JSON.stringify({ action: 'unban-source', banId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '解除封禁失败');
      await openDetails(selected, 'ban');
      setNotice(`${label}封禁已解除；已退出的玩家需要重新登录`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function batchAction(action: 'revoke-sessions' | 'temporary-ban' | 'ban' | 'unban' | 'add-tag' | 'remove-tag') {
    if (!selectedIds.length || busy) return;
    if (action === 'revoke-sessions' && !canManageSessions) return;
    if (['temporary-ban', 'ban', 'unban'].includes(action) && !canManageBans) return;
    if (['add-tag', 'remove-tag'].includes(action) && !canManageProfiles) return;
    const label = action === 'revoke-sessions' ? '强制下线' : action === 'temporary-ban' ? '临时封禁' : action === 'ban' ? '永久封禁' : action === 'unban' ? '解除封禁' : action === 'add-tag' ? '增加标签' : '移除标签';
    const tag = action === 'add-tag' || action === 'remove-tag' ? prompt(`请输入要${label}的标签`)?.trim() : '';
    if ((action === 'add-tag' || action === 'remove-tag') && !tag) return;
    let bannedUntil = '';
    if (action === 'temporary-ban') {
      const input = prompt('请输入临时封禁小时数（例如 24、72、168）', '24');
      if (input === null) return;
      const hours = Number(input);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 8760) {
        setNotice('临时封禁时长必须在 1 小时到 1 年之间');
        return;
      }
      bannedUntil = temporaryBanUntil(hours);
    }
    const reason = action === 'ban' || action === 'temporary-ban' ? prompt('请输入批量封禁原因（可以留空）') || '' : '';
    if (!confirm(`确定对选中的 ${selectedIds.length} 位玩家执行“${label}”吗？`)) return;
    setBusy('batch');
    setNotice('');
    try {
      const response = await fetch('/api/play-admin/players/batch', {
        method: 'POST', headers: adminHeaders(true),
        body: JSON.stringify({
          subjectIds: selectedIds,
          action: action === 'temporary-ban' ? 'ban' : action,
          tag,
          reason,
          bannedUntil,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '批量操作失败');
      setSelectedIds([]);
      await load();
      setNotice(`批量操作完成：成功 ${data.succeeded || 0} 位，失败 ${data.failed || 0} 位`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function resetPassword() {
    if (!selected || !canResetPasswords || newPassword.length < 10) return;
    if (!confirm(`确定重置“${selected.displayName}”的密码并撤销全部会话吗？`)) return;
    setBusy('password');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'POST', headers: adminHeaders(true),
        body: JSON.stringify({ action: 'reset-password', password: newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '密码重置失败');
      setNewPassword('');
      await openDetails(selected);
      setNotice(`密码已重置，并撤销 ${data.revoked || 0} 个会话`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function submitCreateUser() {
    if (!canCreatePlayers || busy || createUser.password.length < 10) return;
    setBusy('create-user');
    setNotice('');
    try {
      const response = await fetch('/api/play-admin/players', {
        method: 'POST',
        headers: adminHeaders(true),
        body: JSON.stringify({
          ...createUser,
          tags: createUser.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '用户创建失败');
      setCreateUserOpen(false);
      setCreateUser(emptyCreateUser);
      await load();
      setNotice(`用户“${data.player.displayName}”已创建，尚未产生登录会话`);
      await openDetails(data.player, 'profile');
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  if (!actor) {
    return (
      <div className={styles.themeRoot} data-theme={theme}>
        <Head><title>登录玩家管理</title></Head>
        <main className={styles.signedOutShell}>
          <section className={styles.signedOutPanel}>
            <PlayerAdminBrand />
            {loginOpen ? (
              <form className={styles.loginDialog} onSubmit={(event) => { event.preventDefault(); void loginAdmin(); }}>
                <div className={styles.loginHeading}>
                  <h1>登录玩家管理</h1>
                  <p>使用独立的管理账号进入后台。</p>
                </div>
                <label>管理员用户名<input autoFocus autoComplete="username" value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} /></label>
                <label>管理员密码<input type="password" autoComplete="current-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} /></label>
                {notice ? <div className={styles.loginError} role="alert">{notice}</div> : null}
                <div className={styles.loginActions}>
                  {returnUrl ? <Link className={styles.secondaryButton} href={returnUrl}>{returnLabel}</Link> : null}
                  <button className={styles.secondaryButton} type="button" onClick={() => setOwnerRecoveryOpen((value) => !value)}>服主恢复密钥</button>
                  <button className={styles.primaryButton} disabled={!adminUsername || !adminPassword || busy === 'verify'} type="submit">{busy === 'verify' ? '登录中…' : '登录后台'}</button>
                </div>
                {ownerRecoveryOpen ? <div className={styles.ownerRecovery}><label>服主恢复密钥<input type="password" autoComplete="off" value={ownerToken} onChange={(event) => setOwnerToken(event.target.value)} /></label><button className={styles.secondaryButton} type="button" disabled={!ownerToken || busy === 'verify'} onClick={() => void exchangeOwnerSession()}>使用恢复密钥</button></div> : null}
              </form>
            ) : (
              <div className={styles.authChecking} role="status"><RefreshCw className={styles.spinning} size={18} /><span><strong>正在验证管理会话</strong><small>请稍候…</small></span></div>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.themeRoot} data-theme={theme}>
      <Head><title>玩家管理</title></Head>
      <main className={styles.adminShell}>
        <aside className={styles.sidebar}>
          <PlayerAdminBrand />
          <nav aria-label="玩家后台分类">
            <button aria-current={section === 'overview' ? 'page' : undefined} className={section === 'overview' ? styles.navActive : ''} onClick={() => navigateSection('overview')}><span><LayoutDashboard size={17} /></span><div>运营概览</div></button>
            <button aria-current={section === 'players' ? 'page' : undefined} className={section === 'players' ? styles.navActive : ''} onClick={() => navigateSection('players')}><span><Users size={17} /></span><div>玩家目录</div></button>
            <button aria-current={section === 'sessions' ? 'page' : undefined} className={section === 'sessions' ? styles.navActive : ''} onClick={() => navigateSection('sessions')}><span><Monitor size={17} /></span><div>在线与会话</div></button>
            <button aria-current={section === 'bans' ? 'page' : undefined} className={section === 'bans' ? styles.navActive : ''} onClick={() => navigateSection('bans')}><span><Ban size={17} /></span><div>封禁管理</div></button>
            {ownerAccess ? <button aria-current={section === 'roles' ? 'page' : undefined} className={section === 'roles' ? styles.navActive : ''} onClick={() => navigateSection('roles')}><span><UserCog size={17} /></span><div>管理账号</div></button> : null}
            {canViewAudit ? <button aria-current={section === 'audit' ? 'page' : undefined} className={section === 'audit' ? styles.navActive : ''} onClick={() => navigateSection('audit')}><span><ShieldCheck size={17} /></span><div>安全与审计</div></button> : null}
          </nav>
          <div className={styles.sidebarFooter}><span className={styles.healthDot} /><span><strong>身份服务正常</strong><small>PostgreSQL 已连接</small></span></div>
        </aside>

        <section className={styles.workspace}>
          <header className={styles.header}>
            <div>
              <div className={styles.titleRow}><h1>{sectionMeta[section].title}</h1>{section !== 'roles' ? <span>{stats.identities} 个身份</span> : null}</div>
            </div>
            <div className={styles.headerTools}>
              {actor ? <div className={styles.headerIdentity} aria-label={`当前操作者：${actor.displayName}`}><ShieldCheck size={15} /><span><small>独立管理账号</small><strong>{actor.displayName} · {actor.credential === 'owner-session' ? '临时服主会话' : actor.role === 'owner' ? '服主' : actor.role === 'admin' ? '高级管理员' : '管理员'}</strong></span></div> : null}
              <div className={styles.headerActions}>
                <button className={styles.iconButton} title={`主题：${theme === 'system' ? '跟随系统' : theme === 'light' ? '亮色' : '暗色'}（点击切换）`} aria-label="切换界面主题" onClick={cycleTheme}>{theme === 'light' ? <Sun size={15} /> : theme === 'dark' ? <Moon size={15} /> : <Laptop size={15} />}</button>
                <button className={styles.iconButton} title="刷新当前数据" aria-label="刷新当前数据" disabled={busy === 'loading'} onClick={() => load().catch((error) => setNotice(error.message))}><RefreshCw className={busy === 'loading' ? styles.spinning : ''} size={15} /></button>
                {actor ? <button className={styles.secondaryButton} disabled={busy === 'logout'} onClick={() => void logoutAdmin()}><LogOut size={14} />退出管理</button> : null}
                {returnUrl ? <Link className={styles.secondaryButton} href={returnUrl}>{returnLabel}</Link> : null}
              </div>
            </div>
          </header>

          {notice && !selected ? <div className={styles.notice} role="status"><span>{notice}</span><button aria-label="关闭提示" onClick={() => setNotice('')}><X size={16} /></button></div> : null}

          {section === 'overview' ? <>
            <section className={styles.metricGrid} aria-label="玩家核心指标">
              <article><span><Users size={15} />注册玩家</span><strong>{stats.users}</strong><small>近 7 天新增 {stats.newLast7Days} 人</small></article>
              <article><span><Activity size={15} />24 小时活跃</span><strong>{stats.activeLast24Hours}</strong><small>成功登录 {stats.loginsLast24Hours} 次</small></article>
              <article><span><Monitor size={15} />有效会话</span><strong>{stats.activeSessions}</strong><small>{overview?.security.expiredSessions || 0} 条过期记录待清理</small></article>
              <article><span><ShieldCheck size={15} />安全状态</span><strong className={stats.banned || stats.failedLoginsLast24Hours ? styles.dangerText : ''}>{stats.banned + stats.failedLoginsLast24Hours}</strong><small>{stats.banned} 个封禁 · {stats.failedLoginsLast24Hours} 次失败登录</small></article>
            </section>
            <div className={styles.dashboardColumns}>
              <section className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>最近账号登录</h2><p>服务器最近的成功登录事件</p></div>{canViewAudit ? <button onClick={() => navigateSection('audit')}>安全审计 <ChevronRight size={13} /></button> : null}</div>
                <div className={styles.activityList}>{overview?.recentLogins.slice(0, 7).map((event, index) => <article key={`${event.subjectId}-${event.createdAt}-${index}`}><span className={styles.avatar}>{event.displayName.slice(0, 1)}</span><div><strong>{event.displayName}</strong><small>{event.username ? `@${event.username}` : event.subjectId}</small></div><div className={styles.activityMeta}><strong>{displayIp(event.ip)}</strong><small>{formatDate(event.createdAt)}</small></div></article>)}</div>
                {!overview?.recentLogins.length ? <div className={styles.compactEmpty}>目前没有账号登录记录</div> : null}
              </section>
              <section className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>身份构成</h2><p>Player Service 实时数据</p></div><Database size={16} /></div>
                <dl className={styles.breakdown}><div><dt>注册玩家</dt><dd>{stats.users}</dd></div><div><dt>独立管理账号</dt><dd>{admins.length || '—'}</dd></div><div><dt>有效会话</dt><dd>{stats.activeSessions}</dd></div><div><dt>正常账号</dt><dd>{Math.max(0, stats.users - stats.banned)}</dd></div><div><dt>封禁账号</dt><dd>{stats.banned}</dd></div></dl>
              </section>
            </div>
          </> : null}

          {(['players', 'sessions', 'bans', 'roles'] as AdminSection[]).includes(section) ? <>
            {section !== 'roles' ? <section className={styles.contextStats} aria-label={`${sectionMeta[section].title}统计`}>
              {section === 'players' ? <>
                <article><span>注册玩家</span><strong>{stats.users}</strong><small>当前可管理账号总数</small></article>
                <article><span>近 7 天新增</span><strong>{stats.newLast7Days}</strong><small>新注册账号</small></article>
                <article><span>24 小时活跃</span><strong>{stats.activeLast24Hours}</strong><small>最近在线玩家</small></article>
              </> : null}
              {section === 'sessions' ? <>
                <article><span>有效设备会话</span><strong>{stats.activeSessions}</strong><small>尚未过期的登录凭据</small></article>
                <article><span>当前筛选玩家</span><strong>{total}</strong><small>至少有一个有效会话</small></article>
                <article><span>过期记录</span><strong>{overview?.security.expiredSessions || 0}</strong><small>{ownerAccess ? '可在本页集中清理' : '仅服主可清理'}</small></article>
              </> : null}
              {section === 'bans' ? <>
                <article><span>当前封禁</span><strong className={stats.banned ? styles.dangerText : ''}>{stats.banned}</strong><small>临时与永久封禁总数</small></article>
                <article><span>24 小时内到期</span><strong>{overview?.security.temporaryBansEndingSoon || 0}</strong><small>到期后自动恢复</small></article>
                <article><span>正常账号</span><strong>{Math.max(0, stats.users - stats.banned)}</strong><small>可以正常登录</small></article>
              </> : null}
            </section> : null}
            {section === 'sessions' && ownerAccess && overview?.security.expiredSessions ? <div className={styles.sectionCallout}><div><Clock3 size={17} /><span><strong>发现 {overview.security.expiredSessions} 条过期会话记录</strong><small>过期记录不会继续授权，但定期清理可以减少数据库体积。</small></span></div><button className={styles.secondaryButton} disabled={Boolean(busy)} onClick={() => void cleanupExpiredSessions()}>清理过期会话</button></div> : null}
            {section === 'roles' ? <div className={styles.rolesWorkspace}>
              <section className={styles.rolesPanel}>
                <header className={styles.rolesPanelHeader}><div><span className={styles.rolesPanelIcon}><UserCog size={17} /></span><span><strong>管理账号</strong><small>{admins.length} 个账号</small></span></div><button className={styles.primaryButton} onClick={() => openAdminAccount()}><UserPlus size={14} />新增账号</button></header>
                {admins.length ? <div className={styles.rolesTableWrap}><table><thead><tr><th>管理账号</th><th>角色</th><th>权限组</th><th>最近登录</th><th>状态</th><th aria-label="操作" /></tr></thead><tbody>{admins.map((admin) => <tr key={admin.id}><td><strong>{admin.displayName}</strong><small>@{admin.username}</small></td><td><span className={styles.neutralBadge}>{admin.role === 'admin' ? '高级管理员' : '管理员'}</span></td><td><strong>{admin.role === 'admin' ? '全部权限' : admin.permissionGroupName || '仅查看'}</strong><small>{admin.permissions.length} 项权限</small></td><td><strong>{formatDate(admin.lastLoginAt)}</strong><small>{admin.lastLoginIp || `${admin.loginCount || 0} 次登录`}</small></td><td><span className={admin.status === 'active' ? styles.goodStatus : styles.badStatus}>{admin.status === 'active' ? '已启用' : '已停用'}</span></td><td><DropdownMenu.Root><DropdownMenu.Trigger asChild><button className={styles.rowActionButton} aria-label={`管理 ${admin.displayName}`}><MoreHorizontal size={17} /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className={styles.actionMenuContent} align="end" sideOffset={6}><DropdownMenu.Item className={styles.actionMenuItem} onSelect={() => openAdminAccount(admin)}><Pencil size={14} />编辑账号</DropdownMenu.Item><DropdownMenu.Separator className={styles.actionMenuSeparator} /><DropdownMenu.Item className={`${styles.actionMenuItem} ${styles.actionMenuDanger}`} onSelect={() => void removeAdminAccount(admin)}><Trash2 size={14} />删除账号</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root></td></tr>)}</tbody></table></div> : <div className={styles.rolesEmpty}><span><UserCog size={22} /></span><strong>暂无管理账号</strong><button className={styles.textButton} onClick={() => openAdminAccount()}>新增第一个账号</button></div>}
              </section>
              <section className={styles.rolesPanel}>
                <header className={styles.rolesPanelHeader}><div><span className={styles.rolesPanelIcon}><ShieldCheck size={17} /></span><span><strong>权限组</strong><small>{permissionGroups.length} 个分组</small></span></div><button className={styles.secondaryButton} onClick={() => openPermissionGroup()}>新建</button></header>
                {permissionGroups.length ? <div className={styles.permissionGroupList}>{permissionGroups.map((group) => <article key={group.id}><div><strong>{group.name}</strong><span>{group.permissions.length ? group.permissions.slice(0, 2).map((permission) => PLAYER_ADMIN_CAPABILITY_META[permission].label).join('、') : '仅查看玩家'}{group.permissions.length > 2 ? `等 ${group.permissions.length} 项` : ''}</span></div><em>{group.adminCount} 人</em><DropdownMenu.Root><DropdownMenu.Trigger asChild><button className={styles.rowActionButton} aria-label={`管理权限组 ${group.name}`}><MoreHorizontal size={17} /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className={styles.actionMenuContent} align="end" sideOffset={6}><DropdownMenu.Item className={styles.actionMenuItem} onSelect={() => openPermissionGroup(group)}><Pencil size={14} />编辑权限组</DropdownMenu.Item><DropdownMenu.Separator className={styles.actionMenuSeparator} /><DropdownMenu.Item className={`${styles.actionMenuItem} ${styles.actionMenuDanger}`} onSelect={() => void removePermissionGroup(group)}><Trash2 size={14} />删除权限组</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root></article>)}</div> : <div className={styles.rolesEmpty}><span><ShieldCheck size={22} /></span><strong>暂无权限组</strong><button className={styles.textButton} onClick={() => openPermissionGroup()}>新建权限组</button></div>}
              </section>
            </div> : null}
            {section !== 'roles' ? <div className={styles.toolbar}>
              <div className={styles.searchField}><Search size={16} aria-hidden="true" /><input ref={searchInputRef} aria-label="搜索玩家" aria-keyshortcuts="/" placeholder={searchPlaceholder} value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); }} /><kbd>/</kbd></div>
              <button className={styles.primaryButton} disabled={busy === 'loading'} onClick={submitSearch}>{busy === 'loading' ? '读取中…' : '搜索'}</button>
              {section === 'players' && canCreatePlayers ? <button className={styles.primaryButton} disabled={Boolean(busy)} onClick={() => setCreateUserOpen(true)}><UserPlus size={14} />新增用户</button> : null}
              {canExportPlayers ? <button className={styles.secondaryButton} disabled={Boolean(busy)} onClick={() => void exportPlayers()}><Download size={14} />{busy === 'export' ? '导出中…' : '导出 CSV'}</button> : null}
            </div> : null}
            {section !== 'roles' ? <div className={styles.filterBar}>
              <div className={styles.filterGroup}>
                <select className={styles.filterSelect} aria-label="角色筛选" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as typeof roleFilter); setPage(1); }}><option value="all">全部角色</option><option value="player">普通玩家</option><option value="moderator">管理员</option><option value="admin">服主</option></select>
                {section === 'players' || section === 'sessions' ? <select className={styles.filterSelect} aria-label="在线筛选" value={onlineFilter} onChange={(event) => { setOnlineFilter(event.target.value as typeof onlineFilter); setPage(1); }}><option value="all">全部在线状态</option><option value="online">当前在线</option><option value="offline">当前离线</option></select> : null}
                <select className={styles.filterSelect} aria-label="排序方式" value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }}><option value="lastSeen">最近在线优先</option><option value="registered">最近注册优先</option><option value="displayName">按昵称排序</option><option value="loginCount">登录次数最多</option></select>
                {search || appliedSearch ? <button className={styles.textButton} onClick={() => { setSearch(''); setAppliedSearch(''); setPage(1); }}>清除搜索</button> : null}
              </div>
              <span>当前显示 {displayedPlayers.length} / {total} 位玩家</span>
            </div> : null}
            {section !== 'roles' && canSelectCurrentSection && selectedIds.length ? <div className={styles.batchToolbar}><strong>已选择 {selectedIds.length} 位玩家</strong>{canManageSessions && (section === 'sessions' || section === 'players') ? <button onClick={() => void batchAction('revoke-sessions')}><LogOut size={14} />强制下线</button> : null}{section === 'players' ? <>{canManageBans ? <><button onClick={() => void batchAction('temporary-ban')}><Ban size={14} />临时封禁</button><button onClick={() => void batchAction('ban')}><Ban size={14} />永久封禁</button></> : null}{canManageProfiles ? <><button onClick={() => void batchAction('add-tag')}><Tags size={14} />增加标签</button><button onClick={() => void batchAction('remove-tag')}><Tags size={14} />移除标签</button></> : null}</> : null}{section === 'bans' && canManageBans ? <button onClick={() => void batchAction('unban')}><ShieldCheck size={14} />解除封禁</button> : null}<button className={styles.batchClear} onClick={() => setSelectedIds([])}><X size={14} />清空</button></div> : null}
            {section !== 'roles' ? <section className={styles.tableCard} aria-busy={busy === 'loading'}>
              {section === 'players' ? <table><thead><tr>{canSelectPlayers ? <th className={styles.checkCell}><input type="checkbox" aria-label="选择本页玩家" checked={Boolean(displayedPlayers.length) && displayedPlayers.every((player) => selectedIds.includes(player.subjectId))} onChange={(event) => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...displayedPlayers.map((player) => player.subjectId)])] : selectedIds.filter((id) => !displayedPlayers.some((player) => player.subjectId === id)))} /></th> : null}<th>玩家</th><th>账号标识</th><th>注册信息</th><th>最后在线</th><th>状态</th><th /></tr></thead><tbody>{displayedPlayers.map((player) => <tr key={player.subjectId} tabIndex={0} onClick={() => openDetails(player, 'profile')} onKeyDown={(event) => { if (event.key === 'Enter') openDetails(player, 'profile'); }}>{canSelectPlayers ? <td className={styles.checkCell} onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`选择 ${player.displayName}`} checked={selectedIds.includes(player.subjectId)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, player.subjectId] : ids.filter((id) => id !== player.subjectId))} /></td> : null}<td><PlayerName player={player} /></td><td><strong>账号 #{player.userId}</strong><small>{player.boxId ? `神岛 ID：${player.boxId}` : '未绑定神岛 ID'}</small></td><td><strong>{formatDate(player.registeredAt || player.createdAt)}</strong><small>{displayIp(player.registrationIp || player.firstSeenIp)}</small></td><td><strong>{formatDate(player.lastSeenAt)}</strong><small>{player.activeSessionCount ? `${player.activeSessionCount} 个有效会话` : '当前离线'}</small></td><td><StatusBadge player={player} /></td><td><button className={styles.tableAction} onClick={(event) => { event.stopPropagation(); void openDetails(player, 'profile'); }}>管理 <ChevronRight size={13} /></button></td></tr>)}</tbody></table> : null}
              {section === 'sessions' ? <table><thead><tr>{canManageSessions ? <th className={styles.checkCell}><input type="checkbox" aria-label="选择本页玩家" checked={Boolean(displayedPlayers.length) && displayedPlayers.every((player) => selectedIds.includes(player.subjectId))} onChange={(event) => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...displayedPlayers.map((player) => player.subjectId)])] : selectedIds.filter((id) => !displayedPlayers.some((player) => player.subjectId === id)))} /></th> : null}<th>在线玩家</th><th>有效会话</th><th>最后登录</th><th>来源地址</th><th /></tr></thead><tbody>{displayedPlayers.map((player) => <tr key={player.subjectId} tabIndex={0} onClick={() => openDetails(player, 'sessions')} onKeyDown={(event) => { if (event.key === 'Enter') openDetails(player, 'sessions'); }}>{canManageSessions ? <td className={styles.checkCell} onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`选择 ${player.displayName}`} checked={selectedIds.includes(player.subjectId)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, player.subjectId] : ids.filter((id) => id !== player.subjectId))} /></td> : null}<td><PlayerName player={player} /></td><td><strong>{player.activeSessionCount} 个设备</strong><small>{player.activeSessionCount ? '登录凭据仍有效' : '没有有效会话'}</small></td><td><strong>{formatDate(player.lastLoginAt)}</strong><small>累计登录 {player.loginCount} 次</small></td><td><strong className={styles.mono}>{displayIp(player.lastLoginIp)}</strong><small>最近在线 {formatDate(player.lastSeenAt)}</small></td><td><button className={styles.tableAction} onClick={(event) => { event.stopPropagation(); void openDetails(player, 'sessions'); }}>管理会话 <ChevronRight size={13} /></button></td></tr>)}</tbody></table> : null}
              {section === 'bans' ? <table><thead><tr>{canManageBans ? <th className={styles.checkCell}><input type="checkbox" aria-label="选择本页玩家" checked={Boolean(displayedPlayers.length) && displayedPlayers.every((player) => selectedIds.includes(player.subjectId))} onChange={(event) => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...displayedPlayers.map((player) => player.subjectId)])] : selectedIds.filter((id) => !displayedPlayers.some((player) => player.subjectId === id)))} /></th> : null}<th>被封禁玩家</th><th>处罚类型</th><th>封禁原因</th><th>处理时间</th><th /></tr></thead><tbody>{displayedPlayers.map((player) => <tr key={player.subjectId} tabIndex={0} onClick={() => openDetails(player, 'ban')} onKeyDown={(event) => { if (event.key === 'Enter') openDetails(player, 'ban'); }}>{canManageBans ? <td className={styles.checkCell} onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`选择 ${player.displayName}`} checked={selectedIds.includes(player.subjectId)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, player.subjectId] : ids.filter((id) => id !== player.subjectId))} /></td> : null}<td><PlayerName player={player} /></td><td><StatusBadge player={player} /><small>{player.bannedUntil ? `至 ${formatDate(player.bannedUntil)}` : '不会自动解除'}</small></td><td><strong>{player.banReason || '未填写原因'}</strong><small>由管理后台执行</small></td><td><strong>{formatDate(player.bannedAt)}</strong><small>最后在线 {formatDate(player.lastSeenAt)}</small></td><td><button className={styles.tableAction} onClick={(event) => { event.stopPropagation(); void openDetails(player, 'ban'); }}>处理封禁 <ChevronRight size={13} /></button></td></tr>)}</tbody></table> : null}
              {busy === 'loading' && !displayedPlayers.length ? <div className={styles.empty}><RefreshCw className={styles.spinning} size={20} /><strong>正在读取玩家记录</strong><small>正在从 Player Service 获取最新数据…</small></div> : null}
              {busy !== 'loading' && !displayedPlayers.length ? <div className={styles.empty}><CircleUserRound size={24} /><strong>没有符合条件的玩家</strong><small>尝试清除搜索词或调整上方筛选条件。</small></div> : null}
            </section> : null}
            {section !== 'roles' ? <div className={styles.pagination}><span>共 {total} 位玩家 · 第 {page} / {totalPages} 页</span><div><button className={styles.secondaryButton} disabled={page <= 1 || busy === 'loading'} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><button className={styles.secondaryButton} disabled={page >= totalPages || busy === 'loading'} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页</button></div></div> : null}
          </> : null}

          {section === 'audit' ? <>
            <section className={styles.riskGrid}>
              <article><span><AlertTriangle size={16} />24 小时登录失败</span><strong>{stats.failedLoginsLast24Hours}</strong><small>{overview?.security.topFailedIps[0] ? `最高来源 ${overview.security.topFailedIps[0].ip}（${overview.security.topFailedIps[0].attempts} 次）` : '暂未发现失败登录'}</small></article>
              <article><span><Users size={16} />共享登录 IP</span><strong>{overview?.security.sharedLoginIps.length || 0}</strong><small>近 30 天被多个账号使用的 IP</small></article>
              <article><span><Ban size={16} />即将到期封禁</span><strong>{overview?.security.temporaryBansEndingSoon || 0}</strong><small>未来 24 小时内自动解封</small></article>
            </section>
            <section className={styles.securityGrid}>
              <div className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>高频失败来源</h2><p>近 24 小时登录失败次数最多的 IP</p></div></div><div className={styles.riskList}>{overview?.security.topFailedIps.map((entry) => <article key={entry.ip}><strong className={styles.mono}>{entry.ip}</strong><span>{entry.attempts} 次</span><time>{formatDate(entry.lastAttemptAt)}</time></article>)}{!overview?.security.topFailedIps.length ? <div className={styles.compactEmpty}>没有失败登录来源</div> : null}</div></div>
              <div className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>账号关联线索</h2><p>近 30 天被多个账号共同使用的登录 IP，仅作为排查线索</p></div></div><div className={styles.riskList}>{overview?.security.sharedLoginIps.map((entry) => <article key={entry.ip}><strong className={styles.mono}>{entry.ip}</strong><span>{entry.accounts} 个账号</span><time>{formatDate(entry.lastSeenAt)}</time></article>)}{!overview?.security.sharedLoginIps.length ? <div className={styles.compactEmpty}>没有共享登录 IP</div> : null}</div></div>
            </section>
            <div className={styles.activityToolbar}><div className={styles.segmented}><button className={activityKind === 'all' ? styles.segmentActive : ''} onClick={() => { setActivityKind('all'); setActivityPage(1); }}>全部事件</button><button className={activityKind === 'login' ? styles.segmentActive : ''} onClick={() => { setActivityKind('login'); setActivityPage(1); }}>账号登录</button><button className={activityKind === 'admin' ? styles.segmentActive : ''} onClick={() => { setActivityKind('admin'); setActivityPage(1); }}>管理操作</button></div><div className={styles.searchField}><Search size={16} /><input placeholder="搜索动作、操作者、玩家、IP 或身份 ID" value={activitySearch} onChange={(event) => { setActivitySearch(event.target.value); setActivityPage(1); }} /></div></div>
            <section className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>完整安全活动</h2><p>账号登录和所有敏感管理操作，按时间统一追溯</p></div><span>{busy === 'activity' ? '读取中…' : `第 ${activityPage} 页`}</span></div><div className={styles.auditTable}>{activity.map((event) => <article key={event.id}><span className={styles.auditIcon}>{event.kind === 'login' ? <Activity size={16} /> : <ShieldCheck size={16} />}</span><div className={styles.auditMain}><strong>{describePlayerAdminAuditAction(event.action).label}</strong><small>目标：{event.displayName || event.username || event.subjectId || '系统'}</small></div><div><strong>{event.actorDisplayName || event.actor}</strong><small>操作者</small></div><div><strong className={styles.mono}>{displayIp(event.ip)}</strong><small>{event.userAgent || '客户端未记录'}</small></div><time>{formatDate(event.createdAt)}</time></article>)}</div>{!activity.length && busy !== 'activity' ? <div className={styles.compactEmpty}>暂无符合条件的安全活动</div> : null}</section>
            <div className={styles.pagination}><span>第 {activityPage} / {activityTotalPages} 页</span><div><button className={styles.secondaryButton} disabled={activityPage <= 1} onClick={() => setActivityPage((value) => value - 1)}>上一页</button><button className={styles.secondaryButton} disabled={activityPage >= activityTotalPages} onClick={() => setActivityPage((value) => value + 1)}>下一页</button></div></div>
          </> : null}
        </section>
      </main>

      {selected ? (
        <div className={styles.backdrop} onMouseDown={closeDetails}>
          <section className={styles.drawer} onMouseDown={(event) => event.stopPropagation()} aria-label="玩家详情">
            <header className={styles.drawerHeader}>
              <div className={styles.playerCell}>
                <PlayerAvatar player={selected} large />
                <span>
                  <span className={styles.drawerEyebrow}>{selected.guest ? '游客身份' : `本地账号 #${selected.userId}`}</span>
                  <h2>{selected.displayName}</h2>
                  <small>{selected.username ? `@${selected.username}` : selected.userKey} · 普通玩家 · {playerStatusLabel(selected)}</small>
                </span>
              </div>
              <button className={styles.closeButton} aria-label="关闭玩家详情" onClick={closeDetails}><X size={19} /></button>
            </header>

            <div className={styles.detailWorkspace}>
              <nav className={styles.detailTabs} aria-label="玩家详情功能">
                <span className={styles.detailGroupLabel}>账号资料</span>
                <button className={detailTab === 'profile' ? styles.detailTabActive : ''} onClick={() => setDetailTab('profile')}><UserCog size={15} /><span><strong>基本资料</strong><small>昵称、标签和备注</small></span></button>
                <button className={detailTab === 'identity' ? styles.detailTabActive : ''} onClick={() => setDetailTab('identity')}><ShieldCheck size={15} /><span><strong>身份档案</strong><small>标识、时间和网络记录</small></span></button>
                <button className={detailTab === 'boxId' ? styles.detailTabActive : ''} onClick={() => setDetailTab('boxId')}><Link2 size={15} /><span><strong>神岛 ID</strong><small>旧平台身份兼容绑定</small></span></button>
                <span className={styles.detailGroupLabel}>会话与安全</span>
                <button className={detailTab === 'sessions' ? styles.detailTabActive : ''} onClick={() => setDetailTab('sessions')}><Monitor size={15} /><span><strong>会话设备</strong><small>当前登录设备与下线</small></span></button>
                <button className={detailTab === 'logins' ? styles.detailTabActive : ''} onClick={() => setDetailTab('logins')}><Activity size={15} /><span><strong>登录记录</strong><small>登录时间、设备和地址</small></span></button>
                <button className={detailTab === 'ban' ? styles.detailTabActive : ''} onClick={() => setDetailTab('ban')}><Ban size={15} /><span><strong>封禁管理</strong><small>临时、永久与解封</small></span></button>
                <button className={detailTab === 'password' ? styles.detailTabActive : ''} onClick={() => setDetailTab('password')}><KeyRound size={15} /><span><strong>密码重置</strong><small>设置临时登录密码</small></span></button>
                <span className={styles.detailGroupLabel}>审计调查</span>
                <button className={detailTab === 'related' ? styles.detailTabActive : ''} onClick={() => setDetailTab('related')}><Users size={15} /><span><strong>关联线索</strong><small>共享登录 IP 排查</small></span></button>
                <button className={detailTab === 'history' ? styles.detailTabActive : ''} onClick={() => setDetailTab('history')}><FileClock size={15} /><span><strong>管理记录</strong><small>敏感操作审计时间线</small></span></button>
                {ownerAccess ? <button className={`${styles.detailDangerTab} ${detailTab === 'danger' ? styles.detailTabActive : ''}`} onClick={() => setDetailTab('danger')}><Trash2 size={15} /><span><strong>删除身份</strong><small>不可恢复的危险操作</small></span></button> : null}
              </nav>

              <div className={styles.drawerBody}>
                <div className={styles.detailPageHeader}><h3>{detailTabMeta[detailTab].title}</h3></div>
                {busy === 'details' && !details ? <div className={styles.empty}>正在读取玩家详情…</div> : null}

                {detailTab === 'profile' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>玩家资料</h3><span>可编辑</span></div>
                  {selected.guest ? <div className={styles.infoNote}>游客没有可编辑账号资料。</div> : <div className={styles.formGrid}>
                    <label>昵称<input disabled={!canManageProfiles} value={selected.displayName} onChange={(event) => setSelected({ ...selected, displayName: event.target.value })} /></label>
                    <label className={styles.fullField}>标签（用逗号分隔）<input disabled={!canManageProfiles} value={selected.tags.join(', ')} onChange={(event) => setSelected({ ...selected, tags: event.target.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) })} placeholder="例如：测试员, 重点关注" /></label>
                    <label className={styles.fullField}>服主备注<textarea disabled={!canManageProfiles} value={selected.adminNote} onChange={(event) => setSelected({ ...selected, adminNote: event.target.value })} placeholder="仅后台可见，不会发送给游戏脚本" /></label>
                    {ownerAccess ? <section className={`${styles.fullField} ${styles.creatorAccess}`}>
                      <span className={styles.creatorAccessTitle}>创作者授权</span>
                      <label className={styles.creatorAccessToggle}>
                        <input type="checkbox" disabled={selected.guest} checked={selected.creatorAccess} onChange={(event) => setSelected({ ...selected, creatorAccess: event.target.checked, creatorPermissions: event.target.checked ? selected.creatorPermissions : [] })} />
                        <span><strong>允许进入创作端</strong><small>开启后可继续分配创建、编辑、导入和发布等权限。</small></span>
                      </label>
                      {selected.creatorAccess ? <div className={styles.permissionGrid}>{CREATOR_CAPABILITIES.filter((capability) => capability !== 'projects.view').map((capability) => <label key={capability}><input type="checkbox" checked={selected.creatorPermissions.includes(capability)} onChange={(event) => setSelected({ ...selected, creatorPermissions: event.target.checked ? [...new Set([...selected.creatorPermissions, capability])] : selected.creatorPermissions.filter((item) => item !== capability) })} /> <span><strong>{CREATOR_CAPABILITY_META[capability].label}</strong><small>{CREATOR_CAPABILITY_META[capability].description}</small></span></label>)}</div> : null}
                    </section> : null}
                  </div>}
                </section> : null}

                {detailTab === 'identity' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>只读身份档案</h3><span>系统记录</span></div>
                  <dl className={styles.detailGrid}>
                    <div><dt>userKey（存档键）</dt><dd className={styles.identityValue}><code>{selected.userKey}</code><button title="复制 userKey" onClick={() => void copyValue('userKey', selected.userKey)}><Copy size={13} /></button></dd></div>
                    <div><dt>身份 ID</dt><dd className={styles.identityValue}><code>{selected.subjectId}</code><button title="复制身份 ID" onClick={() => void copyValue('身份 ID', selected.subjectId)}><Copy size={13} /></button></dd></div>
                    <div><dt>本地账号 ID</dt><dd className={styles.identityValue}><code>{selected.userId || '未注册'}</code>{selected.userId ? <button title="复制账号 ID" onClick={() => void copyValue('账号 ID', selected.userId)}><Copy size={13} /></button> : null}</dd></div>
                    <div><dt>登录用户名</dt><dd className={styles.identityValue}><code>{selected.username || '未设置'}</code>{selected.username ? <button title="复制用户名" onClick={() => void copyValue('用户名', selected.username)}><Copy size={13} /></button> : null}</dd></div>
                    <div><dt>首次创建</dt><dd>{formatDate(selected.createdAt)}</dd></div>
                    <div><dt>账号注册</dt><dd>{selected.guest ? '尚未注册' : formatDate(selected.registeredAt)}</dd></div>
                    <div><dt>最后登录</dt><dd>{selected.guest ? '不适用' : formatDate(selected.lastLoginAt)}</dd></div>
                    <div><dt>最后在线</dt><dd>{formatDate(selected.lastSeenAt)}</dd></div>
                    <div><dt>累计登录</dt><dd>{selected.guest ? '不适用' : `${selected.loginCount} 次`}</dd></div>
                    <div><dt>有效会话</dt><dd>{selected.activeSessionCount} 个</dd></div>
                    <div><dt>首次访问 IP</dt><dd className={styles.mono}>{displayIp(selected.firstSeenIp)}</dd></div>
                    <div><dt>注册 IP</dt><dd className={styles.mono}>{selected.guest ? '尚未注册' : displayIp(selected.registrationIp)}</dd></div>
                    <div><dt>最后登录 IP</dt><dd className={styles.mono}>{selected.guest ? '不适用' : displayIp(selected.lastLoginIp)}</dd></div>
                    <div><dt>最后在线 IP</dt><dd className={styles.mono}>{displayIp(selected.lastSeenIp)}</dd></div>
                  </dl>
                </section> : null}

                {detailTab === 'boxId' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>旧平台身份绑定</h3><span>{selected.boxId ? '已绑定' : '未绑定'}</span></div>
                  {!selected.guest ? <div className={styles.singleField}>
                    <label>神岛 ID<input disabled={!canManageProfiles} maxLength={64} value={selected.boxId} onChange={(event) => setSelected({ ...selected, boxId: event.target.value })} placeholder="未绑定（entity.player.boxId 返回空字符串）" /></label>
                    <p>只用于兼容旧平台脚本。它不会改变本地用户名、userId、userKey、登录方式、存档隔离或后台权限；清空并保存即可解除绑定。</p>
                  </div> : <div className={styles.infoNote}>未注册身份不能绑定神岛 ID。</div>}
                </section> : null}

                {detailTab === 'sessions' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>当前有效会话</h3><span>{details?.sessions.length || 0} 条</span></div>
                  {details?.sessions.length ? <div className={styles.recordList}>{details.sessions.map((session, index) => <article key={`${session.createdAt}-${index}`}><div><strong>{deviceLabel(session.userAgent)}</strong><span>{formatDate(session.lastSeenAt)}</span></div><small className={styles.recordIp}>{displayIp(session.lastSeenIp || session.createdIp)} · 设备 {session.deviceId || '旧会话未识别'}</small><p>{session.userAgent || '未记录客户端信息'}</p><div className={styles.sessionFooter}><small>创建 {formatDate(session.createdAt)} · 到期 {formatDate(session.expiresAt)}</small><span className={styles.sourceActions}>{canManageIdentityBans ? <><button className={styles.textButton} disabled={Boolean(busy)} onClick={() => void banSource('ip', session.lastSeenIp || session.createdIp, 'IP')}>封禁 IP</button>{session.deviceHash ? <button className={styles.textButton} disabled={Boolean(busy)} onClick={() => void banSource('device', session.deviceHash, '设备')}>封禁设备</button> : null}</> : null}{canManageSessions ? <button className={styles.textButton} disabled={Boolean(busy)} onClick={() => revokeSession(session.sessionId)}>{busy === `session:${session.sessionId}` ? '撤销中…' : '撤销会话'}</button> : null}</span></div></article>)}</div> : <div className={styles.compactEmpty}>没有有效登录会话</div>}
                </section> : null}

                {detailTab === 'logins' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>最近成功登录</h3><span>{details?.loginHistory.length || 0} 条</span></div>
                  {details?.loginHistory.length ? <div className={styles.recordList}>{details.loginHistory.map((event, index) => <article key={`${event.createdAt}-${index}`}><div><strong>{deviceLabel(event.userAgent)}</strong><span>{formatDate(event.createdAt)}</span></div><small className={styles.recordIp}>{displayIp(event.ip)} · 设备 {event.deviceId || '旧记录未识别'}</small><p>{event.userAgent || '未记录客户端信息'}</p>{canManageIdentityBans ? <div className={styles.sourceActions}><button className={styles.textButton} disabled={Boolean(busy)} onClick={() => void banSource('ip', event.ip, 'IP')}>封禁 IP</button>{event.deviceHash ? <button className={styles.textButton} disabled={Boolean(busy)} onClick={() => void banSource('device', event.deviceHash, '设备')}>封禁设备</button> : null}</div> : null}</article>)}</div> : <div className={styles.compactEmpty}>{selected.guest ? '游客没有账号登录记录' : '旧账号或尚无登录历史'}</div>}
                </section> : null}

                {detailTab === 'ban' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>账号处罚状态</h3><span>{selected.status === 'banned' ? '已封禁' : '正常'}</span></div>
                  <div className={styles.formGrid}>
                    <label className={styles.fullField}>封禁状态<select disabled={!canManageBans} value={playerBanMode(selected)} onChange={(event) => { const mode = event.target.value as 'active' | 'temporary' | 'permanent'; setSelected({ ...selected, status: mode === 'active' ? 'active' : 'banned', bannedUntil: mode === 'temporary' ? selected.bannedUntil || temporaryBanUntil(24) : undefined }); }}><option value="active">正常</option><option value="temporary">临时封禁</option><option value="permanent">永久封禁</option></select></label>
                    {selected.status === 'banned' ? <><label className={styles.fullField}>封禁原因<textarea disabled={!canManageBans} value={selected.banReason} onChange={(event) => setSelected({ ...selected, banReason: event.target.value })} placeholder="记录处罚依据" /></label>{selected.bannedUntil ? <><label>自动解封时间<input disabled={!canManageBans} type="datetime-local" min={dateTimeLocalValue(new Date().toISOString())} value={dateTimeLocalValue(selected.bannedUntil)} onChange={(event) => setSelected({ ...selected, bannedUntil: event.target.value ? new Date(event.target.value).toISOString() : temporaryBanUntil(24) })} /></label>{canManageBans ? <div className={styles.banPresets}><span>快速设置</span><div>{[[1, '1 小时'], [24, '1 天'], [72, '3 天'], [168, '7 天'], [720, '30 天']].map(([hours, label]) => <button type="button" key={String(hours)} onClick={() => setSelected({ ...selected, bannedUntil: temporaryBanUntil(Number(hours)) })}>{label}</button>)}</div></div> : null}</> : null}<div className={`${styles.fieldHelp} ${styles.fullField}`}>保存封禁后会撤销全部会话，并通知运行中的地图断开该玩家。</div></> : <div className={`${styles.fieldHelp} ${styles.fullField}`}>当前账号可以正常登录和进入地图。</div>}
                  </div>
                  <div className={styles.sourceBanSection}>
                    <div className={styles.sectionHeading}><h3>IP 与设备处罚</h3><span>{details?.identityBans.length || 0} 条生效中</span></div>
                    <p>可在“会话设备”或“登录记录”中选择具体 IP/设备进行封禁。设备标识是随机 Cookie 的哈希，不使用容易误判的浏览器指纹。</p>
                    {details?.identityBans.length ? <div className={styles.sourceBanList}>{details.identityBans.map((ban) => <article key={ban.id}><span><strong>{ban.kind === 'ip' ? 'IP 封禁' : '设备封禁'}</strong><small className={styles.mono}>{ban.displayValue}</small></span><span><strong>{ban.bannedUntil ? `至 ${formatDate(ban.bannedUntil)}` : '永久'}</strong><small>{ban.reason || '未填写原因'} · {formatDate(ban.bannedAt)}</small></span>{canManageIdentityBans ? <button className={styles.secondaryButton} disabled={Boolean(busy)} onClick={() => void unbanSource(ban.id, ban.kind === 'ip' ? 'IP' : '设备')}>解除</button> : null}</article>)}</div> : <div className={styles.compactEmpty}>当前没有关联的 IP 或设备封禁</div>}
                  </div>
                </section> : null}

                {detailTab === 'password' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>设置临时新密码</h3><span>{canResetPasswords ? '已授权' : '无权限'}</span></div>
                  {canResetPasswords && !selected.guest ? <div className={styles.passwordReset}><div><KeyRound size={17} /><span><strong>重置登录凭据</strong><small>完成后所有设备立即退出，玩家需要使用新密码重新登录。</small></span></div><div><input type="password" minLength={10} maxLength={128} placeholder="10–128 位临时密码" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><button className={styles.secondaryButton} disabled={newPassword.length < 10 || Boolean(busy)} onClick={() => void resetPassword()}>重置密码</button></div></div> : <div className={styles.infoNote}>{selected.guest ? '游客没有可重置的账号密码。' : '服主尚未授予当前管理员重置密码权限。'}</div>}
                </section> : null}

                {detailTab === 'related' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>共享登录 IP</h3><span>近 90 天</span></div>
                  {details?.relatedAccounts.length ? <div className={styles.relatedList}>{details.relatedAccounts.map((account) => <button key={`${account.subjectId}:${account.sharedIp}`} type="button" onClick={() => { const target = players.find((player) => player.subjectId === account.subjectId); if (target) void openDetails(target); else setNotice(`关联账号 ${account.displayName || account.username} 不在当前筛选页，可用身份 ID 搜索：${account.subjectId}`); }}><span><strong>{account.displayName || account.username}</strong><small>@{account.username || '未记录用户名'}</small></span><span><strong className={styles.mono}>{account.sharedIp}</strong><small>{formatDate(account.lastSeenAt)}</small></span></button>)}</div> : <div className={styles.compactEmpty}>近 90 天没有发现其他账号使用相同登录 IP</div>}
                </section> : null}

                {detailTab === 'history' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>管理操作时间线</h3><span>{details?.adminHistory.length || 0} 条</span></div>
                  {details?.adminHistory.length ? <div className={styles.timelineList}>{details.adminHistory.map((event) => <article key={event.id}><span><ShieldCheck size={14} /></span><div><strong>{describePlayerAdminAuditAction(event.action).label}</strong><small>{event.actorDisplayName || event.actor}</small></div><time>{formatDate(event.createdAt)}</time></article>)}</div> : <div className={styles.compactEmpty}>尚无针对该玩家的管理操作</div>}
                </section> : null}

                {detailTab === 'danger' ? <section className={`${styles.detailSection} ${styles.dangerSection}`}>
                  <div className={styles.sectionHeading}><h3>永久删除玩家身份</h3><span>不可恢复</span></div>
                  <div className={styles.dangerSummary}><AlertTriangle size={20} /><div><strong>这不是封禁</strong><p>删除后玩家资料、角色、封禁记录和全部会话都会被移除。需要暂时阻止玩家进入时，请使用“封禁管理”。</p></div></div>
                </section> : null}
              </div>
            </div>

            {notice ? <div className={styles.drawerNotice} role="status"><span>{notice}</span><button aria-label="关闭提示" onClick={() => setNotice('')}><X size={15} /></button></div> : null}

            <footer className={styles.drawerActions}>
              {detailTab === 'danger' && ownerAccess ? <button className={styles.dangerButton} disabled={Boolean(busy)} onClick={remove}><Trash2 size={14} />{busy === 'delete' ? '删除中…' : '确认删除身份'}</button> : null}
              {detailTab === 'sessions' && canManageSessions ? <button className={styles.secondaryButton} disabled={Boolean(busy)} onClick={revokeSessions}>{busy === 'revoke' ? '下线中…' : '全部强制下线'}</button> : null}
              <span />
              <button className={styles.secondaryButton} disabled={Boolean(busy)} onClick={closeDetails}>关闭</button>
              {detailTab === 'profile' && canManageProfiles && !selected.guest ? <button className={styles.primaryButton} disabled={Boolean(busy)} onClick={() => void saveProfile()}>{busy === 'save' ? '保存中…' : '保存资料'}</button> : null}
              {detailTab === 'boxId' && canManageProfiles && !selected.guest ? <button className={styles.primaryButton} disabled={Boolean(busy)} onClick={saveBoxId}>{busy === 'boxId' ? '保存中…' : selected.boxId ? '保存绑定' : '清除绑定'}</button> : null}
              {detailTab === 'ban' && canManageBans ? <button className={styles.primaryButton} disabled={Boolean(busy)} onClick={() => void saveBan()}>{busy === 'save' ? '保存中…' : '保存封禁状态'}</button> : null}
            </footer>
          </section>
        </div>
      ) : null}

      <Dialog.Root open={createUserOpen} onOpenChange={(open) => { if (busy !== 'create-user') setCreateUserOpen(open); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={`${styles.modalDialog} ${styles.createUserDialog}`} aria-describedby={undefined}>
          <form onSubmit={(event) => { event.preventDefault(); void submitCreateUser(); }}>
            <AdminDialogHeader title="新增用户" closeLabel="关闭新增用户" disabled={busy === 'create-user'} />
            <div className={styles.createUserGrid}>
              <label>用户名<input autoFocus required minLength={3} maxLength={32} pattern="[A-Za-z][A-Za-z0-9_]{2,31}" autoComplete="off" value={createUser.username} onChange={(event) => setCreateUser({ ...createUser, username: event.target.value })} placeholder="例如 player_001" /></label>
              <label>昵称<input required maxLength={32} value={createUser.displayName} onChange={(event) => setCreateUser({ ...createUser, displayName: event.target.value })} placeholder="玩家显示名称" /></label>
              <label>初始密码<input required type="password" minLength={10} maxLength={128} autoComplete="new-password" value={createUser.password} onChange={(event) => setCreateUser({ ...createUser, password: event.target.value })} placeholder="10–128 位" /></label>
              <label>账号类型<input disabled value="普通玩家" /></label>
              <label>神岛 ID（可选）<input maxLength={64} value={createUser.boxId} onChange={(event) => setCreateUser({ ...createUser, boxId: event.target.value })} placeholder="未绑定" /></label>
              <label>标签（可选）<input value={createUser.tags} onChange={(event) => setCreateUser({ ...createUser, tags: event.target.value })} placeholder="测试员, 白名单" /></label>
              <label className={styles.fullField}>内部备注（可选）<textarea maxLength={2000} value={createUser.adminNote} onChange={(event) => setCreateUser({ ...createUser, adminNote: event.target.value })} placeholder="仅玩家管理后台可见" /></label>
            </div>
            {notice ? <div className={styles.loginError} role="alert">{notice}</div> : null}
            <footer className={styles.createUserActions}>
              <Dialog.Close asChild><button className={styles.secondaryButton} type="button" disabled={busy === 'create-user'}>取消</button></Dialog.Close>
              <button className={styles.primaryButton} type="submit" disabled={busy === 'create-user' || createUser.password.length < 10}>{busy === 'create-user' ? '创建中…' : '创建用户'}</button>
            </footer>
          </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={createAdminOpen} onOpenChange={(open) => { if (busy !== 'admin-save') setCreateAdminOpen(open); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={`${styles.modalDialog} ${styles.adminAccountDialog}`} aria-describedby={undefined}>
          <form onSubmit={(event) => { event.preventDefault(); void submitAdminAccount(); }}>
            <AdminDialogHeader title={editingAdminId ? '编辑管理账号' : '新增管理账号'} closeLabel="关闭管理账号编辑" disabled={busy === 'admin-save'} />
            <div className={styles.createUserGrid}>
              <label>管理员用户名<input autoFocus={!editingAdminId} required disabled={Boolean(editingAdminId)} minLength={3} maxLength={32} pattern="[A-Za-z][A-Za-z0-9_]{2,31}" autoComplete="off" value={createAdmin.username} onChange={(event) => setCreateAdmin({ ...createAdmin, username: event.target.value })} placeholder="例如 ops_admin" /></label>
              <label>显示名称<input required maxLength={32} value={createAdmin.displayName} onChange={(event) => setCreateAdmin({ ...createAdmin, displayName: event.target.value })} placeholder="后台显示名称" /></label>
              <label>{editingAdminId ? '新密码（可选）' : '初始密码'}<input id="admin-account-password" required={!editingAdminId} type="password" minLength={12} maxLength={128} autoComplete="new-password" value={createAdmin.password} onChange={(event) => setCreateAdmin({ ...createAdmin, password: event.target.value })} placeholder={editingAdminId ? '留空则保持原密码' : '至少 12 位'} /></label>
              <label>管理角色<select value={createAdmin.role} onChange={(event) => setCreateAdmin({ ...createAdmin, role: event.target.value as AdminAccount['role'], permissionGroupId: '' })}><option value="moderator">管理员</option><option value="admin">高级管理员</option></select></label>
              {createAdmin.role === 'moderator' ? <label>权限组<select value={createAdmin.permissionGroupId} onChange={(event) => setCreateAdmin({ ...createAdmin, permissionGroupId: event.target.value })}><option value="">仅查看</option>{permissionGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : null}
              {editingAdminId ? <label>账号状态<select value={createAdmin.status} onChange={(event) => setCreateAdmin({ ...createAdmin, status: event.target.value as AdminAccount['status'] })}><option value="active">启用</option><option value="disabled">停用</option></select></label> : null}
            </div>
            {notice ? <div className={styles.loginError} role="alert">{notice}</div> : null}
            <footer className={styles.createUserActions}>
              <Dialog.Close asChild><button className={styles.secondaryButton} type="button" disabled={busy === 'admin-save'}>取消</button></Dialog.Close>
              <button className={styles.primaryButton} type="submit" disabled={busy === 'admin-save' || (!editingAdminId && createAdmin.password.length < 12) || (Boolean(editingAdminId) && createAdmin.password.length > 0 && createAdmin.password.length < 12)}>{busy === 'admin-save' ? '保存中…' : editingAdminId ? '保存修改' : '创建管理账号'}</button>
            </footer>
          </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={permissionGroupOpen} onOpenChange={(open) => { if (!busy.startsWith('permission-group')) setPermissionGroupOpen(open); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={`${styles.modalDialog} ${styles.permissionGroupDialog}`} aria-describedby={undefined}>
          <form onSubmit={(event) => { event.preventDefault(); void savePermissionGroup(); }}>
            <AdminDialogHeader title={editingPermissionGroupId ? '编辑权限组' : '新建权限组'} closeLabel="关闭权限组" disabled={busy.startsWith('permission-group')} />
            <label>名称<input autoFocus required maxLength={32} value={permissionGroupForm.name} onChange={(event) => setPermissionGroupForm({ ...permissionGroupForm, name: event.target.value })} placeholder="例如：客服" /></label>
            <div className={styles.permissionGrid}>
              <article className={styles.permissionLocked}><span><strong>{PLAYER_ADMIN_CAPABILITY_META['players.view'].label}</strong><small>{PLAYER_ADMIN_CAPABILITY_META['players.view'].description}</small></span><em>默认</em></article>
              {PLAYER_ADMIN_GRANTABLE_CAPABILITIES.map((capability) => <label key={capability}><input type="checkbox" checked={permissionGroupForm.permissions.includes(capability)} onChange={(event) => setPermissionGroupForm({ ...permissionGroupForm, permissions: event.target.checked ? [...permissionGroupForm.permissions, capability] : permissionGroupForm.permissions.filter((value) => value !== capability) })} /><span><strong>{PLAYER_ADMIN_CAPABILITY_META[capability].label}</strong><small>{PLAYER_ADMIN_CAPABILITY_META[capability].description}</small></span></label>)}
            </div>
            {notice ? <div className={styles.loginError} role="alert">{notice}</div> : null}
            <footer className={styles.createUserActions}>
              <Dialog.Close asChild><button className={styles.secondaryButton} type="button" disabled={busy.startsWith('permission-group')}>取消</button></Dialog.Close>
              <button className={styles.primaryButton} type="submit" disabled={!permissionGroupForm.name.trim() || busy.startsWith('permission-group')}>{busy === 'permission-group-save' ? '保存中…' : '保存'}</button>
            </footer>
          </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
