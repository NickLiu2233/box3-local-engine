import { once } from 'node:events';
import { createVoxaWebSocketServer, issueVoxaSocketTicket } from '../../voxa/server/ai-control-websocket';
import { createVoxaAiSession, enqueueVoxaAiCommand, closeVoxaAiSession, getVoxaAiSession } from '../../voxa/server/ai-control-session';

const WebSocket = require('ws');
let server: Awaited<ReturnType<typeof createVoxaWebSocketServer>>;
beforeAll(async () => { server = await createVoxaWebSocketServer(0); });
afterAll(async () => { await server.close(); });

async function connect(ticket: string, origin = 'http://voxa.test') {
  const ws = new WebSocket(`ws://127.0.0.1:${server.port}/api/local/ai/socket`, { origin });
  const messages: any[] = [];
  ws.on('message', data => messages.push(JSON.parse(String(data))));
  await once(ws, 'open');
  const first = new Promise<void>(resolve => ws.on('message', data => {
    if (JSON.parse(String(data)).type === 'snapshot-end') resolve();
  }));
  ws.send(JSON.stringify({ type: 'connect', ticket }));
  await first;
  return { ws, messages };
}
const ticket = (projectId: string, ownerSubjectId = 'owner') => issueVoxaSocketTicket({ role: 'editor', projectId, ownerSubjectId, origin: 'http://voxa.test' });
async function next(ws: any, action: () => void) {
  const message = once(ws, 'message');
  action();
  return JSON.parse(String((await message)[0]));
}

test('pushes sessions and commands, accepts editor results and notifies the controller without polling', async () => {
  const project = 'ws-live';
  const editor = await connect(ticket(project));
  expect(editor.messages[0]).toEqual({ type: 'ready' });
  const sessionMessage = await next(editor.ws, () => { createVoxaAiSession(project, 'owner'); });
  expect(sessionMessage.type).toBe('sessions');
  const session = sessionMessage.sessions[0];
  const controller = await connect(issueVoxaSocketTicket({ role: 'controller', projectId: project, sessionId: session.id, ownerSubjectId: 'owner', origin: 'http://voxa.test' }));
  const command = await next(editor.ws, () => { enqueueVoxaAiCommand(session.id, 'owner', { type: 'project.inspect', requestId: 'inspect-1' }); });
  expect(command).toMatchObject({ type: 'command', sessionId: session.id, command: { requestId: 'inspect-1' } });
  const result = await next(controller.ws, () => editor.ws.send(JSON.stringify({ type: 'result', sessionId: session.id, requestId: 'inspect-1', result: { ok: true, data: { nodeCount: 5 } } })));
  expect(result).toMatchObject({ type: 'result', requestId: 'inspect-1', result: { ok: true, data: { nodeCount: 5 } } });
  expect(getVoxaAiSession(session.id, 'owner')?.commands[0].result).toEqual(result.result);
  const closed = await next(controller.ws, () => { closeVoxaAiSession(session.id, 'owner'); });
  expect(closed.type).toBe('closed');
  editor.ws.close(); controller.ws.close();
});

test('replays pending commands to a reconnecting editor and isolates other owners', async () => {
  const session = createVoxaAiSession('ws-replay', 'owner');
  enqueueVoxaAiCommand(session.id, 'owner', { type: 'scene.capture', requestId: 'pending' });
  const editor = await connect(ticket('ws-replay'));
  // Let all initial snapshot frames arrive using the protocol's final frame.
  const snapshot = editor.messages.find(m => m.type === 'snapshot-end') || await next(editor.ws, () => {});
  expect(snapshot.type).toBe('snapshot-end');
  expect(editor.messages.some(m => m.type === 'command' && m.command.requestId === 'pending')).toBe(true);
  const other = await connect(ticket('ws-replay', 'other'));
  const otherSnapshot = other.messages.find(m => m.type === 'snapshot-end') || await next(other.ws, () => {});
  expect(otherSnapshot.type).toBe('snapshot-end');
  expect(other.messages.find(m => m.type === 'sessions').sessions).toEqual([]);
  editor.ws.close(); other.ws.close(); closeVoxaAiSession(session.id, 'owner');
});

test('rejects cross-origin and reused tickets', async () => {
  const credential = ticket('ws-origin');
  const bad = new WebSocket(`ws://127.0.0.1:${server.port}/api/local/ai/socket`, { origin: 'http://other.test' });
  await once(bad, 'open');
  const closed = once(bad, 'close');
  bad.send(JSON.stringify({ type: 'connect', ticket: credential }));
  expect((await closed)[0]).toBe(1008);
  const good = await connect(credential);
  const replay = new WebSocket(`ws://127.0.0.1:${server.port}/api/local/ai/socket`, { origin: 'http://voxa.test' });
  await once(replay, 'open');
  const replayClosed = once(replay, 'close');
  replay.send(JSON.stringify({ type: 'connect', ticket: credential }));
  expect((await replayClosed)[0]).toBe(1008);
  good.ws.close();
});

test('delivers large capture results and releases a session when its controller disconnects', async () => {
  const session = createVoxaAiSession('ws-capture-large', 'owner', 'capture');
  const editor = await connect(ticket('ws-capture-large'));
  const controller = await connect(issueVoxaSocketTicket({ role: 'controller', projectId: 'ws-capture-large', sessionId: session.id, ownerSubjectId: 'owner', origin: 'http://voxa.test' }));
  await next(editor.ws, () => { enqueueVoxaAiCommand(session.id, 'owner', { type: 'scene.capture', requestId: 'large' }); });
  const contentBase64 = Buffer.alloc(2 * 1024 * 1024, 7).toString('base64');
  const response = await next(controller.ws, () => editor.ws.send(JSON.stringify({ type: 'result', sessionId: session.id, requestId: 'large', result: { ok: true, data: { contentBase64 } } })));
  expect(response.result.data.contentBase64).toBe(contentBase64);
  const released = next(editor.ws, () => controller.ws.close());
  expect((await released).sessions).toEqual([]);
  expect(getVoxaAiSession(session.id, 'owner')).toBeUndefined();
  editor.ws.close();
});
