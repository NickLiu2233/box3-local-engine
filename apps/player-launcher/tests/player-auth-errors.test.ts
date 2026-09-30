import assert from 'node:assert/strict'
import test from 'node:test'

import {
  playerLoginConnectionError,
  playerLoginErrorMessage,
} from '../src/services/player-auth-errors'

test('401 explains the credential issue without revealing whether an account exists', () => {
  const message = playerLoginErrorMessage(401, { message: '用户名或密码错误' })
  assert.match(message, /账号不存在或密码错误/)
  assert.doesNotMatch(message, /HTTP 401/)
})

test('account restrictions and server-provided ban reasons are actionable', () => {
  assert.equal(
    playerLoginErrorMessage(403, { message: '该玩家已被封禁', banReason: '测试封禁' }),
    '该账号已被此服务器封禁。原因：测试封禁',
  )
  assert.equal(
    playerLoginErrorMessage(403, { message: '当前 IP 地址已被封禁' }),
    '当前网络地址已被此服务器限制登录。',
  )
})

test('rate limits and upstream outages get distinct guidance', () => {
  assert.equal(playerLoginErrorMessage(429), '登录尝试次数过多，请稍后再试。')
  assert.equal(
    playerLoginErrorMessage(502, { code: 'PLAYER_SERVICE_UNAVAILABLE' }),
    '暂时无法连接服务器登录服务，请检查网络后重试。',
  )
})

test('transport errors do not expose raw network details', () => {
  assert.equal(
    playerLoginConnectionError(new TypeError('fetch failed: ECONNREFUSED')),
    '无法连接服务器登录服务，请检查网络或稍后重试。',
  )
})
