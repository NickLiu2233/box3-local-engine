import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
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
    expect(Object.keys(envelope).sort()).toEqual(['format', 'formatVersion', 'model', 'name'])
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
  test('legacy preview packages receive metadata defaults and a static initial pose', () => {
    const envelope = JSON.parse(new TextDecoder().decode(encodeVoxaPlay('旧模型', fixture())))
    for (const field of ['author', 'description', 'version', 'defaultAnimationId'])
      delete envelope[field]
    const entry = importPlayModel(new TextEncoder().encode(JSON.stringify(envelope)))
    expect(entry).toMatchObject({ author: '', description: '', version: 'v1.0.0' })
    expect(decodeVoxaPlay(fs.readFileSync(playModelFile(entry.id))).defaultAnimationId).toBeNull()
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
