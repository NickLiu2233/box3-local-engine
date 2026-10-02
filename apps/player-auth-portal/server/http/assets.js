'use strict'

const { readFile, realpath, stat } = require('node:fs/promises')
const path = require('node:path')
const defaultPublicDirectory = path.join(__dirname, '../../public')
const types = new Map([
  ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'], ['.gif', 'image/gif'], ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'], ['.woff', 'font/woff'], ['.woff2', 'font/woff2'],
])

/**
 * 仅公开 public 中的前端资源，让开发者添加 logo/字体无需再写路由。
 * 扩展名白名单 + 隐藏路径拒绝 + realpath 校验同时防止源码/凭据泄漏与符号链接越界。
 * 不提供任意文件下载，也不默认开放 history 子路由。
 */
async function serveAsset(response, pathname, publicDirectory = defaultPublicDirectory) {
  let relative
  try { relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname) } catch { return false }
  if (!relative.startsWith('/') || relative.includes('\\') || relative.includes('\0') || relative.split('/').some(part => part.startsWith('.'))) return false
  const isHtml = relative === '/index.html'
  const type = isHtml ? 'text/html; charset=utf-8' : types.get(path.extname(relative).toLowerCase())
  if (!type) return false
  let file
  try {
    const root = await realpath(publicDirectory)
    file = await realpath(path.resolve(root, '.' + relative))
    if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) return false
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) return false
    throw error
  }
  const body = await readFile(file)
  response.writeHead(200, {
    'Content-Type': type, 'Content-Length': body.length,
    'Cache-Control': isHtml ? 'no-store' : 'public, max-age=300, must-revalidate',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
    // 默认不依赖 CDN/内联脚本，降低页面供应链与注入风险。
    'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  })
  response.end(body)
  return true
}
module.exports = { serveAsset }
