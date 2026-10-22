import { describe, expect, jest, test } from '@jest/globals'
import { createHash } from 'node:crypto'
import { encodeVoxaPlay, modelV7 } from '@box/voxa-project'
import { loadModelPreview, MODEL_PREVIEW_CACHE } from './model-cache'

function payload(name = '缓存模型') {
  const model = modelV7.ModelDataV7Schema.fromJSON({
    version: 7,
    nodes: [
      {
        mesh: 0,
        rotation: [0, 0, 0, 1],
        translation: [0, 0, 0],
        scale: [1, 1, 1],
        parentScaleMat3: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        children: [],
        alpha: 1,
      },
    ],
    meshes: [
      Array.from({ length: 6 }, (_, index) =>
        index === 0
          ? { vertices: [0, 0, 0], sizes: [2, 2], uvs: [0, 0, 1, 1], uvFlags: [0] }
          : { vertices: [], sizes: [], uvs: [], uvFlags: [] },
      ),
    ],
    texture: { palette: [0xffcc4400], data: [0], width: 1 },
    animations: [],
  })
  return encodeVoxaPlay(name, model)
}
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
function storage() {
  const entries = new Map<string, Response>()
  const url = (key: RequestInfo | URL) =>
    typeof key === 'string' ? key : key instanceof URL ? key.href : key.url
  const cache: Pick<Cache, 'match' | 'put' | 'keys' | 'delete'> = {
    match: async (key: RequestInfo | URL) => entries.get(url(key))?.clone(),
    put: async (key: RequestInfo | URL, value: Response) => {
      entries.set(url(key), value.clone())
    },
    keys: async () => [...entries.keys()].map((key) => new Request(key)),
    delete: async (key: RequestInfo | URL) => entries.delete(url(key)),
  }
  return {
    entries,
    cache,
    open: async (name: string) => {
      expect(name).toBe(MODEL_PREVIEW_CACHE)
      return cache
    },
  }
}
function options(bytes: Uint8Array, cacheStorage = storage()) {
  return {
    id: 'model-1',
    version: 'v1.0.0',
    contentHash: hash(bytes),
    origin: 'https://play.example.test',
    storage: cacheStorage,
    digest: async (data: Uint8Array) => hash(data),
    fetchBytes: jest.fn(async () => new Response(bytes).arrayBuffer()),
  }
}

describe('versioned model preview Cache Storage', () => {
  test('the second open of an unchanged version reads bytes locally', async () => {
    const input = options(payload())
    await loadModelPreview(input)
    expect((await loadModelPreview(input)).name).toBe('缓存模型')
    expect(input.fetchBytes).toHaveBeenCalledTimes(1)
  })
  test('version or content changes refresh the model and remove the previous entry', async () => {
    const input = options(payload())
    await loadModelPreview(input)
    await loadModelPreview({ ...input, version: 'v2.0.0' })
    expect(input.fetchBytes).toHaveBeenCalledTimes(2)
    const changed = options(payload('新版模型'), input.storage)
    expect((await loadModelPreview({ ...changed, version: 'v2.0.0' })).name).toBe('新版模型')
    expect(input.storage.entries.size).toBe(1)
  })
  test('corrupt cache bytes are repaired from the current download', async () => {
    const input = options(payload())
    await loadModelPreview(input)
    const key = [...input.storage.entries.keys()][0]
    input.storage.entries.set(key, new Response('broken'))
    expect((await loadModelPreview(input)).name).toBe('缓存模型')
    expect(input.fetchBytes).toHaveBeenCalledTimes(2)
  })
  test('storage denial does not prevent an online preview', async () => {
    const input = options(payload())
    expect(
      (
        await loadModelPreview({
          ...input,
          storage: {
            open: async () => {
              throw new Error('denied')
            },
          },
        })
      ).name,
    ).toBe('缓存模型')
  })
  test('wrong downloads are rejected without replacing a known good cached version', async () => {
    const input = options(payload())
    await loadModelPreview(input)
    await expect(
      loadModelPreview({
        ...input,
        version: 'v2.0.0',
        fetchBytes: async () => new Response(payload('wrong')).arrayBuffer(),
      }),
    ).rejects.toThrow('版本已变化')
    expect(input.storage.entries.size).toBe(1)
  })
})
