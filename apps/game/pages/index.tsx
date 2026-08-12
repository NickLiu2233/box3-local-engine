import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { PlayWorld } from '../server/play-worlds';
import { getPlayWorlds } from '../server/play-worlds';
import { isPlayAdminEnabled } from '../server/play-admin-security';

const TOKEN_KEY = 'box-play-admin-token';

type ImportProgress = {
  filename: string;
  phase: 'uploading' | 'processing' | 'done' | 'error';
  percent: number;
  sent: number;
  total: number;
  elapsedSeconds: number;
  worldName?: string;
  message?: string;
};

function formatBytes(value: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unit = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

export default function HomePage({
  worlds,
  adminEnabled,
}: {
  worlds: PlayWorld[];
  adminEnabled: boolean;
}) {
  const importInput = useRef<HTMLInputElement>(null);
  const [worldList, setWorldList] = useState(worlds);
  const [adminToken, setAdminToken] = useState('');
  const [verified, setVerified] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [deleteWorld, setDeleteWorld] = useState<PlayWorld | null>(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

  async function verifyToken(token: string, quiet = false) {
    const response = await fetch('/api/play-admin/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      if (!quiet) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || '验证失败');
      }
      return false;
    }
    sessionStorage.setItem(TOKEN_KEY, token);
    setAdminToken(token);
    setVerified(true);
    setLoginOpen(false);
    return true;
  }

  useEffect(() => {
    if (!adminEnabled) return;
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) verifyToken(saved, true).then((valid) => {
      if (!valid) sessionStorage.removeItem(TOKEN_KEY);
    });
  }, [adminEnabled]);

  async function importBundle(file: File) {
    if (importProgress && importProgress.phase !== 'done' && importProgress.phase !== 'error') return;
    setBusy('import');
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
      setImportProgress((current) => {
        if (!current || (current.phase !== 'uploading' && current.phase !== 'processing')) return current;
        const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
        return {
          ...current,
          elapsedSeconds,
          percent: current.phase === 'processing'
            ? Math.min(95, Math.max(current.percent, 75 + elapsedSeconds * 2))
            : current.percent,
        };
      });
    }, 500);
    try {
      const data = await new Promise<{ world?: PlayWorld; message?: string }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', '/api/play-admin/import');
        request.setRequestHeader('Authorization', `Bearer ${adminToken}`);
        request.setRequestHeader('Content-Type', 'application/octet-stream');
        request.upload.onprogress = (event) => {
          const total = event.lengthComputable ? event.total : file.size;
          setImportProgress((current) => current ? {
            ...current,
            phase: 'uploading',
            percent: total ? Math.min(70, (event.loaded / total) * 70) : 0,
            sent: event.loaded,
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
        request.onerror = () => reject(new Error('无法连接游玩端，游玩包上传失败'));
        request.onabort = () => reject(new Error('导入已取消'));
        request.onload = () => {
          let result: { world?: PlayWorld; message?: string } = {};
          try { result = JSON.parse(request.responseText || '{}'); } catch { /* handled below */ }
          if (request.status >= 200 && request.status < 300) resolve(result);
          else reject(new Error(result.message || `导入失败（HTTP ${request.status}）`));
        };
        request.send(file);
      });
      if (data.world) {
        setWorldList((current) => [data.world!, ...current.filter((world) => world.id !== data.world!.id)]);
      }
      setImportProgress({
        filename: file.name,
        phase: 'done',
        percent: 100,
        sent: file.size,
        total: file.size,
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
        worldName: data.world?.name,
      });
    } catch (error) {
      setImportProgress((current) => ({
        filename: file.name,
        phase: 'error',
        percent: current?.percent || 0,
        sent: current?.sent || 0,
        total: current?.total || file.size,
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
        message: error instanceof Error ? error.message : '导入游玩包失败',
      }));
    } finally {
      window.clearInterval(timer);
      setBusy('');
    }
  }

  async function exportBundle(world: PlayWorld) {
    setBusy(`export:${world.id}`);
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/worlds/${encodeURIComponent(world.id)}/export`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || '导出失败');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
      const filename = encodedName ? decodeURIComponent(encodedName) : `${world.name}_${world.id}.boxplay`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function confirmDelete() {
    if (!deleteWorld) return;
    setBusy(`delete:${deleteWorld.id}`);
    setNotice('');
    try {
      const response = await fetch(`/api/play-admin/worlds/${encodeURIComponent(deleteWorld.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || '删除失败');
      }
      window.location.reload();
    } catch (error) {
      setNotice((error as Error).message);
      setBusy('');
      setDeleteWorld(null);
    }
  }

  function exitAdmin() {
    sessionStorage.removeItem(TOKEN_KEY);
    setAdminToken('');
    setVerified(false);
  }

  return (
    <>
      <Head><title>作品</title></Head>
      <main className="page">
        <div className="header">
          <div className="title"><h1>作品</h1><span>{worldList.length} 个</span></div>
          <div className="headerActions">
            {adminEnabled ? (
              verified ? (
                <>
                <button className="button primary" disabled={Boolean(busy)} onClick={() => importInput.current?.click()}>
                  {busy === 'import' ? '导入中…' : '导入游玩包'}
                </button>
                <button className="button" onClick={exitAdmin}>退出管理</button>
                </>
              ) : <button className="button" onClick={() => setLoginOpen(true)}>服主管理</button>
            ) : null}
          </div>
          <input
            ref={importInput}
            className="hidden"
            type="file"
            accept=".boxplay,.tar.gz,.tgz,application/gzip"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = '';
              if (file) importBundle(file);
            }}
          />
        </div>

        {notice ? <div className="notice">{notice}<button onClick={() => setNotice('')}>×</button></div> : null}

        {worldList.length ? (
          <div className="grid">
            {worldList.map((world) => (
              <article className="card" key={world.id}>
                <Link className="cardLink" href={`/play-launch?world=${encodeURIComponent(world.id)}&name=${encodeURIComponent(world.name)}`}>
                  <div className="cover">
                    {world.cover ? <img src={world.cover} alt="" /> : <span>{world.name.slice(0, 1)}</span>}
                  </div>
                  <div className="info">
                    <strong>{world.name}</strong>
                    <small>{world.author || '未署名'} · {world.version}</small>
                    {world.description ? <p>{world.description}</p> : null}
                  </div>
                </Link>
                {verified ? (
                  <div className="cardActions">
                    <button disabled={Boolean(busy)} onClick={() => exportBundle(world)}>
                      {busy === `export:${world.id}` ? '导出中…' : '导出游玩包'}
                    </button>
                    <button className="dangerText" disabled={Boolean(busy)} onClick={() => setDeleteWorld(world)}>删除</button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            <span>暂无可游玩的作品</span>
            {verified ? <button className="button primary" onClick={() => importInput.current?.click()}>导入游玩包</button> : null}
          </div>
        )}
      </main>

      {loginOpen ? (
        <div className="backdrop" onMouseDown={() => setLoginOpen(false)}>
          <form
            className="dialog"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              setBusy('verify');
              setNotice('');
              verifyToken(adminToken).catch((error) => setNotice(error.message)).finally(() => setBusy(''));
            }}
          >
            <h2>服主验证</h2>
            <label>管理密钥</label>
            <input autoFocus type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
            <div className="dialogActions">
              <button className="button" type="button" onClick={() => setLoginOpen(false)}>取消</button>
              <button className="button primary" disabled={!adminToken || busy === 'verify'} type="submit">
                {busy === 'verify' ? '验证中…' : '验证'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteWorld ? (
        <div className="backdrop" onMouseDown={() => setDeleteWorld(null)}>
          <div className="dialog" onMouseDown={(event) => event.stopPropagation()}>
            <h2>删除地图</h2>
            <p>确定删除“{deleteWorld.name}”吗？删除后玩家将无法进入该地图。</p>
            <div className="dialogActions">
              <button className="button" onClick={() => setDeleteWorld(null)}>取消</button>
              <button className="button danger" disabled={busy === `delete:${deleteWorld.id}`} onClick={confirmDelete}>
                {busy === `delete:${deleteWorld.id}` ? '删除中…' : '删除'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {importProgress ? (
        <div className="progressBackdrop">
          <section className="progressDialog" role="dialog" aria-modal="true" aria-labelledby="play-import-title">
            <div className={`progressIcon ${importProgress.phase === 'done' ? 'done' : importProgress.phase === 'error' ? 'error' : ''}`}>
              {importProgress.phase === 'done' ? '✓' : importProgress.phase === 'error' ? '!' : '↑'}
            </div>
            <h2 id="play-import-title">
              {importProgress.phase === 'uploading'
                ? '正在上传游玩包'
                : importProgress.phase === 'processing'
                  ? '正在导入作品'
                  : importProgress.phase === 'done'
                    ? '导入完成'
                    : '导入失败'}
            </h2>
            <p className="progressFilename">{importProgress.worldName || importProgress.filename}</p>
            <div className="progressTrack" aria-label="游玩包导入进度" aria-valuenow={Math.round(importProgress.percent)} role="progressbar">
              <span style={{ width: `${importProgress.percent}%` }} />
            </div>
            <div className="progressMeta" aria-live="polite">
              <strong>{Math.round(importProgress.percent)}%</strong>
              <span>
                {importProgress.phase === 'uploading'
                  ? `${formatBytes(importProgress.sent)} / ${formatBytes(importProgress.total)} · ${importProgress.elapsedSeconds}s`
                  : importProgress.phase === 'processing'
                    ? `正在解压、校验并写入游玩目录 · ${importProgress.elapsedSeconds}s`
                    : importProgress.phase === 'done'
                      ? `${formatBytes(importProgress.total)} · 用时 ${importProgress.elapsedSeconds}s`
                      : importProgress.message}
              </span>
            </div>
            {(importProgress.phase === 'done' || importProgress.phase === 'error') ? (
              <button className="progressClose" type="button" onClick={() => setImportProgress(null)}>
                {importProgress.phase === 'done' ? '完成' : '关闭'}
              </button>
            ) : null}
          </section>
        </div>
      ) : null}

      <style jsx>{`
        :global(*){box-sizing:border-box}:global(body){margin:0;background:#f7f7f8;color:#202124;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        button,input{font:inherit}.page{width:min(1120px,calc(100% - 40px));margin:0 auto;padding:44px 0 80px}.header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.title{display:flex;align-items:baseline;gap:12px}.title h1{font-size:26px;margin:0}.title span{font-size:13px;color:#85888f}.headerActions{display:flex;gap:8px}.button{height:36px;padding:0 14px;border:1px solid #d9dadd;border-radius:7px;background:#fff;color:#303238;cursor:pointer}.button:hover{background:#f3f4f5}.button:disabled{cursor:default;opacity:.55}.button.primary{border-color:#1f2329;background:#1f2329;color:#fff}.button.primary:hover{background:#34383f}.button.danger{border-color:#d94343;background:#d94343;color:#fff}.hidden{display:none}
        .notice{display:flex;justify-content:space-between;align-items:center;margin:-8px 0 18px;padding:10px 12px;border:1px solid #efd0d0;border-radius:7px;background:#fff5f5;color:#b42323;font-size:13px}.notice button{border:0;background:transparent;color:inherit;font-size:20px;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}.card{overflow:hidden;background:#fff;border:1px solid #e6e7e9;border-radius:10px;transition:border-color .15s,transform .15s}.card:hover{border-color:#bfc2c7;transform:translateY(-2px)}.cardLink{display:block;color:inherit;text-decoration:none}.cover{aspect-ratio:16/9;background:#eceef1;display:flex;align-items:center;justify-content:center;color:#a2a6ad;font-size:32px}.cover img{width:100%;height:100%;object-fit:cover}.info{padding:14px}.info strong{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.info small{display:block;color:#85888f;margin-top:6px}.info p{margin:10px 0 0;color:#5e6269;font-size:13px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.cardActions{display:flex;border-top:1px solid #ececef}.cardActions button{flex:1;height:38px;border:0;background:#fff;color:#555960;font-size:13px;cursor:pointer}.cardActions button+button{border-left:1px solid #ececef}.cardActions button:hover{background:#f6f6f7}.cardActions .dangerText{color:#cf3939}.empty{min-height:164px;padding:54px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;color:#92959b;background:#fff;border:1px solid #e6e7e9;border-radius:10px}
        .backdrop{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(20,22,25,.38)}.dialog{width:min(400px,100%);padding:22px;background:#fff;border-radius:10px;box-shadow:0 18px 55px rgba(0,0,0,.2)}.dialog h2{margin:0 0 20px;font-size:19px}.dialog p{margin:0 0 22px;color:#5d6168;font-size:14px;line-height:1.6}.dialog label{display:block;margin-bottom:8px;color:#555960;font-size:13px}.dialog input{width:100%;height:40px;padding:0 11px;border:1px solid #d6d8dc;border-radius:7px;outline:none}.dialog input:focus{border-color:#7a7f87;box-shadow:0 0 0 3px rgba(40,44,50,.08)}.dialogActions{display:flex;justify-content:flex-end;gap:8px;margin-top:22px}
        .progressBackdrop{position:fixed;z-index:30;inset:0;display:grid;place-items:center;padding:24px;background:rgba(0,0,0,.66)}.progressDialog{width:min(100%,460px);padding:28px;border:1px solid rgba(255,255,255,.14);border-radius:16px;color:#fff;background:#262626;box-shadow:0 22px 70px rgba(0,0,0,.5)}.progressIcon{display:grid;width:44px;height:44px;place-items:center;border-radius:9px;color:#262626;background:#ffdb00;font-size:24px;font-weight:800}.progressIcon.done{color:#fff;background:#78c95d}.progressIcon.error{color:#fff;background:#f65252}.progressDialog h2{margin:18px 0 6px;font-size:20px}.progressFilename{overflow:hidden;margin:0;color:rgba(255,255,255,.62);font-size:13px;text-overflow:ellipsis;white-space:nowrap}.progressTrack{overflow:hidden;height:8px;margin-top:24px;border-radius:999px;background:rgba(255,255,255,.12)}.progressTrack span{display:block;height:100%;border-radius:inherit;background:#ffdb00;transition:width 260ms ease}.progressMeta{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-top:10px}.progressMeta strong{flex:0 0 auto;color:#ffdb00;font-size:13px}.progressMeta span{color:rgba(255,255,255,.58);font-size:12px;line-height:1.55;text-align:right;word-break:break-all}.progressClose{display:flex;min-width:88px;height:36px;align-items:center;justify-content:center;margin:24px 0 0 auto;border:0;border-radius:7px;color:#262626;background:#ffdb00;font-size:13px;font-weight:700;cursor:pointer}.progressClose:hover{background:#ffe44d}
        @media(max-width:640px){.page{width:min(100% - 24px,1120px);padding-top:24px}.header{align-items:flex-start}.headerActions{flex-wrap:wrap;justify-content:flex-end}.grid{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.BOX_DEPLOYMENT_MODE === 'player-service') {
    return { redirect: { destination: '/account', permanent: false } };
  }
  if (process.env.BOX_DEPLOYMENT_MODE !== 'play') {
    return { redirect: { destination: '/projects', permanent: false } };
  }
  if (!process.env.BOX_PLAY_LIBRARY_PATH) {
    return {
      redirect: {
        destination: `/p/${encodeURIComponent(process.env.BOX_WORLD_ID || 'local')}`,
        permanent: false,
      },
    };
  }
  return {
    props: {
      worlds: getPlayWorlds(),
      adminEnabled: isPlayAdminEnabled(),
    },
  };
};
