'use strict'

// 账号响应不缓存；Cookie 和限流头由代理显式传递。
function sendJSON(response, statusCode, value, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(value))
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    ...extraHeaders,
  })
  response.end(body)
}

function sendError(response, statusCode, code, message) {
  sendJSON(response, statusCode, { code, message })
}

module.exports = { sendJSON, sendError }
