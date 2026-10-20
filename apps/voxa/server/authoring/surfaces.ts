import type { VoxelView } from '@box/utils/voxel'

export type Surface = {
  color: number
  plane: number
  u: number
  v: number
  width: number
  height: number
}

// Merge only coplanar faces of the same color. A 16-voxel tile cap keeps
// painter ordering useful where different parts intersect in the preview.
export function forEachSurface(
  view: VoxelView,
  axis: number,
  sign: number,
  emit: (surface: Surface) => void,
) {
  const axes = [0, 1, 2].filter((a) => a !== axis),
    width = view.shape[axes[0]],
    height = view.shape[axes[1]]
  const mask = new Uint16Array(width * height),
    p = [0, 0, 0]
  for (let layer = 0; layer < view.shape[axis]; layer++) {
    mask.fill(0)
    p[axis] = layer
    for (let v = 0; v < height; v++)
      for (let u = 0; u < width; u++) {
        p[axes[0]] = u
        p[axes[1]] = v
        const color = view.getVoxel(p[0], p[1], p[2])
        if (!color) continue
        p[axis] = layer + sign
        const neighbor =
          p[axis] >= 0 && p[axis] < view.shape[axis] && view.getVoxel(p[0], p[1], p[2])
        p[axis] = layer
        if (!neighbor) mask[u + width * v] = color
      }
    const active = new Map<string, Surface>()
    for (let v = 0; v <= height; v++) {
      const row = new Map<string, Surface>()
      if (v < height)
        for (let u = 0; u < width;) {
          const color = mask[u + width * v]
          let end = u + 1
          while (end < width && end - u < 16 && mask[end + width * v] === color) end++
          if (color)
            row.set(`${u}:${end}:${color}`, {
              color,
              plane: layer + (sign > 0 ? 1 : 0),
              u,
              v,
              width: end - u,
              height: 1,
            })
          u = end
        }
      for (const [key, surface] of active)
        if (!row.has(key) || surface.height === 16) {
          emit(surface)
          active.delete(key)
        }
      for (const [key, surface] of row) {
        const previous = active.get(key)
        if (previous) previous.height++
        else active.set(key, surface)
      }
    }
  }
}
