import { store } from '../../voxa/src/redux/store';
import { exportAnimationPreview } from '../../voxa/src/automation/animation-preview';
import { AnimatorMode, loadMotions, setActiveMotionId, setAnimatorMode } from '../../voxa/src/redux/animator-slice';
import { AppMode, setAppMode, setCurrentTime, setPlaying } from '../../voxa/src/redux/app-slice';

const originalDocument = globalThis.document, originalWindow = globalThis.window, originalFetch = globalThis.fetch;
afterEach(() => {
  Object.assign(globalThis, { document: originalDocument, window: originalWindow, fetch: originalFetch });
});

function fixture(failCapture = false) {
  store.dispatch(setAppMode(AppMode.Animator));
  store.dispatch(setAnimatorMode(AnimatorMode.Motion));
  store.dispatch(loadMotions({ motionIds: ['walk'], motions: { walk: { id: 'walk', name: 'Walk', nodes: {} } } }));
  store.dispatch(setActiveMotionId('walk'));
  store.dispatch(setCurrentTime(0.42));
  store.dispatch(setPlaying(true));
  const drawImage = jest.fn(), overlay = { style: {}, setAttribute: jest.fn(), remove: jest.fn(), textContent: '' };
  const output = {
    getContext: () => ({ fillRect: jest.fn(), drawImage }),
    toBlob: (callback: (blob: Blob | null) => void) => callback(failCapture ? null : new Blob(['png'])),
  };
  const fetch = jest.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, blob: async () => new Blob(['zip'], { type: 'application/zip' }) }));
  Object.assign(globalThis, {
    document: { createElement: (tag: string) => tag === 'canvas' ? output : overlay, body: { appendChild: jest.fn() } },
    window: { addEventListener: jest.fn(), removeEventListener: jest.fn() }, fetch,
  });
  const snapshot = { position: [1, 2, 3], target: [0, 0, 0], zoom: 1 };
  const camera = { getSnapshot: () => snapshot, sync: jest.fn(), aspect: 2, isPerspectiveCamera: () => false };
  const pose = jest.fn();
  const source = { width: 400, height: 200 };
  const editor = {
    stage: { getCamera: () => camera, orbitControls: { enabled: true, reset: jest.fn() }, renderer: { domElement: source } },
    motionPlayer: {
      getMotionDuration: () => 0.2,
      pause: jest.fn(() => { store.dispatch(setCurrentTime(0.4)); store.dispatch(setPlaying(false)); }),
      play: jest.fn(() => store.dispatch(setPlaying(true))),
    },
    animatorApp: {
      nodeManager: { setActiveIds: jest.fn() }, toggleBoxes: jest.fn(), toggleSkeleton: jest.fn(), toggleGrid: jest.fn(),
      motionManager: { withMotionPreview: async (_: string, capture: (pose: (time: number) => void) => Promise<void>) => capture(pose), poseAtTime: jest.fn() },
    },
    render: jest.fn(),
  };
  return { editor, pose, camera, source, drawImage, overlay, fetch };
}

test('capture samples the editor renderer at each timestamp using one camera and preserves viewport proportions', async () => {
  const { editor, pose, camera, source, drawImage, overlay, fetch } = fixture();
  const { plan } = await exportAnimationPreview(editor as unknown as Parameters<typeof exportAnimationPreview>[0], { motionId: 'walk', fps: 10, size: 128 });
  expect(pose.mock.calls.map(([time]) => time)).toEqual([0, 0.1, 0.2]);
  expect(editor.render).toHaveBeenCalledTimes(4);
  expect(camera.sync.mock.calls.every(([snapshot]) => snapshot === camera.getSnapshot())).toBe(true);
  expect(drawImage).toHaveBeenCalledTimes(3);
  expect(drawImage).toHaveBeenCalledWith(source, 0, 32, 128, 64);
  expect(store.getState().app.motionPanel.currentTime).toBe(0.42);
  expect(editor.motionPlayer.play).toHaveBeenCalledTimes(1);
  expect(editor.stage.orbitControls.enabled).toBe(true);
  expect(overlay.remove).toHaveBeenCalled();
  const request = JSON.parse(String(fetch.mock.calls[0][1]?.body));
  expect(request.plan).toEqual(plan);
  expect(request.camera.aspect).toBe(2);
  expect(request.frames).toHaveLength(3);
});

test('failed canvas capture restores time, playback and camera controls without submitting partial frames', async () => {
  const { editor, overlay, fetch } = fixture(true);
  await expect(exportAnimationPreview(editor as unknown as Parameters<typeof exportAnimationPreview>[0], { motionId: 'walk', fps: 10, size: 128 })).rejects.toThrow('动画帧截图失败');
  expect(store.getState().app.motionPanel.currentTime).toBe(0.42);
  expect(store.getState().app.motionPanel.playing).toBe(true);
  expect(editor.stage.orbitControls.enabled).toBe(true);
  expect(overlay.remove).toHaveBeenCalled();
  expect(window.removeEventListener).toHaveBeenCalledTimes(2);
  expect(fetch).not.toHaveBeenCalled();
});
