'use strict'

// 固定接口目录；不允许浏览器指定任意上游路径或 URL。
const operations = new Map(Object.entries({
  '/api/auth/login': { name: 'login', method: 'POST' },
  '/api/auth/register': { name: 'register', method: 'POST' },
  '/api/auth/session': { name: 'session', method: 'GET' },
  '/api/auth/logout': { name: 'logout', method: 'POST' },
  '/api/auth/profile': { name: 'profile', method: 'PATCH' },
  '/api/auth/password': { name: 'password', method: 'POST' },
}))

module.exports = { operations }
