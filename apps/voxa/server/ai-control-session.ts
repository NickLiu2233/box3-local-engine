import { randomUUID } from 'node:crypto';

const TTL_MS = 15 * 60_000;
const MAX_QUEUE = 200;

export type VoxaAutomationCommand = {
  type: 'project.inspect' | 'project.save' | 'project.load' | 'scene.capture' | 'scene.view' | 'node.createPart' | 'node.transform' | 'voxel.fill' | 'voxel.paint' | 'voxel.erase' | 'voxel.mirror' | 'collision.set' | 'animation.keyframe' | 'animation.preview';
  requestId: string;
  name?: string;
  nodeId?: string;
  voxelId?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  size?: [number, number, number];
  min?: [number, number, number];
  max?: [number, number, number];
  value?: number;
  axis?: 0 | 1 | 2;
  mode?: 'default' | 'custom';
  motionId?: string;
  nodeIds?: string[];
  time?: number;
  interpolation?: 'STEP' | 'LINEAR' | 'EASE_IN_SINE' | 'EASE_OUT_SINE' | 'EASE_IN_OUT_SINE';
  projectFileHash?: string;
  playing?: boolean;
  target?: [number, number, number];
  preserveView?: boolean;
};
export type VoxaAutomationSessionMode = 'edit' | 'capture';

type CommandState = {
  command: VoxaAutomationCommand;
  result?: { ok: true; data?: unknown } | { ok: false; error: string };
};

type Session = {
  id: string;
  projectId: string;
  ownerSubjectId: string;
  expiresAt: number;
  locked: boolean;
  mode: VoxaAutomationSessionMode;
  commands: CommandState[];
  timer?: ReturnType<typeof setTimeout>;
};

export type VoxaAiEvent = {
  type: 'sessions' | 'command' | 'result' | 'closed';
  projectId: string;
  ownerSubjectId: string;
  sessionId: string;
  command?: VoxaAutomationCommand;
  index?: number;
  requestId?: string;
  result?: CommandState['result'];
};
const registry = globalThis as typeof globalThis & {
  __boxVoxaAiSessions?: Map<string, Session>;
  __boxVoxaAiListeners?: Set<(event: VoxaAiEvent) => void>;
};
const sessions = registry.__boxVoxaAiSessions ||= new Map<string, Session>();
const listeners = registry.__boxVoxaAiListeners ||= new Set<(event: VoxaAiEvent) => void>();

export function subscribeVoxaAiEvents(listener: (event: VoxaAiEvent) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify(session: Session, event: Omit<VoxaAiEvent, 'projectId' | 'ownerSubjectId' | 'sessionId'>) {
  for (const listener of listeners) listener({ ...event, projectId: session.projectId, ownerSubjectId: session.ownerSubjectId, sessionId: session.id });
}

function remove(session: Session) {
  sessions.delete(session.id);
  clearTimeout(session.timer);
  notify(session, { type: 'closed' });
  notify(session, { type: 'sessions' });
}

function get(id: string) {
  const session = sessions.get(id);
  if (!session) return undefined;
  if (session.expiresAt <= Date.now()) {
    remove(session);
    return undefined;
  }
  return session;
}

export function createVoxaAiSession(
  projectId: string,
  ownerSubjectId: string,
  mode: VoxaAutomationSessionMode = 'edit',
) {
  const session: Session = {
    id: randomUUID(),
    projectId,
    ownerSubjectId,
    expiresAt: Date.now() + TTL_MS,
    locked: true,
    mode,
    commands: [],
  };
  sessions.set(session.id, session);
  session.timer = setTimeout(() => remove(session), TTL_MS);
  session.timer.unref?.();
  notify(session, { type: 'sessions' });
  return publicSession(session);
}

export function listVoxaAiSessions(projectId: string, ownerSubjectId: string) {
  return [...sessions.values()]
    .filter((session) => session.projectId === projectId && session.ownerSubjectId === ownerSubjectId && get(session.id))
    .map(publicSession);
}

export function getVoxaAiSession(id: string, ownerSubjectId: string) {
  const session = get(id);
  return session && session.ownerSubjectId === ownerSubjectId ? session : undefined;
}

export function enqueueVoxaAiCommand(id: string, ownerSubjectId: string, command: VoxaAutomationCommand) {
  const session = getVoxaAiSession(id, ownerSubjectId);
  if (!session) throw new Error('VOXA 自动化会话不存在或已过期');
  if (session.mode === 'capture' && command.type !== 'scene.capture') {
    throw new Error('VOXA 截图会话只允许 scene.capture 命令');
  }
  if (session.commands.some((item) => item.command.requestId === command.requestId)) {
    return session.commands.find((item) => item.command.requestId === command.requestId)!;
  }
  if (session.commands.length >= MAX_QUEUE) throw new Error('VOXA 自动化命令队列已满');
  const item = { command };
  session.commands.push(item);
  notify(session, { type: 'command', command, index: session.commands.length - 1 });
  return item;
}

export function listVoxaAiCommands(id: string, ownerSubjectId: string, cursor: number) {
  const session = getVoxaAiSession(id, ownerSubjectId);
  if (!session) throw new Error('VOXA 自动化会话不存在或已过期');
  return { session: publicSession(session), items: session.commands.slice(Math.max(0, cursor)).map((item, index) => ({ index: cursor + index, ...item })) };
}

export function completeVoxaAiCommand(id: string, ownerSubjectId: string, requestId: string, result: CommandState['result']) {
  const session = getVoxaAiSession(id, ownerSubjectId);
  if (!session) throw new Error('VOXA 自动化会话不存在或已过期');
  const item = session.commands.find((entry) => entry.command.requestId === requestId);
  if (!item) throw new Error('VOXA 自动化命令不存在');
  if (item.result) return item;
  item.result = result;
  notify(session, { type: 'result', requestId, result });
  return item;
}

export function closeVoxaAiSession(id: string, ownerSubjectId: string) {
  const session = getVoxaAiSession(id, ownerSubjectId);
  if (!session) return false;
  remove(session);
  return true;
}

function publicSession(session: Session) {
  return { id: session.id, projectId: session.projectId, expiresAt: new Date(session.expiresAt).toISOString(), locked: session.locked, mode: session.mode };
}
