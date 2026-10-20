import { forEachSurface } from '../../voxa/server/authoring/surfaces'
import { allocEmptyVoxels } from '@box/utils/helper'
import crypto from 'node:crypto'
import { mat4, vec3 } from 'gl-matrix'
import {
  applyOperations,
  createProject,
  describeProject,
  readVoxels,
} from '../../voxa/server/authoring/project'
import { compileProject, poseOffsets, worldMatrices } from '../../voxa/server/authoring/compile'
import { renderProject } from '../../voxa/server/authoring/render'
import { modelBytesToSchema, bodyPartBytesToSchema } from '@box/voxa-project'

function fixture() {
  return applyOperations(createProject('model'), [
    {
      op: 'palette.set',
      colors: [
        { id: 1, rgb: [30, 60, 100] },
        { id: 2, rgb: [255, 150, 30], emissive: 100 },
      ],
    },
    { op: 'node.create', id: 'body', kind: 'bone', position: [0, 10, 0] },
    { op: 'node.create', id: 'armor', kind: 'part', bone: 'body', size: [4, 6, 8] },
    { op: 'voxel.fill', node: 'armor', min: [0, 0, 0], max: [3, 5, 7], color: 1 },
    { op: 'voxel.paint', node: 'armor', min: [0, 4, 0], max: [3, 5, 7], color: 2 },
    {
      op: 'animation.set',
      id: 'roar',
      interpolation: 'EASE_IN_OUT_SINE',
      tracks: [
        {
          node: 'body',
          frames: [
            { time: 0, rotation: [0, 0, 0] },
            { time: 1, rotation: [0, 90, 0], translation: [0, 2, 0], alpha: -0.5 },
          ],
        },
      ],
    },
  ])
}
function storage() {
  const blobs = new Map<string, Buffer>()
  return {
    blobs,
    persist: async (bytes: Buffer) => {
      const hash = crypto.createHash('sha256').update(bytes).digest('hex')
      blobs.set(hash, bytes)
      return hash
    },
  }
}

test('headless edits create independent editable parts, colors and real animation tracks', () => {
  const p = fixture()
  expect(describeProject(p).partCount).toBe(1)
  expect(readVoxels(p.voxels.armor_voxels.encodedView).getVoxel(0, 5, 7)).toBe(2)
  const pose = poseOffsets(p, { motion: 'roar', time: 0.5 }).get('body')!
  expect(pose.translation[1]).toBeCloseTo(1)
  expect(pose.alpha).toBeCloseTo(-0.25)
  const base = worldMatrices(p).worlds.get('armor')!
  expect(Array.from(vec3.transformMat4(vec3.create(), [0, 0, 0], base))).toEqual([-2, 7, -4])
})

test('failed batches do not leave partial edits or change their input', () => {
  const p = fixture(),
    before = p.nodes.armor.name
  expect(() =>
    applyOperations(p, [
      { op: 'node.transform', node: 'armor', name: 'partial' },
      { op: 'voxel.fill', node: 'missing', min: [0, 0, 0], max: [1, 1, 1], color: 1 },
    ]),
  ).toThrow()
  expect(p.nodes.armor.name).toBe(before)
})

test('node.clone copies a bone subtree, bound voxels and mirrored geometry', () => {
  const p = applyOperations(fixture(), [
    { op: 'node.clone', node: 'body', id: 'body_R', mirrorAxis: 0 },
  ])
  const clonedBone = p.nodes.body_R
  expect(clonedBone).toBeTruthy()
  expect(clonedBone.parentId).toBe('ROOT_BONE')
  expect(clonedBone.skinId).toBe('body_R_body_skin')
  const clonedPart = p.nodes.body_R_armor
  expect(clonedPart.parentId).toBe(clonedBone.skinId)
  expect(clonedPart.voxelId).toBe('body_R_armor_voxels')
  expect(p.voxels[clonedPart.voxelId]).toBeTruthy()
  expect(p.nodes.ROOT_BONE.childrenIds).toContain('body_R')
})

test.each([
  { op: 'node.create', id: 'constructor', kind: 'part' },
  { op: 'node.create', id: 'huge', kind: 'part', size: [256, 256, 256] },
  { op: 'voxel.fill', node: 'armor', min: [0, 0, 0], max: [4, 0, 0], color: 1 },
  { op: 'animation.set', id: 'invalid', tracks: [{ node: 'armor', frames: [{ time: 0 }] }] },
  { op: 'animation.set', id: 'invalid', tracks: [{ node: 'body', frames: [{ time: 1 }] }] },
  { op: 'node.transform', node: 'armor', scale: [0, 1, 1] },
])('rejects malformed or unbounded authoring input: $op', (op) => {
  expect(() => applyOperations(fixture(), [op])).toThrow()
})

