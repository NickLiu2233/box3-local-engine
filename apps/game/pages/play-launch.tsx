import { useEffect, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { ArenaBg } from '../components/loading/arena';

type RuntimeStatus = {
  phase: 'idle' | 'starting' | 'loading' | 'ready' | 'error';
  percent: number;
  message: string;
};

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'play') return { notFound: true };
  return { props: {} };
};

export default function PlayLaunchPage() {
  const router = useRouter();
  const world = typeof router.query.world === 'string' ? router.query.world : '';
  const name = typeof router.query.name === 'string' ? router.query.name : '本地作品';
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<RuntimeStatus>({ phase: 'idle', percent: 4, message: '正在提交启动请求' });
  const percent = useMemo(() => status.phase === 'ready' ? 100 : status.phase === 'error' ? status.percent : Math.round(Math.min(92, Math.max(status.percent, 4 + elapsed * .8))), [elapsed, status]);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(world)) {
      setStatus({ phase: 'error', percent: 0, message: '地图 ID 无效' });
      return;
    }
    let cancelled = false;
    let timer: number | undefined;
    const request = async (action: 'start' | 'status') => {
      const response = await fetch(`/p/${encodeURIComponent(world)}/__local_runtime/${action}`, { method: action === 'start' ? 'POST' : 'GET' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `启动失败（HTTP ${response.status}）`);
      return data as RuntimeStatus;
    };
    const poll = async () => {
      try {
        const next = await request('status');
        if (cancelled) return;
        setStatus(next);
        if (next.phase === 'ready') {
          window.setTimeout(() => window.location.replace(`/p/${encodeURIComponent(world)}`), 300);
          return;
        }
        if (next.phase !== 'error') timer = window.setTimeout(poll, 800);
      } catch (error) {
        if (!cancelled) setStatus({ phase: 'error', percent: 0, message: error instanceof Error ? error.message : '启动失败' });
      }
    };
    request('start').then((next) => {
      if (!cancelled) { setStatus(next); timer = window.setTimeout(poll, 500); }
    }).catch((error) => {
      if (!cancelled) setStatus({ phase: 'error', percent: 0, message: error instanceof Error ? error.message : '启动失败' });
    });
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [router.isReady, world]);

  const failed = status.phase === 'error';
  return <ArenaBg progress={percent} error={failed} message={failed ? `启动失败：${status.message}` : `${name} · ${status.message} · ${elapsed}s`} actions={failed ? <><button onClick={() => window.location.reload()}>重新尝试</button><button onClick={() => router.push('/')}>返回作品列表</button></> : undefined} />;
}
