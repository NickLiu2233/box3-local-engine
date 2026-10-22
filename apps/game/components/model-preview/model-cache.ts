import { decodeVoxaPlay } from '@box/voxa-project'

export const MODEL_PREVIEW_CACHE = 'box-play-models:v1'
type PreviewCache = Pick<Cache, 'match' | 'put' | 'keys' | 'delete'>
type ModelCacheOptions = {
  id: string
  version: string
  contentHash: string
  origin: string
  signal?: AbortSignal
  fetchBytes: () => Promise<ArrayBuffer>
  storage?: { open: (name: string) => Promise<PreviewCache> }
  digest?: (bytes: Uint8Array) => Promise<string>
}

async function browserDigest(bytes: Uint8Array) {
  if (!globalThis.crypto?.subtle) return ''
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Publication is checked by the page; only validated renderer bytes enter this optional cache. */
export async function loadModelPreview({
  id,
  version,
  contentHash,
  origin,
  signal,
  fetchBytes,
  storage,
  digest = browserDigest,
}: ModelCacheOptions) {
  const key = new URL(`/__box-model-cache/${encodeURIComponent(id)}`, origin)
  key.searchParams.set('version', version)
  key.searchParams.set('hash', contentHash || '')
  const validate = async (bytes: ArrayBuffer) => {
    if (signal?.aborted) throw new DOMException('预览已关闭', 'AbortError')
    const data = new Uint8Array(bytes)
    const actualHash = await digest(data)
    if (actualHash && contentHash && actualHash !== contentHash)
      throw new Error('模型资源版本已变化，请重新打开预览')
    return decodeVoxaPlay(data)
  }
  let cache: PreviewCache | undefined
  try {
    const cacheStorage = /^[a-f0-9]{64}$/.test(contentHash || '')
      ? storage || (typeof caches !== 'undefined' ? caches : undefined)
      : undefined
    cache = await cacheStorage?.open(MODEL_PREVIEW_CACHE)
    const cached = await cache?.match(key.href)
    if (cached) {
      try {
        return await validate(await cached.arrayBuffer())
      } catch (error) {
        if (signal?.aborted) throw error
        await cache?.delete(key.href)
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error
    cache = undefined
  }
  const bytes = await fetchBytes()
  const bundle = await validate(bytes)
  if (cache && !signal?.aborted) {
    try {
      await cache.put(
        key.href,
        new Response(bytes, { headers: { 'Content-Type': 'application/vnd.box.voxaplay+json' } }),
      )
      const previous = (await cache.keys()).filter(
        (request) => new URL(request.url).pathname === key.pathname && request.url !== key.href,
      )
      await Promise.all(previous.map((request) => cache!.delete(request)))
    } catch {
      // Storage can be denied or full; the already validated online preview still works.
    }
  }
  return bundle
}
