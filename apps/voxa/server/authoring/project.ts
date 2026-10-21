import { mat3, mat4, quat, vec3 } from 'gl-matrix'
import { MuReadStream, MuWriteStream } from '@box/mudb/stream'
import { allocEmptyVoxels } from '@box/utils/helper'
import { restoreVoxels, storeVoxels, VoxelView } from '@box/utils/voxel'
import {
  migrateProject,
  projectSchemaToBytes,
  projectV5,
  projectV10 as P,
  ProjectNodeType as T,
  ProjectInterpolationType,
  Vec3Schema,
  Vec4Schema,
} from '@box/voxa-project'
import avatar from '../../src/models/project/avatar.json'

export type Project = typeof P.ProjectDataV10Schema.identity
export type Node = typeof P.NodeSchema.identity
export type Operation = { op: string; [key: string]: unknown }
export type Kind = 'model' | 'skin'
const ROOTS = new Set(['ROOT', 'ROOT_BONE', 'ROOT_SKIN'])
export const MAX_VOXELS = 8_000_000

export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
export function vector(value: unknown, label: string): [number, number, number] {
  const size = 3
  check(
    Array.isArray(value) &&
      value.length === size &&
      value.every((v) => typeof v === 'number' && Number.isFinite(v)),
    `${label} 需要 ${size} 个有限数值`,
  )
  return value as [number, number, number]
}
export function identifier(value: unknown): string {
  check(
    typeof value === 'string' &&
      /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value) &&
      !['constructor', 'prototype', '__proto__'].includes(value),
    'ID 需要以英文字母开头，使用字母、数字、下划线或连字符，最长 64 字符',
  )
  return value
}
/**
 * Existing skin templates can contain IDs beginning with a digit. New IDs are
 * still constrained by identifier(), while references must accept every ID
 * that can legally exist in an imported project.
 */
