import { mat3, mat4, vec3 } from 'gl-matrix'
import { unpackMeshData, unpackTextureData } from '@box/mesher'
import { PreviewBloom } from './bloom'
import { directionIndicatorVertices } from './direction-indicator'
import { animationDuration, previewPose, type PreviewModel } from './pose'

const vertex = `attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
uniform mat4 world; uniform mat4 viewProjection; uniform mat3 normalMatrix;
varying vec2 texcoord; varying vec3 surfaceNormal;
void main(){texcoord=uv;surfaceNormal=normalize(normalMatrix*normal);gl_Position=viewProjection*world*vec4(position,1.0);}`
const fragment = `precision mediump float; uniform sampler2D palette; uniform float alpha;
uniform bool emissiveEnabled, emissionPass;
varying vec2 texcoord; varying vec3 surfaceNormal;
void main(){
 vec4 c=texture2D(palette,texcoord);
 float light=.55+.45*max(dot(normalize(surfaceNormal),normalize(vec3(.5,1.,.7))),0.);
 float energy=4.*(c.a*255.*.01);
 vec3 color=emissionPass?c.rgb*min(energy,1.):c.rgb*(light+(emissiveEnabled?energy:0.));
 gl_FragColor=vec4(color,alpha);
}`
const arrowVertex = `attribute vec3 position; uniform mat4 viewProjection;
void main(){gl_Position=viewProjection*vec4(position,1.);}`
const arrowFragment = `precision mediump float;void main(){gl_FragColor=vec4(.7,.7,.7,1.);}`

// Same 320 × 320 plane, 4-unit cells, line opacity and X/Z colors as VOXA's models/grid.
const gridVertex = `attribute vec3 position; uniform mat4 viewProjection; varying vec3 pos;
void main(){pos=position;gl_Position=viewProjection*vec4(position.x,0.0,position.y,1.0);}`
const gridFragment = `precision mediump float;
uniform float size, gridSize; varying vec3 pos;
float getGridAlpha(vec2 resolution,vec2 posOnPlane,vec2 df,float factor){
 vec2 relativePos=fract(posOnPlane/resolution);
 vec2 lowAlpha=smoothstep(factor*df,vec2(0.),resolution*relativePos);
 vec2 highAlpha=smoothstep(factor*df,vec2(0.),resolution*abs(vec2(1.)-relativePos));
 return max(max(lowAlpha.x,lowAlpha.y),max(highAlpha.x,highAlpha.y));
}
void main(){
 GRID_DERIVATIVES
 float gFactor=1.5;
 float grid=getGridAlpha(vec2(gridSize),pos.xy,df.xy,gFactor)*0.08;
 vec4 color=vec4(1.,1.,1.,grid);
 float xA=getGridAlpha(vec2(size),pos.yz,df.yz,gFactor);
 color=xA>0.0?vec4(0.91,0.2,0.2,xA):color;
 float zA=getGridAlpha(vec2(size),pos.xz,df.xz,gFactor);
 color=zA>0.0?vec4(0.,0.76,1.,zA):color;
 gl_FragColor=color;
}`