test('compiles renderable model meshes, texture colors, anchored bounds and animated channels', async () => {
  const { blobs, persist } = storage(),
    p = fixture()
  const result = await compileProject(p, 'model', persist)
  expect(result.bounds).toEqual([4, 6, 8])
  expect(result.solidVoxels).toBe(192)
  const metadata = JSON.parse(blobs.get(result.modelFileHash)!.toString())
  const data = modelBytesToSchema(blobs.get(metadata.dataHash)!)!.schema
  expect(data.version).toBe(7)
  const model = data as import('@box/voxa-project').modelV7.ModelDataV7
  expect(model.meshes).toHaveLength(1)
  expect(model.texture.width).toBeGreaterThan(0)
  expect(model.animations[0].samplers.some((s) => s.interpolation === 'EASE_IN_OUT_SINE')).toBe(
    true,
  )
  expect(metadata.motionList[0].duration).toBe(1)
  expect(model.animations[0].channels.some((c) => c.target.path === 'alpha')).toBe(true)
  const worlds: mat4[] = []
  model.nodes.forEach((n, i) => {
    const parent = model.nodes.findIndex((other) => other.children.includes(i))
    const local = mat4.fromRotationTranslationScale(
      mat4.create(),
      n.rotation,
      n.translation,
      n.scale,
    )
    worlds[i] = parent < 0 ? local : mat4.multiply(mat4.create(), worlds[parent], local)
  })
  const meshNode = model.nodes.findIndex((n) => n.mesh === 0)
  expect(Array.from(vec3.transformMat4(vec3.create(), [0, 0, 0], worlds[meshNode]))).toEqual([
    0, 0, 0,
  ])
})

test('CPU rendering produces PNGs that change when the animated pose changes', async () => {
  const p = fixture()
  const base = await renderProject(p),
    animated = await renderProject(p, { motion: 'roar', time: 0.7 })
  expect(base.subarray(1, 4).toString()).toBe('PNG')
  expect(base.equals(animated)).toBe(false)
})

test('skin editing preserves canonical skeleton and emits actual per-body-part skin resources', async () => {
  const p = createProject('skin')
  const head = p.nodes[p.nodes.head.skinId]
  expect(head).toBeTruthy()
  const edited = applyOperations(p, [
    { op: 'palette.set', colors: [{ id: 200, rgb: [90, 220, 255], emissive: 30 }] },
    { op: 'voxel.paint', node: head.id, min: [0, 0, 0], max: [0, 0, 0], color: 200 },
  ])
  const { blobs, persist } = storage()
  const result = await compileProject(edited, 'skin', persist)
  const meta = JSON.parse(blobs.get(result.modelFileHash)!.toString())
  expect(meta.version).toBe(3)
  expect(meta.head).toBeTruthy()
  expect(meta.torso).toBeTruthy()
  const part = bodyPartBytesToSchema(blobs.get(meta.head)!)!
  expect(part.version).toBe(3)
  expect(part.schema.partId).toBe(3)
  expect(part.schema.meshes.length).toBeGreaterThan(0)
  expect(edited.nodes.head.position).toEqual(p.nodes.head.position)
})

test('surface merging preserves colored face coverage while reducing flat surfaces', () => {
  const view = allocEmptyVoxels(32, 32, 32)
  view.data.fill(1)
  const rectangles: import('../../voxa/server/authoring/surfaces').Surface[] = []
  for (let axis = 0; axis < 3; axis++)
    for (const sign of [-1, 1]) forEachSurface(view, axis, sign, (r) => rectangles.push(r))
  expect(rectangles).toHaveLength(24)
  expect(rectangles.reduce((area, r) => area + r.width * r.height, 0)).toBe(6 * 32 * 32)
  view.setVoxel(0, 0, 0, 2)
  const colored: import('../../voxa/server/authoring/surfaces').Surface[] = []
  for (let axis = 0; axis < 3; axis++)
    for (const sign of [-1, 1]) forEachSurface(view, axis, sign, (r) => colored.push(r))
  expect(
    colored.filter((r) => r.color === 2).reduce((area, r) => area + r.width * r.height, 0),
  ).toBe(3)
  expect(colored.reduce((area, r) => area + r.width * r.height, 0)).toBe(6 * 32 * 32)
})
