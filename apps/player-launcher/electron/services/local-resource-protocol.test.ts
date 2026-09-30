import assert from 'node:assert/strict'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { test } from 'node:test'
import { createLocalResourceProtocol, parseRange } from './local-resource-protocol'

test('supports exact and suffix ranges without exposing arbitrary paths', async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-protocol-'))
  context.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const bytes = Buffer.from('0123456789')
  const hash = crypto.createHash('sha256').update(bytes).digest('base64url')
  const filename = path.join(root, hash)
  fs.writeFileSync(filename, bytes)
  const session = {
    id: 'launch-session',
    origin: 'http://play.example.com',
    expiresAt: Date.now() + 60_000,
    assets: new Map([[hash, { filename, size: bytes.length, contentType: 'audio/mpeg' }]]),
  }
  const handle = createLocalResourceProtocol({ getSession: (id) => id === 'launch-session' ? session : null })
  const url = 'boxplay://localhost/launch-session/block/' + hash + '.mp3'
  const headers = { Origin: session.origin }
  const ranged = await handle(new Request(url, { headers: { ...headers, Range: 'bytes=3-6' } }))
  assert.equal(ranged.status, 206)
  assert.equal(ranged.headers.get('content-range'), 'bytes 3-6/10')
  assert.equal(await ranged.text(), '3456')

  const suffix = await handle(new Request(url, { headers: { ...headers, Range: 'bytes=-3' } }))
  assert.equal(await suffix.text(), '789')
  assert.deepEqual(parseRange('bytes=20-', 10), null)

  const invalidHash = await handle(new Request('boxplay://localhost/launch-session/block/../secret', { headers }))
  assert.equal(invalidHash.status, 404)
  const wrongOrigin = await handle(new Request(url, { headers: { Origin: 'https://attacker.example' } }))
  assert.equal(wrongOrigin.status, 403)

  const forgedHeader = new Request(url, { headers })
  Object.defineProperty(forgedHeader, 'initiatorOrigin', { value: 'https://attacker.example' })
  assert.equal((await handle(forgedHeader)).status, 403)
})