export class ModelPreviewRenderer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private gridProgram: WebGLProgram
  private gridBuffer: WebGLBuffer
  private arrowProgram: WebGLProgram
  private arrowBuffer: WebGLBuffer
  private arrowCount = 0
  private meshBounds: { min: vec3; max: vec3 }[] = []
  private emissiveEnabled = true
  private hasEmissive: boolean
  private bloom?: PreviewBloom
  private createBloom: () => PreviewBloom
  private gridVisible = false
  private buffers: { buffer: WebGLBuffer; count: number }[] = []
  private texture: WebGLTexture
  private frame = 0
  private disposed = false
  private center = vec3.create()
  private panOffset = vec3.create()
  private radius = 1
  private distance = 3
  private yaw = Math.PI / 5
  private pitch = Math.PI / 7
  private animation = -1
  private playing = true
  private elapsed = 0
  private previous = 0
  private pose: ReturnType<typeof previewPose>
  private drag?: { id: number; x: number; y: number; mode: 'rotate' | 'pan' }

  constructor(
    private canvas: HTMLCanvasElement,
    private model: PreviewModel,
  ) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: true })
    if (!gl) throw new Error('当前浏览器无法开启 WebGL，请开启硬件加速后重试')
    this.gl = gl
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('无法创建模型预览')
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        throw new Error('预览着色器加载失败')
      }
      return shader
    }
    const link = (vertexSource: string, fragmentSource: string) => {
      const program = gl.createProgram()
      if (!program) throw new Error('无法创建模型预览')
      const vs = compile(gl.VERTEX_SHADER, vertexSource),
        fs = compile(gl.FRAGMENT_SHADER, fragmentSource)
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program)
        throw new Error('预览着色器加载失败')
      }
      return program
    }
    this.program = link(vertex, fragment)
    this.hasEmissive = model.texture.palette.some((color) => (color & 255) > 0)
    this.createBloom = () => new PreviewBloom(gl, link)
    this.arrowProgram = link(arrowVertex, arrowFragment)
    const arrowBuffer = gl.createBuffer()
    if (!arrowBuffer) throw new Error('无法创建方向箭头')
    this.arrowBuffer = arrowBuffer
    const arrowVertices = directionIndicatorVertices()
    this.arrowCount = arrowVertices.length / 3
    gl.bindBuffer(gl.ARRAY_BUFFER, arrowBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, arrowVertices, gl.STATIC_DRAW)
    const derivatives = Boolean(gl.getExtension('OES_standard_derivatives'))
    this.gridProgram = link(
      gridVertex,
      (derivatives ? '#extension GL_OES_standard_derivatives : enable\n' : '') +
        gridFragment.replace(
          'GRID_DERIVATIVES',
          derivatives ? 'vec3 df=fwidth(pos);' : 'vec3 df=vec3(0.08);',
        ),
    )
    const gridBuffer = gl.createBuffer()
    if (!gridBuffer) throw new Error('无法创建预览网格')
    this.gridBuffer = gridBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -160, -160, 0, 160, -160, 0, -160, 160, 0, -160, 160, 0, 160, -160, 0, 160, 160, 0,
      ]),
      gl.STATIC_DRAW,
    )
    const normals = [
      [-1, 0, 0],
      [1, 0, 0],
      [0, -1, 0],
      [0, 1, 0],
      [0, 0, -1],
      [0, 0, 1],
    ]
    const height = model.texture.data.length / model.texture.width
    for (const mesh of model.meshes) {
      const unpacked = unpackMeshData(mesh, Uint16Array, Uint16Array)
      const values = new Float32Array(unpacked.count * 8)
      let offset = 0
      for (let quad = 0; quad < unpacked.count / 6; quad++)
        for (const point of [0, 1, 2, 2, 1, 3]) {
          const i = quad * 4 + point
          values.set(unpacked.meshData.subarray(i * 4, i * 4 + 3), offset)
          values.set(normals[unpacked.meshData[i * 4 + 3]], offset + 3)
          values[offset + 6] = unpacked.uvData[i * 2] / model.texture.width
          values[offset + 7] = unpacked.uvData[i * 2 + 1] / height
          offset += 8
        }
      const buffer = gl.createBuffer()
      if (!buffer) throw new Error('模型过大，无法分配预览显存')
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW)
      this.buffers.push({ buffer, count: unpacked.count })
      this.meshBounds.push({
        min: vec3.fromValues(unpacked.lox, unpacked.loy, unpacked.loz),
        max: vec3.fromValues(unpacked.hix, unpacked.hiy, unpacked.hiz),
      })
    }
    const texture = gl.createTexture()
    if (!texture) throw new Error('无法创建模型材质')
    this.texture = texture
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      model.texture.width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      unpackTextureData(model.texture, [24, 16, 8, 0]),
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.pose = previewPose(model)
    this.reset()
    canvas.addEventListener('pointerdown', this.pointerDown)
    canvas.addEventListener('pointermove', this.pointerMove)
    canvas.addEventListener('pointerup', this.pointerUp)
    canvas.addEventListener('pointercancel', this.pointerUp)
    canvas.addEventListener('wheel', this.wheel, { passive: false })
    canvas.addEventListener('contextmenu', this.contextMenu)
    canvas.addEventListener('lostpointercapture', this.pointerUp)
    this.frame = requestAnimationFrame(this.render)
  }
  setAnimation(index: number) {
    this.animation = index
    this.elapsed = 0
    this.pose = previewPose(this.model, index, 0)
  }
  setGridVisible(value: boolean) {
    this.gridVisible = value
  }
  setPlaying(value: boolean) {
    this.playing = value
  }
  setEmissiveEnabled(value: boolean) {
    this.emissiveEnabled = value
  }
  reset() {
    const min = vec3.fromValues(Infinity, Infinity, Infinity),
      max = vec3.fromValues(-Infinity, -Infinity, -Infinity)
    this.model.nodes.forEach((node, index) => {
      if (node.mesh < 0 || !this.buffers[node.mesh].count) return
      const box = this.meshBounds[node.mesh]
      for (let corner = 0; corner < 8; corner++) {
        const v = vec3.fromValues(
          corner & 1 ? box.max[0] : box.min[0],
          corner & 2 ? box.max[1] : box.min[1],
          corner & 4 ? box.max[2] : box.min[2],
        )
        vec3.transformMat4(v, v, this.pose.matrices[index])
        vec3.min(min, min, v)
        vec3.max(max, max, v)
      }
    })
    vec3.scale(this.center, vec3.add(this.center, min, max), 0.5)
    this.radius = Math.max(0.01, vec3.distance(min, max) / 2)
    // VOXA Stage.resetCamera fits the current model and restores yaw 30° / pitch 45°.
    this.yaw = Math.PI / 6
    this.pitch = Math.PI / 4
    this.distance = this.radius / Math.sin(Math.PI / 8) + 26
    vec3.set(this.panOffset, 0, 0, 0)
  }
  zoom(factor: number) {
    const distance = this.distance * factor
    if (Number.isFinite(distance)) this.distance = Math.max(this.radius * 0.4, distance)
  }
  private contextMenu = (event: Event) => event.preventDefault()
  private pointerDown = (event: PointerEvent) => {
    if (![0, 1, 2].includes(event.button) || this.drag) return
    event.preventDefault()
    const modified = event.ctrlKey || event.metaKey || event.shiftKey
    const pan = event.button === 1 ? !modified : modified
    this.drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      mode: pan ? 'pan' : 'rotate',
    }
    this.canvas.setPointerCapture(event.pointerId)
  }
  private pointerMove = (event: PointerEvent) => {
    if (!this.drag || this.drag.id !== event.pointerId) return
    const dx = event.clientX - this.drag.x,
      dy = event.clientY - this.drag.y
    const height = Math.max(1, this.canvas.clientHeight)
    if (this.drag.mode === 'pan') {
      // VOXA's screen-space pan uses camera distance, field of view and viewport height.
      const distance = this.distance * Math.max(1, height / Math.max(1, this.canvas.clientWidth))
      const units = (2 * distance * Math.tan(Math.PI / 8)) / height
      const right = vec3.fromValues(Math.cos(this.yaw), 0, -Math.sin(this.yaw))
      const up = vec3.fromValues(
        -Math.sin(this.yaw) * Math.sin(this.pitch),
        Math.cos(this.pitch),
        -Math.cos(this.yaw) * Math.sin(this.pitch),
      )
      vec3.scaleAndAdd(this.panOffset, this.panOffset, right, -dx * units)
      vec3.scaleAndAdd(this.panOffset, this.panOffset, up, dy * units)
    } else {
      this.yaw -= (dx * 2 * Math.PI) / height
      this.pitch = Math.max(
        -Math.PI / 2 + 0.000001,
        Math.min(Math.PI / 2 - 0.000001, this.pitch + (dy * 2 * Math.PI) / height),
      )
    }
    this.drag.x = event.clientX
    this.drag.y = event.clientY
  }
  private pointerUp = (event: PointerEvent) => {
    if (this.drag?.id !== event.pointerId) return
    this.drag = undefined
    if (this.canvas.hasPointerCapture(event.pointerId))
      this.canvas.releasePointerCapture(event.pointerId)
  }
  private wheel = (event: WheelEvent) => {
    event.preventDefault()
    if (this.drag || !event.deltaY) return
    // VOXA OrbitControls applies a 0.95 zoom step per wheel event, independent of delta magnitude.
    this.zoom(event.deltaY < 0 ? 0.95 : 1 / 0.95)
  }
  private render = (now: number) => {
    if (this.disposed) return
    const gl = this.gl,
      canvas = this.canvas
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.floor(canvas.clientWidth * ratio)),
      height = Math.max(1, Math.floor(canvas.clientHeight * ratio))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    const delta = this.previous ? Math.min((now - this.previous) / 1000, 0.1) : 0
    this.previous = now
    if (this.playing && this.animation >= 0) {
      this.elapsed += delta
      const duration = animationDuration(this.model.animations[this.animation])
      this.pose = previewPose(this.model, this.animation, duration ? this.elapsed % duration : 0)
    }
    const cameraDistance = this.distance * Math.max(1, height / width)
    const target = vec3.add(vec3.create(), this.center, this.panOffset)
    const eye = vec3.fromValues(
      target[0] + Math.sin(this.yaw) * Math.cos(this.pitch) * cameraDistance,
      target[1] + Math.sin(this.pitch) * cameraDistance,
      target[2] + Math.cos(this.yaw) * Math.cos(this.pitch) * cameraDistance,
    )
    const projection = mat4.perspective(
      mat4.create(),
      Math.PI / 4,
      width / height,
      Math.max(this.radius * 0.001, cameraDistance / 10000),
      cameraDistance + Math.max(this.radius * 4, 640),
    )
    mat4.multiply(projection, projection, mat4.lookAt(mat4.create(), eye, target, [0, 1, 0]))
    gl.viewport(0, 0, width, height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    this.drawModel(projection, false)
    if (this.gridVisible) {
      gl.useProgram(this.gridProgram)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.gridBuffer)
      const position = gl.getAttribLocation(this.gridProgram, 'position')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0)
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.gridProgram, 'viewProjection'),
        false,
        projection,
      )
      gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'size'), 320)
      gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'gridSize'), 4)
      gl.depthMask(false)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      gl.depthMask(true)
      gl.useProgram(this.arrowProgram)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.arrowBuffer)
      const arrowPosition = gl.getAttribLocation(this.arrowProgram, 'position')
      gl.enableVertexAttribArray(arrowPosition)
      gl.vertexAttribPointer(arrowPosition, 3, gl.FLOAT, false, 0, 0)
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.arrowProgram, 'viewProjection'),
        false,
        projection,
      )
      gl.drawArrays(gl.TRIANGLES, 0, this.arrowCount)
    }
    if (this.emissiveEnabled && this.hasEmissive) {
      const bloom = this.bloom || (this.bloom = this.createBloom())
      bloom.begin(width, height)
      this.drawModel(projection, true)
      bloom.finish(width, height)
    }
    this.frame = requestAnimationFrame(this.render)
  }
  private drawModel(projection: mat4, emissionPass: boolean) {
    const gl = this.gl
    gl.useProgram(this.program)
    gl.uniform1i(
      gl.getUniformLocation(this.program, 'emissiveEnabled'),
      this.emissiveEnabled ? 1 : 0,
    )
    gl.uniform1i(gl.getUniformLocation(this.program, 'emissionPass'), emissionPass ? 1 : 0)
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'viewProjection'), false, projection)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.uniform1i(gl.getUniformLocation(this.program, 'palette'), 0)
    this.model.nodes.forEach((node, index) => {
      if (node.mesh < 0 || this.pose.alphas[index] <= 0) return
      const mesh = this.buffers[node.mesh]
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer)
      for (const [name, size, offset] of [
        ['position', 3, 0],
        ['normal', 3, 12],
        ['uv', 2, 24],
      ] as const) {
        const loc = gl.getAttribLocation(this.program, name)
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 32, offset)
      }
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.program, 'world'),
        false,
        this.pose.matrices[index],
      )
      gl.uniformMatrix3fv(
        gl.getUniformLocation(this.program, 'normalMatrix'),
        false,
        mat3.normalFromMat4(mat3.create(), this.pose.matrices[index]) || mat3.create(),
      )
      gl.uniform1f(gl.getUniformLocation(this.program, 'alpha'), this.pose.alphas[index])
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count)
    })
  }
  destroy() {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.canvas.removeEventListener('pointerdown', this.pointerDown)
    this.canvas.removeEventListener('pointermove', this.pointerMove)
    this.canvas.removeEventListener('pointerup', this.pointerUp)
    this.canvas.removeEventListener('pointercancel', this.pointerUp)
    this.canvas.removeEventListener('wheel', this.wheel)
    this.canvas.removeEventListener('contextmenu', this.contextMenu)
    this.canvas.removeEventListener('lostpointercapture', this.pointerUp)
    this.buffers.forEach((mesh) => this.gl.deleteBuffer(mesh.buffer))
    this.gl.deleteTexture(this.texture)
    this.gl.deleteProgram(this.program)
    this.gl.deleteProgram(this.gridProgram)
    this.gl.deleteBuffer(this.gridBuffer)
    this.gl.deleteBuffer(this.arrowBuffer)
    this.gl.deleteProgram(this.arrowProgram)
    this.bloom?.destroy()
  }
}
