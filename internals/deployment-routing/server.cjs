'use strict'
const http = require('node:http')
const bootstrap = require('./browser.cjs')
const path = require('./public-path.cjs')

function configuration() {
  const base = process.env.BOX_APP_BASE_PATH || ''
  const peerPaths = JSON.parse(process.env.BOX_PUBLIC_SERVICE_PREFIXES || '[]')
  return {basePath:base, peerPaths}
}
function html(source, config = configuration()) {
  if (!config.basePath) return source
  const transform = tag => tag.replace(/\b(href|src|srcset|action|poster|data)=("|')([^"']*)\2/gi, (whole,key,quote,value) => `${key}=${quote}${key.toLowerCase() === 'srcset' ? path.srcSet(value,config.basePath,config.peerPaths) : path.publicPath(value,config.basePath,config.peerPaths)}${quote}`)
  let raw = ''
  const result = source.replace(/<(?:[^"'>]|"[^"]*"|'[^']*')*>/g, tag => {
    if (raw) { if (new RegExp(`^<\\/${raw}\\s*>$`,'i').test(tag)) raw = ''; return tag }
    if (/^<!--/.test(tag)) return tag
    if (/^<(script|style)\b/i.test(tag)) raw = RegExp.$1.toLowerCase()
    return transform(tag)
  })
  const data = result.replace(/(<script\b[^>]*id="__NEXT_DATA__"[^>]*>)([\s\S]*?)(<\/script>)/, (whole,opening,json,closing) => {
    const value = JSON.parse(json)
    if (!/^https?:\/\//i.test(value.assetPrefix || '')) value.assetPrefix = path.publicPath(value.assetPrefix || '/',config.basePath,config.peerPaths) .replace(/\/$/,'')
    return opening + JSON.stringify(value).replace(/</g,'\\u003c') + closing
  })
  return data.replace(/<head(?:\s[^>]*)?>/i, opening => `${opening}<script>${bootstrap(config)}</script>`)
}
function install() {
  if (http.ServerResponse.prototype.__boxPrefixInstalled) return
  const write = http.ServerResponse.prototype.write
  const end = http.ServerResponse.prototype.end
  const writeHead = http.ServerResponse.prototype.writeHead
  const flush = http.ServerResponse.prototype.flushHeaders
  const context = response => response.__boxPrefixConfig || configuration()
  const enabled = response => Boolean(context(response).basePath) && /^text\/html/i.test(String(response.getHeader('content-type') || response.__boxContentType || ''))
  http.ServerResponse.prototype.writeHead = function(status, ...args) {
    const headers = args.find(value => value && typeof value === 'object')
    if (headers && !Array.isArray(headers)) {
      for (const [key,value] of Object.entries(headers)) this.setHeader(key,value)
    }
    const location = this.getHeader('location')
    if (typeof location === 'string') this.setHeader('location',path.publicPath(location,context(this).basePath,context(this).peerPaths))
    if (enabled(this)) { this.statusCode = status; return this }
    return writeHead.call(this,status,...args)
  }
  http.ServerResponse.prototype.flushHeaders = function() { if (!enabled(this)) return flush.call(this) }
  http.ServerResponse.prototype.write = function(chunk, encoding, callback) {
    if (!enabled(this)) return write.call(this,chunk,encoding,callback)
    this.__boxChunks ||= []
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk,typeof encoding === 'string' ? encoding : undefined)
    this.__boxSize = (this.__boxSize || 0) + bytes.length
    if (this.__boxSize > 8 * 1024 * 1024) { this.destroy(new Error('HTML exceeds prefix adapter limit')); return false }
    this.__boxChunks.push(bytes)
    if (typeof encoding === 'function') encoding()
    else if (callback) callback()
    return true
  }
  http.ServerResponse.prototype.end = function(chunk, encoding, callback) {
    if (!enabled(this)) return end.call(this,chunk,encoding,callback)
    if (chunk) this.write(chunk,typeof encoding === 'string' ? encoding : undefined)
    const source = Buffer.concat(this.__boxChunks || []).toString('utf8')
    const result = html(source,context(this))
    this.removeHeader('content-length'); this.removeHeader('etag')
    writeHead.call(this,this.statusCode)
    return end.call(this,result,typeof encoding === 'function' ? encoding : callback)
  }
  http.ServerResponse.prototype.__boxPrefixInstalled = true
}
module.exports = {html, install, configuration}
