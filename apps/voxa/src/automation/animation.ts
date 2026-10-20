import { ProjectInterpolationType } from '@box/voxa-project';
import { ROOT_BONE_ID } from '../defs';
import type { VoxelEditor } from '../models/editor';
import { MAX_KEYFRAME_TIME } from '../models/animator-app/util';
import { ProjectNodeType, setKeyframesInterpolation } from '../redux/animator-slice';
import { store } from '../redux/store';

// Validate before creating a motion or changing the editor's selection/time.
export function addAutomationKeyframe(
  editor: Pick<VoxelEditor, 'animatorApp' | 'history'>,
  motionId: string | undefined,
  nodeIds: string[],
  time = 0,
  interpolation?: `${ProjectInterpolationType}`,
) {
  const type = Object.values(ProjectInterpolationType).find((value) => value === interpolation);
  if (interpolation !== undefined && !type) throw new Error(`不支持的动画补帧方式：${interpolation}`);
  if (!Number.isFinite(time) || time < 0 || time > MAX_KEYFRAME_TIME) {
    throw new Error(`动画时间必须是 0 到 ${MAX_KEYFRAME_TIME} 秒之间的有限数值`);
  }
  const { hierarchyData, motionData } = store.getState().animator;
  if (motionId !== undefined && !motionData.motions[motionId]) throw new Error(`动画不存在：${motionId}`);
  if (!Array.isArray(nodeIds) || nodeIds.some((id) => typeof id !== 'string' || id === ROOT_BONE_ID || hierarchyData[id]?.type !== ProjectNodeType.Bone)) {
    throw new Error('动画节点必须是有效的骨骼节点 ID');
  }
  const targetNodeIds = nodeIds.length
    ? [...new Set(nodeIds)]
    : Object.values(hierarchyData).filter((node) => node.id !== ROOT_BONE_ID && node.type === ProjectNodeType.Bone).map((node) => node.id);
  if (!targetNodeIds.length) throw new Error('当前工程没有可添加关键帧的骨骼');
  editor.history.setGroup();
  try {
    const id = motionId ?? editor.animatorApp.automationCreateAnimation();
    if (!id) throw new Error('无法创建 VOXA 动画');
    const result = editor.animatorApp.automationAddKeyframe(id, targetNodeIds, time);
    const motion = store.getState().animator.motionData.motions[id];
    const nodeKeyframeIds = Object.fromEntries(targetNodeIds.map((nodeId) => {
      const keyframe = motion?.nodes[nodeId]?.keyframes[String(time)];
      if (!keyframe) throw new Error(`骨骼 ${nodeId} 的 ${time} 秒关键帧未写入`);
      return [nodeId, [keyframe.id]];
    }));
    if (type) {
      editor.history.saveAction({ action: setKeyframesInterpolation({ motionId: id, nodeKeyframeIds, type }) });
    }
    return { ...result, nodeIds: targetNodeIds, interpolation: type };
  } finally {
    editor.history.unsetGroup();
  }
}
