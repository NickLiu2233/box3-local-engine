import type { FormEvent } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './player-management.module.css';

type Player = {
  userId: string;
  username: string;
  displayName: string;
  guest: boolean;
  userKey: string;
  role: string;
  status: string;
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
      returnLabel: creator ? '返回创作端' : '返回游玩端',
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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function refresh() {
    const response = await fetch('/api/player-auth/session', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '无法读取玩家身份');
    setPlayer(data.player);
    setDatabaseEnabled(Boolean(data.databaseEnabled));
    setRegistrationEnabled(data.registrationEnabled !== false);
  }

  useEffect(() => { refresh().catch((error) => setNotice(error.message)); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
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
      setNotice(mode === 'login' ? '登录成功' : '账号创建成功，游客存档已保留');
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    await fetch('/api/player-auth/logout', { method: 'POST' });
    await refresh();
    setBusy(false);
    setNotice('已退出，现在以游客身份游玩');
  }

  return (
    <>
      <Head><title>玩家账号</title></Head>
      <main className={styles.page}>
        <header className={styles.header}>
          <div><span className={styles.eyebrow}>PLAYER IDENTITY</span><h1>玩家账号</h1></div>
          <Link className={styles.secondaryButton} href={returnUrl}>{returnLabel}</Link>
        </header>

        {notice ? <div className={styles.notice}>{notice}</div> : null}
        <section className={styles.card}>
          <div className={styles.identityBadge}>{player?.displayName?.slice(0, 1) || '游'}</div>
          <div className={styles.identityInfo}>
            <h2>{player?.displayName || '正在读取身份…'}</h2>
            <p>{player?.guest ? '游客玩家' : `@${player?.username}`}</p>
            {player ? <code>{player.userKey}</code> : null}
          </div>
          {!player?.guest ? <button className={styles.secondaryButton} disabled={busy} onClick={logout}>退出登录</button> : null}
        </section>

        {player?.guest ? (
          <section className={styles.panel}>
            <div className={styles.tabs}>
              <button className={mode === 'login' ? styles.activeTab : ''} onClick={() => setMode('login')}>登录</button>
              {registrationEnabled ? <button className={mode === 'register' ? styles.activeTab : ''} onClick={() => setMode('register')}>注册并保留游客存档</button> : null}
            </div>
            {!databaseEnabled ? (
              <div className={styles.empty}>服主尚未配置 PostgreSQL，当前可以作为稳定游客游玩，但不能注册账号。</div>
            ) : mode === 'register' && !registrationEnabled ? (
              <div className={styles.empty}>服主已关闭玩家注册。</div>
            ) : (
              <form className={styles.form} onSubmit={submit}>
                <label>用户名<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
                {mode === 'register' ? <label>游戏昵称<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" /></label> : null}
                <label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
                <button className={styles.primaryButton} disabled={busy} type="submit">{busy ? '处理中…' : mode === 'login' ? '登录' : '创建账号'}</button>
              </form>
            )}
          </section>
        ) : null}
      </main>
    </>
  );
}
