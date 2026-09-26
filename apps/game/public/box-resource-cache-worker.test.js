const fs = require('fs')
const path = require('path')
const vm = require('vm')

function loadWorkerTestHooks() {
  const hooks = {}
  const workerScope = {
    __BOX3_RESOURCE_CACHE_TEST__: hooks,
    location: { origin: 'https://play.example.test' },
    addEventListener: () => {},
    skipWaiting: () => {},
    clients: { claim: () => {} },
  }
  const source = fs.readFileSync(path.join(__dirname, 'box-resource-cache-worker.js'), 'utf8')
  vm.runInNewContext(source, {
    self: workerScope,
    URL,
    Request,
    Response,
    Headers,
    TextEncoder,
    Uint8Array,
    crypto: globalThis.crypto,
    btoa,
    atob,
  })
  return hooks
}

describe('BOX3 Play resource cache worker', () => {
  test('maps engine media URLs with extensions to the manifest content hash', () => {
    const { resourceDescriptor } = loadWorkerTestHooks()
    const hash = 'QmbVZUtAue26KwkMjcJggm5yVLbiUrunC83t4e2CdS2ZGf'

    expect(resourceDescriptor({
      url: `https://play.example.test/runtime/play/a-map/block/${hash}.png`,
    })).toEqual({ hash, extension: '.png' })
    expect(resourceDescriptor({
      url: `https://play.example.test/runtime/play/a-map/block/${hash}`,
    })).toEqual({ hash, extension: '' })
    expect(resourceDescriptor({
      url: `https://play.example.test/runtime/play/a-map/engine/m/${hash}`,
    })).toEqual({ hash, extension: '' })
    expect(resourceDescriptor({
      url: `https://play.example.test/runtime/play/a-map/engine/s/${hash}`,
    })).toBeNull()
  })

  test('limits background prefetches so they do not flood the map loader', async () => {
    const { runWithConcurrency } = loadWorkerTestHooks()
    let active = 0
    let peak = 0
    await runWithConcurrency(Array.from({ length: 20 }, (_, index) => index), 3, async () => {
      active += 1
      peak = Math.max(peak, active)
      await Promise.resolve()
      active -= 1
    })
    expect(peak).toBeLessThanOrEqual(3)
  })
})
