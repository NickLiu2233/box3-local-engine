'use strict'

// 仅用于本地页面预览/测试，绝不复制进生产镜像。
// 内存账号随进程退出丢失，不模拟数据库、封禁、限流、审计或真实设备绑定。
const http = require('node:http')
const { randomUUID } = require('node:crypto')
const { sendJSON } = require('../server/http/response')

function createMockPlayerService(apiKey) {
  const accounts = new Map([['demo', { username: 'demo', displayName: '演示玩家', password: 'demo-password-123', subjectId: randomUUID().replaceAll('-', ''), userId: '1' }]])
  const sessions = new Map()
  const view = account => ({ subjectId: account.subjectId, userId: account.userId, username: account.username, displayName: account.displayName, status: 'active', role: 'player' })
  // Cookie 不按端口隔离。预览必须使用独立名字，不能覆盖同主机上真实引擎的登录状态。
  const sessionCookie = token => `box_portal_preview_session=${token}; Path=/; HttpOnly; SameSite=Lax${token ? '' : '; Max-Age=0'}`
  return http.createServer(async (req, res) => {
    if (req.headers['x-box-player-auth-key'] !== apiKey) return sendJSON(res, 401, { code: 'AUTH_API_KEY_INVALID', message: '模拟服务凭据无效' })
    const operation = new URL(req.url, 'http://mock').pathname.replace('/api/player-auth/', '')
    const token = String(req.headers.cookie || '').match(/(?:^|;\s*)box_portal_preview_session=([^;]+)/)?.[1]
    const account = accounts.get(sessions.get(token))
    let body = {}
    try {
      let raw = ''
      for await (const chunk of req) { raw += chunk; if (raw.length > 32768) throw new Error() }
      body = raw ? JSON.parse(raw) : {}
    } catch { return sendJSON(res, 400, { message: '无效 JSON' }) }
    if (operation === 'session') return sendJSON(res, 200, { player: account ? view(account) : null, databaseEnabled: true, registrationEnabled: true })
    if (operation === 'logout') {
      sessions.delete(token)
      return sendJSON(res, 200, { loggedOut: true }, { 'Set-Cookie': sessionCookie('') })
    }
    if (operation === 'login' || operation === 'register') {
      const username = String(body.username || '').trim().toLowerCase()
      let player = accounts.get(username)
      if (operation === 'register') {
        if (!/^[a-z][a-z0-9_]{2,31}$/.test(username) || !String(body.displayName || '').trim() || String(body.displayName).trim().length > 32 || typeof body.password !== 'string' || body.password.length < 10 || body.password.length > 128 || player) return sendJSON(res, 400, { message: '注册信息无效或用户名已存在' })
        player = { username, displayName: body.displayName.trim(), password: body.password, subjectId: randomUUID().replaceAll('-', ''), userId: String(accounts.size + 1) }
        accounts.set(username, player)
      }
      if (!player || player.password !== body.password) return sendJSON(res, 401, { message: '用户名或密码错误' })
      for (const [key, owner] of sessions) if (owner === username) sessions.delete(key)
      const nextToken = randomUUID()
      sessions.set(nextToken, username)
      return sendJSON(res, operation === 'register' ? 201 : 200, { player: view(player) }, { 'Set-Cookie': [sessionCookie(nextToken), 'box_portal_preview_device=development-fixture; Path=/; HttpOnly; SameSite=Lax'] })
    }
    if (!account) return sendJSON(res, 401, { code: 'AUTH_REQUIRED', message: '请重新登录' })
    if (operation === 'profile') {
      if (typeof body.displayName !== 'string' || !/^.{1,32}$/.test(body.displayName.trim())) return sendJSON(res, 400, { message: '昵称长度为 1–32' })
      account.displayName = body.displayName.trim()
      return sendJSON(res, 200, { player: view(account) })
    }
    if (operation === 'password') {
      if (account.password !== body.currentPassword) return sendJSON(res, 400, { code: 'CURRENT_PASSWORD_INVALID', message: '原密码不正确' })
      if (typeof body.newPassword !== 'string' || body.newPassword.length < 10 || body.newPassword.length > 128 || body.newPassword === body.currentPassword) return sendJSON(res, 400, { message: '新密码无效' })
      account.password = body.newPassword
      for (const [key, owner] of sessions) if (owner === account.username) sessions.delete(key)
      return sendJSON(res, 200, { changed: true, reloginRequired: true }, { 'Set-Cookie': sessionCookie('') })
    }
    return sendJSON(res, 404, { message: '模拟接口不存在' })
  })
}
module.exports = { createMockPlayerService }
