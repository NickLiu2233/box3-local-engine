import { mat4, vec2, vec3 } from 'gl-matrix'
import { PerspectiveCamera, OrbitControls, MOUSE, MOUSE_BUTTONS, Spherical } from './voxa-runtime'

/** Use VOXA's controls, with the preview's fixed grid origin and independent screen pan. */
export class PreviewCameraControls extends OrbitControls {
  private fixedOrigin = false
  private screenPan = vec2.create()
  private modelRadius = 1
  private viewportScale = 1

  constructor(
    public camera: PerspectiveCamera,
    canvas: HTMLCanvasElement,
  ) {
    super(camera, canvas)
    this.fixedOrigin = true
    this.minDistance = 0.01
    this.maxDistance = Infinity
    this.bindMouseButtonAction(MOUSE_BUTTONS.LEFT, MOUSE.ROTATE)
    this.bindMouseButtonAction(MOUSE_BUTTONS.MIDDLE, MOUSE.PAN)
    this.bindMouseButtonAction(MOUSE_BUTTONS.RIGHT, MOUSE.ROTATE)
  }

  public update() {
    const changed = super.update()
    if (!this.fixedOrigin) return changed
    if (vec3.squaredLength(this.target)) {
      const view = this.camera.viewMatrixInverse
      this.screenPan[0] += vec3.dot(this.target, [view[0], view[1], view[2]])
      this.screenPan[1] += vec3.dot(this.target, [view[4], view[5], view[6]])
      vec3.sub(this.camera.position, this.camera.position, this.target)
      vec3.set(this.target, 0, 0, 0)
    }
    this.syncView()
    return changed
  }

  public syncView() {
    const width = Math.max(1, this.domElement.clientWidth)
    const height = Math.max(1, this.domElement.clientHeight)
    const viewportScale = Math.max(1, height / width)
    if (viewportScale !== this.viewportScale) {
      const scale = viewportScale / this.viewportScale
      vec3.scale(this.camera.position, this.camera.position, scale)
      vec2.scale(this.screenPan, this.screenPan, scale)
      this.viewportScale = viewportScale
    }
    const distance = vec3.length(this.camera.position)
    this.camera.near = Math.max(this.modelRadius * 0.001, distance / 10000)
    this.camera.far = distance + Math.max(this.modelRadius * 4, 640)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    // Lens shift keeps panning independent of the controller's fixed world-space origin.
    this.camera.projectionMatrix[8] =
      this.screenPan[0] / (distance * Math.tan(this.camera.fov / 2) * this.camera.aspect)
    this.camera.projectionMatrix[9] = this.screenPan[1] / (distance * Math.tan(this.camera.fov / 2))
    mat4.invert(this.camera.projectionMatrixInverse, this.camera.projectionMatrix)
    this.camera.lookAt([0, 0, 0])
  }

  public resetAtOrigin(distance: number, radius: number) {
    this.modelRadius = radius
    vec2.set(this.screenPan, 0, 0)
    vec3.set(this.target, 0, 0, 0)
    const aspect =
      Math.max(1, this.domElement.clientWidth) / Math.max(1, this.domElement.clientHeight)
    const actualDistance = distance * Math.max(1, 1 / aspect)
    this.viewportScale = Math.max(1, 1 / aspect)
    new Spherical(actualDistance, Math.PI / 4, Math.PI / 6).applyToVec3(this.camera.position)
    this.camera.near = Math.max(0.001, radius * 0.001)
    this.camera.far = actualDistance + Math.max(radius * 4, 640)
    this.camera.lookAt([0, 0, 0])
    super.reset()
    this.syncView()
  }

  public zoomBy(factor: number) {
    const distance = vec3.length(this.camera.position)
    const next = Math.max(this.minDistance, distance * factor)
    if (Number.isFinite(next))
      vec3.scale(this.camera.position, this.camera.position, next / distance)
    this.update()
  }

  public destroy() {
    // The editor controller's runtime cleanup is private in its TypeScript interface.
    ;(this as unknown as { dispose: () => void }).dispose()
    this.removeAllListeners()
  }
}

export { PerspectiveCamera }
