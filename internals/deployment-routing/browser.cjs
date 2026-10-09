'use strict'

function bootstrap(config) {
  const base = config.basePath
  window.__BOX_APP_BASE_PATH__ = base
  window.__BOX_PUBLIC_PREFIXES__ = config.peerPaths || []
  if (!base) return
  const within = (path, prefix) => path === prefix || path.startsWith(prefix + '/')
  const resolve = value => {
    if (typeof value !== 'string' || (!value.startsWith('/') && !/^(https?|wss?):\/\//i.test(value))) return value
    if (value.startsWith('//')) return value
    const url = new URL(value, window.location.origin)
    const ownProtocol = url.protocol === 'ws:' ? 'http:' : url.protocol === 'wss:' ? 'https:' : url.protocol
    if (ownProtocol + '//' + url.host !== window.location.origin) return value
    if (within(url.pathname, base) || window.__BOX_PUBLIC_PREFIXES__.some(prefix => prefix && within(url.pathname, prefix))) return value
    url.pathname = base + url.pathname
    return value.startsWith('/') ? url.pathname + url.search + url.hash : url.href
  }
  window.__BOX_RESOLVE_PUBLIC_URL__ = resolve
  const fetch = window.fetch.bind(window)
  window.fetch = (input, options) => {
    if (input instanceof Request) { const url = resolve(input.url); if (url !== input.url) input = new Request(url, input) }
    else if (input instanceof URL) input = resolve(input.href)
    else input = resolve(input)
    return fetch(input, options)
  }
  const open = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function(method, url, ...args) { return open.call(this, method, resolve(String(url)), ...args) }
  for (const name of ['WebSocket', 'EventSource', 'Worker', 'SharedWorker']) {
    const Original = window[name]
    if (!Original) continue
    window[name] = class extends Original { constructor(url, options) { super(resolve(String(url)), options) } }
  }
  if (navigator.serviceWorker?.register) {
    const register = navigator.serviceWorker.register.bind(navigator.serviceWorker)
    navigator.serviceWorker.register = (url, options = {}) => register(resolve(String(url)), {...options, scope:resolve(options.scope || '/')})
  }
}

module.exports = config => `(${bootstrap.toString()})(${JSON.stringify(config).replace(/</g, '\\u003c')});`
