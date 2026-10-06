type Options = { body: object; headers?: Record<string, string> };
type Listener = (event: any) => void;
type Connection = { listeners: Set<Listener>; stop: () => void };
const connections = new Map<string, Connection>();
/** One connection per service and subscription; no periodic HTTP data reads. */
export function subscribeRealtime(key: string, options: Options, listener: Listener) {
  let connection = connections.get(key);
  if (!connection) {
    const listeners = new Set<Listener>();
    let socket: WebSocket | undefined;
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const controller = new AbortController();
    const emit = (event: any) => { for (const handler of [...listeners]) { try { handler(event); } catch { /* Isolate observers. */ } } };
    const reopen = () => {
      if (!disposed) retry = setTimeout(() => { void open(); }, Math.min(30_000, 1000 * 2 ** Math.min(failures++, 5)));
    };
    const open = async () => {
      if (disposed) return;
      try {
        const response = await fetch('/api/realtime/session', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...options.headers },
          body: JSON.stringify(options.body), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
        });
        if ([401, 403, 404].includes(response.status)) { emit({ type: 'unauthorized' }); return; }
        if (!response.ok) throw new Error('实时连接不可用');
        const grant = await response.json();
        if (disposed) return;
        const url = new URL(grant.socketPath, window.location.href);
        if (url.origin !== window.location.origin) throw new Error('实时连接必须同源');
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(url.href); socket = ws;
        deadline = setTimeout(() => ws.close(), 10_000);
        ws.onopen = () => { if (!disposed && socket === ws) ws.send(JSON.stringify({ type: 'connect', ticket: grant.ticket })); };
        ws.onmessage = ({ data }) => {
          if (disposed || socket !== ws) return;
          try {
            const event = JSON.parse(String(data));
            if (event.type === 'reauthenticate') { emit(event); ws.close(); return; }
            if (event.type === 'ready') { failures = 0; clearTimeout(deadline); }
            emit(event);
          } catch { ws.close(); }
        };
        ws.onerror = () => ws.close();
        ws.onclose = () => {
          if (socket !== ws) return;
          clearTimeout(deadline); socket = undefined;
          emit({ type: 'disconnected' }); reopen();
        };
      } catch { if (!disposed) { emit({ type: 'disconnected' }); reopen(); } }
    };
    connection = { listeners, stop: () => {
      disposed = true; controller.abort(); clearTimeout(retry); clearTimeout(deadline); socket?.close();
    } };
    connections.set(key, connection);
    // Defer so the first observer is installed before bootstrap can fail.
    void Promise.resolve().then(open);
  }
  const subscription = (event: any) => listener(event);
  connection.listeners.add(subscription);
  return () => {
    connection!.listeners.delete(subscription);
    if (!connection!.listeners.size) { connection!.stop(); connections.delete(key); }
  };
}