export function referenceIdentifier(value: unknown): string {
  check(
    typeof value === 'string' &&
      /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value) &&
      !['constructor', 'prototype', '__proto__'].includes(value),
    '节点引用 ID 无效',
  )
  return value
}
export function rotation(value: unknown) {
  const e = vector(value, 'rotation')
  return quat.fromEuler(quat.create(), e[0], e[1], e[2])
}
export function readVoxels(encoded: number[]) {
  check(encoded.length >= 12, '体素数据不完整')
  const header = Buffer.from(encoded.slice(0, 12))
  const size = [header.readInt32LE(0), header.readInt32LE(4), header.readInt32LE(8)]
  check(
    size.every((n) => Number.isInteger(n) && n > 0 && n <= 256) &&
      size.reduce((a, b) => a * b, 1) <= 2_000_000,
    '体素尺寸超过限制',
  )
  return restoreVoxels(new MuReadStream(Uint8Array.from(encoded))).voxels
}
export function encode(view: VoxelView) {
  const stream = new MuWriteStream(12)
  try {
    storeVoxels(view, stream, !view.data.some(Boolean))
    return Array.from(stream.bytes())
  } finally {
    stream.destroy()
  }
}
function makeNode(id: string, type: T, parentId = ''): Node {
  const node = P.NodeSchema.alloc()
  Object.assign(node, {
    id,
    type,
    name: id,
    parentId,
    scale: new Float32Array([1, 1, 1]),
    quaternion: quat.create(),
    parentScaleMat3: mat3.create(),
  })
  return node
}
export function createProject(kind: Kind): Project {
  if (kind === 'skin') {
    const project = migrateProject(
      projectSchemaToBytes(projectV5.ProjectDataV5Schema.fromJSON(avatar)),
    )
    check(project, '无法载入标准皮肤模板')
    return project
  }
  const project = P.ProjectDataV10Schema.alloc()
  project.nodes.ROOT = makeNode('ROOT', T.Root)
  project.nodes.ROOT_BONE = makeNode('ROOT_BONE', T.Bone, 'ROOT')
  project.nodes.ROOT_SKIN = makeNode('ROOT_SKIN', T.Group, 'ROOT')
  project.nodes.ROOT.childrenIds = ['ROOT_BONE', 'ROOT_SKIN']
  const color = P.PaletteItemSchema.alloc()
  color.id = 1
  color.rgb.set([100, 150, 190])
  color.hsv.set([210, 47, 75])
  project.palette = {
    items: [color],
    groups: { default: { id: 'default', name: 'Palette', itemIds: [1] } },
    groupList: ['default'],
  }
  return project
}
export function applyOperations(input: Project, operations: unknown): Project {
  check(Array.isArray(operations) && operations.length <= 8192, 'operations 需要数组，最多 8192 步')
  // Work on an independent copy; any invalid step leaves the stored project untouched.
  const project = P.ProjectDataV10Schema.clone(input)
  // Older empty projects may contain zeroed root scales. They compile into a
  // singular world matrix and fail during CPU preview normal calculation.
  // Normalize legacy transform fields before applying new authoring steps.
  for (const current of Object.values(project.nodes)) {
    if (!current.scale || !Array.from(current.scale).every((value) => Number.isFinite(value) && value > 0))
      current.scale = Vec3Schema.fromJSON([1, 1, 1])
    if (!current.parentScaleMat3 || Math.abs(mat3.determinant(current.parentScaleMat3)) < 1e-8)
      current.parentScaleMat3 = mat3.create() as typeof current.parentScaleMat3
  }
  const views = new Map<string, VoxelView>()
  const node = (id: unknown) => {
    const n = project.nodes[referenceIdentifier(id)]
    check(n, `节点不存在：${id}`)
    return n
  }
  const getView = (id: unknown) => {
    const n = node(id)
    check(n.type === T.SkinPart && project.voxels[n.voxelId], '体素操作的 node 必须是部件 ID')
    if (!views.has(n.voxelId))
      views.set(n.voxelId, readVoxels(project.voxels[n.voxelId].encodedView))
    return views.get(n.voxelId)!
  }
  let volume = Object.values(project.voxels).reduce((sum, v) => {
    const b = Buffer.from(v.encodedView.slice(0, 12))
    check(b.length === 12, '体素头损坏')
    return sum + b.readInt32LE(0) * b.readInt32LE(4) * b.readInt32LE(8)
  }, 0)
  check(volume <= MAX_VOXELS, '工程体素总尺寸超过限制')
  for (const raw of operations) {
    check(raw && typeof raw === 'object' && !Array.isArray(raw), '每一步需要操作对象')
    const op = raw as Operation
    if (op.op === 'project.reset') {
      check(op.kind === 'model' || op.kind === 'skin', 'project.reset 的 kind 需要 model 或 skin')
      const fresh = createProject(op.kind)
      project.nodes = fresh.nodes
      project.voxels = fresh.voxels
      project.palette = fresh.palette
      project.animations = fresh.animations
      project.hitBox = fresh.hitBox
      project.modelPivot = fresh.modelPivot
      views.clear()
      volume = 0
    } else if (op.op === 'palette.set') {
      check(
        Array.isArray(op.colors) && op.colors.length > 0 && op.colors.length <= 255,
        'colors 需要 1–255 个颜色',
      )
      const seen = new Set<number>()
      for (const c of op.colors) {
        check(
          c && Number.isInteger(c.id) && c.id >= 1 && c.id <= 255 && !seen.has(c.id),
          '颜色 ID 需要唯一的 1–255 整数',
        )
        seen.add(c.id)
        const rgb = vector(c.rgb, 'rgb')
        check(
          rgb.every((v) => Number.isInteger(v) && v >= 0 && v <= 255),
          'RGB 分量需要 0–255 整数',
        )
        const emissive = c.emissive ?? 0
        check(
          Number.isFinite(emissive) && emissive >= 0 && emissive <= 255,
          'emissive 范围为 0–255',
        )
        const item = P.PaletteItemSchema.alloc()
        item.id = c.id
        item.rgb.set(rgb)
        item.material.emissive = emissive
        const max = Math.max(...rgb) / 255,
          min = Math.min(...rgb) / 255,
          delta = max - min
        const hue = !delta
          ? 0
          : ((rgb.indexOf(max * 255) === 0
              ? (rgb[1] - rgb[2]) / 255 / delta
              : rgb.indexOf(max * 255) === 1
                ? 2 + (rgb[2] - rgb[0]) / 255 / delta
                : 4 + (rgb[0] - rgb[1]) / 255 / delta) *
              60 +
              360) %
            360
        item.hsv.set([
          Math.round(hue),
          Math.round(max ? (delta / max) * 100 : 0),
          Math.round(max * 100),
        ])
        const index = project.palette.items.findIndex((p) => p.id === item.id)
        if (index < 0) project.palette.items.push(item)
        else project.palette.items[index] = item
      }
      const ids = project.palette.items.map((p) => p.id)
      project.palette.groups = { default: { id: 'default', name: 'Palette', itemIds: ids } }
      project.palette.groupList = ['default']
    } else if (op.op === 'node.create') {
      const id = identifier(op.id)
      check(!project.nodes[id], `节点 ID 已存在：${id}`)
      check(['bone', 'group', 'part'].includes(String(op.kind)), 'kind 需要 bone、group 或 part')
      const type = op.kind === 'bone' ? T.Bone : op.kind === 'group' ? T.Group : T.SkinPart
      let parent = op.parent ?? (type === T.Bone ? 'ROOT_BONE' : 'ROOT_SKIN')
      if (op.bone !== undefined) {
        const bone = node(op.bone)
        check(
          bone.type === T.Bone && bone.id !== 'ROOT_BONE' && bone.skinId,
          'bone 需要带绑定组的骨骼 ID',
        )
        parent = bone.skinId
      }
      const owner = node(parent)
      check(
        type === T.Bone ? owner.type === T.Bone : owner.type === T.Group,
        '骨骼只能挂在骨骼下，部件/组只能挂在组下',
      )
      const n = makeNode(id, type, owner.id)
      n.name = String(op.name ?? id).slice(0, 64)
      project.nodes[id] = n
      owner.childrenIds.push(id)
      if (type === T.Bone) {
        const skinId = identifier(`${id}_skin`)
        check(!project.nodes[skinId], `绑定组 ID 已存在：${skinId}`)
        const skin = makeNode(skinId, T.Group)
        skin.boneId = id
        n.skinId = skinId
        project.nodes[skinId] = skin
      }
      if (type === T.SkinPart) {
        const size = vector(op.size ?? [16, 16, 16], 'size')
        check(
          size.every((n) => Number.isInteger(n) && n > 0 && n <= 256) &&
            size.reduce((a, b) => a * b, 1) <= 2_000_000,
          'size 每轴需要 1–256 整数，单部件不超过 200 万格',
        )
        volume += size.reduce((a, b) => a * b, 1)
        check(volume <= MAX_VOXELS, '工程体素总尺寸超过限制')
        n.voxelId = `${id}_voxels`
        check(!project.voxels[n.voxelId], '体素 ID 已存在')
        n.pivot.set(size.map((n) => -n / 2))
        const view = allocEmptyVoxels(size[0], size[1], size[2])
        views.set(n.voxelId, view)
        project.voxels[n.voxelId] = { id: n.voxelId, dimension: 3, encodedView: encode(view) }
      }
      for (const key of ['position', 'rotation', 'scale', 'pivot'])
        if (op[key] !== undefined) transform(n, { [key]: op[key] })
    } else if (op.op === 'node.clone') {
      const source = node(op.node)
      check(!ROOTS.has(source.id), '系统根节点不能复制')
      const rootId = identifier(op.id)
      check(!project.nodes[rootId], `节点 ID 已存在：${rootId}`)
      const mirrorAxis = op.mirrorAxis === undefined ? undefined : Number(op.mirrorAxis)
      check(mirrorAxis === undefined || [0, 1, 2].includes(mirrorAxis), 'mirrorAxis 需要 0、1 或 2')
      const explicitMap = op.idMap && typeof op.idMap === 'object' && !Array.isArray(op.idMap)
        ? op.idMap as Record<string, unknown>
        : {}
      const sourceIds = new Set<string>()
      const pending = [source.id]
      while (pending.length) {
        const current = pending.pop()!
        if (sourceIds.has(current)) continue
        sourceIds.add(current)
        for (const candidate of Object.values(project.nodes)) {
          if (candidate.parentId === current || candidate.boneId === current) pending.push(candidate.id)
        }
      }
      const idMap = new Map<string, string>([[source.id, rootId]])
      for (const oldId of sourceIds) {
        if (oldId === source.id) continue
        const requested = explicitMap[oldId]
        const nextId = requested === undefined ? `${rootId}_${oldId}` : identifier(requested)
        check(!idMap.has(oldId), `复制 ID 重复：${oldId}`)
        check(!project.nodes[nextId] && ![...idMap.values()].includes(nextId), `复制目标 ID 已存在：${nextId}`)
        idMap.set(oldId, nextId)
      }
      const parentId = op.parent === undefined
        ? source.parentId
        : referenceIdentifier(op.parent)
      const owner = node(parentId)
      check(owner.type === T.Bone || owner.type === T.Group || owner.type === T.Root, '复制目标父节点无效')
      const cloned = new Map<string, Node>()
      for (const oldId of sourceIds) {
        const original = project.nodes[oldId]
        const copy = P.NodeSchema.clone(original)
        const newId = idMap.get(oldId)!
        copy.id = newId
        copy.name = oldId === source.id ? String(op.name ?? original.name).slice(0, 64) : original.name
        copy.parentId = oldId === source.id ? parentId : idMap.get(original.parentId) || original.parentId
        copy.childrenIds = original.childrenIds.filter(child => idMap.has(child)).map(child => idMap.get(child)!)
        copy.boneId = original.boneId ? idMap.get(original.boneId) || original.boneId : ''
        copy.skinId = original.skinId ? idMap.get(original.skinId) || original.skinId : ''
        if (original.voxelId) {
          const voxel = project.voxels[original.voxelId]
          check(voxel, `体素不存在：${original.voxelId}`)
          const voxelId = `${newId}_voxels`
          const view = readVoxels(voxel.encodedView)
          if (mirrorAxis !== undefined) {
            const sourceData = view.data.slice()
            for (let z = 0; z < view.shape[2]; z++)
              for (let y = 0; y < view.shape[1]; y++)
                for (let x = 0; x < view.shape[0]; x++) {
                  const mirrored = [x, y, z]
                  mirrored[mirrorAxis] = view.shape[mirrorAxis] - 1 - mirrored[mirrorAxis]
                  view.setVoxel(x, y, z, sourceData[view.index(mirrored[0], mirrored[1], mirrored[2])])
                }
            copy.flip[mirrorAxis] = copy.flip[mirrorAxis] ? 0 : 1
          }
          copy.voxelId = voxelId
          project.voxels[voxelId] = { id: voxelId, dimension: voxel.dimension, encodedView: encode(view) }
        }
        if (mirrorAxis !== undefined) {
          const position = Array.from(copy.position)
          position[mirrorAxis] = -position[mirrorAxis]
          copy.position.set(position)
          const euler = Array.from(copy.euler)
          for (const axis of [0, 1, 2]) if (axis !== mirrorAxis) euler[axis] = -euler[axis]
          copy.euler.set(euler)
          copy.quaternion.set(rotation(euler))
        }
        cloned.set(oldId, copy)
      }
      for (const copy of cloned.values()) project.nodes[copy.id] = copy
      owner.childrenIds.push(rootId)
    } else if (op.op === 'node.group') {
      const id = identifier(op.id)
      check(!project.nodes[id], `节点 ID 已存在：${id}`)
      check(
        !(op.bone !== undefined && op.parent !== undefined),
        'node.group 不能同时指定 bone 和 parent',
      )
      const requested = Array.isArray(op.nodes)
        ? op.nodes.map(referenceIdentifier)
        : []
      check(
        requested.length <= 128,
        'node.group 最多编组 128 个节点',
      )
      check(
        new Set(requested).size === requested.length,
        'node.group 的 nodes 不能重复',
      )
      const bone =
        op.bone === undefined ? undefined : node(op.bone)
      if (bone) {
        check(
          bone.type === T.Bone && bone.id !== 'ROOT_BONE' && bone.skinId,
          'node.group 的 bone 需要可绑定骨骼',
        )
        const binding = bone.skinId ? project.nodes[bone.skinId] : undefined
        if (binding?.type === T.Group && binding.childrenIds.length) {
          for (const childId of binding.childrenIds) {
            if (!requested.includes(childId)) requested.push(childId)
          }
        } else if (binding && !requested.includes(binding.id)) {
          requested.push(binding.id)
        }
      }
      check(
        requested.length > 0,
        'node.group 的 nodes 需要至少一个部件或组',
      )
      const children = [...new Set(requested)]
      const childNodes = children.map(node)
      check(
        childNodes.every(
          (child) => child.type === T.SkinPart || child.type === T.Group,
        ),
        'node.group 只能编组部件或组',
      )
      const parent =
        !bone && op.parent !== undefined
          ? node(referenceIdentifier(op.parent))
          : undefined
      if (parent) check(parent.type === T.Group, 'node.group 的父节点必须是组')
      if (!bone && !parent) {
        const commonParent = childNodes[0].parentId
        check(
          commonParent &&
            childNodes.every((child) => child.parentId === commonParent),
          'node.group 未指定 bone/parent 时，子节点必须属于同一父节点',
        )
      }
      const local = (current: Node) => {
        if (ROOTS.has(current.id)) return mat4.create()
        const pivot = vec3.multiply(vec3.create(), current.pivot, current.scale)
        vec3.transformQuat(pivot, pivot, current.quaternion)
        vec3.add(pivot, pivot, current.position)
        return mat4.fromRotationTranslationScale(
          mat4.create(),
          current.quaternion,
          pivot,
          current.scale,
        )
      }
      const worlds = new Map<string, mat4>()
      const visiting = new Set<string>()
      const world = (current: Node): mat4 => {
        const cached = worlds.get(current.id)
        if (cached) return cached
        check(!visiting.has(current.id), '节点层级存在循环')
        visiting.add(current.id)
        const matrix = local(current)
        const ownerId = current.parentId || current.boneId
        if (ownerId) {
          check(project.nodes[ownerId], `父节点不存在：${ownerId}`)
          mat4.multiply(matrix, world(project.nodes[ownerId]), matrix)
        }
        worlds.set(current.id, matrix)
        visiting.delete(current.id)
        return matrix
      }
      const previousWorlds = new Map(
        childNodes.map((child) => [child.id, mat4.clone(world(child))]),
      )
      const group = makeNode(id, T.Group, parent?.id || '')
      group.name = String(op.name ?? id).slice(0, 64)
      group.childrenIds = children
      project.nodes[id] = group
      if (bone) {
        group.boneId = bone.id
        bone.skinId = id
      } else if (parent) {
        parent.childrenIds.push(id)
      } else {
        const owner = node(childNodes[0].parentId)
        group.parentId = owner.id
        owner.childrenIds.push(id)
      }
      for (const current of Object.values(project.nodes)) {
        if (current.id !== id) {
          current.childrenIds = current.childrenIds.filter(
            (childId) => !children.includes(childId),
          )
        }
      }
      const groupWorld = world(group)
      const inverseGroup = mat4.invert(mat4.create(), groupWorld)
      check(inverseGroup, '编组父级矩阵无效')
      for (const child of childNodes) {
        const target = mat4.multiply(
          mat4.create(),
          inverseGroup,
          previousWorlds.get(child.id)!,
        )
        const scale = mat4.getScaling(vec3.create(), target)
        const quaternion = mat4.getRotation(quat.create(), target)
        const translation = mat4.getTranslation(vec3.create(), target)
        const pivot = vec3.multiply(vec3.create(), child.pivot, scale)
        vec3.transformQuat(pivot, pivot, quaternion)
        vec3.subtract(translation, translation, pivot)
        child.position.set(translation)
        child.quaternion.set(quaternion)
        const rotationMatrix = mat3.fromQuat(mat3.create(), quaternion)
        const r31 = rotationMatrix[2]
        let theta: number
        let psi: number
        let phi: number
        if (r31 !== 1 && r31 !== -1) {
          theta = -Math.asin(r31)
          const cosTheta = Math.cos(theta)
          psi = Math.atan2(
            rotationMatrix[5] / cosTheta,
            rotationMatrix[8] / cosTheta,
          )
          phi = Math.atan2(
            rotationMatrix[1] / cosTheta,
            rotationMatrix[0] / cosTheta,
          )
        } else {
          phi = 0
          if (r31 === -1) {
            theta = Math.PI / 2
            psi = phi + Math.atan2(rotationMatrix[0], rotationMatrix[6])
          } else {
            theta = -Math.PI / 2
            psi = -phi + Math.atan2(-rotationMatrix[0], -rotationMatrix[6])
          }
        }
        child.euler.set([
          (psi * 180) / Math.PI,
          (theta * 180) / Math.PI,
          (phi * 180) / Math.PI,
        ])
        child.scale.set(scale)
        child.parentScaleMat3 = mat3.create() as typeof child.parentScaleMat3
        child.parentId = id
        child.boneId = ''
      }
    } else if (op.op === 'node.transform') {
      const n = node(op.node)
      check(!ROOTS.has(n.id), '系统根节点不能变换')
      transform(n, op)
    } else if (['voxel.fill', 'voxel.paint', 'voxel.erase', 'voxel.mirror'].includes(op.op)) {
      const view = getView(op.node)
      if (op.op === 'voxel.mirror') {
        const axis = Number(op.axis)
        check([0, 1, 2].includes(axis), 'axis 需要 0、1 或 2')
        const source = view.data.slice()
        for (let z = 0; z < view.shape[2]; z++)
          for (let y = 0; y < view.shape[1]; y++)
            for (let x = 0; x < view.shape[0]; x++) {
              const p = [x, y, z]
              p[axis] = view.shape[axis] - 1 - p[axis]
              view.setVoxel(x, y, z, source[view.index(p[0], p[1], p[2])])
            }
      } else {
        const min = vector(op.min, 'min'),
          max = vector(op.max, 'max')
        check(
          min.every(
            (n, i) =>
              Number.isInteger(n) &&
              Number.isInteger(max[i]) &&
              n >= 0 &&
              max[i] >= n &&
              max[i] < view.shape[i],
          ),
          '填充区域需要位于部件尺寸内，min/max 均包含边界',
        )
        const color = op.op === 'voxel.erase' ? 0 : Number(op.color)
        check(
          Number.isInteger(color) &&
            (color === 0 || project.palette.items.some((p) => p.id === color)),
          'color 需要已定义的色板 ID，0 为空',
        )
        for (let z = min[2]; z <= max[2]; z++)
          for (let y = min[1]; y <= max[1]; y++)
            for (let x = min[0]; x <= max[0]; x++) {
              if (op.op !== 'voxel.paint' || view.getVoxel(x, y, z)) view.setVoxel(x, y, z, color)
            }
      }
    } else if (op.op === 'animation.set') {
      const id = identifier(op.id)
      check(
        Array.isArray(op.tracks) && op.tracks.length > 0 && op.tracks.length <= 128,
        'tracks 需要骨骼轨道数组',
      )
      const animation = P.ProjectAnimationSchema.alloc()
      animation.id = id
      animation.name = String(op.name ?? id).slice(0, 64)
      for (const track of op.tracks) {
        const bone = node(track.node)
        check(bone.type === T.Bone && bone.id !== 'ROOT_BONE', '动画轨道需要可动画骨骼')
        check(
          !animation.nodes[bone.id] &&
            Array.isArray(track.frames) &&
            track.frames.length > 0 &&
            track.frames.length <= 3601,
          '轨道不能重复，frames 需要 1–3601 帧',
        )
        const times = new Set<number>()
        const keyframeList = track.frames
          .map((frame: Record<string, unknown>) => {
            check(
              frame &&
                Number.isFinite(frame.time) &&
                Number(frame.time) >= 0 &&
                Number(frame.time) <= 60 &&
                !times.has(Number(frame.time)),
              '关键帧时间需要唯一的 0–60 秒数值',
            )
            times.add(Number(frame.time))
            const interpolation = frame.interpolation ?? op.interpolation ?? 'LINEAR'
            check(
              Object.values(ProjectInterpolationType).includes(
                interpolation as ProjectInterpolationType,
              ),
              '不支持的 interpolation',
            )
            const k = P.KeyframeSchema.alloc()
            k.offset = {
              translation: Vec3Schema.fromJSON([0, 0, 0]),
              rotation: Vec4Schema.fromJSON([0, 0, 0, 1]),
              scale: Vec3Schema.fromJSON([1, 1, 1]),
              alpha: 0,
            }
            k.time = String(frame.time)
            k.interpolation = interpolation as ProjectInterpolationType
            if (frame.translation !== undefined)
              k.offset.translation = Vec3Schema.fromJSON(vector(frame.translation, 'translation'))
            if (frame.rotation !== undefined)
              k.offset.rotation = Vec4Schema.fromJSON(
                Array.from(rotation(frame.rotation)) as [number, number, number, number],
              )
            if (frame.scale !== undefined) {
              const v = vector(frame.scale, 'scale')
              check(
                v.every((n) => n > 0 && n <= 100),
                '动画 scale 需要大于 0 且不超过 100',
              )
              k.offset.scale = Vec3Schema.fromJSON(v)
            }
            if (frame.alpha !== undefined) {
              check(
                Number.isFinite(frame.alpha) &&
                  Number(frame.alpha) >= -1 &&
                  Number(frame.alpha) <= 1,
                'alpha 为 -1–1 的透明度偏移',
              )
              k.offset.alpha = Number(frame.alpha)
            }
            return k
          })
          .sort((a: { time: string }, b: { time: string }) => Number(a.time) - Number(b.time))
        check(times.has(0), '每条动画轨道必须含 0 秒帧')
        animation.nodes[bone.id] = { nodeId: bone.id, keyframeList }
      }
      const i = project.animations.findIndex((a) => a.id === id)
      if (i < 0) {
        check(project.animations.length < 64, '动作数量超过 64')
        project.animations.push(animation)
      } else project.animations[i] = animation
    } else if (op.op === 'collision.set') {
      check(op.mode === 'default' || op.mode === 'custom', '碰撞模式需要 default 或 custom')
      project.hitBox.mode = op.mode === 'custom' ? 1 : 0
      if (op.mode === 'custom') {
        const size = vector(op.size, 'size')
        check(
          size.every((v) => v > 0),
          '碰撞尺寸需要大于 0',
        )
        project.hitBox.customBox = {
          position: Vec3Schema.fromJSON(vector(op.position, 'position')),
          size: Vec3Schema.fromJSON(size),
        }
      } else project.hitBox.customBox = undefined
    } else throw new Error(`未知操作：${op.op}`)
  }
  check(
    Object.values(project.nodes).filter((n) => n.type === T.SkinPart).length <= 128,
    '部件数超过 128',
  )
  for (const [id, view] of views) project.voxels[id].encodedView = encode(view)
  return project
}
function transform(n: Node, op: Record<string, unknown>) {
  if (op.name !== undefined) {
    check(typeof op.name === 'string' && op.name.trim(), 'name 不能为空')
    n.name = op.name.slice(0, 64)
  }
  for (const key of ['position', 'scale', 'pivot'] as const)
    if (op[key] !== undefined) {
      const values = vector(op[key], key)
      check(
        values.every((v) => Math.abs(v) <= 10000),
        '变换数值超出范围',
      )
      if (key === 'scale')
        check(
          values.every((v) => v > 0 && v <= 100),
          'scale 需要大于 0 且不超过 100',
        )
      n[key].set(values)
    }
  if (op.rotation !== undefined) {
    n.euler.set(vector(op.rotation, 'rotation'))
    n.quaternion.set(rotation(op.rotation))
  }
}
export function describeProject(project: Project) {
  return {
    partCount: Object.values(project.nodes).filter((n) => n.type === T.SkinPart).length,
    palette: project.palette.items.map((p) => ({
      id: p.id,
      rgb: Array.from(p.rgb),
      emissive: p.material.emissive,
    })),
    nodes: Object.values(project.nodes).map((n) => ({
      id: n.id,
      name: n.name,
      type: ['root', 'part', 'group', 'bone'][n.type],
      parent: n.parentId,
      bone: n.boneId,
      skin: n.skinId,
      voxelId: n.voxelId,
      position: Array.from(n.position),
      rotation: Array.from(n.euler),
      scale: Array.from(n.scale),
      pivot: Array.from(n.pivot),
      alpha: n.alpha,
      size:
        n.voxelId && project.voxels[n.voxelId]
          ? [0, 4, 8].map((offset) =>
              Buffer.from(project.voxels[n.voxelId].encodedView.slice(0, 12)).readInt32LE(offset),
            )
          : undefined,
    })),
    animations: project.animations.map((a) => ({
      id: a.id,
      name: a.name,
      duration: Math.max(
        0,
        ...Object.values(a.nodes).flatMap((n) => n.keyframeList.map((k) => Number(k.time))),
      ),
      tracks: Object.keys(a.nodes),
    })),
    hitBox: project.hitBox,
  }
}
