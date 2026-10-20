import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

jest.mock('../../voxa/server/model-management-access', () => ({
  requireVoxaModelAccess: jest.fn(async () => true),
}))
jest.mock('../../voxa/server/local-cors', () => ({ setLocalCors: () => true }))

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'voxa-authoring-'))
process.env.VOXA_DATA_PATH = directory
const handler = require('../../voxa/pages/api/local/models/authoring').default
const exportHandler = require('../../voxa/pages/api/local/models/[id]/export').default
const importHandler = require('../../voxa/pages/api/local/models/import').default
const { getModel, listModels } = require('../../voxa/server/local-voxa-store')
const { requireVoxaModelAccess } = require('../../voxa/server/model-management-access')
function response() {
  const res = {
    statusCode: 200,
    value: undefined as any,
    headers: {} as Record<string, string>,
    setHeader: jest.fn(),
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(value: unknown) {
      this.value = value
      return this
    },
    send(value: unknown) {
      this.value = value
      return this
    },
    end() {
      return this
    },
  }
  return res
}
afterAll(() => fs.rmSync(directory, { recursive: true, force: true }))

test('creates, renames, edits, saves and reads a model with no editor session', async () => {
  const res = response()
  await handler({ method: 'POST', body: { name: 'CLI model' } }, res)
  expect(res.statusCode).toBe(201)
  const id = res.value.modelId
  const edit = response()
  await handler(
    {
      method: 'POST',
      body: {
        id,
        name: 'Renamed',
        expectedProjectFileHash: res.value.projectFileHash,
        operations: [
          { op: 'node.create', id: 'body', kind: 'part', size: [4, 4, 4] },
          { op: 'voxel.fill', node: 'body', min: [0, 0, 0], max: [3, 3, 3], color: 1 },
        ],
      },
    },
    edit,
  )
  expect(edit.statusCode).toBe(200)
  expect(edit.value.modelName).toBe('Renamed')
  expect(edit.value.compiled.solidVoxels).toBe(64)
  const conflict = response()
  await handler(
    {
      method: 'POST',
      body: { id, expectedProjectFileHash: res.value.projectFileHash, name: 'stale' },
    },
    conflict,
  )
  expect(conflict.statusCode).toBe(409)
  expect(getModel(id).modelName).toBe('Renamed')
  const info = response()
  await handler({ method: 'GET', query: { id: String(id) } }, info)
  expect(info.value.project.nodes.find((n: any) => n.id === 'body').size).toEqual([4, 4, 4])
  const failed = response()
  await handler(
    {
      method: 'POST',
      body: { id, name: 'bad', operations: [{ op: 'node.transform', node: 'missing' }] },
    },
    failed,
  )
  expect(failed.statusCode).toBe(400)
  expect(getModel(id).modelName).toBe('Renamed')
})

test.each(['model', 'skin'])(
  '%s export/import preserves a fully usable resource graph',
  async (kind) => {
    const created = response()
    await handler(
      {
        method: 'POST',
        body: {
          kind,
          name: `${kind}-roundtrip`,
          operations:
            kind === 'model'
              ? [
                  { op: 'node.create', id: 'cube', kind: 'part', size: [2, 2, 2] },
                  { op: 'voxel.fill', node: 'cube', min: [0, 0, 0], max: [1, 1, 1], color: 1 },
                ]
              : [],
        },
      },
      created,
    )
    expect(created.statusCode).toBe(201)
    const exported = response()
    await exportHandler({ method: 'GET', query: { id: String(created.value.modelId) } }, exported)
    expect(exported.statusCode).toBe(200)
    expect(Buffer.isBuffer(exported.value)).toBe(true)
    const imported = response()
    const req = Object.assign(Readable.from([exported.value]), { method: 'POST' })
    await importHandler(req, imported)
    expect(imported.statusCode).toBe(201)
    expect(imported.value.requiresResourceResave).toBe(false)
    expect(imported.value.creativeMode).toBe(kind === 'skin' ? 2 : 1)
    expect(imported.value.modelFileHash).toBe(created.value.modelFileHash)
  },
)

test('denied access does not create or edit models', async () => {
  requireVoxaModelAccess.mockResolvedValueOnce(false)
  const before = listModels().length,
    res = response()
  await handler({ method: 'POST', body: { name: 'denied' } }, res)
  expect(listModels()).toHaveLength(before)
})
