import { mat3, vec3 } from 'gl-matrix'
import sharp from 'sharp'
import { ProjectNodeType as T } from '@box/voxa-project'
import { check, type Project, type Node } from './project'
import { nodeView, parentId, worldMatrices, type Pose } from './compile'
import type { VoxelView } from '@box/utils/voxel'
import { forEachSurface } from './surfaces'

sharp.cache(false)
sharp.concurrency(1)

export type RenderOptions = {
  width?: number
  height?: number
  view?: string
}

export type RenderSheetOptions = RenderOptions & {
  views?: string[]
}

type Basis = {
  u: [number, number, number]
  v: [number, number, number]
  d: [number, number, number]
}

type WorldFace = {
  points: number[][]
  color: string
  alpha: number
  light: boolean
}

type ProjectedFace = WorldFace & {
  projected: number[][]
  depth: number
}

const FACE_SPECS = [
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

const VIEW_ANGLES: Record<string, { azimuth: number; elevation: number }> = {
  default: { azimuth: 50, elevation: 25 },
  front: { azimuth: 90, elevation: 20 },
  back: { azimuth: -90, elevation: 20 },
  left: { azimuth: 180, elevation: 20 },
  right: { azimuth: 0, elevation: 20 },
  top: { azimuth: 90, elevation: 75 },
}

function basis(view = 'default'): Basis {
  const angles = VIEW_ANGLES[view]
  check(angles, `不支持的预览视角：${view}`)
  const azimuth = (angles.azimuth * Math.PI) / 180
  const elevation = (angles.elevation * Math.PI) / 180
  const u: [number, number, number] = [
    Math.sin(azimuth),
    0,
    -Math.cos(azimuth),
  ]
  const d: [number, number, number] = [
    Math.cos(elevation) * Math.cos(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.sin(azimuth),
  ]
  const v: [number, number, number] = [
    d[1] * u[2] - d[2] * u[1],
    d[2] * u[0] - d[0] * u[2],
    d[0] * u[1] - d[1] * u[0],
  ]
  return { u, v, d }
}

function dot(a: ArrayLike<number>, b: ArrayLike<number>) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function buildFaces(project: Project, pose: Pose) {
  const { worlds, offsets } = worldMatrices(project, pose)
  const cache = new Map<string, VoxelView>()
  const palette = new Map(project.palette.items.map((p) => [p.id, p]))
  const faces: WorldFace[] = []
  const alphaOf = (n: Node) => {
    let alpha = 1
    let current: Node | undefined = n
    const seen = new Set<string>()
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      alpha *= Math.max(
        0,
        Math.min(
          1,
          current.alpha + (offsets.get(current.id)?.alpha ?? 0),
        ),
      )
      current = project.nodes[parentId(current)]
    }
    return alpha
  }
  for (const n of Object.values(project.nodes)) {
    if (n.type !== T.SkinPart) continue
    const alpha = alphaOf(n)
    if (alpha < 0.01) continue
    const view = nodeView(project, n, cache)
    const matrix = worlds.get(n.id)!
    const normalMatrix = mat3.normalFromMat4(mat3.create(), matrix)!
    const visible = FACE_SPECS.map((face) => {
      const normal = vec3.normalize(
        vec3.create(),
        vec3.transformMat3(vec3.create(), face.normal as vec3, normalMatrix),
      )
      return {
        ...face,
        visible:
          dot(normal, [0.567, 0.417, 0.68]) > 0.001,
        shade:
          0.57 +
          0.43 * Math.max(0, dot(normal, [0.25, 0.85, 0.45])),
      }
    }).filter((face) => face.visible)
    for (const face of visible) {
      const axis = face.normal.findIndex((v) => v !== 0)
      const sign = face.normal[axis]
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
          Math.round(
            Math.min(
              255,
              c * (item.material.emissive ? 1 : face.shade),
            ),
          ),
        )
        faces.push({
          points: world.map((p) => Array.from(p)),
          color: `rgb(${color})`,
          alpha,
          light: item.material.emissive > 0,
        })
        check(
          faces.length <= 100_000,
          '预览表面过于复杂，请简化模型后重试',
        )
      })
    }
  }
  return faces
}

function projectFaces(faces: WorldFace[], view: Basis): ProjectedFace[] {
  return faces
    .map((face) => {
      const projected = face.points.map((point) => [
        dot(point, view.u),
        -dot(point, view.v),
      ])
      return {
        ...face,
        projected,
        depth:
          face.points.reduce((sum, point) => sum + dot(point, view.d), 0) /
          4,
      }
    })
    .sort((a, b) => a.depth - b.depth)
}

function frameBounds(frames: ProjectedFace[][]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const frame of frames) {
    for (const face of frame) {
      for (const point of face.projected) {
        minX = Math.min(minX, point[0])
        minY = Math.min(minY, point[1])
        maxX = Math.max(maxX, point[0])
        maxY = Math.max(maxY, point[1])
      }
    }
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  }
  return { minX, minY, maxX, maxY }
}

function svgFrame(
  faces: ProjectedFace[],
  bounds: ReturnType<typeof frameBounds>,
  width: number,
  height: number,
) {
  const scale = Math.min(
    (width - 100) / Math.max(1, bounds.maxX - bounds.minX),
    (height - 100) / Math.max(1, bounds.maxY - bounds.minY),
  )
  const ox =
    width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale
  const oy =
    height / 2 - ((bounds.minY + bounds.maxY) / 2) * scale
  const polygons = faces
    .map(
      (face) =>
        `<polygon points="${face.projected
          .map(
            (point) =>
              `${(point[0] * scale + ox).toFixed(2)},${(
                point[1] * scale +
                oy
              ).toFixed(2)}`,
          )
          .join(' ')}" fill="${face.color}" opacity="${face.alpha.toFixed(
          3,
        )}" stroke="${face.color}" stroke-width="0.35"/>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><radialGradient id="bg"><stop stop-color="#1b2943"/><stop offset="1" stop-color="#080d17"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/>${polygons}</svg>`
}

export async function renderProjectSheet(
  project: Project,
  poses: Pose[],
  options: RenderSheetOptions = {},
) {
  const width = options.width ?? 1200
  const height = options.height ?? 1000
  check(
    Number.isInteger(width) &&
      Number.isInteger(height) &&
      width >= 128 &&
      width <= 1200 &&
      height >= 64 &&
      height <= 1200,
    '预览尺寸需要 128–1200 的整数像素',
  )
  check(Array.isArray(poses) && poses.length > 0 && poses.length <= 120,
    '每批需要 1–120 个姿态')
  const views = options.views?.length
    ? options.views
    : [options.view ?? 'default']
  check(views.length <= 6, '每批最多 6 个视角')
  const worldFaces = poses.map((pose) => buildFaces(project, pose))
  const frames: {
    view: string
    index: number
    buffer: Buffer
  }[] = []
  for (const name of views) {
    const direction = basis(name)
    const projected = worldFaces.map((faces) =>
      projectFaces(faces, direction),
    )
    const bounds = frameBounds(projected)
    for (let index = 0; index < projected.length; index++) {
      frames.push({
        view: name,
        index,
        buffer: await sharp(
          Buffer.from(svgFrame(projected[index], bounds, width, height)),
        )
          .png()
          .toBuffer(),
      })
    }
  }
  return { width, height, views, frames }
}

export async function renderProject(
  project: Project,
  pose: Pose = {},
  options: RenderOptions = {},
) {
  const result = await renderProjectSheet(project, [pose], options)
  return result.frames[0].buffer
}
