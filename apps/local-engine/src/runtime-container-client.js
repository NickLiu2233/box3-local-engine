'use strict'

function schedulerSettings(env = process.env) {
  const endpoint = String(env.BOX_RUNTIME_MANAGER_URL || '').trim().replace(/\/$/, '')
  const token = String(env.BOX_RUNTIME_MANAGER_TOKEN || '').trim()
  return endpoint && token ? { endpoint, token } : null
}

async function schedulerRequest(settings, path, options = {}) {
  const response = await fetch(`${settings.endpoint}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-box-runtime-token': settings.token,
      ...(options.headers || {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || `地图容器调度失败（${response.status}）`)
  return body
}

async function ensureRuntimeContainer(settings, request) {
  const result = await schedulerRequest(settings, '/api/runtime/ensure', {
    method: 'POST',
    body: JSON.stringify(request),
  })
  if (!result.hostname || !Number.isInteger(Number(result.port))) {
    throw new Error('地图容器调度器返回了无效的运行时地址')
  }
  return {
    hostname: result.hostname,
    port: Number(result.port),
    containerId: String(result.containerId || ''),
    startedAt: result.startedAt || new Date().toISOString(),
    exited: false,
    async stop() {
      await schedulerRequest(settings, `/api/runtime/${encodeURIComponent(result.containerId)}`, {
        method: 'DELETE',
      })
      this.exited = true
    },
  }
}

module.exports = { ensureRuntimeContainer, schedulerSettings }
