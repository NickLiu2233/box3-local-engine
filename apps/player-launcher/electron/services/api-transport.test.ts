import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { test } from 'node:test'
import { createApiTransport, mergeCookies, validateRequestUrl } from './api-transport'

test('API requests are restricted to server API and advertised login routes', () => {
  const base = new URL('https://play.example.com/base')
  assert.equal(validateRequestUrl(base, 'https://play.example.com/base/api/health-check').pathname, '/base/api/health-check')
  assert.throws(() => validateRequestUrl(base, 'https://other.example.com/base/api/health-check'))
  assert.throws(() => validateRequestUrl(base, 'https://play.example.com/elsewhere'))
  assert.equal(validateRequestUrl(base, 'https://accounts.example.com/api/auth/login', 'https://accounts.example.com').pathname, '/api/auth/login')
  assert.throws(() => validateRequestUrl(base, 'https://accounts.example.com/api/private', 'https://accounts.example.com'))
})

test('only player session cookies are retained and logout expires them', () => {
  assert.equal(
    mergeCookies('box_local_player_device=device; unrelated=value', [
      'box_local_player_session=session; Path=/; HttpOnly',
      'box_local_player_device=; Path=/; Max-Age=0',
    ]),
    'box_local_player_session=session; unrelated=value',
  )
})

test('transport sends and clears server-scoped session cookies', async () => {
  const requests = []
  const transport = createApiTransport({
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options })
      const headers = new Headers({ 'content-type': 'application/json' })
      if (requests.length === 1) headers.append('set-cookie', 'box_local_player_session=first; Path=/; HttpOnly')
      return new Response('{"status":"ok"}', { status: 200, headers })
    },
  })
  await transport.request({ endpoint: 'play.example.com', url: 'https://play.example.com/api/health-check', method: 'GET' })
  await transport.request({ endpoint: 'play.example.com', url: 'https://play.example.com/api/player-launcher/maps', method: 'GET' })
  assert.equal(requests[1].options.headers.get('cookie'), 'box_local_player_session=first')
  transport.clear('play.example.com')
  assert.deepEqual(transport.cookies('play.example.com'), [])
})

test('downloads required assets with content type, range, length and streaming checks', async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-download-'))
  context.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const filename = path.join(root, 'asset.partial')
  fs.writeFileSync(filename, 'abc')
  const transport = createApiTransport({
    fetchImpl: async (_url, options) => {
      assert.equal(options.redirect, 'manual')
      assert.equal(options.headers.get('range'), 'bytes=3-')
      return new Response(Buffer.from('def'), {
        status: 206,
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': '3',
          'content-range': 'bytes 3-5/6',
        },
      })
    },
  })
  const progress = []
  const result = await transport.downloadAsset({
    request: {
      endpoint: 'https://play.example.com',
      url: 'https://play.example.com/api/player-launcher/maps/town/blobs/hash?digest=digest&ticket=one.ticket',
      method: 'GET',
      headers: [['Range', 'bytes=3-']],
      body: null,
    },
    filename,
    expectedSize: 6,
    expectedContentType: 'application/octet-stream',
    existingBytes: 3,
    hash: 'hash',
    onProgress: (item) => progress.push(item),
  })
  assert.equal(fs.readFileSync(filename, 'utf8'), 'abcdef')
  assert.equal(result.downloadedBytes, 3)
  assert.equal(progress.at(-1).currentBytes, 6)
})

test('does not persist a successful response whose signed MIME type does not match', async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-wrong-mime-'))
  context.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const filename = path.join(root, 'asset.partial')
  const transport = createApiTransport({
    fetchImpl: async () => new Response(Buffer.from('asset'), {
      status: 200,
      headers: { 'content-type': 'text/html', 'content-length': '5' },
    }),
  })
  await assert.rejects(transport.downloadAsset({
    request: {
      endpoint: 'https://play.example.com',
      url: 'https://play.example.com/api/player-launcher/maps/town/blobs/hash?digest=digest&ticket=one.ticket',
      method: 'GET',
      headers: [],
      body: null,
    },
    filename,
    expectedSize: 5,
    expectedContentType: 'image/png',
    existingBytes: 0,
    hash: 'hash',
  }), /类型与签名清单不符/)
  assert.equal(fs.existsSync(filename), false)
})
