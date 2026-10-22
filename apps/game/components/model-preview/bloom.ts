const screenVertex = `attribute vec2 position; varying vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`
const blurFragment = `precision mediump float; varying vec2 uv; uniform sampler2D pixels; uniform vec2 direction;
void main(){
 vec3 color=texture2D(pixels,uv).rgb*.227027;
 color+=(texture2D(pixels,uv+direction*1.384615).rgb+texture2D(pixels,uv-direction*1.384615).rgb)*.316216;
 color+=(texture2D(pixels,uv+direction*3.230769).rgb+texture2D(pixels,uv-direction*3.230769).rgb)*.070270;
 gl_FragColor=vec4(color,1.);
}`
const compositeFragment = `precision mediump float; varying vec2 uv; uniform sampler2D pixels;
void main(){gl_FragColor=vec4(texture2D(pixels,uv).rgb*.7,0.);}`

type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer }

/** Emissive-only bloom. Ordinary surfaces and the grid never contribute to the halo. */
export class PreviewBloom {
  private blur: WebGLProgram
  private composite: WebGLProgram
  private triangle: WebGLBuffer
  private targets: Target[] = []
  private depth: WebGLRenderbuffer | null = null
  private width = 0
  private height = 0

  constructor(
    private gl: WebGLRenderingContext,
    link: (vertex: string, fragment: string) => WebGLProgram,
  ) {
    this.blur = link(screenVertex, blurFragment)
    this.composite = link(screenVertex, compositeFragment)
    const triangle = gl.createBuffer()
    if (!triangle) throw new Error('无法创建发光预览')
    this.triangle = triangle
    gl.bindBuffer(gl.ARRAY_BUFFER, triangle)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  }

  private resize(width: number, height: number) {
    width = Math.max(1, Math.ceil(width / 2))
    height = Math.max(1, Math.ceil(height / 2))
    if (width === this.width && height === this.height) return
    this.clearTargets()
    const gl = this.gl
    this.width = width
    this.height = height
    for (let i = 0; i < 3; i++) {
      const texture = gl.createTexture(),
        framebuffer = gl.createFramebuffer()
      if (!texture || !framebuffer) throw new Error('无法创建发光缓冲区')
      this.targets.push({ texture, framebuffer })
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    }
    this.depth = gl.createRenderbuffer()
    if (!this.depth) throw new Error('无法创建发光深度缓冲区')
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[0].framebuffer)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth)
  }

  begin(width: number, height: number) {
    this.resize(width, height)
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[0].framebuffer)
    gl.viewport(0, 0, this.width, this.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  }

  private draw(program: WebGLProgram, texture: WebGLTexture) {
    const gl = this.gl
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triangle)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(gl.getUniformLocation(program, 'pixels'), 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  finish(width: number, height: number) {
    const gl = this.gl
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)
    let source = this.targets[0].texture
    for (const spread of [1, 3, 6]) {
      gl.useProgram(this.blur)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[1].framebuffer)
      gl.uniform2f(gl.getUniformLocation(this.blur, 'direction'), spread / this.width, 0)
      this.draw(this.blur, source)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[2].framebuffer)
      gl.uniform2f(gl.getUniformLocation(this.blur, 'direction'), 0, spread / this.height)
      this.draw(this.blur, this.targets[1].texture)
      source = this.targets[2].texture
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, width, height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    this.draw(this.composite, source)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.DEPTH_TEST)
  }

  private clearTargets() {
    for (const target of this.targets) {
      this.gl.deleteTexture(target.texture)
      this.gl.deleteFramebuffer(target.framebuffer)
    }
    this.gl.deleteRenderbuffer(this.depth)
    this.targets = []
    this.depth = null
  }

  destroy() {
    this.clearTargets()
    this.gl.deleteBuffer(this.triangle)
    this.gl.deleteProgram(this.blur)
    this.gl.deleteProgram(this.composite)
  }
}
