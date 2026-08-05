import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { PlayWorld } from '../server/play-worlds';
import { getPlayWorlds } from '../server/play-worlds';
import { isPlayAdminEnabled } from '../server/play-admin-security';

const TOKEN_KEY = 'box-play-admin-token';

export default function HomePage({
  worlds,
  adminEnabled,
}: {
  worlds: PlayWorld[];
  adminEnabled: boolean;
}) {
  const importInput = useRef<HTMLInputElement>(null);
  const [adminToken, setAdminToken] = useState('');
  const [verified, setVerified] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [deleteWorld, setDeleteWorld] = useState<PlayWorld | null>(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

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
    setBusy('import');
    setNotice('');
    try {
      const response = await fetch('/api/play-admin/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: file,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '导入失败');
      window.location.reload();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
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
          <div className="title"><h1>作品</h1><span>{worlds.length} 个</span></div>
          {adminEnabled ? (
            verified ? (
              <div className="headerActions">
                <button className="button primary" disabled={Boolean(busy)} onClick={() => importInput.current?.click()}>
                  {busy === 'import' ? '导入中…' : '导入游玩包'}
                </button>
                <button className="button" onClick={exitAdmin}>退出管理</button>
              </div>
            ) : <button className="button" onClick={() => setLoginOpen(true)}>服主管理</button>
          ) : null}
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

        {worlds.length ? (
          <div className="grid">
            {worlds.map((world) => (
              <article className="card" key={world.id}>
                <Link className="cardLink" href={`/p/${encodeURIComponent(world.id)}`}>
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

      <style jsx>{`
        :global(*){box-sizing:border-box}:global(body){margin:0;background:#f7f7f8;color:#202124;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        button,input{font:inherit}.page{width:min(1120px,calc(100% - 40px));margin:0 auto;padding:44px 0 80px}.header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.title{display:flex;align-items:baseline;gap:12px}.title h1{font-size:26px;margin:0}.title span{font-size:13px;color:#85888f}.headerActions{display:flex;gap:8px}.button{height:36px;padding:0 14px;border:1px solid #d9dadd;border-radius:7px;background:#fff;color:#303238;cursor:pointer}.button:hover{background:#f3f4f5}.button:disabled{cursor:default;opacity:.55}.button.primary{border-color:#1f2329;background:#1f2329;color:#fff}.button.primary:hover{background:#34383f}.button.danger{border-color:#d94343;background:#d94343;color:#fff}.hidden{display:none}
        .notice{display:flex;justify-content:space-between;align-items:center;margin:-8px 0 18px;padding:10px 12px;border:1px solid #efd0d0;border-radius:7px;background:#fff5f5;color:#b42323;font-size:13px}.notice button{border:0;background:transparent;color:inherit;font-size:20px;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}.card{overflow:hidden;background:#fff;border:1px solid #e6e7e9;border-radius:10px;transition:border-color .15s,transform .15s}.card:hover{border-color:#bfc2c7;transform:translateY(-2px)}.cardLink{display:block;color:inherit;text-decoration:none}.cover{aspect-ratio:16/9;background:#eceef1;display:flex;align-items:center;justify-content:center;color:#a2a6ad;font-size:32px}.cover img{width:100%;height:100%;object-fit:cover}.info{padding:14px}.info strong{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.info small{display:block;color:#85888f;margin-top:6px}.info p{margin:10px 0 0;color:#5e6269;font-size:13px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.cardActions{display:flex;border-top:1px solid #ececef}.cardActions button{flex:1;height:38px;border:0;background:#fff;color:#555960;font-size:13px;cursor:pointer}.cardActions button+button{border-left:1px solid #ececef}.cardActions button:hover{background:#f6f6f7}.cardActions .dangerText{color:#cf3939}.empty{min-height:164px;padding:54px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;color:#92959b;background:#fff;border:1px solid #e6e7e9;border-radius:10px}
        .backdrop{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(20,22,25,.38)}.dialog{width:min(400px,100%);padding:22px;background:#fff;border-radius:10px;box-shadow:0 18px 55px rgba(0,0,0,.2)}.dialog h2{margin:0 0 20px;font-size:19px}.dialog p{margin:0 0 22px;color:#5d6168;font-size:14px;line-height:1.6}.dialog label{display:block;margin-bottom:8px;color:#555960;font-size:13px}.dialog input{width:100%;height:40px;padding:0 11px;border:1px solid #d6d8dc;border-radius:7px;outline:none}.dialog input:focus{border-color:#7a7f87;box-shadow:0 0 0 3px rgba(40,44,50,.08)}.dialogActions{display:flex;justify-content:flex-end;gap:8px;margin-top:22px}
        @media(max-width:640px){.page{width:min(100% - 24px,1120px);padding-top:24px}.header{align-items:flex-start}.headerActions{flex-wrap:wrap;justify-content:flex-end}.grid{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
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
  return { props: { worlds: getPlayWorlds(), adminEnabled: isPlayAdminEnabled() } };
};
