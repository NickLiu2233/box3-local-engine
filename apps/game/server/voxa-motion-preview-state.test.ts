import { store } from '../../voxa/src/redux/store';
import { MotionManager } from '../../voxa/src/models/animator-app/motion-manager';
import { AnimatorMode, loadMotions, setActiveMotionId, setAnimatorMode } from '../../voxa/src/redux/animator-slice';
import { setCurrentTime } from '../../voxa/src/redux/app-slice';
import { KeyframeCaches } from '../../voxa/src/models/animator-app/motion-manager/keyframe-caches';

function fixture(mode: AnimatorMode) {
  store.dispatch(loadMotions({ motionIds: ['old', 'new'], motions: {
    old: { id: 'old', name: 'Old', nodes: {} }, new: { id: 'new', name: 'New', nodes: {} },
  } }));
  store.dispatch(setActiveMotionId('old'));
  store.dispatch(setAnimatorMode(mode));
  store.dispatch(setCurrentTime(0.42));
  const boneManager = { updateSetupData: jest.fn(), clearSetupData: jest.fn() };
  const manager = Object.assign(Object.create(MotionManager.prototype), {
    keyframeCaches: new KeyframeCaches(),
    nodeManager: { boneManager, getAllSkinNodes: () => [] },
    profiler: { updateSkinAlphaCache: jest.fn(), clearSkinAlphaCache: jest.fn() },
    history: { saveAction: jest.fn(), setGroup: jest.fn() },
    poseAtTime: jest.fn(), pose: jest.fn(),
  });
  return { manager: manager as MotionManager & typeof manager, boneManager };
}

test.each([AnimatorMode.Motion, AnimatorMode.Setup])('restores the selected motion and time after successful or failed capture (mode %s)', async mode => {
  const { manager, boneManager } = fixture(mode);
  const originalMotions = store.getState().animator.motionData;
  const run = async (fail: boolean) => manager.withMotionPreview('new', async (pose: (time: number) => void) => {
    expect(store.getState().animator.activeMotionId).toBe('new');
    pose(0);
    pose(0.8);
    expect(manager.poseAtTime).toHaveBeenCalledWith(0.8);
    if (fail) throw new Error('GPU capture failed');
    return 'frames';
  });
  expect(await run(false)).toBe('frames');
  await expect(run(true)).rejects.toThrow('GPU capture failed');
  expect(store.getState().animator.activeMotionId).toBe('old');
  expect(store.getState().app.motionPanel.currentTime).toBe(0.42);
  expect(store.getState().animator.motionData).toBe(originalMotions);
  expect(manager.history.saveAction).not.toHaveBeenCalled();
  if (mode === AnimatorMode.Motion) {
    expect(manager.poseAtTime).toHaveBeenLastCalledWith(0.42);
    expect(boneManager.updateSetupData).not.toHaveBeenCalled();
  } else {
    expect(manager.pose).toHaveBeenCalledTimes(2);
    expect(boneManager.clearSetupData).toHaveBeenCalledTimes(2);
  }
});

test('missing motion fails before changing state or setup caches', async () => {
  const { manager, boneManager } = fixture(AnimatorMode.Setup);
  await expect(manager.withMotionPreview('missing', async () => undefined)).rejects.toThrow('动画不存在');
  expect(store.getState().animator.activeMotionId).toBe('old');
  expect(boneManager.updateSetupData).not.toHaveBeenCalled();
});
