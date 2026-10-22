import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  decodeVoxaPlay,
  encodeVoxaPlay,
  modelV7,
  ProjectInterpolationType,
  Vec3Schema,
} from '@box/voxa-project'
import {
  deletePlayModel,
  getPlayModel,
  importPlayModel,
  listPlayModels,
  playModelFile,
  updatePlayModel,
} from './play-models'
import { animationDuration, previewPose } from '../components/model-preview/pose'

function fixture() {
  const model = modelV7.ModelDataV7Schema.clone(modelV7.ModelDataV7Schema.identity)
  const node = modelV7.ModelNodeSchema.clone(modelV7.ModelNodeSchema.identity)
  node.mesh = 0
  node.scale.set([1, 1, 1])
  node.rotation.set([0, 0, 0, 1])
  node.parentScaleMat3.set([1, 0, 0, 0, 1, 0, 0, 0, 1])
  model.nodes = [node]
  model.texture = { palette: [0xffcc4400], data: [0], width: 1 }
  model.meshes = [
    Array.from({ length: 6 }, (_, index) =>
      index === 0
        ? { vertices: [0, 0, 0], sizes: [2, 2], uvs: [0, 0, 1, 1], uvFlags: [0] }
        : { vertices: [], sizes: [], uvs: [], uvFlags: [] },
    ),
  ]
  model.animations = [
    {
      id: 'motion',
      name: '移动',
      channels: [{ sampler: 0, target: { node: 0, path: 'translation' as never } }],
      samplers: [
        {
          interpolation: ProjectInterpolationType.Linear,
          input: [0, 2],
          output: {
            type: 'translation',
            data: [Vec3Schema.fromJSON([0, 0, 0]), Vec3Schema.fromJSON([10, 0, 0])],
          },
        },
      ],
    },
  ]
  return model
}

