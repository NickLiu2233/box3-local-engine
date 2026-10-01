import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { test } from 'node:test'
import { createMapLabels } from './map-labels'

test('remembers the latest played map across launcher restarts using only public map metadata', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-map-labels-'))
  context.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const filename = path.join(root, 'map-labels.json')
  const labels = createMapLabels(filename)
  labels.remember('server-fixture', [{
    permanentMapId: 'permanent-town', publicId: 'town', name: '星梦小镇', version: 'v1.0.0',
  }])
  labels.rememberPlayed('server-fixture', {
    permanentMapId: 'permanent-town', accessId: 'town', name: '星梦小镇', releaseVersion: 'v1.0.0',
  })

  const reopened = createMapLabels(filename)
  const recent = reopened.recent('server-fixture')
  assert.equal(recent?.permanentMapId, 'permanent-town')
  assert.equal(recent?.name, '星梦小镇')
  assert.equal(recent?.releaseVersion, 'v1.0.0')
  reopened.forget('server-fixture')
  assert.equal(createMapLabels(filename).recent('server-fixture'), null)
})
