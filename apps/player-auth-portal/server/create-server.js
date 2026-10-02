'use strict'

// 组装路由，不混入账号业务。开发预览、测试和部署共用此入口。
const http = require('node:http')
const { operations } = require('./auth/operations')
const { proxyAuthentication } = require('./auth/proxy')
const { serveAsset } = require('./http/assets')
const { sendJSON, sendError } = require('./http/response')

function createAuthPortalServer(config) {
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'same-origin')
    try {
      const requestURL = new URL(request.url || '/', 'http://localhost')
      const operation = operations.get(requestURL.pathname)
      if (request.method === 'GET' && requestURL.pathname === '/api/health-check') {
        return sendJSON(response, 200, {
          status: 'ok',
          service: 'player-auth-portal',
        })
      }
      if (operation) {
        return await proxyAuthentication(request, response, config, {
          ...operation,
          search: requestURL.searchParams,
        })
      }
      if (request.method === 'GET' && await serveAsset(response, requestURL.pathname, config.publicDirectory)) return
      return sendError(response, 404, 'NOT_FOUND', '页面不存在')
    } catch (error) {
      return sendError(
        response,
        error.statusCode || 500,
        error.code || 'INTERNAL_ERROR',
        error.statusCode ? error.message : '服务暂时不可用',
      )
    }
  })
}

module.exports = { createAuthPortalServer }
