import { PERFORMANCE_HIDDEN_POLL_MS, PERFORMANCE_POLL_MS } from '../core/constants.js'
import { clearFeedback } from './feedback.js'
import { invoke } from '../infrastructure/transport.js'
import { render } from '../core/render-request.js'
import { state } from '../core/state.js'

let performanceTimer

export function syncPerformancePolling() {
  clearInterval(performanceTimer)
  performanceTimer = undefined
  if (state.page !== 'performance') return
  if (!state.performance && !state.performanceLoading) refreshPerformance()
  performanceTimer = window.setInterval(
    refreshPerformance,
    document.hidden ? PERFORMANCE_HIDDEN_POLL_MS : PERFORMANCE_POLL_MS,
  )
}

export async function refreshPerformance() {
  if (state.performanceLoading || state.page !== 'performance') return
  state.performanceLoading = true
  clearFeedback()
  render()
  try {
    state.performance = await invoke('get_performance_status')
  } catch (error) {
    state.performanceError = String(error)
  } finally {
    state.performanceLoading = false
    if (state.page === 'performance') render()
  }
}
