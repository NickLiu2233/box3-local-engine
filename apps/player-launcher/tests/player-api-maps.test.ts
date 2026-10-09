import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPlayerApi, resolveMapCoverUrl } from '../src/api/player-api'

test('normalizes map covers for the standalone file-based launcher window', async () => {
  const endpoint = 'http://127.0.0.1:3121'
  assert.equal(
    resolveMapCoverUrl(endpoint, 'QmCover.png', 'map-one'),
    'http://127.0.0.1:3121/runtime/play/map-one/block/QmCover.png',
  )
  assert.equal(
    resolveMapCoverUrl(endpoint, '', 'map-one'),
    'http://127.0.0.1:3121/map-templates/blank-template.png',
  )
  assert.equal(
    resolveMapCoverUrl(endpoint, '/map-templates/custom.png', 'map-one'),
    'http://127.0.0.1:3121/map-templates/custom.png',
  )
  assert.equal(
    resolveMapCoverUrl(endpoint, 'data:image/png;base64,YWJj', 'map-one'),
    'data:image/png;base64,YWJj',
  )
  assert.equal(
    resolveMapCoverUrl(endpoint, 'QmCover.png', 'map/one'),
    'http://127.0.0.1:3121/runtime/play/map%2Fone/block/QmCover.png',
  )

  const api = createPlayerApi({
    isNative: () => true,
    invoke: async (command, payload) => {
      if (command === 'fetch_public_image') {
        assert.equal(payload.url, 'http://127.0.0.1:3121/runtime/play/map-one/block/QmCover.png')
        return 'data:image/png;base64,YWJj'
      }
      return {
        status: 200,
        headers: [['content-type', 'application/json']],
        body: JSON.stringify({
          worlds: [{ id: 'map-one', publicId: 'map-one', cover: 'QmCover.png', onlineCount: 4 }],
        }),
      }
    },
  })
  const result = await api.getMaps(endpoint)
  assert.equal(result.data.worlds[0].cover, 'data:image/png;base64,YWJj')
  assert.equal(result.data.worlds[0].onlineCount, 4)
})
