import { ModelDataV7Schema, type ModelDataV7 } from './model/schema-v7'
import { ProjectInterpolationType } from './util'

export const VOXA_PLAY_MAX_BYTES = 32 * 1024 * 1024
export type VoxaPlayMetadata = {
  author: string
  description: string
  version: string
  defaultAnimationId: string | null
}
export type VoxaPlayBundle = VoxaPlayMetadata & {
  format: 'box-voxa-play'
  formatVersion: 1
  name: string
  previewImage?: string
  model: ModelDataV7
}

function invalid(): never {
  throw new Error('模型预览包无效或超出支持的大小，请从 VOXA 重新导出 .voxaplay')
}
function record(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  return value as Record<string, any>
}
function list(value: unknown, max: number): any[] {
  if (!Array.isArray(value) || value.length > max) invalid()
  return value
}
function numbers(value: unknown, max: number, integer = false): number[] {
  const values = list(value, max)
  if (
    values.some(
      (x) =>
        typeof x !== 'number' ||
        !Number.isFinite(x) ||
        Math.abs(x) > (integer ? 0xffffffff : 1e9) ||
        (integer && (!Number.isInteger(x) || x < 0)),
    )
  )
    invalid()
  return values
}
function vector(value: unknown, length: number) {
  if (numbers(value, length).length !== length) invalid()
}

