import { useEffect, useRef } from 'react';
import { clientConfig } from 'src/config/client';
import { useEdit } from 'src/client/edit/edit-context';

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('截图编码失败'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const separator = result.indexOf(',');
      if (separator < 0) return reject(new Error('截图编码失败'));
      resolve(result.slice(separator + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export const SceneControl = () => {
  const editor = useEdit();
  const projectId = clientConfig.mapInfo.permanentMapId;
  const sessionId = useRef('');
  const active = useRef(false);

  useEffect(() => {
    if (!projectId) return;
    active.current = true;

    const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    const close = async () => {
      const currentSessionId = sessionId.current;
      sessionId.current = '';
      if (!currentSessionId) return;
      try {
        await fetch(`/api/creator/v1/projects/${encodeURIComponent(projectId)}/scene/session`, {
          method: 'DELETE',
          headers: { 'X-Box-Creator-Scene-Session': currentSessionId },
        });
      } catch {
        // The session expires automatically on the server.
      }
    };

    const run = async () => {
      while (active.current) {
        try {
          const sessionResponse = await fetch(`/api/creator/v1/projects/${encodeURIComponent(projectId)}/scene/session`, { method: 'POST' });
          if (!sessionResponse.ok) throw new Error('无法初始化 CLI 场景控制');
          const session = await sessionResponse.json() as { sessionId: string };
          sessionId.current = session.sessionId;

          while (active.current && sessionId.current === session.sessionId) {
            const response = await fetch(`/api/creator/v1/projects/${encodeURIComponent(projectId)}/scene/action`, {
              headers: { 'X-Box-Creator-Scene-Session': session.sessionId },
            });
            if (response.status === 204) {
              await wait(800);
              continue;
            }
            if (!response.ok) break;
            const action = await response.json() as { id: string; type: 'capture' };
            if (action.type !== 'capture') continue;
            const blob = await editor.captureScreenshot();
            if (!blob) throw new Error('当前场景尚未准备好，无法截图');
            const submit = await fetch(`/api/creator/v1/projects/${encodeURIComponent(projectId)}/scene/actions/${encodeURIComponent(action.id)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Box-Creator-Scene-Session': session.sessionId },
              body: JSON.stringify({ contentBase64: await toBase64(blob) }),
            });
            if (!submit.ok) throw new Error('截图提交失败');
          }
        } catch (error) {
          console.warn('CLI 场景控制连接失败，将重试', error);
        } finally {
          await close();
        }
        if (active.current) await wait(1_000);
      }
    };

    void run();
    return () => {
      active.current = false;
      void close();
    };
  }, [editor, projectId]);

  return null;
};
