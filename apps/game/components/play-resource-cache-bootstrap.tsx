import { useEffect } from 'react'

type ResourceManifest = {
  enabled: boolean
  worldId?: string
  version?: string
  hashes?: string[]
  signature?: {
    algorithm: 'ES256'
    publicKey: Record<string, string>
    value: string
  }
}

type ActiveWorkerRegistration = Pick<ServiceWorkerRegistration, 'active' | 'installing' | 'waiting'>

function waitForActivation(worker: ServiceWorker | null): Promise<ServiceWorker | null> {
  if (!worker || worker.state === 'activated') return Promise.resolve(worker)
  return new Promise((resolve) => {
    const onStateChange = () => {
      if (worker.state === 'activated') {
        worker.removeEventListener('statechange', onStateChange)
        resolve(worker)
      }
      if (worker.state === 'redundant') {
        worker.removeEventListener('statechange', onStateChange)
        resolve(null)
      }
    }
    worker.addEventListener('statechange', onStateChange)
  })
}

/** Resolves a worker that can receive a cache request on a first visit. */
export async function getActiveResourceCacheWorker(
  registration: ActiveWorkerRegistration,
): Promise<ServiceWorker | null> {
  // Prefer the version just installed by this page. `navigator.serviceWorker.ready`
  // can point to an older controller during an update, so using it here may send
  // the first prefetch message to a worker that does not implement this cache.
  return waitForActivation(registration.installing || registration.waiting || registration.active)
}

/** Starts background caching while the map runtime is loading. */
export function PlayResourceCacheBootstrap({ world }: { world: string }) {
  useEffect(() => {
    if (!world || !('serviceWorker' in navigator)) return
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch(`/api/play-resource-cache/${encodeURIComponent(world)}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (!response.ok || cancelled) return
        const manifest = await response.json() as ResourceManifest
        const registered = await navigator.serviceWorker.register('/box-resource-cache-worker.js', { scope: '/' })
        const worker = await getActiveResourceCacheWorker(registered)
        if (cancelled || !worker) return
        if (!manifest.enabled || !manifest.worldId || !manifest.version || !Array.isArray(manifest.hashes) || !manifest.signature) {
          worker.postMessage({ type: 'BOX3_CLEAR_STATIC_RESOURCES' })
          return
        }
        worker.postMessage({
          type: 'BOX3_PREFETCH_STATIC_RESOURCES',
          mapId: manifest.worldId,
          version: manifest.version,
          hashes: manifest.hashes,
          signature: manifest.signature,
          assets: manifest.hashes.map((hash) => `/runtime/play/${encodeURIComponent(world)}/block/${encodeURIComponent(hash)}`),
        })
      } catch {
        // Caching is an optional acceleration. Map startup must stay online
        // and fully functional if registration or manifest loading fails.
      }
    })()
    return () => { cancelled = true }
  }, [world])
  return null
}
