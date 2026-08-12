import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
};

type PlayerDetails = {
  player: Player;
  sessions: Array<{
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
  if (action === 'player.update') return '修改玩家资料';
  if (action === 'player.delete') return '删除玩家身份';
  if (action === 'player.sessions.revoke') return '强制玩家下线';
  return action;
}

export default function PlayersPage({ returnUrl, returnLabel }: PlayersPageProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [section, setSection] = useState<AdminSection>('overview');
  const [selected, setSelected] = useState<Player | null>(null);
  const [details, setDetails] = useState<PlayerDetails | null>(null);
  const [search, setSearch] = useState('');
  const [token, setToken] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('loading');
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [identityFilter, setIdentityFilter] = useState<'all' | 'user' | 'banned'>('all');

  const load = useCallback(async (value = '') => {
    const saved = sessionStorage.getItem(TOKEN_KEY) || '';
    setToken(saved);
    if (!saved) {
      setBusy('');
      setLoginOpen(true);
      return;
    }
    setBusy('loading');
    const headers = { Authorization: `Bearer ${saved}` };
    const [playersResponse, overviewResponse] = await Promise.all([
      fetch(`/api/play-admin/players?search=${encodeURIComponent(value)}`, { headers, cache: 'no-store' }),
      fetch('/api/play-admin/players/overview', { headers, cache: 'no-store' }),
    ]);
    const [playersData, overviewData] = await Promise.all([playersResponse.json(), overviewResponse.json()]);
    if (!playersResponse.ok) throw new Error(playersData.message || '无法读取玩家');
    if (!overviewResponse.ok) throw new Error(overviewData.message || '无法读取玩家统计');
    setPlayers(playersData.players);
    setOverview(overviewData);
    setBusy('');
  }, []);

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
      setLoginOpen(false);
      setBusy('');
      await load(search);
    } catch (error) {
      setBusy('');
      setNotice((error as Error).message);
    }
  }

  useEffect(() => {
    load().catch((error) => {
      setBusy('');
      setNotice(error.message);
    });
  }, [load]);

  const stats = overview?.totals || {
    identities: players.length,
    users: players.filter((player) => !player.guest).length,
    guests: players.filter((player) => player.guest).length,
    banned: players.filter((player) => player.status === 'banned').length,
    activeSessions: 0, activeLast24Hours: 0, newLast7Days: 0,
    loginsLast24Hours: 0, uniqueLoginIpsLast7Days: 0, moderators: 0, admins: 0,
  };
  const visiblePlayers = useMemo(() => players.filter((player) => {
    if (identityFilter === 'user') return !player.guest;
    if (identityFilter === 'banned') return player.status === 'banned';
    return true;
  }), [players, identityFilter]);
  const displayedPlayers = section === 'accounts'
    ? players.filter((player) => !player.guest)
    : visiblePlayers;

  async function openDetails(player: Player) {
    setSelected(player);
    setDetails(null);
    setBusy('details');
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/players/${player.subjectId}`, {
        headers: { Authorization: `Bearer ${token || sessionStorage.getItem(TOKEN_KEY) || ''}` },
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: selected.displayName,
          avatar: selected.avatar,
          role: selected.role,
          status: selected.status,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '保存失败');
      setSelected(data.player);
      setDetails((current) => current ? { ...current, player: data.player } : current);
      await load(search);
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
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '删除失败');
      setSelected(null);
      setDetails(null);
      await load(search);
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke-sessions' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '强制下线失败');
      await openDetails(selected);
      await load(search);
      setNotice(`下线指令已发送，并撤销 ${data.revoked || 0} 个登录会话`);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  function submitSearch() {
    setNotice('');
    load(search).catch((error) => {
      setBusy('');
      setNotice(error.message);
    });
  }

  return (
    <>
      <Head><title>玩家管理</title></Head>
      <main className={styles.adminShell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}><span>BOX</span><div><strong>玩家服务</strong><small>SERVER CONSOLE</small></div></div>
          <nav aria-label="玩家后台分类">
            <button className={section === 'overview' ? styles.navActive : ''} onClick={() => setSection('overview')}><span>◫</span><div>运营概览<small>实时规模与活跃</small></div></button>
            <button className={section === 'players' ? styles.navActive : ''} onClick={() => { setSection('players'); setIdentityFilter('all'); }}><span>♙</span><div>玩家身份<small>注册账号与封禁</small></div></button>
            <button className={section === 'accounts' ? styles.navActive : ''} onClick={() => { setSection('accounts'); setIdentityFilter('user'); }}><span>◎</span><div>账号与权限<small>角色和登录状态</small></div></button>
            <button className={section === 'security' ? styles.navActive : ''} onClick={() => setSection('security')}><span>◇</span><div>安全审计<small>登录与服主操作</small></div></button>
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
              <button className={styles.secondaryButton} disabled={busy === 'loading'} onClick={() => load(search).catch((error) => setNotice(error.message))}>{busy === 'loading' ? '刷新中…' : '刷新数据'}</button>
              <button className={styles.secondaryButton} onClick={() => setLoginOpen(true)}>重新验证</button>
              {returnUrl ? <Link className={styles.secondaryButton} href={returnUrl}>{returnLabel}</Link> : null}
            </div>
          </header>

          {notice ? <div className={styles.notice} role="status"><span>{notice}</span><button aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div> : null}

          {section === 'overview' ? <>
            <section className={styles.metricGrid} aria-label="玩家核心指标">
              <article><span>注册玩家</span><strong>{stats.users}</strong><small>必须登录后才能进入游戏或创作</small></article>
              <article><span>24 小时活跃</span><strong>{stats.activeLast24Hours}</strong><small>按最后在线时间统计</small></article>
              <article><span>当前有效会话</span><strong>{stats.activeSessions}</strong><small>所有已登录设备会话</small></article>
              <article><span>近 7 天新增</span><strong>{stats.newLast7Days}</strong><small>新注册玩家账号</small></article>
              <article><span>24 小时登录</span><strong>{stats.loginsLast24Hours}</strong><small>账号成功登录次数</small></article>
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
              <button className={identityFilter === 'all' ? styles.statActive : ''} onClick={() => { setSection('players'); setIdentityFilter('all'); }}><span>全部身份</span><strong>{stats.identities}</strong></button>
              <button className={identityFilter === 'user' ? styles.statActive : ''} onClick={() => { setSection('accounts'); setIdentityFilter('user'); }}><span>注册账号</span><strong>{stats.users}</strong></button>
              <button className={identityFilter === 'banned' ? styles.statActive : ''} onClick={() => { setSection('players'); setIdentityFilter('banned'); }}><span>已封禁</span><strong className={stats.banned ? styles.dangerText : ''}>{stats.banned}</strong></button>
            </section>
            <div className={styles.toolbar}><div className={styles.searchField}><span aria-hidden="true">⌕</span><input aria-label="搜索玩家" placeholder="搜索用户名、昵称、账号 ID 或身份 ID" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); }} /></div><button className={styles.primaryButton} disabled={busy === 'loading'} onClick={submitSearch}>{busy === 'loading' ? '读取中…' : '搜索'}</button>{search ? <button className={styles.textButton} onClick={() => { setSearch(''); load().catch((error) => setNotice(error.message)); }}>清除</button> : null}</div>
            <section className={styles.tableCard} aria-busy={busy === 'loading'}><table><thead><tr><th>玩家</th><th>身份与角色</th><th>注册信息</th><th>最后登录</th><th>最后在线</th><th>状态</th></tr></thead><tbody>{displayedPlayers.map((player) => <tr key={player.subjectId} tabIndex={0} onClick={() => openDetails(player)} onKeyDown={(event) => { if (event.key === 'Enter') openDetails(player); }}><td><div className={styles.playerCell}><span className={styles.avatar}>{player.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{player.displayName}</strong><small>{player.username ? `@${player.username}` : player.userKey}</small></span></div></td><td><strong>{player.guest ? '游客' : `账号 #${player.userId}`}</strong><small>{roleLabel(player.role)} · {player.activeSessionCount} 个会话</small></td><td><strong>{formatDate(player.registeredAt || player.createdAt)}</strong><small>{displayIp(player.registrationIp || player.firstSeenIp)}</small></td><td><strong>{player.guest ? '未注册账号' : formatDate(player.lastLoginAt)}</strong><small>{player.guest ? '—' : `${player.loginCount} 次 · ${displayIp(player.lastLoginIp)}`}</small></td><td><strong>{formatDate(player.lastSeenAt)}</strong><small>{displayIp(player.lastSeenIp)}</small></td><td><span className={player.status === 'banned' ? styles.badStatus : styles.goodStatus}>{player.status === 'banned' ? '已封禁' : '正常'}</span></td></tr>)}</tbody></table>{busy === 'loading' && !displayedPlayers.length ? <div className={styles.empty}>正在读取玩家记录…</div> : null}{busy !== 'loading' && !displayedPlayers.length ? <div className={styles.empty}>暂无符合条件的玩家记录</div> : null}</section>
          </> : null}

          {section === 'security' ? <div className={styles.securityGrid}>
            <section className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>最近登录事件</h2><p>成功登录时间、账号、IP 与客户端</p></div><span>{overview?.recentLogins.length || 0} 条</span></div><div className={styles.recordList}>{overview?.recentLogins.map((event, index) => <article key={`${event.subjectId}-${event.createdAt}-${index}`}><div><strong>{event.displayName} {event.username ? `@${event.username}` : ''}</strong><span>{formatDate(event.createdAt)}</span></div><p>{event.userAgent || '未记录客户端信息'}</p><small>IP：{displayIp(event.ip)} · 身份：{event.subjectId}</small></article>)}</div>{!overview?.recentLogins.length ? <div className={styles.compactEmpty}>暂无登录事件</div> : null}</section>
            <section className={styles.dataPanel}><div className={styles.panelHeading}><div><h2>服主操作审计</h2><p>修改、封禁、强制下线和删除记录</p></div><span>{overview?.recentAudits.length || 0} 条</span></div><div className={styles.recordList}>{overview?.recentAudits.map((event) => <article key={event.id}><div><strong>{auditLabel(event.action)}</strong><span>{formatDate(event.createdAt)}</span></div><p className={styles.mono}>{event.subjectId || '系统'}</p><small>{Object.keys(event.details || {}).length ? JSON.stringify(event.details) : '无附加参数'}</small></article>)}</div>{!overview?.recentAudits.length ? <div className={styles.compactEmpty}>暂无服主操作</div> : null}</section>
          </div> : null}
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
              <button className={styles.closeButton} aria-label="关闭玩家详情" onClick={closeDetails}>×</button>
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
                    <label>角色<select value={selected.role} onChange={(event) => setSelected({ ...selected, role: event.target.value as Player['role'] })}><option value="player">玩家</option><option value="moderator">管理员</option><option value="admin">服主</option></select></label>
                    <label>状态<select value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value as Player['status'] })}><option value="active">正常</option><option value="banned">封禁并撤销全部会话</option></select></label>
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
                        <small>创建 {formatDate(session.createdAt)} · 到期 {formatDate(session.expiresAt)}</small>
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
            </div>

            <footer className={styles.drawerActions}>
              <button className={styles.dangerButton} disabled={Boolean(busy)} onClick={remove}>{busy === 'delete' ? '删除中…' : '删除身份'}</button>
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
              <button className={styles.primaryButton} disabled={!adminToken || busy === 'verify'} type="submit">{busy === 'verify' ? '验证中…' : '验证并进入'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
