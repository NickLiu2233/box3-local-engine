import { mat4, quat, vec3 } from 'gl-matrix'
import { calcEasing, type modelV7 } from '@box/voxa-project'

export type PreviewModel = modelV7.ModelDataV7

export function animationDuration(animation: PreviewModel['animations'][number]) {
  return Math.max(
    0,
    ...animation.samplers.map((sampler) => sampler.input[sampler.input.length - 1] || 0),
  )
}

/** Same node transform order and interpolation as the boxes model renderer. */
export function previewPose(model: PreviewModel, animationIndex = -1, time = 0) {
  const transforms = model.nodes.map((node) => ({
    translation: vec3.clone(node.translation),
    rotation: quat.clone(node.rotation),
    scale: vec3.clone(node.scale),
    alpha: node.alpha,
  }))
  const animation = model.animations[animationIndex]
  if (animation)
    for (const channel of animation.channels) {
      const sampler = animation.samplers[channel.sampler]
      const times = sampler.input
      if (!times.length || time < times[0]) continue
      let left = 0
      while (left + 1 < times.length && times[left + 1] <= time) left++
      const right = Math.min(left + 1, times.length - 1)
      const weight =
        right === left
          ? 0
          : calcEasing(
              sampler.interpolation,
              Math.min(1, (time - times[left]) / (times[right] - times[left])),
            )
      const target = transforms[channel.target.node]
      const a = sampler.output.data[left],
        b = sampler.output.data[right]
      switch (channel.target.path) {
        case 'translation':
          vec3.lerp(target.translation, a as vec3, b as vec3, weight)
          break
        case 'scale':
          vec3.lerp(target.scale, a as vec3, b as vec3, weight)
          break
        case 'rotation':
          quat.slerp(target.rotation, a as quat, b as quat, weight)
          break
        case 'alpha':
          target.alpha = Number(a) * (1 - weight) + Number(b) * weight
          break
      }
    }
  const parents = model.nodes.map(() => -1)
  model.nodes.forEach((node, index) =>
    node.children.forEach((child) => {
      parents[child] = index
    }),
  )
  const matrices: mat4[] = [],
    alphas: number[] = []
  model.nodes.forEach((node, index) => {
    const pose = transforms[index]
    const local = mat4.fromRotationTranslationScale(
      mat4.create(),
      pose.rotation,
      pose.translation,
      pose.scale,
    )
    const basis = mat4.create()
    for (let column = 0; column < 3; column++)
      for (let row = 0; row < 3; row++)
        basis[column * 4 + row] = node.parentScaleMat3[column * 3 + row]
    mat4.multiply(local, basis, local)
    matrices[index] =
      parents[index] < 0 ? local : mat4.multiply(local, matrices[parents[index]], local)
    alphas[index] = pose.alpha * (parents[index] < 0 ? 1 : alphas[parents[index]])
  })
  return { matrices, alphas }
}
