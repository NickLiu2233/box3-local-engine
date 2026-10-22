import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { ApiClient } from '../dist/index.es.mjs'

const document = JSON.parse(
  readFileSync(new URL('../openapi/openapi.json', import.meta.url), 'utf8'),
)
test('model-preview operations publish collection, upload, update, deletion and binary preview contracts', () => {
  assert.deepEqual(Object.keys(document.paths['/api/play-admin/models']).sort(), ['get', 'post'])
  assert.deepEqual(Object.keys(document.paths['/api/play-admin/models/{id}']).sort(), [
    'delete',
    'patch',
  ])
  assert.equal(
    document.paths['/api/play-admin/models'].post.requestBody.content['application/octet-stream']
      .schema.format,
    'binary',
  )
  assert.ok(document.paths['/api/play-admin/models/{id}'].delete.responses[204])
  assert.equal(
    document.paths['/api/play-models/{id}'].get.responses[200].content[
      'application/vnd.box.voxaplay+json'
    ].schema.format,
    'binary',
  )
})
test('generated client uploads file bytes and reads preview buffers without JSON conversion', async () => {
  const file = new Blob(['preview-only-payload'], { type: 'application/octet-stream' })
  const client = new ApiClient({
    baseUrl: 'https://play.example.test',
    fetch: async (request) => {
      if (request.method === 'POST') {
        assert.equal(new URL(request.url).pathname, '/api/play-admin/models')
        assert.equal(await request.text(), 'preview-only-payload')
        return new Response(JSON.stringify({ model: { id: 'model-id' } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      assert.equal(new URL(request.url).pathname, '/api/play-models/model-id')
      return new Response('preview-only-payload', {
        headers: { 'Content-Type': 'application/vnd.box.voxaplay+json' },
      })
    },
  })
  const uploaded = await client.postApiPlayAdminModels({
    body: file,
    bodySerializer: (body) => body,
  })
  assert.equal(uploaded.model.id, 'model-id')
  const preview = await client.getApiPlayModelsIdRaw({
    params: { path: { id: 'model-id' } },
    parseAs: 'arrayBuffer',
  })
  assert.ok(preview.data instanceof ArrayBuffer)
  assert.equal(new TextDecoder().decode(preview.data), 'preview-only-payload')
})
