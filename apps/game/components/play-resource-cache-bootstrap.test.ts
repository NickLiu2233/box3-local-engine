import { describe, expect, test } from '@jest/globals'

import { getActiveResourceCacheWorker } from './play-resource-cache-bootstrap'

function worker(state: ServiceWorkerState) {
  const listeners = new Set<() => void>()
  return {
    state,
    addEventListener(_name: string, listener: () => void) { listeners.add(listener) },
    removeEventListener(_name: string, listener: () => void) { listeners.delete(listener) },
    activate() {
      this.state = 'activated'
      for (const listener of listeners) listener()
    },
  }
}

describe('Play resource cache worker activation', () => {
  test('waits for a newly installed worker before sending its first cache request', async () => {
    const installing = worker('installing')
    const active = getActiveResourceCacheWorker({ active: null, waiting: null, installing } as never)

    installing.activate()

    await expect(active).resolves.toBe(installing)
  })

  test('prefers an installing update over an older active worker', async () => {
    const oldWorker = worker('activated')
    const installing = worker('installing')
    const active = getActiveResourceCacheWorker({ active: oldWorker, waiting: null, installing } as never)

    installing.activate()

    await expect(active).resolves.toBe(installing)
  })
})
