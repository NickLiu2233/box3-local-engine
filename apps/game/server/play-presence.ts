const PRESENCE_TTL_MS = 75_000

const presenceByMap = new Map<string, Map<string, number>>()

function clearExpired(now = Date.now()) {
  for (const [mapId, players] of presenceByMap) {
    for (const [playerId, expiresAt] of players) {
      if (expiresAt <= now) players.delete(playerId)
    }
    if (!players.size) presenceByMap.delete(mapId)
  }
}

export function touchPlayPresence(mapId: string, playerId: string) {
  clearExpired()
  const players = presenceByMap.get(mapId) || new Map<string, number>()
  players.set(playerId, Date.now() + PRESENCE_TTL_MS)
  presenceByMap.set(mapId, players)
}

export function removePlayPresence(mapId: string, playerId: string) {
  const players = presenceByMap.get(mapId)
  if (!players) return
  players.delete(playerId)
  if (!players.size) presenceByMap.delete(mapId)
}

export function getPlayPresenceCounts(
  mapIds: string[],
  groupByMap: Record<string, string> = {},
) {
  clearExpired()
  const requestedGroups = new Map(mapIds.map((mapId) => [mapId, groupByMap[mapId] || mapId]))
  const requestedGroupIds = new Set(requestedGroups.values())
  const playersByGroup = new Map<string, Set<string>>()
  for (const [mapId, players] of presenceByMap) {
    const groupId = groupByMap[mapId] || mapId
    if (!requestedGroupIds.has(groupId)) continue
    const groupPlayers = playersByGroup.get(groupId) || new Set<string>()
    for (const playerId of players.keys()) groupPlayers.add(playerId)
    playersByGroup.set(groupId, groupPlayers)
  }
  return Object.fromEntries(
    mapIds.map((mapId) => [
      mapId,
      { onlineCount: playersByGroup.get(requestedGroups.get(mapId) || mapId)?.size || 0 },
    ]),
  )
}
