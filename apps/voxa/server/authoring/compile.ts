import { mat3, mat4, quat, vec3 } from 'gl-matrix'
import { Mesher } from '@box/mesher'
import { allocEmptyVoxels } from '@box/utils/helper'
import { VoxelView } from '@box/utils/voxel'
import { BodyPart, BODY_PART_DEFAULT_SCALE } from '@box/schema/player/player-schema'
import {
  bodyPartSchemaToBytes,
  modelSchemaToBytes,
  modelV7 as M,
  skinV3,
  ProjectNodeType as T,
  calcEasing,
  SamplerSchema,
  ChannelNodePath,
} from '@box/voxa-project'
import { check, readVoxels, type Project, type Node, type Kind } from './project'

export type Persist = (bytes: Buffer, contentType?: string) => Promise<string>
export type Pose = { motion?: string; time?: number }
export function parentId(n: Node) {
  return n.parentId || n.boneId
}
function root(n: Node) {
  return ['ROOT', 'ROOT_BONE', 'ROOT_SKIN'].includes(n.id)
}
export function localMatrix(
  n: Node,
  offset?: {
    translation?: ArrayLike<number>
    rotation?: ArrayLike<number>
    scale?: ArrayLike<number>
  },
) {
  const pivot = vec3.multiply(vec3.create(), n.pivot, n.scale)
  vec3.transformQuat(pivot, pivot, n.quaternion)
  vec3.add(pivot, pivot, n.position)
  const local = root(n)
    ? mat4.create()
    : mat4.fromRotationTranslationScale(mat4.create(), n.quaternion, pivot, n.scale)
  if (offset)
    mat4.multiply(
      local,
      local,
      mat4.fromRotationTranslationScale(
        mat4.create(),
        (offset.rotation as quat) || quat.create(),
        (offset.translation as vec3) || vec3.create(),
        (offset.scale as vec3) || vec3.fromValues(1, 1, 1),
      ),
    )
  return local
}
export function poseOffsets(project: Project, pose: Pose) {
  const offsets = new Map<
    string,
    { translation: vec3; rotation: quat; scale: vec3; alpha: number }
  >()
  if (!pose.motion) return offsets
  const animation = project.animations.find((a) => a.id === pose.motion)
  check(animation, '动画不存在')
  const time = pose.time ?? 0
  check(Number.isFinite(time) && time >= 0 && time <= 60, '预览时间需要在 0–60 秒之间')
  for (const track of Object.values(animation.nodes)) {
    const frames = track.keyframeList
    let i = 0
    while (i + 1 < frames.length && Number(frames[i + 1].time) <= time) i++
    const a = frames[i],
      b = frames[Math.min(i + 1, frames.length - 1)]
    const weight =
      a === b
        ? 0
        : calcEasing(
            a.interpolation,
            Math.max(0, Math.min(1, (time - Number(a.time)) / (Number(b.time) - Number(a.time)))),
          )
    const translation = vec3.lerp(
      vec3.create(),
      a.offset.translation || [0, 0, 0],
      b.offset.translation || [0, 0, 0],
      weight,
    )
    const rotation = quat.slerp(
      quat.create(),
      a.offset.rotation || [0, 0, 0, 1],
      b.offset.rotation || [0, 0, 0, 1],
      weight,
    )
    const scale = vec3.lerp(
      vec3.create(),
      a.offset.scale || [1, 1, 1],
      b.offset.scale || [1, 1, 1],
      weight,
    )
    offsets.set(track.nodeId, {
      translation,
      rotation,
      scale,
      alpha: (a.offset.alpha ?? 0) * (1 - weight) + (b.offset.alpha ?? 0) * weight,
    })
  }
  return offsets
}
export function worldMatrices(project: Project, pose: Pose = {}) {
  const offsets = poseOffsets(project, pose),
    worlds = new Map<string, mat4>(),
    visiting = new Set<string>()
  const visit = (n: Node): mat4 => {
    if (worlds.has(n.id)) return worlds.get(n.id)!
    check(!visiting.has(n.id), '节点层级存在循环')
    visiting.add(n.id)
    const local = localMatrix(n, offsets.get(n.id))
    const psm = mat4.fromValues(
      n.parentScaleMat3[0],
      n.parentScaleMat3[1],
      n.parentScaleMat3[2],
      0,
      n.parentScaleMat3[3],
      n.parentScaleMat3[4],
      n.parentScaleMat3[5],
      0,
      n.parentScaleMat3[6],
      n.parentScaleMat3[7],
      n.parentScaleMat3[8],
      0,
      0,
      0,
      0,
      1,
    )
    mat4.multiply(local, psm, local)
    const parent = parentId(n)
    if (parent) {
      check(project.nodes[parent], `父节点不存在：${parent}`)
      mat4.multiply(local, visit(project.nodes[parent]), local)
    }
    worlds.set(n.id, local)
    visiting.delete(n.id)
    return local
  }
  Object.values(project.nodes).forEach(visit)
  return { worlds, offsets }
}
export function nodeView(project: Project, n: Node, cache: Map<string, VoxelView>) {
  const key = `${n.voxelId}:${Array.from(n.flip)}`
  if (cache.has(key)) return cache.get(key)!
  const voxel = project.voxels[n.voxelId]
  check(voxel, `体素资源不存在：${n.voxelId}`)
  let view = readVoxels(voxel.encodedView)
  if (n.flip.some(Boolean)) {
    const source = view,
      target = allocEmptyVoxels(...source.shape)
    for (let z = 0; z < source.shape[2]; z++)
      for (let y = 0; y < source.shape[1]; y++)
        for (let x = 0; x < source.shape[0]; x++)
          target.setVoxel(
            x,
            y,
            z,
            source.getVoxel(
              n.flip[0] ? source.shape[0] - x - 1 : x,
              n.flip[1] ? source.shape[1] - y - 1 : y,
              n.flip[2] ? source.shape[2] - z - 1 : z,
            ),
          )
    view = target
  }
  cache.set(key, view)
  return view
}
function texturePalette(project: Project) {
  const length = Math.max(1, ...project.palette.items.map((i) => i.id)) + 1
  const colors: [number, number, number][] = Array.from({ length }, () => [0, 0, 0])
  const emissive = Array(length).fill(0)
  project.palette.items.forEach((p) => {
    colors[p.id] = [p.rgb[0], p.rgb[1], p.rgb[2]]
    emissive[p.id] = p.material.emissive
  })
  return { colors, emissive }
}
function geometry(project: Project, selected: Node[], worlds: Map<string, mat4>) {
  const mesher = new Mesher(true, true, false),
    cache = new Map<string, VoxelView>(),
    meshIds = new Map<string, number>()
  const lo = vec3.fromValues(Infinity, Infinity, Infinity),
    hi = vec3.fromValues(-Infinity, -Infinity, -Infinity)
  let solid = 0
  for (const n of selected) {
    if (n.type !== T.SkinPart) continue
    const view = nodeView(project, n, cache)
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity]
    for (let z = 0; z < view.shape[2]; z++)
      for (let y = 0; y < view.shape[1]; y++)
        for (let x = 0; x < view.shape[0]; x++)
          if (view.getVoxel(x, y, z)) {
            solid++
            min[0] = Math.min(min[0], x)
            min[1] = Math.min(min[1], y)
            min[2] = Math.min(min[2], z)
            max[0] = Math.max(max[0], x + 1)
            max[1] = Math.max(max[1], y + 1)
            max[2] = Math.max(max[2], z + 1)
          }
    if (!Number.isFinite(min[0])) continue
    for (let corner = 0; corner < 8; corner++) {
      const p = vec3.transformMat4(
        vec3.create(),
        [corner & 1 ? max[0] : min[0], corner & 2 ? max[1] : min[1], corner & 4 ? max[2] : min[2]],
        worlds.get(n.id)!,
      )
      vec3.min(lo, lo, p)
      vec3.max(hi, hi, p)
    }
    const key = `${n.voxelId}:${Array.from(n.flip)}`
    if (!meshIds.has(key)) {
      meshIds.set(key, mesher.models.length)
      mesher.addModel(view, project.voxels[n.voxelId].dimension)
    }
  }
  if (!solid) {
    vec3.set(lo, 0, 0, 0)
    vec3.set(hi, 0, 0, 0)
  }
  return { mesher, meshIds, lo, hi, solid }
}
function modelNodes(
  selected: Node[],
  meshIds: Map<string, number>,
  origin: vec3,
  detachedRoot?: string,
) {
  const nodes: typeof M.ModelNodesSchema.identity = [],
    indexes = new Map<string, number>(),
    selectedIds = new Set(selected.map((n) => n.id))
  const pending = [...selected]
  while (pending.length) {
    const i = pending.findIndex(
      (n) => !selectedIds.has(parentId(n)) || indexes.has(parentId(n)) || n.id === detachedRoot,
    )
    check(i >= 0, '节点层级存在循环')
    const n = pending.splice(i, 1)[0]
    const out = M.ModelNodeSchema.alloc(),
      local = localMatrix(n)
    mat4.getTranslation(out.translation, local)
    mat4.getRotation(out.rotation, local)
    mat4.getScaling(out.scale, local)
    out.parentScaleMat3.set(n.parentScaleMat3)
    const parent = parentId(n),
      p = indexes.get(parent)
    if (p !== undefined && n.id !== detachedRoot) nodes[p].children.push(nodes.length)
    if ((!root(n) && ['ROOT', 'ROOT_BONE', 'ROOT_SKIN'].includes(parent)) || n.id === detachedRoot)
      vec3.subtract(out.translation, out.translation, origin)
    out.alpha = n.alpha
    out.mesh = meshIds.get(`${n.voxelId}:${Array.from(n.flip)}`) ?? -1
    indexes.set(n.id, nodes.length)
    nodes.push(out)
  }
  return { nodes, indexes }
}
function addAnimations(
  project: Project,
  nodes: typeof M.ModelNodesSchema.identity,
  indexes: Map<string, number>,
  origin: vec3,
) {
  const animations: typeof M.ModelDataV7Schema.identity.animations = []
  const motionList: { id: string; name: string; duration: number }[] = []
  for (const source of project.animations) {
    const animation = M.AnimationSchema.alloc()
    animation.id = source.id
    animation.name = source.name
    let duration = 0
    for (const track of Object.values(source.nodes)) {
      const bone = project.nodes[track.nodeId],
        target = indexes.get(track.nodeId)
      check(bone && target !== undefined, '动画包含不存在的骨骼')
      const frames = track.keyframeList
      duration = Math.max(duration, ...frames.map((k) => Number(k.time)))
      const values = frames.map((k) => {
        const matrix = localMatrix(bone, k.offset)
        if (['ROOT', 'ROOT_BONE', 'ROOT_SKIN'].includes(parentId(bone))) {
          matrix[12] -= origin[0]
          matrix[13] -= origin[1]
          matrix[14] -= origin[2]
        }
        return {
          translation: mat4.getTranslation(vec3.create(), matrix),
          rotation: mat4.getRotation(quat.create(), matrix),
          scale: mat4.getScaling(vec3.create(), matrix),
          alpha: Math.max(0, Math.min(1, bone.alpha + (k.offset.alpha ?? 0))),
        }
      })
      for (const path of ['translation', 'rotation', 'scale', 'alpha'] as const) {
        const targets =
          path === 'alpha'
            ? [...indexes.entries()]
                .filter(([id]) => {
                  let n: Node | undefined = project.nodes[id]
                  const seen = new Set<string>()
                  while (n && !seen.has(n.id)) {
                    if (n.id === bone.skinId) return true
                    seen.add(n.id)
                    n = project.nodes[n.parentId]
                  }
                  return false
                })
                .filter(([id]) => project.nodes[id].type === T.SkinPart)
                .map(([, idx]) => idx)
            : [target]
        // Keep a shared endpoint when interpolation changes so every interval has both samples.
        let start = 0
        while (start < frames.length) {
          let end = Math.min(start + 1, frames.length - 1)
          while (
            end < frames.length - 1 &&
            frames[end].interpolation === frames[start].interpolation
          )
            end++
          const sampler = SamplerSchema.alloc()
          sampler.interpolation = frames[start].interpolation
          sampler.input = frames.slice(start, end + 1).map((k) => Number(k.time))
          sampler.output = {
            type: path,
            data: values.slice(start, end + 1).map((v) => v[path]),
          } as typeof sampler.output
          const idx = animation.samplers.length
          animation.samplers.push(sampler)
          targets.forEach((node) =>
            animation.channels.push({
              sampler: idx,
              target: { node, path: path as ChannelNodePath },
            }),
          )
          if (end === frames.length - 1) break
          start = end
        }
      }
    }
    animations.push(animation)
    motionList.push({ id: source.id, name: source.name, duration })
  }
  return { animations, motionList }
}
export async function compileProject(project: Project, kind: Kind, persist: Persist) {
  const selected = Object.values(project.nodes),
    { worlds } = worldMatrices(project),
    geometryData = geometry(project, selected, worlds)
  const { mesher, meshIds, lo, hi, solid } = geometryData,
    { colors, emissive } = texturePalette(project)
  const { nodes, indexes } = modelNodes(selected, meshIds, lo)
  const compiled = M.ModelDataV7Schema.alloc()
  compiled.nodes = nodes
  compiled.meshes = mesher.models.length ? mesher.getMeshes() : []
  if (mesher.models.length) compiled.texture = await mesher.getTexture(colors, emissive)
  const { animations, motionList } = addAnimations(project, nodes, indexes, lo)
  compiled.animations = animations
  const dataHash = await persist(
    Buffer.from(modelSchemaToBytes(compiled)),
    'application/octet-stream',
  )
  const bounds = Array.from(vec3.subtract(vec3.create(), hi, lo)),
    center = vec3.scale(vec3.create(), vec3.add(vec3.create(), lo, hi), 0.5)
  const metadata: Record<string, unknown> = {
    version: 7,
    dataHash,
    bounds,
    motionList,
    renderBoxOffset: Array.from(
      vec3.subtract(vec3.create(), center, project.modelPivot || [0, 0, 0]),
    ),
    useCustomBounds: project.hitBox.mode === 1,
  }
  if (project.hitBox.mode === 1 && project.hitBox.customBox)
    metadata.customBounds = {
      size: Array.from(project.hitBox.customBox.size),
      offset: Array.from(
        vec3.subtract(
          vec3.create(),
          project.hitBox.customBox.position,
          project.modelPivot || [0, 0, 0],
        ),
      ),
    }
  let modelFileHash: string
  if (kind === 'skin') {
    const skin: Record<string, string | number> = { version: 3 }
    for (const name of Object.keys(BodyPart).filter((k) => !/^\d+$/.test(k))) {
      const bone = project.nodes[name]
      if (!bone?.skinId) continue
      const included = new Set<string>()
      const visit = (id: string) => {
        check(!included.has(id), '皮肤层级存在循环')
        included.add(id)
        project.nodes[id]?.childrenIds.forEach(visit)
      }
      visit(bone.skinId)
      const parts = selected.filter((n) => included.has(n.id))
      const localWorlds = worldMatrices({
        ...project,
        nodes: Object.fromEntries(
          parts.map((n) => [
            n.id,
            { ...n, boneId: '', parentId: included.has(n.parentId) ? n.parentId : '' },
          ]),
        ),
      }).worlds
      const geo = geometry(project, parts, localWorlds)
      const part = skinV3.BodyPartDataV3Schema.alloc()
      part.partId = BodyPart[name as keyof typeof BodyPart]
      const result = modelNodes(parts, geo.meshIds, vec3.create(), bone.skinId)
      part.nodes = result.nodes
      part.bounds.set(vec3.subtract(vec3.create(), geo.hi, geo.lo))
      if (part.nodes[0]) {
        const first = part.nodes[0]
        const scale = vec3.scale(vec3.create(), first.scale, BODY_PART_DEFAULT_SCALE),
          translation = vec3.scale(vec3.create(), first.translation, BODY_PART_DEFAULT_SCALE)
        mat4.fromRotationTranslationScale(part.bindMat, first.rotation, translation, scale)
        const psm = mat4.fromValues(
          first.parentScaleMat3[0],
          first.parentScaleMat3[1],
          first.parentScaleMat3[2],
          0,
          first.parentScaleMat3[3],
          first.parentScaleMat3[4],
          first.parentScaleMat3[5],
          0,
          first.parentScaleMat3[6],
          first.parentScaleMat3[7],
          first.parentScaleMat3[8],
          0,
          0,
          0,
          0,
          1,
        )
        mat4.multiply(part.bindMat, psm, part.bindMat)
        first.rotation.set([0, 0, 0, 1])
        first.translation.set([0, 0, 0])
        first.scale.set([1, 1, 1])
        first.parentScaleMat3.set(mat3.create())
      }
      part.meshes = geo.mesher.models.length ? geo.mesher.getMeshes() : []
      if (geo.mesher.models.length) part.texture = await geo.mesher.getTexture(colors, emissive)
      skin[name] = await persist(
        Buffer.from(bodyPartSchemaToBytes(part)),
        'application/octet-stream',
      )
    }
    modelFileHash = await persist(Buffer.from(JSON.stringify(skin)), 'application/json')
  } else modelFileHash = await persist(Buffer.from(JSON.stringify(metadata)), 'application/json')
  return {
    modelFileHash,
    modelDataHash: dataHash,
    bounds,
    solidVoxels: solid,
    meshCount: compiled.meshes.length,
    motionList,
  }
}
