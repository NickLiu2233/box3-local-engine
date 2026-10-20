import type { VoxelEditor } from '../models/editor';
import { store } from '../redux/store';
import { AppMode, setCurrentTime } from '../redux/app-slice';
import { AnimatorMode, PivotMode, setModelBoxVisible, setActiveKeyframes } from '../redux/animator-slice';
import {
  animationPreviewPlan, MAX_PREVIEW_BYTES, MAX_PREVIEW_ZIP_BYTES,
  type AnimationPreviewOptions, type AnimationPreviewCapture,
} from '../../shared/animation-preview';

const exporting = new WeakSet<VoxelEditor>();

function base64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** UI and CLI share this exact capture path, including unsaved edits. */
export async function exportAnimationPreview(editor: VoxelEditor, options: AnimationPreviewOptions, cancelled = () => false) {
  if (exporting.has(editor)) throw new Error('动画预览正在导出');
  const state = store.getState();
  if (state.app.mode !== AppMode.Animator || state.animator.mode === AnimatorMode.HitBox || state.animator.pivotMode !== PivotMode.None) {
    throw new Error('请先切换到模型或动画模式，并退出中心点编辑');
  }
  const motion = state.animator.motionData.motions[options.motionId];
  if (!motion) throw new Error('动画不存在');
  const plan = animationPreviewPlan(editor.motionPlayer.getMotionDuration(options.motionId), options);
  const camera = editor.stage.getCamera();
  const cameraSnapshot = camera.getSnapshot();
  const aspect = camera.aspect;
  const orbitEnabled = editor.stage.orbitControls.enabled;
  const source = editor.stage.renderer.domElement;
  if (!source.width || !source.height) throw new Error('当前画布尺寸无效');
  const sourceWidth = source.width, sourceHeight = source.height;
  const output = document.createElement('canvas');
  output.width = output.height = plan.size;
  const ctx = output.getContext('2d');
  if (!ctx) throw new Error('无法创建动画导出画布');
  // Keep the viewport aspect ratio. Letterboxing avoids stretching or cropping poses.
  const scale = Math.min(plan.size / sourceWidth, plan.size / sourceHeight);
  const width = sourceWidth * scale, height = sourceHeight * scale;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#080d17aa;color:white;display:grid;place-items:center;font:16px sans-serif;cursor:wait;touch-action:none';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  const blockKeys = (event: KeyboardEvent) => { event.preventDefault(); event.stopImmediatePropagation(); };
  const frames: string[] = [];
  let totalBytes = 0;
  exporting.add(editor);
  document.body.appendChild(overlay);
  window.addEventListener('keydown', blockKeys, true);
  window.addEventListener('keyup', blockKeys, true);
  try {
    editor.motionPlayer.pause();
    editor.stage.orbitControls.enabled = false;
    editor.animatorApp.nodeManager.setActiveIds([], false);
    editor.animatorApp.toggleBoxes(false);
    editor.animatorApp.toggleSkeleton(false);
    editor.animatorApp.toggleGrid(false);
    store.dispatch(setModelBoxVisible(false));
    await editor.animatorApp.motionManager.withMotionPreview(options.motionId, async pose => {
      for (const frame of plan.frames) {
        if (cancelled()) throw new Error('动画导出已取消');
        overlay.textContent = `正在导出动画 ${frame.index + 1}/${plan.frames.length}`;
        // Yield for UI progress, then synchronously pose, render and copy the WebGL canvas.
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        if (source.width !== sourceWidth || source.height !== sourceHeight) throw new Error('画布尺寸发生变化，请保持窗口尺寸后重试');
        camera.sync(cameraSnapshot);
        pose(frame.time);
        editor.render();
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, plan.size, plan.size);
        ctx.drawImage(source, (plan.size - width) / 2, (plan.size - height) / 2, width, height);
        const png = await new Promise<Blob>((resolve, reject) => output.toBlob(blob => blob ? resolve(blob) : reject(new Error('动画帧截图失败')), 'image/png'));
        totalBytes += png.size;
        if (totalBytes > MAX_PREVIEW_BYTES) throw new Error('预览帧集超过 24 MiB，请缩短区间或降低尺寸');
        frames.push(base64(new Uint8Array(await png.arrayBuffer())));
      }
    });
  } finally {
    try {
      camera.sync(cameraSnapshot);
      editor.stage.orbitControls.reset();
      // reset() refreshes OrbitControls' internal target, but also normalizes
      // camera zoom. Sync once more so the user's exact view is restored.
      camera.sync(cameraSnapshot);
      editor.stage.orbitControls.enabled = orbitEnabled;
      editor.animatorApp.toggleBoxes(state.animator.boxesVisible);
      editor.animatorApp.toggleSkeleton(state.animator.skeletonVisible);
      editor.animatorApp.toggleGrid(state.animator.gridVisible);
      store.dispatch(setModelBoxVisible(state.animator.modelBoxVisible));
      editor.animatorApp.nodeManager.setActiveIds(state.animator.activeIds, false);
      store.dispatch(setCurrentTime(state.app.motionPanel.currentTime));
      if (state.animator.mode === AnimatorMode.Motion) {
        editor.animatorApp.motionManager.poseAtTime(state.app.motionPanel.currentTime);
      }
      store.dispatch(setActiveKeyframes(state.animator.activeKeyframes));
      editor.render();
      if (state.app.motionPanel.playing) editor.motionPlayer.play();
    } finally {
      window.removeEventListener('keydown', blockKeys, true);
      window.removeEventListener('keyup', blockKeys, true);
      overlay.remove();
      exporting.delete(editor);
    }
  }
  if (cancelled()) throw new Error('动画导出已取消');
  const input: AnimationPreviewCapture = {
    plan, motionName: motion.name, frames,
    camera: {
      projection: camera.isPerspectiveCamera() ? 'perspective' : 'orthographic',
      position: Array.from(cameraSnapshot.position), target: Array.from(cameraSnapshot.target),
      zoom: cameraSnapshot.zoom, aspect,
      fov: camera.isPerspectiveCamera() ? camera.fov * 180 / Math.PI : undefined,
    },
  };
  const response = await fetch('/api/local/animation-preview', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `动画预览打包失败 (${response.status})`);
  }
  const archive = await response.blob();
  if (archive.size > MAX_PREVIEW_ZIP_BYTES) throw new Error('动画预览包超过 6 MiB');
  return { archive, plan };
}
