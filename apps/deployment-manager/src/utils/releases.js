export function parseVersion(value) {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[\w.-]+)?$/.exec(String(value))
  if (!match) throw new Error('版本信息格式无效')
  return match.slice(1).map(Number)
}

export function isNewerVersion(latest, current) {
  const a = parseVersion(latest), b = parseVersion(current)
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

export function validateRelease(value) {
  if (value?.schemaVersion !== 1) throw new Error('更新清单格式无效')
  parseVersion(value.version)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !Number.isFinite(Date.parse(value.date)) || new Date(value.date).toISOString().slice(0, 10) !== value.date) throw new Error('更新日期无效')
  if (typeof value.summary !== 'string' || !Array.isArray(value.sections) || value.sections.length > 30) throw new Error('更新日志无效')
  for (const section of value.sections) {
    if (typeof section.title !== 'string' || !Array.isArray(section.items) || section.items.length > 100 || section.items.some(item => typeof item !== 'string')) throw new Error('更新日志无效')
  }
  return value
}
