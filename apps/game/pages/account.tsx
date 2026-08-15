import type { FormEvent } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowRight, Eye, EyeOff, LoaderCircle,
  LockKeyhole, LogOut,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './player-management.module.css';

const THEME_KEY = 'box-player-admin-theme';

type ConsoleTheme = 'system' | 'light' | 'dark';
type NoticeKind = 'success' | 'error' | 'info';

type Player = {
  username: string;
  displayName: string;
};

type AccountPageProps = { returnUrl: string; returnLabel: string };

export const getServerSideProps: GetServerSideProps<AccountPageProps> = async ({ query }) => {
  const mode = process.env.BOX_DEPLOYMENT_MODE;
  if (mode !== 'player-service') {
    if (mode === 'play') return { notFound: true };
    const base = (process.env.BOX_PLAYER_SERVICE_PUBLIC_URL || 'http://127.0.0.1:3213').replace(/\/$/, '');
    return { redirect: { destination: `${base}/account?from=creator`, permanent: false } };
  }
  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  const creator = from === 'creator';
  return {
    props: {
      returnUrl: creator
        ? process.env.BOX_CREATOR_PUBLIC_URL || 'http://127.0.0.1:3002'
        : process.env.BOX_PLAY_PUBLIC_URL || 'http://127.0.0.1:3000',
      returnLabel: creator ? '进入创作端' : '进入游玩端',
    },
  };
};

export default function AccountPage({ returnUrl, returnLabel }: AccountPageProps) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [databaseEnabled, setDatabaseEnabled] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [theme, setTheme] = useState<ConsoleTheme>('system');
  const [notice, setNotice] = useState<{ kind: NoticeKind; message: string } | null>(null);

  async function refresh() {
    const response = await fetch('/api/player-auth/session', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '无法读取玩家身份');
    setPlayer(data.player);
    setDatabaseEnabled(Boolean(data.databaseEnabled));
    setRegistrationEnabled(data.registrationEnabled !== false);
  }

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') setTheme(stored);
    refresh()
      .catch((error) => setNotice({ kind: 'error', message: error.message }))
      .finally(() => setLoaded(true));
  }, []);

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setPassword('');
    setNotice(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/player-auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '操作失败');
      setPlayer(data.player);
      setPassword('');
      setNotice(null);
    } catch (error) {
      setNotice({ kind: 'error', message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/player-auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('退出登录失败，请稍后重试');
      await refresh();
      setNotice({ kind: 'info', message: '已安全退出，请重新登录后继续。' });
    } catch (error) {
      setNotice({ kind: 'error', message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`${styles.themeRoot} ${styles.accountShell}`} data-theme={theme}>
      <Head><title>玩家账号 · BOX Local Engine</title></Head>

      <div className={styles.accountLayout}>
        <section className={styles.accountCard} aria-labelledby="account-card-title">
          {player ? <div className={styles.accountCardHeader}>
            <div>
              <h1 id="account-card-title">欢迎回来</h1>
              <p>已登录为 {player.displayName}</p>
            </div>
          </div> : <h1 id="account-card-title" className={styles.accountPageTitle}>玩家账号</h1>}

          {notice ? <div className={`${styles.accountNotice} ${styles[`accountNotice_${notice.kind}`]}`} role={notice.kind === 'error' ? 'alert' : 'status'} aria-live="polite">{notice.message}</div> : null}

          {!loaded ? (
            <div className={styles.accountLoading}><LoaderCircle className={styles.spinning} size={20} /><strong>正在验证登录状态</strong><small>正在连接 Player Service…</small></div>
          ) : player ? (
            <div className={styles.accountSignedIn}>
              <div className={styles.accountProfile}>
                <span className={styles.accountAvatar}>{player.displayName?.slice(0, 1) || '玩'}</span>
                <div><strong>{player.displayName}</strong><span>@{player.username}</span></div>
              </div>
              <Link className={`${styles.primaryButton} ${styles.accountContinueButton}`} href={returnUrl}>{returnLabel}<ArrowRight size={15} /></Link>
              <button className={styles.accountLogoutButton} type="button" disabled={busy} onClick={logout}><LogOut size={14} />{busy ? '正在退出…' : '退出当前账号'}</button>
            </div>
          ) : (
            <>
              <div className={styles.accountTabs} role="tablist" aria-label="账号操作">
                <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? styles.accountTabActive : ''} onClick={() => switchMode('login')}>登录</button>
                {registrationEnabled ? <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? styles.accountTabActive : ''} onClick={() => switchMode('register')}>注册账号</button> : null}
              </div>

              {!databaseEnabled ? (
                <div className={styles.accountUnavailable}><LockKeyhole size={20} /><strong>账号服务尚未启用</strong><p>服主需要先配置 PostgreSQL，玩家才能注册并进入创作端或游玩端。</p></div>
              ) : mode === 'register' && !registrationEnabled ? (
                <div className={styles.accountUnavailable}><LockKeyhole size={20} /><strong>注册通道已关闭</strong><p>请联系服主创建账号，或使用已有账号登录。</p></div>
              ) : (
                <form className={styles.accountForm} onSubmit={submit}>
                  <label htmlFor="account-username"><span>用户名</span><input id="account-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus required minLength={mode === 'register' ? 3 : 1} maxLength={32} pattern={mode === 'register' ? '[A-Za-z][A-Za-z0-9_]{2,31}' : undefined} placeholder="输入用户名" /></label>
                  {mode === 'register' ? <label htmlFor="account-display-name"><span>游戏昵称</span><input id="account-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" required maxLength={32} placeholder="其他玩家看到的名字" /></label> : null}
                  <label htmlFor="account-password"><span>密码</span><div className={styles.accountPasswordField}><input id="account-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} placeholder="至少 8 个字符" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? '隐藏密码' : '显示密码'} title={showPassword ? '隐藏密码' : '显示密码'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
                  <button className={`${styles.primaryButton} ${styles.accountSubmitButton}`} disabled={busy} type="submit">{busy ? <><LoaderCircle className={styles.spinning} size={15} />正在处理…</> : <>{mode === 'login' ? '登录并继续' : '创建账号'}<ArrowRight size={15} /></>}</button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
