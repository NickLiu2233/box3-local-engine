import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  Activity, Ban, KeyRound, LayoutDashboard, LogOut, RefreshCw,
  Search, ShieldCheck, Tags, Trash2, UserCog, Users, X,
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
};

type AdminSection = 'overview' | 'players' | 'accounts' | 'security';
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

type PlayersPageProps = { returnUrl: string; returnLabel: string };

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

export default function PlayersPage({ returnUrl, returnLabel }: PlayersPageProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [section, setSection] = useState<AdminSection>('overview');
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
  const [identityFilter, setIdentityFilter] = useState<'all' | 'user' | 'banned'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | Player['role']>('all');
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online' | 'offline'>('all');
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
    if (section !== 'security') return;
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

  async function batchAction(action: 'revoke-sessions' | 'ban' | 'unban' | 'add-tag' | 'remove-tag') {
    if (!selectedIds.length || busy) return;
    const label = action === 'revoke-sessions' ? '强制下线' : action === 'ban' ? '封禁' : action === 'unban' ? '解除封禁' : action === 'add-tag' ? '增加标签' : '移除标签';
    const tag = action === 'add-tag' || action === 'remove-tag' ? prompt(`请输入要${label}的标签`)?.trim() : '';
    if ((action === 'add-tag' || action === 'remove-tag') && !tag) return;
    const reason = action === 'ban' ? prompt('请输入批量封禁原因（可以留空）') || '' : '';
    if (!confirm(`确定对选中的 ${selectedIds.length} 位玩家执行“${label}”吗？`)) return;
    setBusy('batch');
    setNotice('');
    try {
      const response = await fetch('/api/play-admin/players/batch', {
        method: 'POST', headers: adminHeaders(token, true),
        body: JSON.stringify({ subjectIds: selectedIds, action, tag, reason }),
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
            <button className={section === 'overview' ? styles.navActive : ''} onClick={() => setSection('overview')}><span><LayoutDashboard size={17} /></span><div>运营概览<small>实时规模与活跃</small></div></button>
            <button className={section === 'players' ? styles.navActive : ''} onClick={() => { setSection('players'); setIdentityFilter('all'); }}><span><Users size={17} /></span><div>玩家身份<small>注册账号与封禁</small></div></button>
            <button className={section === 'accounts' ? styles.navActive : ''} onClick={() => { setSection('accounts'); setIdentityFilter('user'); }}><span><UserCog size={17} /></span><div>账号与权限<small>角色和登录状态</small></div></button>
            <button className={section === 'security' ? styles.navActive : ''} onClick={() => setSection('security')}><span><ShieldCheck size={17} /></span><div>安全审计<small>登录与管理操作</small></div></button>
          </nav>
          <div className={styles.sidebarFooter}><span className={styles.healthDot} />PostgreSQL 已连接</div>
        </aside>

        <section className={styles.workspace}>
          <header className={styles.header}>
            <div>
              <div className={styles.titleRow}><h1>{section === 'overview' ? '运营概览' : section === 'players' ? '玩家身份' : section === 'accounts' ? '账号与权限' : '安全审计'}</h1><span>{stats.identities} 个身份</span></div>
              <p>{section === 'overview' ? '查看玩家规模、活跃度和服务状态' : section === 'players' ? '查询并管理注册账号和封禁状态' : section === 'accounts' ? '管理账号角色、权限和有效登录会话' : '检查最近登录来源与所有服主敏感操作'}</p>
            </div>
            <div className={styles.headerButtons}>
              {actor ? <span className={styles.operatorChip}><ShieldCheck size={14} /><span><strong>{actor.displayName}</strong><small>{actor.credential === 'owner-token' ? '服主密钥' : roleLabel(actor.role as Player['role'])}</small></span></span> : null}
              <button className={styles.secondaryButton} disabled={busy === 'loading'} onClick={() => load().catch((error) => setNotice(error.message))}><RefreshCw size={14} />{busy === 'loading' ? '刷新中…' : '刷新数据'}</button>
              <button className={styles.secondaryButton} onClick={() => setLoginOpen(true)}><KeyRound size={14} />服主验证</button>
              {returnUrl ? <Link className={styles.secondaryButton} href={returnUrl}>{returnLabel}</Link> : null}
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
            <div className={styles.dashboardColumns}>
              <section className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>最近账号登录</h2><p>最新 30 条成功登录事件</p></div><button onClick={() => setSection('security')}>查看全部</button></div>
                <div className={styles.activityList}>{overview?.recentLogins.slice(0, 8).map((event, index) => <article key={`${event.subjectId}-${event.createdAt}-${index}`}><span className={styles.avatar}>{event.displayName.slice(0, 1)}</span><div><strong>{event.displayName}</strong><small>{event.username ? `@${event.username}` : event.subjectId}</small></div><div className={styles.activityMeta}><strong>{displayIp(event.ip)}</strong><small>{formatDate(event.createdAt)}</small></div></article>)}</div>
                {!overview?.recentLogins.length ? <div className={styles.compactEmpty}>目前没有账号登录记录</div> : null}
              </section>
              <section className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>身份构成</h2><p>PostgreSQL 当前真实数据</p></div></div>
                <dl className={styles.breakdown}><div><dt>注册账号</dt><dd>{stats.users}</dd></div><div><dt>普通玩家</dt><dd>{Math.max(0, stats.users - stats.admins - stats.moderators)}</dd></div><div><dt>管理角色</dt><dd>{stats.admins + stats.moderators}</dd></div><div><dt>正常账号</dt><dd>{Math.max(0, stats.users - stats.banned)}</dd></div><div><dt>封禁账号</dt><dd>{stats.banned}</dd></div></dl>
              </section>
            </div>
          </> : null}

          {(section === 'players' || section === 'accounts') ? <>
            <section className={styles.stats} aria-label="玩家统计">
              <button className={identityFilter === 'all' ? styles.statActive : ''} onClick={() => { setSection('players'); setIdentityFilter('all'); setPage(1); }}><span>全部身份</span><strong>{stats.identities}</strong></button>
              <button className={identityFilter === 'user' ? styles.statActive : ''} onClick={() => { setSection('accounts'); setIdentityFilter('user'); setPage(1); }}><span>注册账号</span><strong>{stats.users}</strong></button>
              <button className={identityFilter === 'banned' ? styles.statActive : ''} onClick={() => { setSection('players'); setIdentityFilter('banned'); setPage(1); }}><span>已封禁</span><strong className={stats.banned ? styles.dangerText : ''}>{stats.banned}</strong></button>
            </section>
            <div className={styles.toolbar}>
              <div className={styles.searchField}><Search size={16} aria-hidden="true" /><input aria-label="搜索玩家" placeholder="搜索用户名、昵称、标签、备注或身份 ID" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); }} /></div>
              <select className={styles.filterSelect} aria-label="角色筛选" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as typeof roleFilter); setPage(1); }}><option value="all">全部角色</option><option value="player">玩家</option><option value="moderator">管理员</option><option value="admin">服主</option></select>
              <select className={styles.filterSelect} aria-label="在线筛选" value={onlineFilter} onChange={(event) => { setOnlineFilter(event.target.value as typeof onlineFilter); setPage(1); }}><option value="all">全部会话</option><option value="online">当前在线</option><option value="offline">当前离线</option></select>
              <select className={styles.filterSelect} aria-label="排序方式" value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }}><option value="lastSeen">最近在线</option><option value="registered">最近注册</option><option value="displayName">昵称排序</option><option value="loginCount">登录次数</option></select>
              <button className={styles.primaryButton} disabled={busy === 'loading'} onClick={submitSearch}>{busy === 'loading' ? '读取中…' : '搜索'}</button>
              {search || appliedSearch ? <button className={styles.textButton} onClick={() => { setSearch(''); setAppliedSearch(''); setPage(1); }}>清除</button> : null}
            </div>
            {selectedIds.length ? <div className={styles.batchToolbar}><strong>已选择 {selectedIds.length} 位玩家</strong><button onClick={() => void batchAction('revoke-sessions')}><LogOut size={14} />强制下线</button><button onClick={() => void batchAction('ban')}><Ban size={14} />封禁</button><button onClick={() => void batchAction('unban')}><ShieldCheck size={14} />解封</button><button onClick={() => void batchAction('add-tag')}><Tags size={14} />增加标签</button><button onClick={() => void batchAction('remove-tag')}><Tags size={14} />移除标签</button><button className={styles.batchClear} onClick={() => setSelectedIds([])}><X size={14} />清空</button></div> : null}
            <section className={styles.tableCard} aria-busy={busy === 'loading'}><table><thead><tr><th className={styles.checkCell}><input type="checkbox" aria-label="选择本页玩家" checked={Boolean(displayedPlayers.length) && displayedPlayers.every((player) => selectedIds.includes(player.subjectId))} onChange={(event) => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...displayedPlayers.map((player) => player.subjectId)])] : selectedIds.filter((id) => !displayedPlayers.some((player) => player.subjectId === id)))} /></th><th>玩家</th><th>身份与角色</th><th>注册信息</th><th>最后登录</th><th>最后在线</th><th>状态</th></tr></thead><tbody>{displayedPlayers.map((player) => <tr key={player.subjectId} tabIndex={0} onClick={() => openDetails(player)} onKeyDown={(event) => { if (event.key === 'Enter') openDetails(player); }}><td className={styles.checkCell} onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`选择 ${player.displayName}`} checked={selectedIds.includes(player.subjectId)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, player.subjectId] : ids.filter((id) => id !== player.subjectId))} /></td><td><div className={styles.playerCell}><span className={styles.avatar}>{player.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{player.displayName}</strong><small>{player.username ? `@${player.username}` : player.userKey}</small></span></div></td><td><strong>{player.guest ? '游客' : `账号 #${player.userId}`}</strong><small>{roleLabel(player.role)} · {player.activeSessionCount} 个会话</small></td><td><strong>{formatDate(player.registeredAt || player.createdAt)}</strong><small>{displayIp(player.registrationIp || player.firstSeenIp)}</small></td><td><strong>{player.guest ? '未注册账号' : formatDate(player.lastLoginAt)}</strong><small>{player.guest ? '—' : `${player.loginCount} 次 · ${displayIp(player.lastLoginIp)}`}</small></td><td><strong>{formatDate(player.lastSeenAt)}</strong><small>{displayIp(player.lastSeenIp)}</small></td><td><span className={player.status === 'banned' ? styles.badStatus : styles.goodStatus}>{player.status === 'banned' ? (player.bannedUntil ? `封禁至 ${formatDate(player.bannedUntil)}` : '永久封禁') : '正常'}</span></td></tr>)}</tbody></table>{busy === 'loading' && !displayedPlayers.length ? <div className={styles.empty}>正在读取玩家记录…</div> : null}{busy !== 'loading' && !displayedPlayers.length ? <div className={styles.empty}>暂无符合条件的玩家记录</div> : null}</section>
            <div className={styles.pagination}><span>共 {total} 位玩家 · 第 {page} / {totalPages} 页</span><div><button className={styles.secondaryButton} disabled={page <= 1 || busy === 'loading'} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><button className={styles.secondaryButton} disabled={page >= totalPages || busy === 'loading'} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页</button></div></div>
          </> : null}

          {section === 'security' ? <>
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

            <div className={styles.drawerBody}>
              {busy === 'details' && !details ? <div className={styles.empty}>正在读取身份、会话和登录记录…</div> : null}

              <section className={styles.detailSection}>
                <div className={styles.sectionHeading}><h3>身份资料</h3><span>{selected.activeSessionCount} 个有效会话</span></div>
                {selected.guest ? (
                  <div className={styles.infoNote}>游客没有账号资料；注册后会升级为账号，并继续使用当前 userKey 和地图存档。</div>
                ) : (
                  <div className={styles.formGrid}>
                    <label>昵称<input value={selected.displayName} onChange={(event) => setSelected({ ...selected, displayName: event.target.value })} /></label>
                    <label>头像资源或地址<input value={selected.avatar || ''} onChange={(event) => setSelected({ ...selected, avatar: event.target.value })} placeholder="可留空" /></label>
                    <label>角色<select disabled={!ownerAccess} value={selected.role} onChange={(event) => setSelected({ ...selected, role: event.target.value as Player['role'] })}><option value="player">玩家</option><option value="moderator">管理员</option><option value="admin">服主</option></select></label>
                    <label>状态<select value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value as Player['status'] })}><option value="active">正常</option><option value="banned">封禁并撤销全部会话</option></select></label>
                    <label className={styles.fullField}>标签（用逗号分隔）<input value={selected.tags.join(', ')} onChange={(event) => setSelected({ ...selected, tags: event.target.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) })} placeholder="例如：测试员, 重点关注" /></label>
                    <label className={styles.fullField}>服主备注<textarea value={selected.adminNote} onChange={(event) => setSelected({ ...selected, adminNote: event.target.value })} placeholder="仅服主后台可见，不会发送给游戏脚本" /></label>
                    {selected.status === 'banned' ? <>
                      <label className={styles.fullField}>封禁原因<textarea value={selected.banReason} onChange={(event) => setSelected({ ...selected, banReason: event.target.value })} placeholder="记录处罚依据，留空也可封禁" /></label>
                      <label>封禁截止时间<input type="datetime-local" value={dateTimeLocalValue(selected.bannedUntil)} onChange={(event) => setSelected({ ...selected, bannedUntil: event.target.value ? new Date(event.target.value).toISOString() : undefined })} /></label>
                      <div className={styles.fieldHelp}>不设置截止时间表示永久封禁。保存后会立即撤销全部会话并通知正在运行的地图。</div>
                    </> : null}
                  </div>
                )}
              </section>

              <section className={styles.detailSection}>
                <div className={styles.sectionHeading}><h3>身份与时间</h3></div>
                <dl className={styles.detailGrid}>
                  <div><dt>userKey（存档键）</dt><dd className={styles.mono}>{selected.userKey}</dd></div>
                  <div><dt>身份 ID</dt><dd className={styles.mono}>{selected.subjectId}</dd></div>
                  <div><dt>首次创建</dt><dd>{formatDate(selected.createdAt)}</dd></div>
                  <div><dt>账号注册</dt><dd>{selected.guest ? '尚未注册' : formatDate(selected.registeredAt)}</dd></div>
                  <div><dt>最后登录</dt><dd>{selected.guest ? '不适用' : formatDate(selected.lastLoginAt)}</dd></div>
                  <div><dt>最后在线</dt><dd>{formatDate(selected.lastSeenAt)}</dd></div>
                  <div><dt>累计登录</dt><dd>{selected.guest ? '不适用' : `${selected.loginCount} 次`}</dd></div>
                  <div><dt>有效会话</dt><dd>{selected.activeSessionCount} 个</dd></div>
                </dl>
              </section>

              <section className={styles.detailSection}>
                <div className={styles.sectionHeading}><h3>网络记录</h3><span>仅服主可见</span></div>
                <dl className={styles.detailGrid}>
                  <div><dt>首次访问 IP</dt><dd className={styles.mono}>{displayIp(selected.firstSeenIp)}</dd></div>
                  <div><dt>注册 IP</dt><dd className={styles.mono}>{selected.guest ? '尚未注册' : displayIp(selected.registrationIp)}</dd></div>
                  <div><dt>最后登录 IP</dt><dd className={styles.mono}>{selected.guest ? '不适用' : displayIp(selected.lastLoginIp)}</dd></div>
                  <div><dt>最后在线 IP</dt><dd className={styles.mono}>{displayIp(selected.lastSeenIp)}</dd></div>
                </dl>
              </section>

              {details ? (
                <>
                  <section className={styles.detailSection}>
                    <div className={styles.sectionHeading}><h3>当前会话</h3><span>{details.sessions.length} 条</span></div>
                    {details.sessions.length ? <div className={styles.recordList}>{details.sessions.map((session, index) => (
                      <article key={`${session.createdAt}-${index}`}>
                        <div><strong>{displayIp(session.lastSeenIp || session.createdIp)}</strong><span>{formatDate(session.lastSeenAt)}</span></div>
                        <p>{session.userAgent || '未记录客户端信息'}</p>
                        <div className={styles.sessionFooter}><small>创建 {formatDate(session.createdAt)} · 到期 {formatDate(session.expiresAt)}</small><button className={styles.textButton} disabled={Boolean(busy)} onClick={() => revokeSession(session.sessionId)}>{busy === `session:${session.sessionId}` ? '撤销中…' : '撤销此设备'}</button></div>
                      </article>
                    ))}</div> : <div className={styles.compactEmpty}>没有有效登录会话</div>}
                  </section>

                  {!selected.guest ? <section className={styles.detailSection}>
                    <div className={styles.sectionHeading}><h3>最近登录记录</h3><span>最近 {details.loginHistory.length} 条</span></div>
                    {details.loginHistory.length ? <div className={styles.recordList}>{details.loginHistory.map((event, index) => (
                      <article key={`${event.createdAt}-${index}`}>
                        <div><strong>{displayIp(event.ip)}</strong><span>{formatDate(event.createdAt)}</span></div>
                        <p>{event.userAgent || '未记录客户端信息'}</p>
                      </article>
                    ))}</div> : <div className={styles.compactEmpty}>旧账号或尚无登录历史</div>}
                  </section> : null}
                </>
              ) : null}

              {ownerAccess && !selected.guest ? <section className={styles.detailSection}>
                <div className={styles.sectionHeading}><h3>密码与账号恢复</h3><span>仅服主可操作</span></div>
                <div className={styles.passwordReset}><div><KeyRound size={17} /><span><strong>设置临时新密码</strong><small>重置后所有设备立即退出，玩家需使用新密码重新登录。</small></span></div><div><input type="password" minLength={8} maxLength={128} placeholder="8–128 位临时密码" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><button className={styles.secondaryButton} disabled={newPassword.length < 8 || Boolean(busy)} onClick={() => void resetPassword()}>重置密码</button></div></div>
              </section> : null}
            </div>

            <footer className={styles.drawerActions}>
              {ownerAccess ? <button className={styles.dangerButton} disabled={Boolean(busy)} onClick={remove}><Trash2 size={14} />{busy === 'delete' ? '删除中…' : '删除身份'}</button> : null}
              <button className={styles.secondaryButton} disabled={Boolean(busy)} onClick={revokeSessions}>{busy === 'revoke' ? '下线中…' : '强制下线'}</button>
              <span />
              <button className={styles.secondaryButton} disabled={Boolean(busy)} onClick={closeDetails}>取消</button>
              {!selected.guest ? <button className={styles.primaryButton} disabled={Boolean(busy)} onClick={save}>{busy === 'save' ? '保存中…' : '保存更改'}</button> : null}
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
