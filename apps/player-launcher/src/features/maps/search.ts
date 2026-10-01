import type { PlayWorld } from '../../types'

export function filterWorlds(worlds: PlayWorld[], query = ''): PlayWorld[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return worlds.filter((world) => {
    const text = [world.name, world.author, world.description].join(' ').toLocaleLowerCase()
    return terms.every((term) => text.includes(term))
  })
}
