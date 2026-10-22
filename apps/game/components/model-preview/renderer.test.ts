import { describe, expect, test } from '@jest/globals'
import { mat4, vec3 } from 'gl-matrix'
import { modelV7, ProjectInterpolationType, Vec3Schema } from '@box/voxa-project'
import { PerspectiveCamera, PreviewCameraControls } from './camera'
import { previewPose } from './pose'

function controls() {
  const handlers = new Map<string, (event: any) => void>()
  const canvas = {
    style: {},
    clientWidth: 1000,
    clientHeight: 800,
    addEventListener: (type: string, handler: (event: any) => void) => handlers.set(type, handler),
    removeEventListener: (type: string) => handlers.delete(type),
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
  } as unknown as HTMLCanvasElement
  const camera = new PerspectiveCamera()
  const controller = new PreviewCameraControls(camera, canvas)
  controller.resetAtOrigin(300, 100)
  const origin = () =>
    Array.from(vec3.transformMat4(vec3.create(), [0, 0, 0], camera.viewProjection))
  const drag = (button: number, dx: number, dy: number) => {
    const event = {
      button,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 500,
      clientY: 400,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      preventDefault: () => {},
    }
    handlers.get('pointerdown')!(event)
    handlers.get('pointermove')!({ ...event, clientX: 500 + dx, clientY: 400 + dy })
    handlers.get('pointerup')!(event)
  }
  return { camera, controller, origin, drag, handlers, canvas }
}

describe('VOXA controls with a fixed preview origin', () => {
  test('rotates around the grid origin even after screen panning', () => {
    const { controller, origin, drag } = controls()
    drag(1, 80, 30)
    const before = origin()
    drag(0, 100, 30)
    expect(origin()[0]).toBeCloseTo(before[0], 5)
    expect(origin()[1]).toBeCloseTo(before[1], 5)
    expect(Array.from(controller.target)).toEqual([0, 0, 0])
    controller.destroy()
  })

  test('left and right mouse drags use the same editor rotation', () => {
    const left = controls(),
      right = controls()
    left.drag(0, 100, 50)
    right.drag(2, 100, 50)
    expect(Array.from(left.camera.position)).toEqual(Array.from(right.camera.position))
    left.controller.destroy()
    right.controller.destroy()
  })

  test('uses the editor wheel step and permits continued zooming out', () => {
    const { camera, controller, handlers } = controls()
    const distance = vec3.length(camera.position)
    handlers.get('wheel')!({ deltaY: -1, preventDefault: () => {} })
    expect(vec3.length(camera.position)).toBeCloseTo(distance * 0.95, 3)
    controller.zoomBy(1000)
    expect(vec3.length(camera.position)).toBeGreaterThan(distance * 900)
    expect(camera.far).toBeGreaterThan(vec3.length(camera.position))
    controller.destroy()
  })

  test('adapts to viewport changes without accumulating zoom', () => {
    const { camera, controller, canvas } = controls()
    controller.zoomBy(0.5)
    const distance = vec3.length(camera.position)
    Object.assign(canvas, { clientWidth: 400, clientHeight: 800 })
    controller.syncView()
    expect(camera.aspect).toBe(0.5)
    expect(vec3.length(camera.position)).toBeCloseTo(distance * 2, 3)
    Object.assign(canvas, { clientWidth: 1000, clientHeight: 800 })
    controller.syncView()
    expect(vec3.length(camera.position)).toBeCloseTo(distance, 3)
    controller.destroy()
  })

  test('touch gestures rotate with one finger and pan or pinch with two', () => {
    const { camera, controller, handlers, origin } = controls()
    const touch = (type: string, pointerId: number, x: number, y: number) =>
      handlers.get(type)!({ pointerId, pointerType: 'touch', pageX: x, pageY: y })
    const initial = vec3.clone(camera.position)
    touch('pointerdown', 1, 400, 400)
    touch('pointermove', 1, 450, 420)
    touch('pointerup', 1, 450, 420)
    expect(vec3.distance(initial, camera.position)).toBeGreaterThan(1)

    controller.resetAtOrigin(300, 100)
    touch('pointerdown', 1, 450, 400)
    touch('pointerdown', 2, 550, 400)
    touch('pointermove', 1, 430, 400)
    touch('pointermove', 2, 570, 400)
    expect(vec3.length(camera.position)).toBeLessThan(300)
    touch('pointerup', 1, 430, 400)
    touch('pointerup', 2, 570, 400)

    controller.resetAtOrigin(300, 100)
    touch('pointerdown', 1, 450, 400)
    touch('pointerdown', 2, 550, 400)
    touch('pointermove', 1, 490, 420)
    touch('pointermove', 2, 590, 420)
    expect(Math.abs(origin()[0])).toBeGreaterThan(0.01)
    expect(Array.from(controller.target)).toEqual([0, 0, 0])
    touch('pointerup', 1, 490, 420)
    touch('pointerup', 2, 590, 420)
    controller.destroy()
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
    model.animations = [
      {
        id: 'motion',
        name: '移动',
        channels: [{ sampler: 0, target: { node: 1, path: 'translation' as never } }],
        samplers: [
          {
            interpolation: ProjectInterpolationType.Linear,
            input: [0, 1],
            output: {
              type: 'translation',
              data: [Vec3Schema.fromJSON([2, 0, 0]), Vec3Schema.fromJSON([5, 0, 0])],
            },
          },
        ],
      },
    ]
    const origin: [number, number, number] = [100, -20, 30]
    const rest = previewPose(model, -1, 0, origin)
    expect(Array.from(rest.matrices[0].slice(12, 15))).toEqual([110, -20, 30])
    expect(Array.from(rest.matrices[1].slice(12, 15))).toEqual([112, -20, 30])
    const animated = previewPose(model, 0, 1, origin)
    expect(Array.from(animated.matrices[1].slice(12, 15))).toEqual([115, -20, 30])
  })
})
