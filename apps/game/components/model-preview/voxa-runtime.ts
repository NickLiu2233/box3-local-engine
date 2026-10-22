import type { mat4, quat, vec3 } from 'gl-matrix'
import type { Framebuffer2D, Regl } from '@box/regl'

// These modules are bundled into Play. They never connect to a running VOXA service.
// Keep this adapter typed locally so editor-only project/store types stay outside Play.
export interface PerspectiveCamera {
  position: vec3
  target: vec3
  up: vec3
  quaternion: quat
  projectionMatrix: mat4
  projectionMatrixInverse: mat4
  viewProjection: mat4
  viewMatrixInverse: mat4
  aspect: number
  fov: number
  near: number
  far: number
  lookAt(target: vec3): void
  updateProjectionMatrix(): void
}
export const PerspectiveCamera = require('../../../voxa/src/models/rendering/camera/perspective')
  .PerspectiveCamera as new (
  fov?: number,
  aspect?: number,
  near?: number,
  far?: number,
) => PerspectiveCamera

interface EditorOrbitControls {
  domElement: HTMLElement
  target: vec3
  minDistance: number
  maxDistance: number
  update(): boolean
  reset(): void
  bindMouseButtonAction(button: number, action: number): void
  removeAllListeners(): void
}
const orbit = require('../../../voxa/src/models/rendering/controls/orbit')
export const OrbitControls = orbit.OrbitControls as new (
  camera: PerspectiveCamera,
  element: HTMLElement,
) => EditorOrbitControls
export const MOUSE = orbit.MOUSE as { ROTATE: number; PAN: number }
export const MOUSE_BUTTONS = orbit.MOUSE_BUTTONS as { LEFT: number; MIDDLE: number; RIGHT: number }
export const Spherical = require('../../../voxa/src/models/rendering/math/spherical')
  .Spherical as new (radius: number, phi: number, theta: number) => { applyToVec3(out: vec3): void }

export interface EditorPostProcess {
  fbo: Framebuffer2D | null
  update(config: { postProcess: boolean; bloomEnabled: boolean }): void
  bloom(): void
  draw(): void
  destroy(): void
}
export function createEditorPostProcess(regl: Regl, type: 'half float' | 'float' | 'uint8') {
  const { PostProcess } = require('../../../voxa/src/models/rendering/post-process') as {
    PostProcess: new (regl: Regl, type: 'half float' | 'float' | 'uint8') => EditorPostProcess
  }
  return new PostProcess(regl, type)
}
