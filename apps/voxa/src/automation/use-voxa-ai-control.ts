import { useEffect, useState } from 'react';
import type { VoxelEditor } from '../models/editor';

type Session = { id: string; projectId: string; expiresAt: string; locked: boolean };
type CommandPayload = {
  requestId: string;
  type: string;
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
  projection?: 'perspective' | 'orthographic';
  fov?: number;
  zoom?: number;
};
type Command = { index: number; command: CommandPayload };

async function blobBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function useVoxaAiControl(editor: VoxelEditor | undefined) {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!editor) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const projectId = new URLSearchParams(window.location.search).get('modelId');
    if (!projectId) return;

    let socket: WebSocket | undefined;
    let revision = 0;
    let retry = 0;
    let queue = Promise.resolve();
    const running = new Set<string>();
    let activeSessions = new Set<string>();
    const pendingResults = new Map<string, Record<string, unknown>>();
    const send = (message: Record<string, unknown>) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    };
    const postResult = async (active: { id: string }, requestId: string, result: Record<string, unknown>) => {
      const message = { type: 'result', sessionId: active.id, requestId, result };
      pendingResults.set(`${active.id}:${requestId}`, message);
      send(message);
    };

    const execute = async (active: { id: string }, command: Command['command']) => {
      try {
        if (command.type === 'project.load') {
          if (!command.projectFileHash || !/^[a-zA-Z0-9]{16,128}$/.test(command.projectFileHash)) throw new Error('工程资源标识无效');
          const camera = command.preserveView ? editor.stage.getCamera().getSnapshot() : undefined;
          await editor.projectManager.loadProjectFile({ projectFileHash: command.projectFileHash, projectName: command.name || 'VOXA Project' });
          if (camera) {
            editor.stage.getCamera().sync(camera);
            editor.stage.orbitControls.reset();
            editor.automationView();
          }
          await postResult(active, command.requestId, { ok: true, data: { loaded: true } });
          return;
        }
        if (command.type === 'animation.preview') {
          const data = editor.automationPreview(command.motionId || '', command.time || 0, Boolean(command.playing));
          await postResult(active, command.requestId, { ok: true, data });
          return;
        }
        if (command.type === 'scene.view') {
          const data = editor.automationView(command.position, command.target, command.projection, command.fov, command.zoom);
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          editor.render();
          await postResult(active, command.requestId, { ok: true, data });
          return;
        }
        if (command.type === 'project.inspect') {
          const data = await editor.projectManager.getData();
          const nodes = Object.values(data.nodes || {}).map((node) => ({
            id: node.id,
            type: node.type,
            name: node.name,
            parentId: node.parentId,
            boneId: node.boneId,
            voxelId: node.voxelId,
          }));
          const animations = (data.animations || []).map((animation) => ({
            id: animation.id,
            name: animation.name,
            nodeIds: Object.values(animation.nodes || {}).map((node) => node.nodeId),
          }));
          await postResult(active, command.requestId, {
            ok: true,
            data: {
              revision,
              nodeCount: Object.keys(data.nodes || {}).length,
              voxelCount: Object.keys(data.voxels || {}).length,
              animationCount: data.animations?.length || 0,
              hitBoxMode: data.hitBox?.mode,
              nodes,
              animations,
            },
          });
          return;
        }
        if (command.type === 'project.save') {
          const result = await editor.projectManager.saveProject({ autoSave: false });
          await postResult(active, command.requestId, {
            ok: result.isSuccess,
            data: result.isSuccess ? { modelId: result.result.modelResp.modelId } : undefined,
            error: result.isSuccess ? undefined : result.result.type,
          });
          return;
        }
        if (command.type === 'node.createPart') {
          const data = editor.automationCreatePart(command.name);
          await postResult(active, command.requestId, { ok: true, data });
          return;
        }
        if (command.type === 'node.transform') {
          if (!command.nodeId) throw new Error('node.transform 缺少 nodeId');
          const data = editor.automationTransform(command.nodeId, command.position, command.rotation, command.scale);
          await postResult(active, command.requestId, { ok: true, data });
          return;
        }
        if (command.type === 'voxel.fill' || command.type === 'voxel.paint' || command.type === 'voxel.erase') {
          const fillValue = command.type === 'voxel.erase' ? 0 : command.value;
          if (!command.voxelId || !command.min || !command.max || fillValue === undefined) throw new Error('体素命令参数不完整');
          const data = editor.automationFill(command.voxelId, command.min, command.max, fillValue);
          await postResult(active, command.requestId, { ok: true, data });
          return;
        }
        if (command.type === 'voxel.mirror') {
          if (!command.voxelId || command.axis === undefined) throw new Error('voxel.mirror 参数不完整');
          const data = editor.automationMirror(command.voxelId, command.axis);
          await postResult(active, command.requestId, { ok: true, data });
          return;
        }
        if (command.type === 'collision.set') {
          if (!command.mode) throw new Error('collision.set 缺少 mode');
          const data = editor.automationCollision(command.mode, command.position, command.size);
          await postResult(active, command.requestId, { ok: true, data });
          return;
        }
        if (command.type === 'animation.keyframe') {
          const data = editor.automationAnimation(command.motionId, command.nodeIds ?? [], command.time ?? 0, command.interpolation);
          await postResult(active, command.requestId, { ok: true, data });
          return;
        }
        if (command.type === 'scene.capture') {
          const data = command.projection || command.position || command.target || command.fov !== undefined || command.zoom !== undefined
            ? editor.automationView(command.position, command.target, command.projection, command.fov, command.zoom)
            : undefined;
          if (data) {
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
            editor.render();
          }
          const blob = await new Promise<Blob | null>((resolve) => editor.stage.renderer.domElement.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error('当前 VOXA 画布无法截图');
          await postResult(active, command.requestId, { ok: true, data: { ...data, contentBase64: await blobBase64(blob), contentType: 'image/png' } });
          return;
        }
        throw new Error(`不支持的 VOXA 命令：${command.type}`);
      } catch (error) {
        await postResult(active, command.requestId, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    };

    const reconnect = () => {
      if (disposed || timer) return;
      timer = setTimeout(() => { timer = undefined; void connect(); }, Math.min(10000, 500 * 2 ** Math.min(retry++, 5)));
    };
    const connect = async () => {
      try {
        const response = await fetch('/api/local/ai/socket', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'editor', projectId }),
        });
        if (disposed) return;
        if (response.status === 401 || response.status === 403) return;
        if (!response.ok) throw new Error('VOXA WebSocket 连接失败');
        const data = await response.json() as { ticket: string; socketPath: string };
        if (disposed) return;
        const url = new URL(data.socketPath, window.location.href);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const current = new WebSocket(url);
        socket = current;
        current.onopen = () => current.send(JSON.stringify({ type: 'connect', ticket: data.ticket }));
        current.onmessage = event => {
          if (disposed || socket !== current) return;
          const message = JSON.parse(String(event.data));
          if (message.type === 'ready') retry = 0;
          if (message.type === 'sessions') {
            activeSessions = new Set(message.sessions.map((active: Session) => active.id));
            for (const key of pendingResults.keys()) if (!activeSessions.has(key.split(':')[0])) pendingResults.delete(key);
            setLocked(message.sessions.some((active: Session) => active.locked));
          }
          if (message.type === 'ack') pendingResults.delete(`${message.sessionId}:${message.requestId}`);
          if (message.type === 'command') {
            const key = `${message.sessionId}:${message.command.requestId}`;
            const cached = pendingResults.get(key);
            if (cached) { send(cached); return; }
            if (running.has(key)) return;
            running.add(key);
            queue = queue.then(async () => {
              if (disposed || !activeSessions.has(message.sessionId)) return;
              revision = message.index + 1;
              await execute({ id: message.sessionId }, message.command);
            }).finally(() => {
              running.delete(key);
              if (!disposed && socket?.readyState !== WebSocket.OPEN) setLocked(running.size > 0);
            });
          }
        };
        current.onerror = () => current.close();
        current.onclose = event => {
          if (socket !== current) return;
          setLocked(running.size > 0);
          if (!disposed && event.code !== 4009) reconnect();
        };
      } catch { reconnect(); }
    };
    void connect();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      socket?.close();
      pendingResults.clear();
      setLocked(false);
    };
  }, [editor]);

  return { locked };
}
