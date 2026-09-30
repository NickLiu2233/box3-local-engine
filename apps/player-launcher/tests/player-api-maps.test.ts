import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPlayerApi, resolveMapCoverUrl } from '../src/services/player-api'

test('normalizes map covers for the standalone file-based launcher window', async () => {
  const endpoint = 'http://127.0.0.1:3121'
  assert.equal(
    resolveMapCoverUrl(endpoint, '/runtime/play/map-one/block/QmCover.png'),
    'http://127.0.0.1:3121/runtime/play/map-one/block/QmCover.png',
  )
  assert.equal(
    resolveMapCoverUrl(endpoint, ''),
    'http://127.0.0.1:3121/map-templates/blank-template.png',
  )

  const api = createPlayerApi({
    isNative: () => true,
    invoke: async () => ({
      status: 200,
      headers: [['content-type', 'application/json']],
      body: JSON.stringify({ worlds: [{ id: 'map-one', publicId: 'map-one', cover: '/covers/map.png', onlineCount: 4 }] }),
    }),
  })
  const result = await api.getMaps(endpoint)
  assert.equal(result.data.worlds[0].cover, 'http://127.0.0.1:3121/covers/map.png')
  assert.equal(result.data.worlds[0].onlineCount, 4)
})
