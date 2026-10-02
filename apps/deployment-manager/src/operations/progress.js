import { render } from '../core/render-request.js'
import { state } from '../core/state.js'

let progressRenderTimer

export function scheduleProgressRender() {
  if (progressRenderTimer || !state.busy) return
  progressRenderTimer = window.setTimeout(() => {
    progressRenderTimer = undefined
    if (state.busy) render()
  }, 50)
}
