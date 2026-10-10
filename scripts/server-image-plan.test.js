'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { planImages, mergeImages, services } = require('./server-image-plan')

test('same version/source skips images; a Web manager change rebuilds only that image', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-server-plan-'))
  try {
    const files = ['package.json', 'apps/server-manager-rust/src/main.rs', 'apps/game/src/main.ts']
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
      fs.writeFileSync(
        path.join(root, file),
        file === 'package.json' ? '{"version":"0.3.0"}' : 'original',
      )
    }
    const initial = planImages(root, 'arm64', null, files)
    assert.ok(initial.every((item) => item.build))
    const digest = 'a'.repeat(64)
    const catalog = {
      formatVersion: 2,
      platform: 'linux/arm64',
      imageTag: initial[0].imageTag,
      images: initial.map((item) => ({
        formatVersion: 1,
        image: `box-local-engine-${item.service}`,
        imageId: `sha256:${digest}`,
        imageIds: [`sha256:${digest}`],
        imageTag: item.imageTag,
        platform: 'linux/arm64',
        sha256: digest,
        size: 100,
        archive: `box-local-engine-image-${item.service}-arm64-${digest}.tar.gz`,
        sourceFingerprint: item.sourceFingerprint,
      })),
    }
    assert.ok(planImages(root, 'arm64', catalog, files).every((item) => !item.build))
    fs.writeFileSync(path.join(root, files[1]), 'Web download and update fixes')
    const changed = planImages(root, 'arm64', catalog, files)
    assert.deepEqual(
      changed.filter((item) => item.build).map((item) => item.service),
      ['server-manager'],
    )
    const updated = {
      ...catalog.images.find((image) => image.image === 'box-local-engine-server-manager'),
      size: 200,
    }
    fs.writeFileSync(path.join(root, 'server-manager.json'), JSON.stringify({ images: [updated] }))
    const merged = mergeImages('arm64', catalog, changed, root)
    assert.equal(merged.images.find((image) => image.image === updated.image).size, 200)
    for (const service of services.filter((name) => name !== 'server-manager')) {
      assert.deepEqual(
        merged.images.find((image) => image.image === `box-local-engine-${service}`),
        catalog.images.find((image) => image.image === `box-local-engine-${service}`),
      )
    }
    assert.ok(planImages(root, 'arm64', merged, files).every((item) => !item.build))
    assert.throws(() => planImages(root, 'amd64', catalog, files), /Invalid per-service/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
