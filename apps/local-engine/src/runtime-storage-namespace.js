'use strict'

function identityPart(value) {
  const normalized = String(value || '').trim()
  return normalized && normalized !== '0' ? normalized : ''
}

function resolveMapRuntimeNamespace({ mapUuid, mapId, prefix = '' }) {
  const identity = identityPart(mapUuid) || identityPart(mapId)
  return `${prefix}${identity || 'isolated-standalone'}`
}

function resolveGroupRuntimeNamespace({
  mapGroupUuid,
  mapGroupId,
  mainProjectId,
  mapUuid,
  mapId,
}) {
  return (
    identityPart(mapGroupUuid) ||
    identityPart(mapGroupId) ||
    identityPart(mainProjectId) ||
    identityPart(mapUuid) ||
    identityPart(mapId) ||
    'isolated-standalone'
  )
}

module.exports = {
  resolveMapRuntimeNamespace,
  resolveGroupRuntimeNamespace,
}
