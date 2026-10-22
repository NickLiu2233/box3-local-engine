import { vec3 } from 'gl-matrix'

/** VOXA direction-indicator geometry: four narrow bars just beyond the positive Z edge. */
export function directionIndicatorVertices() {
  const scale = 80,
    maxZ = 160,
    centerX = 0
  const margin1 = scale / 9,
    margin2 = scale / 10,
    diff = scale / 16,
    radius = scale / 450
  const vertices = [
    vec3.fromValues(centerX, 0, maxZ + margin1),
    vec3.fromValues(centerX - diff, 0, maxZ + margin2),
    vec3.fromValues(centerX, 0, maxZ + margin1 + diff),
    vec3.fromValues(centerX + diff, 0, maxZ + margin2),
  ]
  const values: number[] = []
  for (let edge = 0; edge < vertices.length; edge++) {
    const a = vertices[edge],
      b = vertices[(edge + 1) % vertices.length]
    const axis = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), b, a))
    const side = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), axis, [0, 1, 0]))
    const up = vec3.cross(vec3.create(), axis, side)
    const point = (center: vec3, angle: number) => {
      const value = vec3.scaleAndAdd(vec3.create(), center, side, Math.cos(angle) * radius)
      return vec3.scaleAndAdd(value, value, up, Math.sin(angle) * radius)
    }
    for (let face = 0; face < 4; face++) {
      const angle = (face * Math.PI) / 2,
        next = ((face + 1) * Math.PI) / 2
      const p0 = point(a, angle),
        p1 = point(b, angle),
        p2 = point(a, next),
        p3 = point(b, next)
      for (const p of [p0, p1, p2, p2, p1, p3]) values.push(p[0], p[1], p[2])
    }
  }
  return new Float32Array(values)
}
