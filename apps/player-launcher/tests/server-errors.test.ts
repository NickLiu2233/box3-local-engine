import assert from 'node:assert/strict'
import { test } from 'node:test'
import { playerServerAddError } from '../src/services/server-errors'

test('removes Electron IPC wrappers while preserving the player-facing network error', () => {
  assert.equal(
    playerServerAddError(new Error("Error invoking remote method 'launcher:invoke': Error: 无法连接到游玩端服务器，请检查地址和网络")),
    '无法连接到游玩端服务器，请检查地址、端口和网络后重试。',
  )
})

test('turns invalid server address errors into actionable player copy', () => {
  assert.equal(
    playerServerAddError(new Error("Error invoking remote method 'launcher:invoke': Error: 请输入有效的游玩端服务器 IP 或域名")),
    '服务器地址格式不正确，请检查后重试。',
  )
})
