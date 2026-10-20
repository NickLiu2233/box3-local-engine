import { ProjectInterpolationType } from '@box/voxa-project';
import { addAutomationKeyframe } from '../../voxa/src/automation/animation';
import { store } from '../../voxa/src/redux/store';
import { addMotion, addHierarchyNode, loadMotions, ProjectNodeType, setMotionNodes, setAnimatorState } from '../../voxa/src/redux/animator-slice';

const boneId = 'test-bone';

function fixture() {
  store.dispatch(addHierarchyNode({ idx: 0, newNode: { id: boneId, name: 'Test bone', type: ProjectNodeType.Bone, parentId: 'ROOT_BONE', childrenIds: [] } }));
  store.dispatch(loadMotions({ motionIds: [], motions: {} }));
  const create = jest.fn(() => {
    store.dispatch(addMotion({ id: 'motion', name: 'test' }));
    return 'motion';
  });
  const add = jest.fn((motionId: string, nodeIds: string[], time: number) => {
    store.dispatch(setMotionNodes({ motionId, nodes: nodeIds.map((nodeId) => ({
      nodeId,
      keyframes: Object.fromEntries([0, time, time + 1].map((t, index, times) => [String(t), {
        id: `frame-${nodeId}-${t}`, time: t, prevTime: times[index - 1], nextTime: times[index + 1], interpolation: ProjectInterpolationType.Linear,
        offset: { alpha: 0, matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
      }])),
    })) }));
    return { motionId, nodeIds, time };
  });
  const history = jest.fn(({ action }) => store.dispatch(action));
  const editor = { animatorApp: { automationCreateAnimation: create, automationAddKeyframe: add }, history: { saveAction: history, setGroup: jest.fn(), unsetGroup: jest.fn() } } as unknown as Parameters<typeof addAutomationKeyframe>[0];
  return { editor, create, add, history };
}

test.each(Object.values(ProjectInterpolationType))('sets %s only on the requested keyframe', (type) => {
  const { editor } = fixture();
  const result = addAutomationKeyframe(editor, undefined, [boneId], 0.5, type);
  const frames = store.getState().animator.motionData.motions[result.motionId].nodes[boneId].keyframes;
  expect(frames['0.5'].interpolation).toBe(type);
  expect(frames['1.5'].interpolation).toBe(ProjectInterpolationType.Linear);
});

test('defaults to all bones and reuses a specified motion', () => {
  const { editor, create, add, history } = fixture();
  store.dispatch(addMotion({ id: 'existing', name: 'existing' }));
  expect(addAutomationKeyframe(editor, 'existing', [], 1).nodeIds).toContain(boneId);
  expect(create).not.toHaveBeenCalled();
  expect(add).toHaveBeenCalledWith('existing', [boneId], 1);
  expect(history).not.toHaveBeenCalled();
});

test.each([
  [undefined, [boneId], -1, undefined],
  [undefined, [boneId], NaN, undefined],
  [undefined, [boneId], Infinity, undefined],
  [undefined, [boneId], 61, undefined],
  ['missing', [boneId], 0, undefined],
  [undefined, ['missing'], 0, undefined],
  [undefined, ['ROOT_BONE'], 0, undefined],
  [undefined, [boneId], 0, 'INVALID'],
] as const)('rejects invalid input before modifying the project (%s, %s, %s, %s)', (motion, nodes, time, type) => {
  const { editor, create, add, history } = fixture();
  expect(() => addAutomationKeyframe(editor, motion, [...nodes], time, type as ProjectInterpolationType)).toThrow();
  expect(create).not.toHaveBeenCalled();
  expect(add).not.toHaveBeenCalled();
  expect(history).not.toHaveBeenCalled();
  expect(store.getState().animator.motionData.motionIds).toEqual([]);
});


test('does not create an empty motion when only the system bone root exists', () => {
  const { editor, create } = fixture();
  const state = store.getState().animator;
  const hierarchyData = { ...state.hierarchyData };
  delete hierarchyData[boneId];
  store.dispatch(setAnimatorState({ ...state, hierarchyData }));
  expect(() => addAutomationKeyframe(editor, undefined, [])).toThrow('没有可添加关键帧的骨骼');
  expect(create).not.toHaveBeenCalled();
});


test('reports a failed write if the animator silently skips adding a nonzero frame', () => {
  const { editor, add } = fixture();
  add.mockImplementationOnce((motionId, nodeIds, time) => ({ motionId, nodeIds, time }));
  expect(() => addAutomationKeyframe(editor, undefined, [boneId], 1)).toThrow('关键帧未写入');
});
