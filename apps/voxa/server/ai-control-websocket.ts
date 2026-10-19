import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import {
  closeVoxaAiSession, completeVoxaAiCommand, getVoxaAiSession, listVoxaAiCommands,
  listVoxaAiSessions, subscribeVoxaAiEvents,
} from './ai-control-session';

const WebSocket = require('ws');
const SOCKET_PATH = '/api/local/ai/socket';
type Binding = {
  role: 'editor' | 'controller';
  projectId: string;
  ownerSubjectId: string;
  sessionId?: string;
  origin: string;
};
type Ticket = Binding & { expiresAt: number };
const registry = globalThis as typeof globalThis & {
  __boxVoxaSocketTickets?: Map<string, Ticket>;
  __boxVoxaSocketServer?: ReturnType<typeof createVoxaWebSocketServer>;
};
const tickets = registry.__boxVoxaSocketTickets ||= new Map<string, Ticket>();

export function issueVoxaSocketTicket(binding: Binding) {
  for (const [key, ticket] of tickets) if (ticket.expiresAt <= Date.now()) tickets.delete(key);
  if (tickets.size >= 512) throw new Error('VOXA 连接请求过多');
  if (binding.role === 'controller') {
    const session = getVoxaAiSession(binding.sessionId || '', binding.ownerSubjectId);
    if (!session || session.projectId !== binding.projectId) throw new Error('VOXA 自动化会话不存在');
  }
  const token = randomUUID();
  tickets.set(token, { ...binding, expiresAt: Date.now() + 30_000 });
  return token;
}

/** The public Next upgrade route proxies to this loopback-only server. */
export async function createVoxaWebSocketServer(port: number) {
  const server = createServer((_req, res) => { res.writeHead(404); res.end(); });
  const sockets = new WebSocket.Server({ noServer: true, maxPayload: 9 * 1024 * 1024, perMessageDeflate: false });
  const editors = new Map<string, any>();
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== SOCKET_PATH || sockets.clients.size >= 128) { socket.destroy(); return; }
    sockets.handleUpgrade(req, socket, head, ws => sockets.emit('connection', ws, req));
  });
  sockets.on('connection', (ws, req) => {
    let binding: Ticket | undefined;
    let unsubscribe: (() => void) | undefined;
    const authTimeout = setTimeout(() => ws.close(1008), 5_000);
    authTimeout.unref?.();
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    ws.on('pong', () => { alive = true; });
    const heartbeat = setInterval(() => {
      if (!alive) { ws.terminate(); return; }
      alive = false;
      ws.ping();
    }, 30_000);
    heartbeat.unref?.();
    const send = (value: object) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      if (ws.bufferedAmount > 12 * 1024 * 1024) { ws.terminate(); return; }
      ws.send(JSON.stringify(value));
    };
    ws.on('message', (bytes, binary) => {
      try {
        if (binary || (!binding && bytes.length > 1024)) throw new Error('无效消息');
        const message = JSON.parse(String(bytes));
        if (!binding) {
          const ticket = message.type === 'connect' && typeof message.ticket === 'string' ? tickets.get(message.ticket) : undefined;
          if (!ticket || ticket.expiresAt <= Date.now() || ticket.origin !== String(req.headers.origin || '')) throw new Error('未授权连接');
          if (ticket.role === 'controller' && !getVoxaAiSession(ticket.sessionId || '', ticket.ownerSubjectId)) throw new Error('会话已关闭');
          tickets.delete(message.ticket);
          const editorKey = JSON.stringify([ticket.ownerSubjectId, ticket.projectId]);
          if (ticket.role === 'editor') {
            if (editors.get(editorKey)?.readyState === WebSocket.OPEN) { ws.close(4009, 'editor already connected'); return; }
            editors.set(editorKey, ws);
          }
          binding = ticket;
          clearTimeout(authTimeout);
          // Reconnect through the authenticated bootstrap to renew the lease.
          expiry = setTimeout(() => ws.close(4001, 'renew authorization'), 15 * 60_000);
          expiry.unref?.();
          unsubscribe = subscribeVoxaAiEvents(event => {
            if (event.ownerSubjectId !== ticket.ownerSubjectId || event.projectId !== ticket.projectId) return;
            if (ticket.role === 'editor') {
              if (event.type === 'sessions') send({ type: 'sessions', sessions: listVoxaAiSessions(ticket.projectId, ticket.ownerSubjectId) });
              if (event.type === 'command') send({ type: 'command', sessionId: event.sessionId, command: event.command, index: event.index });
            } else if (event.sessionId === ticket.sessionId) {
              if (event.type === 'result') send({ type: 'result', sessionId: event.sessionId, requestId: event.requestId, result: event.result });
              if (event.type === 'closed') send({ type: 'closed', sessionId: event.sessionId });
            }
          });
          send({ type: 'ready' });
          if (ticket.role === 'editor') {
            const sessions = listVoxaAiSessions(ticket.projectId, ticket.ownerSubjectId);
            send({ type: 'sessions', sessions });
            for (const session of sessions) {
              for (const item of listVoxaAiCommands(session.id, ticket.ownerSubjectId, 0).items) {
                if (!item.result) send({ type: 'command', sessionId: session.id, command: item.command, index: item.index });
              }
            }
          } else {
            for (const item of listVoxaAiCommands(ticket.sessionId!, ticket.ownerSubjectId, 0).items) {
              if (item.result) send({ type: 'result', sessionId: ticket.sessionId, requestId: item.command.requestId, result: item.result });
            }
          }
          send({ type: 'snapshot-end' });
        } else {
          if (binding.role !== 'editor' || message.type !== 'result' || typeof message.sessionId !== 'string' || typeof message.requestId !== 'string' || typeof message.result?.ok !== 'boolean') throw new Error('无效结果');
          const session = getVoxaAiSession(message.sessionId, binding.ownerSubjectId);
          if (!session || session.projectId !== binding.projectId) throw new Error('会话已关闭');
          if (!message.result.ok && typeof message.result.error !== 'string') throw new Error('无效错误结果');
          completeVoxaAiCommand(session.id, binding.ownerSubjectId, message.requestId, message.result);
          send({ type: 'ack', sessionId: session.id, requestId: message.requestId });
        }
      } catch { ws.close(1008); }
    });
    ws.on('error', () => ws.terminate());
    ws.on('close', () => {
      clearTimeout(authTimeout); clearTimeout(expiry); clearInterval(heartbeat);
      unsubscribe?.();
      if (binding?.role === 'editor') {
        const key = JSON.stringify([binding.ownerSubjectId, binding.projectId]);
        if (editors.get(key) === ws) editors.delete(key);
      }
      if (binding?.role === 'controller') closeVoxaAiSession(binding.sessionId!, binding.ownerSubjectId);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  server.unref();
  return {
    port: (server.address() as { port: number }).port,
    close: () => new Promise<void>((resolve, reject) => {
      for (const ws of sockets.clients) ws.terminate();
      sockets.close(() => server.close(error => error ? reject(error) : resolve()));
    }),
  };
}

export function ensureVoxaWebSocketServer() {
  if (!registry.__boxVoxaSocketServer) {
    registry.__boxVoxaSocketServer = createVoxaWebSocketServer(Number(process.env.BOX_VOXA_SOCKET_PORT || 9969))
      .catch(error => { registry.__boxVoxaSocketServer = undefined; throw error; });
  }
  return registry.__boxVoxaSocketServer;
}
