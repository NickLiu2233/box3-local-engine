import { randomUUID } from 'node:crypto';

const SESSION_TTL_MS = 15 * 60_000;
const REQUEST_TTL_MS = 25_000;
const MAX_CAPTURE_BYTES = 6 * 1024 * 1024;

type CaptureRequest = {
  id: string;
  resolve: (value: { content: Buffer; contentType: 'image/png' }) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type SceneSession = {
  id: string;
  ownerSubjectId: string;
  expiresAt: number;
  capture?: CaptureRequest;
};

const sessions = new Map<string, SceneSession>();

function rejectCapture(session: SceneSession, error: Error) {
  if (!session.capture) return;
  clearTimeout(session.capture.timer);
  session.capture.reject(error);
  session.capture = undefined;
}

function activeSession(projectId: string) {
  const session = sessions.get(projectId);
  if (session && session.expiresAt <= Date.now()) {
    rejectCapture(session, new Error('编辑场景控制会话已过期'));
    sessions.delete(projectId);
    return undefined;
  }
  return session;
}

export function enableCreatorSceneSession(projectId: string, ownerSubjectId: string) {
  const previous = sessions.get(projectId);
  if (previous) rejectCapture(previous, new Error('编辑场景控制会话已被替换'));
  const session: SceneSession = { id: randomUUID(), ownerSubjectId, expiresAt: Date.now() + SESSION_TTL_MS };
  sessions.set(projectId, session);
  return { sessionId: session.id, expiresAt: new Date(session.expiresAt).toISOString() };
}

export function disableCreatorSceneSession(projectId: string, sessionId: string, ownerSubjectId: string) {
  const session = activeSession(projectId);
  if (!session || session.id !== sessionId || session.ownerSubjectId !== ownerSubjectId) return false;
  rejectCapture(session, new Error('编辑场景控制会话已关闭'));
  sessions.delete(projectId);
  return true;
}

export function creatorSceneSessionStatus(projectId: string, sessionId: string, ownerSubjectId: string) {
  const session = activeSession(projectId);
  return Boolean(session && session.id === sessionId && session.ownerSubjectId === ownerSubjectId);
}

export function nextCreatorSceneAction(projectId: string, sessionId: string, ownerSubjectId: string) {
  const session = activeSession(projectId);
  if (!session || session.id !== sessionId || session.ownerSubjectId !== ownerSubjectId) throw new Error('编辑场景控制会话不可用');
  if (!session.capture) return null;
  return { id: session.capture.id, type: 'capture' as const };
}

export function requestCreatorSceneCapture(projectId: string) {
  const session = activeSession(projectId);
  if (!session) throw Object.assign(new Error('地图当前没有已授权的编辑场景控制会话'), { statusCode: 409 });
  if (session.capture) throw Object.assign(new Error('已有截图请求正在等待编辑器响应'), { statusCode: 409 });
  return new Promise<{ content: Buffer; contentType: 'image/png' }>((resolve, reject) => {
    const id = randomUUID();
    const timer = setTimeout(() => {
      if (session.capture?.id === id) session.capture = undefined;
      reject(Object.assign(new Error('等待编辑器截图超时，请确认地图已打开且已允许 CLI 场景控制'), { statusCode: 504 }));
    }, REQUEST_TTL_MS);
    session.capture = { id, resolve, reject, timer };
  });
}

export function completeCreatorSceneCapture(
  projectId: string,
  sessionId: string,
  requestId: string,
  ownerSubjectId: string,
  contentBase64: string,
) {
  const session = activeSession(projectId);
  if (!session || session.id !== sessionId || session.ownerSubjectId !== ownerSubjectId || session.capture?.id !== requestId) {
    throw new Error('截图请求已失效');
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(contentBase64) || contentBase64.length % 4 !== 0) {
    throw new Error('截图编码无效');
  }
  const content = Buffer.from(contentBase64, 'base64');
  if (!content.length || content.length > MAX_CAPTURE_BYTES || content.toString('base64') !== contentBase64) {
    throw new Error('截图内容无效或超过 6 MiB 限制');
  }
  clearTimeout(session.capture.timer);
  const request = session.capture;
  session.capture = undefined;
  request.resolve({ content, contentType: 'image/png' });
}