describe('preview-only VOXA packages and persistent Play model library', () => {
  let folder: string
  const original = { ...process.env }
  beforeEach(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'voxaplay-test-'))
    process.env.BOX_DEPLOYMENT_MODE = 'play'
    process.env.BOX_PLAY_LIBRARY_PATH = folder
    process.env.BOX_PLAY_PUBLIC_URL = 'https://play.example.test/play'
  })
  afterEach(() => {
    fs.rmSync(folder, { recursive: true, force: true })
    for (const key of ['BOX_DEPLOYMENT_MODE', 'BOX_PLAY_LIBRARY_PATH', 'BOX_PLAY_PUBLIC_URL']) {
      if (original[key] === undefined) delete process.env[key]
      else process.env[key] = original[key]
    }
  })
  test('round trips baked geometry and animation, without editable project state', () => {
    const bytes = encodeVoxaPlay('机器人', fixture())
    const envelope = JSON.parse(new TextDecoder().decode(bytes))
    expect(Object.keys(envelope).sort()).toEqual([
      'author',
      'defaultAnimationId',
      'description',
      'format',
      'formatVersion',
      'model',
      'name',
      'placement',
      'version',
    ])
    expect(Object.keys(envelope.model).sort()).toEqual([
      'animations',
      'meshes',
      'nodes',
      'texture',
      'version',
    ])
    expect(envelope.model.voxels).toBeUndefined()
    expect(envelope.project).toBeUndefined()
    const bundle = decodeVoxaPlay(bytes)
    expect(bundle.model.meshes[0][0].sizes).toEqual([2, 2])
    expect(animationDuration(bundle.model.animations[0])).toBe(2)
    expect(previewPose(bundle.model, 0, 1).matrices[0][12]).toBeCloseTo(5)
  })
  test('higher versions replace the same project while keeping its preview link', () => {
    const projectId = '7a6cd28a-c922-4418-bacd-c36b62d13fff'
    const upload = (version: string, name = '机器人') =>
      importPlayModel(encodeVoxaPlay(name, fixture(), undefined, { projectId, version }))
    const first = upload('v1.0.9')
    expect(() => upload('v1.0.9')).toThrow('相同')
    expect(() => upload('v1.0.8')).toThrow('低于')
    expect(getPlayModel(first.id)?.version).toBe('v1.0.9')
    const next = upload('v1.0.10', '改名机器人')
    expect(next.id).toBe(first.id)
    expect(next.previewUrl).toBe(first.previewUrl)
    expect(next.contentHash).not.toBe(first.contentHash)
    expect(next.name).toBe('改名机器人')
    expect(listPlayModels()).toHaveLength(1)
    expect(decodeVoxaPlay(fs.readFileSync(playModelFile(first.id))).version).toBe('v1.0.10')
  })
  test('projects sharing a name remain separate works', () => {
    const first = importPlayModel(
      encodeVoxaPlay('同名作品', fixture(), undefined, {
        projectId: '7a6cd28a-c922-4418-bacd-c36b62d13fff',
        version: 'v1.0.0',
      }),
    )
    const second = importPlayModel(
      encodeVoxaPlay('同名作品', fixture(), undefined, {
        projectId: '7a6cd28a-c922-4418-bacd-c36b62d13ffe',
        version: 'v1.0.0',
      }),
    )
    expect(first.id).not.toBe(second.id)
    expect(listPlayModels()).toHaveLength(2)
  })
  test('a failed replacement restores the installed preview', () => {
    const projectId = '7a6cd28a-c922-4418-bacd-c36b62d13fff'
    const first = importPlayModel(
      encodeVoxaPlay('原作品', fixture(), undefined, { projectId, version: 'v1.0.0' }),
    )
    const originalBytes = fs.readFileSync(playModelFile(first.id))
    const rename = fs.renameSync
    const spy = jest.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (String(from).includes('.upload-')) throw new Error('模拟写入失败')
      rename(from, to)
    })
    try {
      expect(() =>
        importPlayModel(
          encodeVoxaPlay('更新作品', fixture(), undefined, { projectId, version: 'v1.0.1' }),
        ),
      ).toThrow('模拟写入失败')
      expect(getPlayModel(first.id)?.version).toBe('v1.0.0')
      expect(fs.readFileSync(playModelFile(first.id))).toEqual(originalBytes)
    } finally {
      spy.mockRestore()
    }
  })
  test('export metadata and default animation survive upload canonicalization', () => {
    const bytes = encodeVoxaPlay('机器人', fixture(), undefined, {
      author: '模型作者',
      description: '会自动播放的模型',
      version: 'v2.1.0',
      defaultAnimationId: 'motion',
    })
    const entry = importPlayModel(bytes)
    expect(entry).toMatchObject({
      author: '模型作者',
      description: '会自动播放的模型',
      version: 'v2.1.0',
    })
    const stored = decodeVoxaPlay(fs.readFileSync(playModelFile(entry.id)))
    expect(stored).toMatchObject({
      author: '模型作者',
      description: '会自动播放的模型',
      version: 'v2.1.0',
      defaultAnimationId: 'motion',
    })
    expect(
      stored.model.animations.findIndex((animation) => animation.id === stored.defaultAnimationId),
    ).toBe(0)
  })
  test('packages without render placement must be exported again', () => {
    const envelope = JSON.parse(new TextDecoder().decode(encodeVoxaPlay('旧模型', fixture())))
    envelope.formatVersion = 1
    delete envelope.placement
    expect(() => importPlayModel(new TextEncoder().encode(JSON.stringify(envelope)))).toThrow(
      '格式不支持',
    )
    envelope.formatVersion = 2
    expect(() => importPlayModel(new TextEncoder().encode(JSON.stringify(envelope)))).toThrow(
      '缺少模型定位信息',
    )
    expect(listPlayModels()).toHaveLength(0)
  })
  test('keeps render placement through import while excluding game and engineering metadata', () => {
    const placement = { origin: [-30, -40, -50] } as const
    const envelope = JSON.parse(new TextDecoder().decode(encodeVoxaPlay('锚点模型', fixture())))
    Object.assign(envelope, {
      placement,
      hitBox: { size: [99, 99, 99] },
      bounds: [99, 99, 99],
      physics: { mass: 1 },
      project: { voxels: 'editable data' },
    })
    const entry = importPlayModel(new TextEncoder().encode(JSON.stringify(envelope)))
    const storedBytes = fs.readFileSync(playModelFile(entry.id))
    const stored = JSON.parse(storedBytes.toString())
    expect(decodeVoxaPlay(storedBytes).placement).toEqual(placement)
    for (const field of ['bounds', 'hitBox', 'physics', 'project'])
      expect(stored[field]).toBeUndefined()
    expect(Object.keys(stored.model).sort()).toEqual([
      'animations',
      'meshes',
      'nodes',
      'texture',
      'version',
    ])
  })
  test('invalid anchor or origin coordinates are rejected before storage', () => {
    const envelope = JSON.parse(new TextDecoder().decode(encodeVoxaPlay('锚点模型', fixture())))
    for (const placement of [
      { origin: [0, 0] },
      { origin: [0, null, 0] },
      { origin: [0, 1e20, 0] },
    ]) {
      envelope.placement = placement
      expect(() => importPlayModel(new TextEncoder().encode(JSON.stringify(envelope)))).toThrow()
    }
    expect(listPlayModels()).toHaveLength(0)
  })
  test('valid preview bytes above the former 32MB file cap are accepted', () => {
    const encoded = encodeVoxaPlay('大预览包', fixture())
    const bytes = Buffer.concat([Buffer.alloc(33 * 1024 * 1024, ' '), encoded])
    const entry = importPlayModel(bytes)
    expect(entry.name).toBe('大预览包')
    expect(decodeVoxaPlay(fs.readFileSync(playModelFile(entry.id))).name).toBe('大预览包')
  })
  test('invalid metadata and missing default animations are rejected before import', () => {
    for (const metadata of [
      { author: 'a'.repeat(101) },
      { description: 'a'.repeat(2001) },
      { version: ' ' },
      { defaultAnimationId: 'missing' },
    ]) {
      const envelope = JSON.parse(new TextDecoder().decode(encodeVoxaPlay('模型', fixture())))
      Object.assign(envelope, metadata)
      expect(() => importPlayModel(new TextEncoder().encode(JSON.stringify(envelope)))).toThrow()
    }
    expect(listPlayModels()).toEqual([])
  })
  test('rejects engineering packages and malformed geometry before writing files', () => {
    expect(() =>
      importPlayModel(
        new TextEncoder().encode(
          JSON.stringify({ format: 'box-voxa-project', formatVersion: 1, projectData: {} }),
        ),
      ),
    ).toThrow()
    const value = JSON.parse(new TextDecoder().decode(encodeVoxaPlay('模型', fixture())))
    value.model.nodes[0].children = [0]
    expect(() => importPlayModel(new TextEncoder().encode(JSON.stringify(value)))).toThrow()
    value.model.nodes[0].children = []
    value.model.meshes[0][0].sizes = []
    expect(() => importPlayModel(new TextEncoder().encode(JSON.stringify(value)))).toThrow()
    expect(listPlayModels()).toEqual([])
  })
  test('uploads, publishes, edits, unpublishes and deletes independently of maps', () => {
    const model = importPlayModel(encodeVoxaPlay('飞船', fixture()))
    expect(model.previewUrl).toBe(`https://play.example.test/play/models/${model.id}`)
    expect(getPlayModel(model.id, true)?.name).toBe('飞船')
    expect(listPlayModels(true)).toHaveLength(1)
    updatePlayModel(model.id, {
      name: '飞船二号',
      author: '模型作者',
      version: 'v2.0.0',
      description: '旋转查看',
      published: false,
    })
    expect(getPlayModel(model.id, true)).toBeUndefined()
    expect(listPlayModels(true)).toHaveLength(0)
    expect(listPlayModels()[0].name).toBe('飞船二号')
    expect(listPlayModels()[0].author).toBe('模型作者')
    expect(listPlayModels()[0].version).toBe('v2.0.0')
    expect(() => updatePlayModel(model.id, { version: ' ' })).toThrow()
    expect(() => updatePlayModel(model.id, { author: 'a'.repeat(101) })).toThrow()
    expect(decodeVoxaPlay(fs.readFileSync(playModelFile(model.id))).model.animations).toHaveLength(
      1,
    )
    expect(() => updatePlayModel(model.id, { id: '../escape' })).toThrow()
    expect(() => deletePlayModel('../escape')).toThrow()
    updatePlayModel(model.id, { published: true })
    expect(listPlayModels(true)).toHaveLength(1)
    deletePlayModel(model.id)
    expect(listPlayModels()).toEqual([])
  })
  test('canonical upload drops fields that are unrelated to preview rendering', () => {
    const value = JSON.parse(new TextDecoder().decode(encodeVoxaPlay('模型', fixture())))
    value.project = { editableVoxels: 'must not be retained' }
    value.model.history = ['must not be retained']
    const model = importPlayModel(new TextEncoder().encode(JSON.stringify(value)))
    const stored = JSON.parse(fs.readFileSync(playModelFile(model.id), 'utf8'))
    expect(stored.project).toBeUndefined()
    expect(stored.model.history).toBeUndefined()
  })
  test('rejects script covers and invalid texture references', () => {
    const value = JSON.parse(new TextDecoder().decode(encodeVoxaPlay('模型', fixture())))
    value.previewImage = 'data:image/svg+xml,<svg onload="alert(1)"/>'
    expect(() => decodeVoxaPlay(new TextEncoder().encode(JSON.stringify(value)))).toThrow()
    delete value.previewImage
    value.model.texture.data = [999]
    expect(() => decodeVoxaPlay(new TextEncoder().encode(JSON.stringify(value)))).toThrow()
  })
})
