import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import {
  normalizeRemoteServerURL,
  rememberRemoteServerURL,
} from 'src/utils/remote-game-server';

export default function ConnectPage() {
  const [server, setServer] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(
      'box-local-engine.remote-server',
    );
    if (saved) {
      setServer(saved);
    }
  }, []);

  const connect = async (event: FormEvent) => {
    event.preventDefault();
    setConnecting(true);
    try {
      const normalized = normalizeRemoteServerURL(server);
      if (!normalized) {
        setError('请输入服务器地址');
        return;
      }
      const response = await fetch(`${normalized}/api/server-info`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      rememberRemoteServerURL(normalized);
      window.location.href = `/p/local?server=${encodeURIComponent(normalized)}`;
    } catch {
      setError('无法连接服务器，请检查地址、端口和服务器状态');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <main style={styles.page}>
      <form style={styles.card} onSubmit={connect}>
        <div style={styles.eyebrow}>BOX LOCAL ENGINE</div>
        <h1 style={styles.title}>连接服务器</h1>
        <p style={styles.description}>
          输入专用服务器的域名或 IP 地址，例如 game.example.com 或
          http://192.168.1.20:9966。
        </p>
        <label style={styles.label} htmlFor="server">
          服务器地址
        </label>
        <input
          id="server"
          style={styles.input}
          value={server}
          onChange={(event) => {
            setServer(event.target.value);
            setError('');
          }}
          placeholder="http://127.0.0.1:9966"
          autoFocus
        />
        {error && <div style={styles.error}>{error}</div>}
        <button style={styles.button} type="submit" disabled={connecting}>
          {connecting ? '正在连接……' : '进入服务器'}
        </button>
      </form>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    color: '#f5f7ff',
    background:
      'radial-gradient(circle at top, #273b63 0%, #111a2d 45%, #080d17 100%)',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    width: 'min(100%, 480px)',
    padding: 32,
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    background: 'rgba(12, 19, 33, 0.9)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
  },
  eyebrow: {
    color: '#7eb6ff',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.16em',
  },
  title: { margin: '10px 0 8px', fontSize: 32 },
  description: { margin: '0 0 28px', color: '#aeb9cc', lineHeight: 1.7 },
  label: { display: 'block', marginBottom: 8, fontWeight: 600 },
  input: {
    boxSizing: 'border-box',
    width: '100%',
    padding: '13px 14px',
    color: '#fff',
    border: '1px solid #3a4860',
    borderRadius: 10,
    outline: 'none',
    background: '#111a2a',
    fontSize: 16,
  },
  error: { marginTop: 10, color: '#ff9292', fontSize: 14 },
  button: {
    width: '100%',
    marginTop: 20,
    padding: '13px 16px',
    color: '#07101f',
    border: 0,
    borderRadius: 10,
    background: '#7eb6ff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
