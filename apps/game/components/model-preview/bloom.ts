import createREGL from '@box/regl'
import type { Regl } from '@box/regl'
import { createEditorPostProcess, type EditorPostProcess } from './voxa-runtime'

/** Run the editor's HDR render targets, bright extraction and bloom without a second algorithm. */
export class PreviewBloom {
  private regl: Regl
  private postProcess: EditorPostProcess
  private width = 0
  private height = 0

  constructor(gl: WebGLRenderingContext) {
    this.regl = createREGL({
      gl,
      extensions: ['WEBGL_depth_texture'],
      optionalExtensions: [
        'OES_texture_half_float',
        'EXT_color_buffer_half_float',
        'OES_texture_half_float_linear',
        'OES_texture_float',
        'EXT_color_buffer_float',
        'OES_texture_float_linear',
      ],
    })
    const type = this.regl.hasExtension('OES_texture_half_float')
      ? 'half float'
      : this.regl.hasExtension('OES_texture_float')
        ? 'float'
        : 'uint8'
    this.postProcess = createEditorPostProcess(this.regl, type)
  }

  render(draw: () => void) {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = this.regl._gl
    if (width !== this.width || height !== this.height) {
      this.postProcess.destroy()
      this.width = width
      this.height = height
    }
    this.regl._refresh()
    this.postProcess.update({ postProcess: true, bloomEnabled: true })
    this.postProcess.fbo!.use(() => {
      this.regl._refresh()
      draw()
      this.regl._refresh()
    })
    this.postProcess.bloom()
    this.postProcess.draw()
  }

  destroy() {
    this.postProcess.destroy()
    this.regl.destroy()
  }
}
