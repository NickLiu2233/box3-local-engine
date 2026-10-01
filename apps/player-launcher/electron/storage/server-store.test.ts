import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { test } from 'node:test'
import { createServerStore, normalizeEndpoint } from './server-store'

test('normalizes loopback and public endpoints while rejecting unsafe schemes', () => {
  assert.equal(normalizeEndpoint('127.0.0.1:3492'), 'http://127.0.0.1:3492')
  assert.equal(normalizeEndpoint('play.example.com/'), 'https://play.example.com')
  assert.equal(normalizeEndpoint('192.168.1.20:3121'), 'https://192.168.1.20:3121')
  assert.equal(normalizeEndpoint('[2001:db8::1]:3121'), 'https://[2001:db8::1]:3121')
  assert.equal(normalizeEndpoint('::1'), 'http://[::1]')
  assert.throws(() => normalizeEndpoint('122111222'))
  assert.throws(() => normalizeEndpoint('256.1.1.1'))
  assert.throws(() => normalizeEndpoint('不是服务器地址'))
  assert.throws(() => normalizeEndpoint('ftp://play.example.com'))
  assert.throws(() => normalizeEndpoint('https://user:pass@play.example.com'))
})

test('persists server selection, nickname and removal atomically', async (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-electron-store-'))
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const store = createServerStore(path.join(directory, 'data', 'servers.json'))

  const first = await store.add('127.0.0.1:3492')
  const second = await store.add('play.example.com')
  assert.equal(store.load().selectedServerId, second.id)
  assert.equal((await store.rename(first.id, ' 本地测试 ')).name, '本地测试')
  await assert.rejects(store.rename(first.id, ''))
  assert.deepEqual(await store.remove(second.id), {
    servers: [{ ...first, name: '本地测试' }],
    selectedServerId: first.id,
  })
  // Windows reports synthesized POSIX mode bits; its file access is controlled by ACLs.
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(path.join(directory, 'data', 'servers.json')).mode & 0o777, 0o600)
  }
})
