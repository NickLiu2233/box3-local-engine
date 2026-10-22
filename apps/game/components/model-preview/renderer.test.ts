import { describe, expect, test } from '@jest/globals'
import { mat4, vec3 } from 'gl-matrix'
import { modelV7, ProjectInterpolationType, Vec3Schema } from '@box/voxa-project'
import { ModelPreviewRenderer } from './renderer'
import { previewPose } from './pose'

/** Exercise CPU camera setup without allocating a WebGL context. */
function rendererWithPlacement() {
  const state = {
    model: { nodes: [{ mesh: 0 }] },
    buffers: [{ count: 6 }],
    meshBounds: [{ min: vec3.fromValues(0, 0, 0), max: vec3.fromValues(10, 20, 30) }],
    pose: { matrices: [mat4.create()] },
    center: vec3.create(),
    panOffset: vec3.fromValues(5, 6, 7),
    placement: { origin: [-30, -40, -50], pivot: [2, 3, 4] },
  }
  const renderer = Object.assign(Object.create(ModelPreviewRenderer.prototype), state) as ModelPreviewRenderer
  return { renderer, state }
}

describe('preview camera respects the VOXA project anchor', () => {
  test('reset orbits the supplied anchor instead of the mesh bounding-box center', () => {
    const { renderer, state } = rendererWithPlacement()
    renderer.reset()
    expect(Array.from(state.center)).toEqual([2, 3, 4])
    expect(Array.from(state.panOffset)).toEqual([0, 0, 0])
  })

  test('moving animation geometry does not move the project anchor on reset', () => {
    const { renderer, state } = rendererWithPlacement()
    mat4.translate(state.pose.matrices[0], state.pose.matrices[0], [100, 0, 0])
    renderer.reset()
    expect(Array.from(state.center)).toEqual([2, 3, 4])
  })

  test('restores editor coordinates once for nested nodes and animated poses', () => {
    const model = modelV7.ModelDataV7Schema.clone(modelV7.ModelDataV7Schema.identity)
    model.nodes = [10, 2].map((x) => {
      const node = modelV7.ModelNodeSchema.clone(modelV7.ModelNodeSchema.identity)
      node.translation.set([x, 0, 0])
      node.rotation.set([0, 0, 0, 1])
      node.scale.set([1, 1, 1])
      node.parentScaleMat3.set([1, 0, 0, 0, 1, 0, 0, 0, 1])
      return node
    })
    model.nodes[0].children = [1]
    model.animations = [{
      id: 'motion', name: '移动',
      channels: [{ sampler: 0, target: { node: 1, path: 'translation' as never } }],
      samplers: [{
        interpolation: ProjectInterpolationType.Linear, input: [0, 1],
        output: { type: 'translation', data: [Vec3Schema.fromJSON([2, 0, 0]), Vec3Schema.fromJSON([5, 0, 0])] },
      }],
    }]
    const origin: [number, number, number] = [100, -20, 30]
    const rest = previewPose(model, -1, 0, origin)
    expect(Array.from(rest.matrices[0].slice(12, 15))).toEqual([110, -20, 30])
    expect(Array.from(rest.matrices[1].slice(12, 15))).toEqual([112, -20, 30])
    const animated = previewPose(model, 0, 1, origin)
    expect(Array.from(animated.matrices[1].slice(12, 15))).toEqual([115, -20, 30])
  })
})
