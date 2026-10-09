'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { createFixture } = require('./lib/deployment-manager-ui-fixture')
const { buildReleaseManifest } = require('./build-release-manifest')
const release = {
  schemaVersion: 1,
  version: '0.4.0',
  date: '2026-10-09',
  summary: '<script>alert(1)</script>',
  sections: [{ title: 'New features', items: ['<img src=x onerror=alert(1)>'] }],
}

test('startup checks CDN and newer releases display escaped changelog, version and date', async () => {
  const app = await createFixture({ releaseResponse: release })
  assert.equal(app.calls.filter((call) => call.command === 'fetch_release').length, 1)
  assert.equal(
    app.calls.find((call) => call.command === 'fetch_release').url,
    'https://assets.box3.fun/local-engine/latest.json',
  )
  assert.equal(app.api.state.updateDialogOpen, true)
  assert.match(app.html, /发现新版本 0\.4\.0/)
  assert.match(app.html, /2026-10-09/)
  assert.match(app.html, /&lt;script&gt;/)
  assert.doesNotMatch(app.html, /<img src=x/)
  app.api.closeUpdateDialog()
  assert.equal(app.api.state.updateDialogOpen, false)
  assert.doesNotMatch(app.html, /id="update-title"/)
})

test('manual checks report latest and semantic comparison rejects nonstable versions', async () => {
  const app = await createFixture()
  assert.equal(app.api.state.updateDialogOpen, false)
  await app.api.checkForUpdates(true)
  assert.equal(app.api.state.notice, '当前已是最新版本。')
  assert.equal(app.api.isNewerVersion('0.10.0', '0.9.9'), true)
  assert.equal(app.api.isNewerVersion('0.2.0', '0.3.0'), false)
  assert.equal(app.api.isNewerVersion('v0.3.0', '0.3.0+build'), false)
  assert.throws(() => app.api.isNewerVersion('0.4.0-beta.1', '0.3.0'))
  assert.throws(() =>
    app.api.validateRelease({ ...release, sections: [{ title: 'x', items: [{}] }] }),
  )
})

test('offline startup is silent, manual failure is actionable, and web does not check', async () => {
  const app = await createFixture({
    releaseResponse: () => {
      throw new Error('offline')
    },
  })
  assert.equal(app.api.state.error, '')
  assert.equal(app.api.state.updateChecking, false)
  await app.api.checkForUpdates(true)
  assert.match(app.api.state.error, /无法检测更新/)
  const web = await createFixture({ webManager: true })
  await web.api.checkForUpdates(true)
  assert.equal(web.calls.filter((call) => call.command === 'fetch_release').length, 0)
})

test('overlapping startup and manual checks share one request', async () => {
  let finish
  const response = new Promise((resolve) => {
    finish = resolve
  })
  const app = await createFixture({ releaseResponse: () => response })
  const check = app.api.checkForUpdates(true)
  assert.equal(app.calls.filter((call) => call.command === 'fetch_release').length, 1)
  finish(release)
  await check
  assert.equal(app.api.state.updateChecking, false)
  assert.equal(app.api.state.updateDialogOpen, true)
})

test('manifest selects version logs, retains history and rejects unpublished versions', () => {
  const notes = require('../distribution/release-notes.json')
  assert.ok(notes.some((note) => note.version === '0.1.0'))
  const manifest = buildReleaseManifest('v0.3.0', '2026-10-09')
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.date, '2026-10-09')
  assert.deepEqual(manifest.sections, notes[0].sections)
  assert.throws(() => buildReleaseManifest('0.4.0', '2026-10-09'), /Missing release notes/)
  assert.throws(() => buildReleaseManifest('0.3.0', '2026-02-31'), /Invalid release date/)
})

test('missing CDN manifest reports the publication problem instead of blaming connectivity', async () => {
  const app = await createFixture({
    releaseHttpResponse: {
      ok: false,
      status: 404,
      text: async () =>
        '<Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message></Error>',
    },
  })
  assert.equal(app.api.state.error, '')
  await app.api.checkForUpdates(true)
  assert.match(app.api.state.error, /HTTP 404/)
  assert.match(app.api.state.error, /NoSuchKey/)
  assert.match(app.api.state.error, /The specified key does not exist\./)
  assert.match(app.html, /&lt;Error&gt;/)
  assert.doesNotMatch(app.html, /<Error>/)
  assert.doesNotMatch(app.api.state.error, /检查网络/)
  assert.equal(app.api.state.updateRelease, null)
  assert.equal(app.api.state.updateChecking, false)
})

test('manual checks preserve server and invalid-manifest errors', async () => {
  const server = await createFixture({
    releaseHttpResponse: { ok: false, status: 503, text: async () => 'Service Unavailable' },
  })
  await server.api.checkForUpdates(true)
  assert.match(server.api.state.error, /HTTP 503：\nService Unavailable/)
  const invalid = await createFixture({
    releaseHttpResponse: { ok: true, text: async () => '<Error>NoSuchKey</Error>' },
  })
  await invalid.api.checkForUpdates(true)
  assert.match(invalid.api.state.error, /Unexpected token/)
})