/** The portable preview contains only renderer data, with no scripts or external resources. */
export function decodeVoxaPlay(bytes: Uint8Array): VoxaPlayBundle {
  if (!bytes.byteLength || bytes.byteLength > VOXA_PLAY_MAX_BYTES) invalid()
  let value: Record<string, any>
  try {
    value = record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
  } catch {
    return invalid()
  }
  if (
    value.format !== 'box-voxa-play' ||
    value.formatVersion !== 1 ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    value.name.length > 100
  )
    invalid()
  const author = value.author === undefined ? '' : value.author
  const description = value.description === undefined ? '' : value.description
  const version = value.version === undefined ? 'v1.0.0' : value.version
  const defaultAnimationId =
    value.defaultAnimationId === undefined ? null : value.defaultAnimationId
  if (
    typeof author !== 'string' ||
    author.length > 100 ||
    typeof description !== 'string' ||
    description.length > 2000 ||
    typeof version !== 'string' ||
    !version.trim() ||
    version.length > 50 ||
    (defaultAnimationId !== null &&
      (typeof defaultAnimationId !== 'string' || defaultAnimationId.length > 100))
  )
    invalid()
  if (
    value.previewImage !== undefined &&
    (typeof value.previewImage !== 'string' ||
      value.previewImage.length > 1500000 ||
      !/^data:image\/(?:jpeg;base64,\/9j\/|png;base64,iVBORw0KGgo)[A-Za-z0-9+/]*={0,2}$/.test(
        value.previewImage,
      ))
  )
    invalid()
  const model = record(value.model)
  if (model.version !== 7) invalid()
  const nodes = list(model.nodes, 1024),
    meshes = list(model.meshes, 1024)
  if (!nodes.length || !meshes.length) invalid()
  const texture = record(model.texture)
  const palette = numbers(texture.palette, 65536, true)
  if (!palette.length || palette.some((x) => x > 0xffffffff)) invalid()
  const data = numbers(texture.data, 4 * 1024 * 1024, true)
  if (
    !Number.isInteger(texture.width) ||
    texture.width < 1 ||
    texture.width > 4096 ||
    !data.length ||
    data.length % texture.width ||
    data.length / texture.width > 4096 ||
    data.some((x) => x >= palette.length)
  )
    invalid()
  let quadCount = 0
  const meshQuads = meshes.map((mesh) => {
    if (list(mesh, 6).length !== 6) invalid()
    let count = 0
    for (const input of mesh) {
      const face = record(input)
      const vertices = numbers(face.vertices, 300000, true)
      const sizes = numbers(face.sizes, 200000, true)
      const uvs = numbers(face.uvs, 400000, true)
      const flags = numbers(face.uvFlags, 50000, true)
      const quads = vertices.length / 3
      if (
        !Number.isInteger(quads) ||
        sizes.length !== quads * 2 ||
        uvs.length !== quads * 4 ||
        flags.length !== Math.ceil(quads / 2) ||
        flags.some((x) => x > 119 || (x & 15) > 7 || x >> 4 > 7) ||
        vertices.some((x) => x > 65535) ||
        sizes.some((x) => x < 1 || x > 65535)
      )
        invalid()
      for (let i = 0; i < uvs.length; i++)
        if (uvs[i] > (i % 2 ? data.length / texture.width : texture.width)) invalid()
      count += quads
    }
    quadCount += count
    if (quadCount > 100000) invalid()
    return count
  })
  const parents = new Set<number>()
  let renderedQuads = 0
  nodes.forEach((input, index) => {
    const node = record(input)
    if (
      !Number.isInteger(node.mesh) ||
      node.mesh < -1 ||
      node.mesh >= meshes.length ||
      typeof node.alpha !== 'number' ||
      !Number.isFinite(node.alpha) ||
      node.alpha < 0 ||
      node.alpha > 1
    )
      invalid()
    vector(node.rotation, 4)
    vector(node.translation, 3)
    vector(node.scale, 3)
    vector(node.parentScaleMat3, 9)
    for (const child of numbers(node.children, 1024, true)) {
      if (child <= index || child >= nodes.length || parents.has(child)) invalid()
      parents.add(child)
    }
    renderedQuads += node.mesh < 0 ? 0 : meshQuads[node.mesh]
  })
  if (!quadCount || renderedQuads > 300000 || !renderedQuads) invalid()
  let keyframes = 0
  for (const input of list(model.animations, 256)) {
    const animation = record(input)
    if (
      typeof animation.id !== 'string' ||
      animation.id.length > 100 ||
      typeof animation.name !== 'string' ||
      animation.name.length > 100
    )
      invalid()
    const samplers = list(animation.samplers, 4096)
    for (const input of samplers) {
      const sampler = record(input),
        times = numbers(sampler.input, 100000)
      keyframes += times.length
      if (
        keyframes > 200000 ||
        times.some((x, i) => x < 0 || x > 86400000 || (i > 0 && x < times[i - 1])) ||
        !Object.values(ProjectInterpolationType).includes(sampler.interpolation)
      )
        invalid()
      const output = record(sampler.output)
      if (!['translation', 'rotation', 'scale', 'alpha'].includes(output.type)) invalid()
      const values = list(output.data, times.length)
      if (values.length !== times.length) invalid()
      for (const value of values) {
        if (output.type === 'alpha') {
          if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)
            invalid()
        } else vector(value, output.type === 'rotation' ? 4 : 3)
      }
    }
    for (const input of list(animation.channels, 4096)) {
      const channel = record(input),
        target = record(channel.target)
      if (
        !Number.isInteger(channel.sampler) ||
        !samplers[channel.sampler] ||
        !Number.isInteger(target.node) ||
        !nodes[target.node] ||
        samplers[channel.sampler].output.type !== target.path
      )
        invalid()
    }
  }
  if (
    defaultAnimationId !== null &&
    model.animations.filter((animation: { id: string }) => animation.id === defaultAnimationId)
      .length !== 1
  )
    invalid()
  return {
    format: 'box-voxa-play',
    formatVersion: 1,
    name: value.name.trim(),
    author: author.trim(),
    description: description.trim(),
    version: version.trim(),
    defaultAnimationId,
    ...(value.previewImage ? { previewImage: value.previewImage } : {}),
    model: ModelDataV7Schema.fromJSON(model),
  }
}

export function encodeVoxaPlay(
  name: string,
  model: ModelDataV7,
  previewImage?: string,
  metadata: Partial<VoxaPlayMetadata> = {},
): Uint8Array {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      format: 'box-voxa-play',
      formatVersion: 1,
      name: name.trim().slice(0, 100) || '未命名模型',
      ...(metadata.author !== undefined ? { author: metadata.author } : {}),
      ...(metadata.description !== undefined ? { description: metadata.description } : {}),
      ...(metadata.version !== undefined ? { version: metadata.version } : {}),
      ...(metadata.defaultAnimationId !== undefined
        ? { defaultAnimationId: metadata.defaultAnimationId }
        : {}),
      ...(previewImage ? { previewImage } : {}),
      model: ModelDataV7Schema.toJSON(model),
    }),
  )
  decodeVoxaPlay(bytes)
  return bytes
}

export function voxaPlayFileName(name: string) {
  return `${
    name
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
      .trim()
      .slice(0, 100) || '未命名模型'
  }.voxaplay`
}
