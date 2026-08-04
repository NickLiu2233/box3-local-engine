import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import type { PlayWorld } from '../server/play-worlds';
import { getPlayWorlds } from '../server/play-worlds';

export default function HomePage({ worlds }: { worlds: PlayWorld[] }) {
  return (
    <>
      <Head><title>作品</title></Head>
      <main className="page">
        <div className="header">
          <h1>作品</h1>
          <span>{worlds.length} 个</span>
        </div>
        {worlds.length ? (
          <div className="grid">
            {worlds.map((world) => (
              <Link className="card" href={`/p/${encodeURIComponent(world.id)}`} key={world.id}>
                <div className="cover">
                  {world.cover ? <img src={world.cover} alt="" /> : <span>{world.name.slice(0, 1)}</span>}
                </div>
                <div className="info">
                  <strong>{world.name}</strong>
                  <small>{world.author || '未署名'} · {world.version}</small>
                  {world.description ? <p>{world.description}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">暂无可游玩的作品</div>
        )}
      </main>
      <style jsx>{`
        :global(*){box-sizing:border-box} :global(body){margin:0;background:#f7f7f8;color:#202124;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .page{width:min(1120px,calc(100% - 40px));margin:0 auto;padding:44px 0 80px}.header{display:flex;align-items:baseline;gap:12px;margin-bottom:24px}.header h1{font-size:26px;margin:0}.header span{font-size:13px;color:#85888f}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}.card{display:block;overflow:hidden;color:inherit;text-decoration:none;background:white;border:1px solid #e6e7e9;border-radius:10px;transition:border-color .15s,transform .15s}.card:hover{border-color:#bfc2c7;transform:translateY(-2px)}
        .cover{aspect-ratio:16/9;background:#eceef1;display:flex;align-items:center;justify-content:center;color:#a2a6ad;font-size:32px}.cover img{width:100%;height:100%;object-fit:cover}.info{padding:14px}.info strong{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.info small{display:block;color:#85888f;margin-top:6px}.info p{margin:10px 0 0;color:#5e6269;font-size:13px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.empty{padding:70px 20px;text-align:center;color:#92959b;background:white;border:1px solid #e6e7e9;border-radius:10px}
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
  return { props: { worlds: getPlayWorlds() } };
};
