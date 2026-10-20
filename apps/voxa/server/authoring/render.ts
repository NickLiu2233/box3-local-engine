import { mat3, vec3 } from 'gl-matrix'
import sharp from 'sharp'
import { ProjectNodeType as T } from '@box/voxa-project'
import { check, type Project, type Node } from './project'
import { nodeView, parentId, worldMatrices, type Pose } from './compile'
import type { VoxelView } from '@box/utils/voxel'
import { forEachSurface } from './surfaces'

sharp.cache(false)
sharp.concurrency(1)

// A CPU preview from the actual editable voxels. No browser or WebGL process.
export async function renderProject(project: Project, pose: Pose = {}) {
  const { worlds, offsets } = worldMatrices(project, pose),
    cache = new Map<string, VoxelView>()
  const palette = new Map(project.palette.items.map((p) => [p.id, p]))
  const faces: {
    points: number[][]
    depth: number
    color: string
    alpha: number
    light: boolean
  }[] = []
  const U = [0.768, 0, -0.64],
    V = [-0.299, 0.886, -0.359],
    D = [0.567, 0.417, 0.68]
  const dot = (a: ArrayLike<number>, b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const specs = [
    {
      normal: [1, 0, 0],
      points: [
        [1, 0, 0],
        [1, 1, 0],
        [1, 1, 1],
        [1, 0, 1],
      ],
    },
    {
      normal: [-1, 0, 0],
      points: [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
        [0, 0, 0],
      ],
    },
    {
      normal: [0, 1, 0],
      points: [
        [0, 1, 0],
        [0, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
      ],
    },
    {
      normal: [0, -1, 0],
      points: [
        [0, 0, 1],
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
      ],
    },
    {
      normal: [0, 0, 1],
      points: [
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1],
        [0, 0, 1],
      ],
    },
    {
      normal: [0, 0, -1],
      points: [
        [0, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
        [1, 0, 0],
      ],
    },
  ]
  const alphaOf = (n: Node) => {
    let alpha = 1,
      current: Node | undefined = n
    const seen = new Set<string>()
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      alpha *= Math.max(0, Math.min(1, current.alpha + (offsets.get(current.id)?.alpha ?? 0)))
      current = project.nodes[parentId(current)]
    }
    return alpha
  }
  for (const n of Object.values(project.nodes)) {
    if (n.type !== T.SkinPart) continue
    const alpha = alphaOf(n)
    if (alpha < 0.01) continue
    const view = nodeView(project, n, cache),
      matrix = worlds.get(n.id)!,
      normalMatrix = mat3.normalFromMat4(mat3.create(), matrix)!
    const visible = specs
      .map((s) => {
        const normal = vec3.normalize(
          vec3.create(),
          vec3.transformMat3(vec3.create(), s.normal as vec3, normalMatrix),
        )
        return {
          ...s,
          visible: dot(normal, D) > 0.001,
          shade: 0.57 + 0.43 * Math.max(0, dot(normal, [0.25, 0.85, 0.45])),
        }
      })
      .filter((s) => s.visible)
    for (const face of visible) {
      const axis = face.normal.findIndex((v) => v !== 0),
        sign = face.normal[axis]
      const axes = [0, 1, 2].filter((a) => a !== axis)
      forEachSurface(view, axis, sign, (surface) => {
        const item = palette.get(surface.color)
        check(item, `体素引用未定义的颜色：${surface.color}`)
        const points = [
          [surface.u, surface.v],
          [surface.u + surface.width, surface.v],
          [surface.u + surface.width, surface.v + surface.height],
          [surface.u, surface.v + surface.height],
        ]
        const world = points.map(([u, v]) => {
          const p = [0, 0, 0]
          p[axis] = surface.plane
          p[axes[0]] = u
          p[axes[1]] = v
          return vec3.transformMat4(vec3.create(), p as vec3, matrix)
        })
        const color = Array.from(item.rgb).map((c) =>
          Math.round(Math.min(255, c * (item.material.emissive ? 1 : face.shade))),
        )
        faces.push({
          points: world.map((p) => [dot(p, U), -dot(p, V)]),
          depth: world.reduce((sum, p) => sum + dot(p, D), 0) / 4,
          color: `rgb(${color})`,
          alpha,
          light: item.material.emissive > 0,
        })
        check(faces.length <= 100_000, '预览表面过于复杂，请简化模型后重试')
      })
    }
  }

  faces.sort((a, b) => a.depth - b.depth)
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  faces.forEach((f) =>
    f.points.forEach((p) => {
      minX = Math.min(minX, p[0])
      minY = Math.min(minY, p[1])
      maxX = Math.max(maxX, p[0])
      maxY = Math.max(maxY, p[1])
    }),
  )
  if (!faces.length) {
    minX = 0
    minY = 0
    maxX = 1
    maxY = 1
  }
  const width = 1200,
    height = 1000,
    scale = Math.min(
      (width - 100) / Math.max(1, maxX - minX),
      (height - 100) / Math.max(1, maxY - minY),
    )
  const ox = width / 2 - ((minX + maxX) / 2) * scale,
    oy = height / 2 - ((minY + maxY) / 2) * scale
  const polygons = faces
    .map(
      (f) =>
        `<polygon points="${f.points.map((p) => `${(p[0] * scale + ox).toFixed(2)},${(p[1] * scale + oy).toFixed(2)}`).join(' ')}" fill="${f.color}" opacity="${f.alpha.toFixed(3)}" stroke="${f.color}" stroke-width="0.35"/>`,
    )
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><radialGradient id="bg"><stop stop-color="#1b2943"/><stop offset="1" stop-color="#080d17"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/>${polygons}</svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}
