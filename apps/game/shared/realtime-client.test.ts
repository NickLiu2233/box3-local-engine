import { afterEach, expect, jest, test } from '@jest/globals';
import { subscribeRealtime } from './realtime-client';
class Socket {
  static instances: Socket[] = [];
  onopen?: () => void; onmessage?: (event: any) => void; onclose?: () => void;
  sent: any[] = [];
  constructor(public url: string) { Socket.instances.push(this); }
  send(value: string) { this.sent.push(JSON.parse(value)); }
  close() { this.onclose?.(); }
  event(value: any) { this.onmessage?.({ data: JSON.stringify(value) }); }
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
afterEach(() => { jest.useRealTimers(); delete (globalThis as any).window; delete (globalThis as any).WebSocket; });
test('shared connection authenticates, reconnects and stops without idle HTTP reads', async () => {
  jest.useFakeTimers(); Socket.instances = [];
  (globalThis as any).window = { location: { href: 'https://engine.test/', origin: 'https://engine.test' } };
  (globalThis as any).WebSocket = Socket;
  const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ ticket: 'ticket', socketPath: '/api/realtime/socket' }) }));
  globalThis.fetch = fetchMock as any;
  const events: any[] = [];
  const first = subscribeRealtime('fixture', { body: { kind: 'presence-watch', maps: ['map-a'] } }, e => events.push(e));
  const second = subscribeRealtime('fixture', { body: { kind: 'presence-watch', maps: ['map-a'] } }, () => {});
  try {
    await flush(); expect(fetchMock).toHaveBeenCalledTimes(1);
    const ws = Socket.instances[0]; expect(ws.url).toBe('wss://engine.test/api/realtime/socket');
    ws.onopen?.(); expect(ws.sent).toEqual([{ type: 'connect', ticket: 'ticket' }]);
    ws.event({ type: 'ready' });
    jest.advanceTimersByTime(60_000); await flush(); expect(fetchMock).toHaveBeenCalledTimes(1);
    first(); ws.event({ type: 'change', topic: 'players' }); expect(events).toEqual([{ type: 'ready' }]);
    ws.close(); jest.advanceTimersByTime(1000); await flush(); expect(fetchMock).toHaveBeenCalledTimes(2);
    second(); jest.advanceTimersByTime(60_000); await flush(); expect(fetchMock).toHaveBeenCalledTimes(2);
  } finally { first(); second(); }
});
test('unauthorized bootstrap stops retries and immediate unsubscribe cancels bootstrap', async () => {
  jest.useFakeTimers();
  const fetchMock = jest.fn(async () => ({ ok: false, status: 403 }));
  globalThis.fetch = fetchMock as any;
  const events: any[] = [];
  const stop = subscribeRealtime('forbidden', { body: { kind: 'admin-events' } }, e => events.push(e));
  try {
    await flush(); expect(events).toEqual([{ type: 'unauthorized' }]);
    jest.advanceTimersByTime(60_000); await flush(); expect(fetchMock).toHaveBeenCalledTimes(1);
    const cancel = subscribeRealtime('cancel', { body: {} }, () => {}); cancel(); await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  } finally { stop(); }
});
