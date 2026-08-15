import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Activity, AlertTriangle, Ban, Clock3, Download, FileClock, KeyRound,
  LayoutDashboard, LogOut, Monitor, RefreshCw, Search, ShieldCheck, Tags,
  Trash2, UserCog, Users, X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import styles from './player-management.module.css';

const TOKEN_KEY = 'box-play-admin-token';

type Player = {
  subjectId: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
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
  }>;
  loginHistory: Array<{
    createdAt: string;
    ip: string;
    userAgent: string;
  }>;
  adminHistory: Array<{
    id: string; action: string; actor: string; actorDisplayName: string;
    details: Record<string, unknown>; createdAt: string;
  }>;
  relatedAccounts: Array<{
    subjectId: string; displayName: string; username: string;
    sharedIp: string; lastSeenAt: string;
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
type PlayerDetailTab = 'profile' | 'identity' | 'permissions' | 'sessions' | 'logins' | 'ban' | 'password' | 'related' | 'history' | 'danger';
type AdminActor = {
  displayName: string;
  role: 'moderator' | 'admin' | 'owner';
  subjectId?: string;
  credential: 'owner-token' | 'account';
};
type AdminActivity = {
  id: string; kind: 'login' | 'admin'; action: string; actor: string;
  actorDisplayName: string; subjectId: string; displayName: string;
  username: string; ip: string; userAgent: string;
  details: Record<string, unknown>; createdAt: string;
};

type PlayersPageProps = {
  returnUrl: string;
  returnLabel: string;
  initialSection: AdminSection;
};

const sectionMeta: Record<AdminSection, { title: string; description: string }> = {
  overview: { title: '运营概览', description: '查看玩家规模、活跃度和需要处理的事项' },
  players: { title: '玩家目录', description: '搜索所有注册玩家，维护资料、标签和备注' },
  sessions: { title: '在线与会话', description: '定位当前在线设备，撤销会话或强制玩家下线' },
  bans: { title: '封禁管理', description: '集中处理临时封禁、永久封禁和自动解封' },
  roles: { title: '角色与权限', description: '管理普通玩家、管理员和服主账号的权限边界' },
  audit: { title: '安全与审计', description: '追踪登录风险、账号关联线索和敏感管理操作' },
};

const detailTabMeta: Record<PlayerDetailTab, { title: string; description: string }> = {
  profile: { title: '基本资料', description: '只维护玩家对外显示资料和服主内部备注。' },
  identity: { title: '身份档案', description: '查看不可变身份标识、生命周期和网络记录。' },
  permissions: { title: '角色权限', description: '只调整玩家在服务器后台中的管理角色。' },
  sessions: { title: '会话设备', description: '查看当前有效设备，并按设备或全部强制下线。' },
  logins: { title: '登录记录', description: '查看最近成功登录的设备、时间和来源地址。' },
  ban: { title: '封禁管理', description: '设置临时封禁、永久封禁或恢复正常状态。' },
  password: { title: '密码重置', description: '为玩家设置临时密码，并撤销现有登录会话。' },
  related: { title: '关联线索', description: '依据近 90 天共享登录 IP 辅助排查关联账号。' },
  history: { title: '管理记录', description: '追溯管理员针对该玩家执行的全部敏感操作。' },
  danger: { title: '删除身份', description: '永久删除玩家身份以及它关联的全部登录会话。' },
};

function parseSection(value: unknown): AdminSection {
  const section = Array.isArray(value) ? value[0] : value;
  return ['overview', 'players', 'sessions', 'bans', 'roles', 'audit'].includes(String(section))
    ? section as AdminSection
    : 'overview';
}

export const getServerSideProps: GetServerSideProps<PlayersPageProps> = async ({ query }) => {
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

function roleLabel(role: Player['role']) {
  return role === 'admin' ? '服主' : role === 'moderator' ? '管理员' : '玩家';
}

function auditLabel(action: string) {
  if (action === 'login.success') return '账号登录成功';
  if (action === 'login.failed') return '账号登录失败';
  if (action === 'player.update') return '修改玩家资料';
  if (action === 'player.delete') return '删除玩家身份';
  if (action === 'player.sessions.revoke') return '强制玩家下线';
  if (action === 'player.session.revoke') return '撤销单个设备会话';
  if (action === 'player.password.reset') return '重置玩家密码';
  if (action === 'system.sessions.cleanup') return '清理过期登录会话';
  return action;
}

function adminHeaders(token: string, json = false): Record<string, string> {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  const [token, setToken] = useState('');
  const [actor, setActor] = useState<AdminActor | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('loading');
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminToken, setAdminToken] = useState('');
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
    const saved = sessionStorage.getItem(TOKEN_KEY) || '';
    setToken(saved);
    setBusy('loading');
    const headers = adminHeaders(saved);
    const [verifyResponse, playersResponse, overviewResponse] = await Promise.all([
      fetch('/api/play-admin/verify', { method: 'POST', headers, cache: 'no-store' }),
      fetch(`/api/play-admin/players?${new URLSearchParams({
        search: appliedSearch,
        page: String(page),
        pageSize: '30',
        identity: identityFilter,
        role: roleFilter,
        online: onlineFilter,
        sort,
      })}`, { headers, cache: 'no-store' }),
      fetch('/api/play-admin/players/overview', { headers, cache: 'no-store' }),
    ]);
    const [verifyData, playersData, overviewData] = await Promise.all([
      verifyResponse.json().catch(() => ({})), playersResponse.json(), overviewResponse.json(),
    ]);
    if (!verifyResponse.ok) {
      if (saved) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken('');
        return load();
      }
      setBusy('');
      setLoginOpen(true);
      throw new Error(verifyData.message || '需要管理员账号或服主密钥');
    }
    if (!playersResponse.ok) throw new Error(playersData.message || '无法读取玩家');
    if (!overviewResponse.ok) throw new Error(overviewData.message || '无法读取玩家统计');
    setPlayers(playersData.players);
    setTotal(playersData.total || 0);
    setPage(playersData.page || 1);
    setTotalPages(playersData.totalPages || 1);
    setOverview(overviewData);
    setActor(verifyData.actor || null);
    setLoginOpen(false);
    setBusy('');
  }, [appliedSearch, identityFilter, onlineFilter, page, roleFilter, sort]);

  async function verifyAdmin() {
    if (!adminToken || busy === 'verify') return;
    setBusy('verify');
    setNotice('');
    try {
      const response = await fetch('/api/play-admin/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '验证失败');
      sessionStorage.setItem(TOKEN_KEY, adminToken);
      setToken(adminToken);
      setActor(data.actor || null);
      setLoginOpen(false);
      setBusy('');
      await load();
    } catch (error) {
      setBusy('');
      setNotice((error as Error).message);
    }
  }

  async function loginWithCurrentAccount() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setAdminToken('');
    setNotice('');
    setLoginOpen(false);
    try {
      await load();
    } catch (error) {
      setNotice((error as Error).message);
    }
  }

  useEffect(() => {
    load().catch((error) => {
      setBusy('');
      setNotice(error.message);
    });
  }, [load]);

  const loadActivity = useCallback(async () => {
    if (section !== 'audit') return;
    setBusy('activity');
    const saved = sessionStorage.getItem(TOKEN_KEY) || '';
    const response = await fetch(`/api/play-admin/activity?${new URLSearchParams({
      kind: activityKind, search: activitySearch.trim(), page: String(activityPage), pageSize: '30',
    })}`, { headers: adminHeaders(saved), cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '无法读取安全审计');
    setActivity(data.events || []);
    setActivityPage(data.page || 1);
    setActivityTotalPages(data.totalPages || 1);
    setBusy('');
  }, [activityKind, activityPage, activitySearch, section]);

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
  const ownerAccess = actor?.role === 'owner' || actor?.role === 'admin';

  async function openDetails(player: Player) {
    setSelected(player);
    setDetailTab('profile');
    setDetails(null);
    setBusy('details');
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${player.subjectId}`, {
        headers: adminHeaders(token || sessionStorage.getItem(TOKEN_KEY) || ''),
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
    if (busy === 'save' || busy === 'delete') return;
    setSelected(null);
    setDetails(null);
  }

  async function save() {
    if (!selected) return;
    setBusy('save');
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'PATCH',
        headers: adminHeaders(token, true),
        body: JSON.stringify({
          displayName: selected.displayName,
          avatar: selected.avatar,
          ...(ownerAccess ? { role: selected.role } : {}),
          status: selected.status,
          adminNote: selected.adminNote,
          tags: selected.tags,
          banReason: selected.banReason,
          bannedUntil: selected.bannedUntil || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '保存失败');
      setSelected(data.player);
      setDetails((current) => current ? { ...current, player: data.player } : current);
      await load();
      setNotice('玩家资料已保存');
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
        method: 'DELETE', headers: adminHeaders(token),
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
    if (!selected || !confirm(`确定强制“${selected.displayName}”的全部设备退出登录并断开游戏连接吗？`)) return;
    setBusy('revoke');
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'POST',
        headers: adminHeaders(token, true),
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
    if (busy) return;
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
        headers: adminHeaders(token || sessionStorage.getItem(TOKEN_KEY) || ''),
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
        headers: adminHeaders(token || sessionStorage.getItem(TOKEN_KEY) || '', true),
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
    if (!selected || !confirm('确定撤销这个设备的登录会话吗？该设备会立即退出。')) return;
    setBusy(`session:${sessionId}`);
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'POST',
        headers: adminHeaders(token, true),
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

  async function batchAction(action: 'revoke-sessions' | 'temporary-ban' | 'ban' | 'unban' | 'add-tag' | 'remove-tag') {
    if (!selectedIds.length || busy) return;
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
        method: 'POST', headers: adminHeaders(token, true),
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
    if (!selected || !ownerAccess || newPassword.length < 8) return;
    if (!confirm(`确定重置“${selected.displayName}”的密码并撤销全部会话吗？`)) return;
    setBusy('password');
    try {
      const response = await fetch(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'POST', headers: adminHeaders(token, true),
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

  return (
    <>
      <Head><title>玩家管理</title></Head>
      <main className={styles.adminShell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}><span>BOX</span><div><strong>玩家服务</strong><small>SERVER CONSOLE</small></div></div>
          <nav aria-label="玩家后台分类">
            <button aria-current={section === 'overview' ? 'page' : undefined} className={section === 'overview' ? styles.navActive : ''} onClick={() => navigateSection('overview')}><span><LayoutDashboard size={17} /></span><div>运营概览<small>规模、活跃与待办</small></div></button>
            <button aria-current={section === 'players' ? 'page' : undefined} className={section === 'players' ? styles.navActive : ''} onClick={() => navigateSection('players')}><span><Users size={17} /></span><div>玩家目录<small>资料、标签与备注</small></div></button>
            <button aria-current={section === 'sessions' ? 'page' : undefined} className={section === 'sessions' ? styles.navActive : ''} onClick={() => navigateSection('sessions')}><span><Monitor size={17} /></span><div>在线与会话<small>设备和强制下线</small></div></button>
            <button aria-current={section === 'bans' ? 'page' : undefined} className={section === 'bans' ? styles.navActive : ''} onClick={() => navigateSection('bans')}><span><Ban size={17} /></span><div>封禁管理<small>临时与永久处罚</small></div></button>
            <button aria-current={section === 'roles' ? 'page' : undefined} className={section === 'roles' ? styles.navActive : ''} onClick={() => navigateSection('roles')}><span><UserCog size={17} /></span><div>角色与权限<small>管理员和服主</small></div></button>
            <button aria-current={section === 'audit' ? 'page' : undefined} className={section === 'audit' ? styles.navActive : ''} onClick={() => navigateSection('audit')}><span><ShieldCheck size={17} /></span><div>安全与审计<small>登录风险与操作记录</small></div></button>
          </nav>
          <div className={styles.sidebarFooter}><span className={styles.healthDot} />PostgreSQL 已连接</div>
        </aside>

        <section className={styles.workspace}>
          <header className={styles.header}>
            <div>
              <div className={styles.titleRow}><h1>{sectionMeta[section].title}</h1><span>{stats.identities} 个身份</span></div>
              <p>{sectionMeta[section].description}</p>
            </div>
            <div className={styles.headerTools}>
              {actor ? <div className={styles.headerIdentity} aria-label={`当前操作者：${actor.displayName}`}><ShieldCheck size={15} /><span><small>当前操作者</small><strong>{actor.displayName} · {actor.credential === 'owner-token' ? '服主密钥' : roleLabel(actor.role as Player['role'])}</strong></span></div> : null}
              <div className={styles.headerActions}>
                <button className={styles.secondaryButton} disabled={busy === 'loading'} onClick={() => load().catch((error) => setNotice(error.message))}><RefreshCw size={14} />{busy === 'loading' ? '刷新中…' : '刷新数据'}</button>
                <button className={styles.secondaryButton} onClick={() => setLoginOpen(true)}><KeyRound size={14} />验证方式</button>
                {returnUrl ? <Link className={styles.secondaryButton} href={returnUrl}>{returnLabel}</Link> : null}
              </div>
            </div>
          </header>

          {notice ? <div className={styles.notice} role="status"><span>{notice}</span><button aria-label="关闭提示" onClick={() => setNotice('')}><X size={16} /></button></div> : null}

          {section === 'overview' ? <>
            <section className={styles.metricGrid} aria-label="玩家核心指标">
              <article><span>注册玩家</span><strong>{stats.users}</strong><small>必须登录后才能进入游戏或创作</small></article>
              <article><span>24 小时活跃</span><strong>{stats.activeLast24Hours}</strong><small>按最后在线时间统计</small></article>
              <article><span>当前有效会话</span><strong>{stats.activeSessions}</strong><small>所有已登录设备会话</small></article>
              <article><span>近 7 天新增</span><strong>{stats.newLast7Days}</strong><small>新注册玩家账号</small></article>
              <article><span>24 小时登录</span><strong>{stats.loginsLast24Hours}</strong><small>成功 {stats.loginsLast24Hours} 次 · 失败 {stats.failedLoginsLast24Hours} 次</small></article>
              <article><span>近 7 天登录 IP</span><strong>{stats.uniqueLoginIpsLast7Days}</strong><small>已去重的有效来源</small></article>
              <article><span>管理角色</span><strong>{stats.admins + stats.moderators}</strong><small>{stats.admins} 服主 · {stats.moderators} 管理员</small></article>
              <article><span>已封禁</span><strong className={stats.banned ? styles.dangerText : ''}>{stats.banned}</strong><small>封禁后会自动撤销会话</small></article>
            </section>
            <section className={styles.managementShortcuts} aria-label="管理工作区快捷入口">
              <button onClick={() => navigateSection('players')}><span><Users size={16} /></span><div><strong>查找玩家</strong><small>资料、标签与服主备注</small></div><b>{stats.users}</b></button>
              <button onClick={() => navigateSection('sessions')}><span><Monitor size={16} /></span><div><strong>在线与会话</strong><small>设备会话和强制下线</small></div><b>{stats.activeSessions}</b></button>
              <button onClick={() => navigateSection('bans')}><span><Ban size={16} /></span><div><strong>封禁管理</strong><small>处罚与自动解封</small></div><b>{stats.banned}</b></button>
              <button onClick={() => navigateSection('roles')}><span><UserCog size={16} /></span><div><strong>角色与权限</strong><small>管理员和服主账号</small></div><b>{stats.admins + stats.moderators}</b></button>
            </section>
            <div className={styles.dashboardColumns}>
              <section className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>最近账号登录</h2><p>最新 30 条成功登录事件</p></div><button onClick={() => navigateSection('audit')}>查看全部</button></div>
                <div className={styles.activityList}>{overview?.recentLogins.slice(0, 8).map((event, index) => <article key={`${event.subjectId}-${event.createdAt}-${index}`}><span className={styles.avatar}>{event.displayName.slice(0, 1)}</span><div><strong>{event.displayName}</strong><small>{event.username ? `@${event.username}` : event.subjectId}</small></div><div className={styles.activityMeta}><strong>{displayIp(event.ip)}</strong><small>{formatDate(event.createdAt)}</small></div></article>)}</div>
                {!overview?.recentLogins.length ? <div className={styles.compactEmpty}>目前没有账号登录记录</div> : null}
              </section>
              <section className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>身份构成</h2><p>PostgreSQL 当前真实数据</p></div></div>
                <dl className={styles.breakdown}><div><dt>注册账号</dt><dd>{stats.users}</dd></div><div><dt>普通玩家</dt><dd>{Math.max(0, stats.users - stats.admins - stats.moderators)}</dd></div><div><dt>管理角色</dt><dd>{stats.admins + stats.moderators}</dd></div><div><dt>正常账号</dt><dd>{Math.max(0, stats.users - stats.banned)}</dd></div><div><dt>封禁账号</dt><dd>{stats.banned}</dd></div></dl>
              </section>
            </div>
          </> : null}

          {(['players', 'sessions', 'bans', 'roles'] as AdminSection[]).includes(section) ? <>
            <section className={styles.contextStats} aria-label={`${sectionMeta[section].title}统计`}>
              {section === 'players' ? <>
                <article><span>注册玩家</span><strong>{stats.users}</strong><small>当前可管理账号总数</small></article>
                <article><span>近 7 天新增</span><strong>{stats.newLast7Days}</strong><small>新注册账号</small></article>
                <article><span>24 小时活跃</span><strong>{stats.activeLast24Hours}</strong><small>最近在线玩家</small></article>
                <article><span>带标签筛选</span><strong>{total}</strong><small>当前条件结果</small></article>
              </> : null}
              {section === 'sessions' ? <>
                <article><span>有效设备会话</span><strong>{stats.activeSessions}</strong><small>尚未过期的登录凭据</small></article>
                <article><span>当前筛选玩家</span><strong>{total}</strong><small>至少有一个有效会话</small></article>
                <article><span>24 小时登录</span><strong>{stats.loginsLast24Hours}</strong><small>成功登录事件</small></article>
                <article><span>过期记录</span><strong>{overview?.security.expiredSessions || 0}</strong><small>{ownerAccess ? '可在本页集中清理' : '仅服主可清理'}</small></article>
              </> : null}
              {section === 'bans' ? <>
                <article><span>当前封禁</span><strong className={stats.banned ? styles.dangerText : ''}>{stats.banned}</strong><small>临时与永久封禁总数</small></article>
                <article><span>24 小时内到期</span><strong>{overview?.security.temporaryBansEndingSoon || 0}</strong><small>到期后自动恢复</small></article>
                <article><span>正常账号</span><strong>{Math.max(0, stats.users - stats.banned)}</strong><small>可以正常登录</small></article>
                <article><span>当前筛选结果</span><strong>{total}</strong><small>可批量解除或调整</small></article>
              </> : null}
              {section === 'roles' ? <>
                <article><span>服主账号</span><strong>{stats.admins}</strong><small>拥有全部后台权限</small></article>
                <article><span>管理员</span><strong>{stats.moderators}</strong><small>可管理普通玩家</small></article>
                <article><span>普通玩家</span><strong>{Math.max(0, stats.users - stats.admins - stats.moderators)}</strong><small>没有后台权限</small></article>
                <article><span>权限账号合计</span><strong>{stats.admins + stats.moderators}</strong><small>建议保持最小授权</small></article>
              </> : null}
            </section>
            {section === 'sessions' && ownerAccess && overview?.security.expiredSessions ? <div className={styles.sectionCallout}><div><Clock3 size={17} /><span><strong>发现 {overview.security.expiredSessions} 条过期会话记录</strong><small>过期记录不会继续授权，但定期清理可以减少数据库体积。</small></span></div><button className={styles.secondaryButton} disabled={Boolean(busy)} onClick={() => void cleanupExpiredSessions()}>清理过期会话</button></div> : null}
            {section === 'roles' ? <div className={styles.sectionCallout}><div><ShieldCheck size={17} /><span><strong>权限修改需要服主或 admin 账号</strong><small>管理员只能处理普通玩家，不能修改其他管理员或服主。</small></span></div></div> : null}
            <div className={styles.toolbar}>
              <div className={styles.searchField}><Search size={16} aria-hidden="true" /><input aria-label="搜索玩家" placeholder="搜索用户名、昵称、标签、备注或身份 ID" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); }} /></div>
              <select className={styles.filterSelect} aria-label="角色筛选" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as typeof roleFilter); setPage(1); }}><option value="all">全部角色</option><option value="player">玩家</option><option value="moderator">管理员</option><option value="admin">服主</option></select>
              {section === 'players' || section === 'sessions' ? <select className={styles.filterSelect} aria-label="在线筛选" value={onlineFilter} onChange={(event) => { setOnlineFilter(event.target.value as typeof onlineFilter); setPage(1); }}><option value="all">全部会话</option><option value="online">当前在线</option><option value="offline">当前离线</option></select> : null}
              <select className={styles.filterSelect} aria-label="排序方式" value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }}><option value="lastSeen">最近在线</option><option value="registered">最近注册</option><option value="displayName">昵称排序</option><option value="loginCount">登录次数</option></select>
              <button className={styles.primaryButton} disabled={busy === 'loading'} onClick={submitSearch}>{busy === 'loading' ? '读取中…' : '搜索'}</button>
              <button className={styles.secondaryButton} disabled={Boolean(busy)} onClick={() => void exportPlayers()}><Download size={14} />{busy === 'export' ? '导出中…' : '导出 CSV'}</button>
              {search || appliedSearch ? <button className={styles.textButton} onClick={() => { setSearch(''); setAppliedSearch(''); setPage(1); }}>清除</button> : null}
            </div>
            {selectedIds.length ? <div className={styles.batchToolbar}><strong>已选择 {selectedIds.length} 位玩家</strong>{section === 'sessions' || section === 'players' ? <button onClick={() => void batchAction('revoke-sessions')}><LogOut size={14} />强制下线</button> : null}{section === 'players' ? <><button onClick={() => void batchAction('temporary-ban')}><Ban size={14} />临时封禁</button><button onClick={() => void batchAction('ban')}><Ban size={14} />永久封禁</button><button onClick={() => void batchAction('add-tag')}><Tags size={14} />增加标签</button><button onClick={() => void batchAction('remove-tag')}><Tags size={14} />移除标签</button></> : null}{section === 'bans' ? <button onClick={() => void batchAction('unban')}><ShieldCheck size={14} />解除封禁</button> : null}<button className={styles.batchClear} onClick={() => setSelectedIds([])}><X size={14} />清空</button></div> : null}
            <section className={styles.tableCard} aria-busy={busy === 'loading'}><table><thead><tr><th className={styles.checkCell}><input type="checkbox" aria-label="选择本页玩家" checked={Boolean(displayedPlayers.length) && displayedPlayers.every((player) => selectedIds.includes(player.subjectId))} onChange={(event) => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...displayedPlayers.map((player) => player.subjectId)])] : selectedIds.filter((id) => !displayedPlayers.some((player) => player.subjectId === id)))} /></th><th>玩家</th><th>身份与角色</th><th>注册信息</th><th>最后登录</th><th>最后在线</th><th>状态</th></tr></thead><tbody>{displayedPlayers.map((player) => <tr key={player.subjectId} tabIndex={0} onClick={() => openDetails(player)} onKeyDown={(event) => { if (event.key === 'Enter') openDetails(player); }}><td className={styles.checkCell} onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`选择 ${player.displayName}`} checked={selectedIds.includes(player.subjectId)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, player.subjectId] : ids.filter((id) => id !== player.subjectId))} /></td><td><div className={styles.playerCell}><span className={styles.avatar}>{player.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{player.displayName}</strong><small>{player.username ? `@${player.username}` : player.userKey}</small></span></div></td><td><strong>{player.guest ? '游客' : `账号 #${player.userId}`}</strong><small>{roleLabel(player.role)} · {player.activeSessionCount} 个会话</small></td><td><strong>{formatDate(player.registeredAt || player.createdAt)}</strong><small>{displayIp(player.registrationIp || player.firstSeenIp)}</small></td><td><strong>{player.guest ? '未注册账号' : formatDate(player.lastLoginAt)}</strong><small>{player.guest ? '—' : `${player.loginCount} 次 · ${displayIp(player.lastLoginIp)}`}</small></td><td><strong>{formatDate(player.lastSeenAt)}</strong><small>{displayIp(player.lastSeenIp)}</small></td><td><span className={player.status === 'banned' ? styles.badStatus : styles.goodStatus}>{player.status === 'banned' ? (player.bannedUntil ? `封禁至 ${formatDate(player.bannedUntil)}` : '永久封禁') : '正常'}</span></td></tr>)}</tbody></table>{busy === 'loading' && !displayedPlayers.length ? <div className={styles.empty}>正在读取玩家记录…</div> : null}{busy !== 'loading' && !displayedPlayers.length ? <div className={styles.empty}>暂无符合条件的玩家记录</div> : null}</section>
            <div className={styles.pagination}><span>共 {total} 位玩家 · 第 {page} / {totalPages} 页</span><div><button className={styles.secondaryButton} disabled={page <= 1 || busy === 'loading'} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><button className={styles.secondaryButton} disabled={page >= totalPages || busy === 'loading'} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页</button></div></div>
          </> : null}

          {section === 'audit' ? <>
            <section className={styles.riskGrid}>
              <article><span><AlertTriangle size={16} />24 小时登录失败</span><strong>{stats.failedLoginsLast24Hours}</strong><small>{overview?.security.topFailedIps[0] ? `最高来源 ${overview.security.topFailedIps[0].ip}（${overview.security.topFailedIps[0].attempts} 次）` : '暂未发现失败登录'}</small></article>
              <article><span><Users size={16} />共享登录 IP</span><strong>{overview?.security.sharedLoginIps.length || 0}</strong><small>近 30 天被多个账号使用的 IP</small></article>
              <article><span><Ban size={16} />即将到期封禁</span><strong>{overview?.security.temporaryBansEndingSoon || 0}</strong><small>未来 24 小时内自动解封</small></article>
              <article><span><Monitor size={16} />过期会话记录</span><strong>{overview?.security.expiredSessions || 0}</strong>{ownerAccess && overview?.security.expiredSessions ? <button className={styles.inlineAction} disabled={Boolean(busy)} onClick={() => void cleanupExpiredSessions()}>立即清理</button> : <small>不会授权登录，可定期清理</small>}</article>
            </section>
            <section className={styles.securityGrid}>
              <div className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>高频失败来源</h2><p>近 24 小时登录失败次数最多的 IP</p></div></div><div className={styles.riskList}>{overview?.security.topFailedIps.map((entry) => <article key={entry.ip}><strong className={styles.mono}>{entry.ip}</strong><span>{entry.attempts} 次</span><time>{formatDate(entry.lastAttemptAt)}</time></article>)}{!overview?.security.topFailedIps.length ? <div className={styles.compactEmpty}>没有失败登录来源</div> : null}</div></div>
              <div className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>账号关联线索</h2><p>近 30 天被多个账号共同使用的登录 IP，仅作为排查线索</p></div></div><div className={styles.riskList}>{overview?.security.sharedLoginIps.map((entry) => <article key={entry.ip}><strong className={styles.mono}>{entry.ip}</strong><span>{entry.accounts} 个账号</span><time>{formatDate(entry.lastSeenAt)}</time></article>)}{!overview?.security.sharedLoginIps.length ? <div className={styles.compactEmpty}>没有共享登录 IP</div> : null}</div></div>
            </section>
            <div className={styles.activityToolbar}><div className={styles.segmented}><button className={activityKind === 'all' ? styles.segmentActive : ''} onClick={() => { setActivityKind('all'); setActivityPage(1); }}>全部事件</button><button className={activityKind === 'login' ? styles.segmentActive : ''} onClick={() => { setActivityKind('login'); setActivityPage(1); }}>账号登录</button><button className={activityKind === 'admin' ? styles.segmentActive : ''} onClick={() => { setActivityKind('admin'); setActivityPage(1); }}>管理操作</button></div><div className={styles.searchField}><Search size={16} /><input placeholder="搜索动作、操作者、玩家、IP 或身份 ID" value={activitySearch} onChange={(event) => { setActivitySearch(event.target.value); setActivityPage(1); }} /></div></div>
            <section className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>完整安全活动</h2><p>账号登录和所有敏感管理操作，按时间统一追溯</p></div><span>{busy === 'activity' ? '读取中…' : `第 ${activityPage} 页`}</span></div><div className={styles.auditTable}>{activity.map((event) => <article key={event.id}><span className={styles.auditIcon}>{event.kind === 'login' ? <Activity size={16} /> : <ShieldCheck size={16} />}</span><div className={styles.auditMain}><strong>{auditLabel(event.action)}</strong><small>目标：{event.displayName || event.username || event.subjectId || '系统'}</small></div><div><strong>{event.actorDisplayName || event.actor}</strong><small>操作者</small></div><div><strong className={styles.mono}>{displayIp(event.ip)}</strong><small>{event.userAgent || '客户端未记录'}</small></div><time>{formatDate(event.createdAt)}</time></article>)}</div>{!activity.length && busy !== 'activity' ? <div className={styles.compactEmpty}>暂无符合条件的安全活动</div> : null}</section>
            <div className={styles.pagination}><span>第 {activityPage} / {activityTotalPages} 页</span><div><button className={styles.secondaryButton} disabled={activityPage <= 1} onClick={() => setActivityPage((value) => value - 1)}>上一页</button><button className={styles.secondaryButton} disabled={activityPage >= activityTotalPages} onClick={() => setActivityPage((value) => value + 1)}>下一页</button></div></div>
          </> : null}
        </section>
      </main>

      {selected ? (
        <div className={styles.backdrop} onMouseDown={closeDetails}>
          <section className={styles.drawer} onMouseDown={(event) => event.stopPropagation()} aria-label="玩家详情">
            <header className={styles.drawerHeader}>
              <div className={styles.playerCell}>
                <span className={styles.largeAvatar}>{selected.displayName.slice(0, 1).toUpperCase()}</span>
                <span>
                  <span className={styles.drawerEyebrow}>{selected.guest ? '游客身份' : `本地账号 #${selected.userId}`}</span>
                  <h2>{selected.displayName}</h2>
                  <small>{selected.username ? `@${selected.username}` : selected.userKey}</small>
                </span>
              </div>
              <button className={styles.closeButton} aria-label="关闭玩家详情" onClick={closeDetails}><X size={19} /></button>
            </header>

            <div className={styles.detailWorkspace}>
              <nav className={styles.detailTabs} aria-label="玩家详情功能">
                <button className={detailTab === 'profile' ? styles.detailTabActive : ''} onClick={() => setDetailTab('profile')}><UserCog size={15} /><span><strong>基本资料</strong><small>昵称、头像、标签和备注</small></span></button>
                <button className={detailTab === 'identity' ? styles.detailTabActive : ''} onClick={() => setDetailTab('identity')}><ShieldCheck size={15} /><span><strong>身份档案</strong><small>标识、时间和网络记录</small></span></button>
                <button className={detailTab === 'permissions' ? styles.detailTabActive : ''} onClick={() => setDetailTab('permissions')}><UserCog size={15} /><span><strong>角色权限</strong><small>玩家与管理员角色</small></span></button>
                <button className={detailTab === 'sessions' ? styles.detailTabActive : ''} onClick={() => setDetailTab('sessions')}><Monitor size={15} /><span><strong>会话设备</strong><small>当前登录设备与下线</small></span></button>
                <button className={detailTab === 'logins' ? styles.detailTabActive : ''} onClick={() => setDetailTab('logins')}><Activity size={15} /><span><strong>登录记录</strong><small>登录时间、设备和地址</small></span></button>
                <button className={detailTab === 'ban' ? styles.detailTabActive : ''} onClick={() => setDetailTab('ban')}><Ban size={15} /><span><strong>封禁管理</strong><small>临时、永久与解封</small></span></button>
                <button className={detailTab === 'password' ? styles.detailTabActive : ''} onClick={() => setDetailTab('password')}><KeyRound size={15} /><span><strong>密码重置</strong><small>设置临时登录密码</small></span></button>
                <button className={detailTab === 'related' ? styles.detailTabActive : ''} onClick={() => setDetailTab('related')}><Users size={15} /><span><strong>关联线索</strong><small>共享登录 IP 排查</small></span></button>
                <button className={detailTab === 'history' ? styles.detailTabActive : ''} onClick={() => setDetailTab('history')}><FileClock size={15} /><span><strong>管理记录</strong><small>敏感操作审计时间线</small></span></button>
                {ownerAccess ? <button className={`${styles.detailDangerTab} ${detailTab === 'danger' ? styles.detailTabActive : ''}`} onClick={() => setDetailTab('danger')}><Trash2 size={15} /><span><strong>删除身份</strong><small>不可恢复的危险操作</small></span></button> : null}
              </nav>

              <div className={styles.drawerBody}>
                <div className={styles.detailPageHeader}><span>玩家管理</span><h3>{detailTabMeta[detailTab].title}</h3><p>{detailTabMeta[detailTab].description}</p></div>
                {busy === 'details' && !details ? <div className={styles.empty}>正在读取玩家详情…</div> : null}

                {detailTab === 'profile' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>玩家资料</h3><span>可编辑</span></div>
                  {selected.guest ? <div className={styles.infoNote}>游客没有可编辑账号资料。</div> : <div className={styles.formGrid}>
                    <label>昵称<input value={selected.displayName} onChange={(event) => setSelected({ ...selected, displayName: event.target.value })} /></label>
                    <label>头像资源或地址<input value={selected.avatar || ''} onChange={(event) => setSelected({ ...selected, avatar: event.target.value })} placeholder="可留空" /></label>
                    <label className={styles.fullField}>标签（用逗号分隔）<input value={selected.tags.join(', ')} onChange={(event) => setSelected({ ...selected, tags: event.target.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) })} placeholder="例如：测试员, 重点关注" /></label>
                    <label className={styles.fullField}>服主备注<textarea value={selected.adminNote} onChange={(event) => setSelected({ ...selected, adminNote: event.target.value })} placeholder="仅后台可见，不会发送给游戏脚本" /></label>
                  </div>}
                </section> : null}

                {detailTab === 'identity' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>只读身份档案</h3><span>系统记录</span></div>
                  <dl className={styles.detailGrid}>
                    <div><dt>userKey（存档键）</dt><dd className={styles.mono}>{selected.userKey}</dd></div>
                    <div><dt>身份 ID</dt><dd className={styles.mono}>{selected.subjectId}</dd></div>
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

                {detailTab === 'permissions' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>后台管理角色</h3><span>{ownerAccess ? '服主可修改' : '只读'}</span></div>
                  {!selected.guest ? <div className={styles.singleField}><label>角色<select disabled={!ownerAccess} value={selected.role} onChange={(event) => setSelected({ ...selected, role: event.target.value as Player['role'] })}><option value="player">玩家</option><option value="moderator">管理员</option><option value="admin">服主</option></select></label><p>管理员可处理玩家与封禁；服主还可管理角色、重置密码和删除身份。</p></div> : <div className={styles.infoNote}>游客不能获得后台管理角色。</div>}
                </section> : null}

                {detailTab === 'sessions' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>当前有效会话</h3><span>{details?.sessions.length || 0} 条</span></div>
                  {details?.sessions.length ? <div className={styles.recordList}>{details.sessions.map((session, index) => <article key={`${session.createdAt}-${index}`}><div><strong>{deviceLabel(session.userAgent)}</strong><span>{formatDate(session.lastSeenAt)}</span></div><small className={styles.recordIp}>{displayIp(session.lastSeenIp || session.createdIp)}</small><p>{session.userAgent || '未记录客户端信息'}</p><div className={styles.sessionFooter}><small>创建 {formatDate(session.createdAt)} · 到期 {formatDate(session.expiresAt)}</small><button className={styles.textButton} disabled={Boolean(busy)} onClick={() => revokeSession(session.sessionId)}>{busy === `session:${session.sessionId}` ? '撤销中…' : '撤销此设备'}</button></div></article>)}</div> : <div className={styles.compactEmpty}>没有有效登录会话</div>}
                </section> : null}

                {detailTab === 'logins' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>最近成功登录</h3><span>{details?.loginHistory.length || 0} 条</span></div>
                  {details?.loginHistory.length ? <div className={styles.recordList}>{details.loginHistory.map((event, index) => <article key={`${event.createdAt}-${index}`}><div><strong>{deviceLabel(event.userAgent)}</strong><span>{formatDate(event.createdAt)}</span></div><small className={styles.recordIp}>{displayIp(event.ip)}</small><p>{event.userAgent || '未记录客户端信息'}</p></article>)}</div> : <div className={styles.compactEmpty}>{selected.guest ? '游客没有账号登录记录' : '旧账号或尚无登录历史'}</div>}
                </section> : null}

                {detailTab === 'ban' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>账号处罚状态</h3><span>{selected.status === 'banned' ? '已封禁' : '正常'}</span></div>
                  <div className={styles.formGrid}>
                    <label className={styles.fullField}>封禁状态<select value={playerBanMode(selected)} onChange={(event) => { const mode = event.target.value as 'active' | 'temporary' | 'permanent'; setSelected({ ...selected, status: mode === 'active' ? 'active' : 'banned', bannedUntil: mode === 'temporary' ? selected.bannedUntil || temporaryBanUntil(24) : undefined }); }}><option value="active">正常</option><option value="temporary">临时封禁</option><option value="permanent">永久封禁</option></select></label>
                    {selected.status === 'banned' ? <><label className={styles.fullField}>封禁原因<textarea value={selected.banReason} onChange={(event) => setSelected({ ...selected, banReason: event.target.value })} placeholder="记录处罚依据" /></label>{selected.bannedUntil ? <><label>自动解封时间<input type="datetime-local" min={dateTimeLocalValue(new Date().toISOString())} value={dateTimeLocalValue(selected.bannedUntil)} onChange={(event) => setSelected({ ...selected, bannedUntil: event.target.value ? new Date(event.target.value).toISOString() : temporaryBanUntil(24) })} /></label><div className={styles.banPresets}><span>快速设置</span><div>{[[1, '1 小时'], [24, '1 天'], [72, '3 天'], [168, '7 天'], [720, '30 天']].map(([hours, label]) => <button type="button" key={String(hours)} onClick={() => setSelected({ ...selected, bannedUntil: temporaryBanUntil(Number(hours)) })}>{label}</button>)}</div></div></> : null}<div className={`${styles.fieldHelp} ${styles.fullField}`}>保存封禁后会撤销全部会话，并通知运行中的地图断开该玩家。</div></> : <div className={`${styles.fieldHelp} ${styles.fullField}`}>当前账号可以正常登录和进入地图。</div>}
                  </div>
                </section> : null}

                {detailTab === 'password' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>设置临时新密码</h3><span>仅服主可操作</span></div>
                  {ownerAccess && !selected.guest ? <div className={styles.passwordReset}><div><KeyRound size={17} /><span><strong>重置登录凭据</strong><small>完成后所有设备立即退出，玩家需要使用新密码重新登录。</small></span></div><div><input type="password" minLength={8} maxLength={128} placeholder="8–128 位临时密码" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><button className={styles.secondaryButton} disabled={newPassword.length < 8 || Boolean(busy)} onClick={() => void resetPassword()}>重置密码</button></div></div> : <div className={styles.infoNote}>{selected.guest ? '游客没有可重置的账号密码。' : '当前管理角色没有重置密码的权限。'}</div>}
                </section> : null}

                {detailTab === 'related' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>共享登录 IP</h3><span>近 90 天</span></div>
                  {details?.relatedAccounts.length ? <div className={styles.relatedList}>{details.relatedAccounts.map((account) => <button key={`${account.subjectId}:${account.sharedIp}`} type="button" onClick={() => { const target = players.find((player) => player.subjectId === account.subjectId); if (target) void openDetails(target); else setNotice(`关联账号 ${account.displayName || account.username} 不在当前筛选页，可用身份 ID 搜索：${account.subjectId}`); }}><span><strong>{account.displayName || account.username}</strong><small>@{account.username || '未记录用户名'}</small></span><span><strong className={styles.mono}>{account.sharedIp}</strong><small>{formatDate(account.lastSeenAt)}</small></span></button>)}</div> : <div className={styles.compactEmpty}>近 90 天没有发现其他账号使用相同登录 IP</div>}
                </section> : null}

                {detailTab === 'history' ? <section className={styles.detailSection}>
                  <div className={styles.sectionHeading}><h3>管理操作时间线</h3><span>{details?.adminHistory.length || 0} 条</span></div>
                  {details?.adminHistory.length ? <div className={styles.timelineList}>{details.adminHistory.map((event) => <article key={event.id}><span><ShieldCheck size={14} /></span><div><strong>{auditLabel(event.action)}</strong><small>{event.actorDisplayName || event.actor}</small></div><time>{formatDate(event.createdAt)}</time></article>)}</div> : <div className={styles.compactEmpty}>尚无针对该玩家的管理操作</div>}
                </section> : null}

                {detailTab === 'danger' ? <section className={`${styles.detailSection} ${styles.dangerSection}`}>
                  <div className={styles.sectionHeading}><h3>永久删除玩家身份</h3><span>不可恢复</span></div>
                  <div className={styles.dangerSummary}><AlertTriangle size={20} /><div><strong>这不是封禁</strong><p>删除后玩家资料、角色、封禁记录和全部会话都会被移除。需要暂时阻止玩家进入时，请使用“封禁管理”。</p></div></div>
                </section> : null}
              </div>
            </div>

            <footer className={styles.drawerActions}>
              {detailTab === 'danger' && ownerAccess ? <button className={styles.dangerButton} disabled={Boolean(busy)} onClick={remove}><Trash2 size={14} />{busy === 'delete' ? '删除中…' : '确认删除身份'}</button> : null}
              {detailTab === 'sessions' ? <button className={styles.secondaryButton} disabled={Boolean(busy)} onClick={revokeSessions}>{busy === 'revoke' ? '下线中…' : '全部强制下线'}</button> : null}
              <span />
              <button className={styles.secondaryButton} disabled={Boolean(busy)} onClick={closeDetails}>关闭</button>
              {detailTab === 'profile' && !selected.guest ? <button className={styles.primaryButton} disabled={Boolean(busy)} onClick={save}>{busy === 'save' ? '保存中…' : '保存资料'}</button> : null}
              {detailTab === 'permissions' && ownerAccess && !selected.guest ? <button className={styles.primaryButton} disabled={Boolean(busy)} onClick={save}>{busy === 'save' ? '保存中…' : '保存角色'}</button> : null}
              {detailTab === 'ban' ? <button className={styles.primaryButton} disabled={Boolean(busy)} onClick={save}>{busy === 'save' ? '保存中…' : '保存封禁状态'}</button> : null}
            </footer>
          </section>
        </div>
      ) : null}

      {loginOpen ? (
        <div className={styles.loginBackdrop}>
          <form className={styles.loginDialog} onSubmit={(event) => { event.preventDefault(); void verifyAdmin(); }}>
            <span className={styles.eyebrow}>SERVER OWNER</span>
            <h2>服主验证</h2>
            <p>输入与创作端、游玩端相同的管理密钥后读取玩家资料。</p>
            <label>管理密钥<input autoFocus type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} /></label>
            {notice ? <div className={styles.loginError}>{notice}</div> : null}
            <div className={styles.loginActions}>
              {returnUrl ? <Link className={styles.secondaryButton} href={returnUrl}>{returnLabel}</Link> : null}
              <button className={styles.secondaryButton} type="button" onClick={() => void loginWithCurrentAccount()}>使用当前管理员账号</button>
              <button className={styles.primaryButton} disabled={!adminToken || busy === 'verify'} type="submit">{busy === 'verify' ? '验证中…' : '验证并进入'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
