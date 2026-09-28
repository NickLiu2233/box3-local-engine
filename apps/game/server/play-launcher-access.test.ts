import fs from 'fs'
import os from 'os'
import path from 'path'

import { afterEach, describe, expect, test } from '@jest/globals'

import {
  getPlayLauncherAccessSettings,
  getPlayerLauncherWorlds,
  updatePlayLauncherAccessSettings,
} from './play-launcher-access'

let root = ''

function addWorld(id: string, mapRole: 'main' | 'submap', playEnabled: boolean) {
  const dataRoot = path.join(root, id, 'data')
  const permissionHash = `permission-${id}`
  fs.mkdirSync(path.join(dataRoot, 'blobs'), { recursive: true })
  fs.writeFileSync(path.join(root, id, 'manifest.json'), JSON.stringify({
    id,
    permanentMapId: `permanent-${id}`,
    publicId: id,
    projectName: id,
    version: 'v1',
    permissionHash,
    mapGroupId: 'main-map',
    mapRole,
    mainProjectId: 'main-map',
    playEnabled,
  }))
  fs.writeFileSync(path.join(dataRoot, 'project-state.json'), JSON.stringify({ permissionHash }))
}

afterEach(() => {
  delete process.env.BOX_PLAY_LIBRARY_PATH
  if (root) fs.rmSync(root, { recursive: true, force: true })
  root = ''
})

describe('Play launcher resource access', () => {
  test('defaults closed and persists an independent server-wide switch', () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-launcher-access-'))
    process.env.BOX_PLAY_LIBRARY_PATH = root

    expect(getPlayLauncherAccessSettings()).toEqual({ enabled: false })
    const updated = updatePlayLauncherAccessSettings(true)
    expect(updated.enabled).toBe(true)
    expect(getPlayLauncherAccessSettings()).toEqual(updated)
    expect(fs.existsSync(path.join(root, 'player-launcher-access.json'))).toBe(true)
  })

  test('rejects non-boolean switch values', () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-launcher-access-'))
    process.env.BOX_PLAY_LIBRARY_PATH = root
    expect(() => updatePlayLauncherAccessSettings('true')).toThrow('enabled 必须是布尔值')
  })

  test('launcher discovery only includes playable top-level maps', () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-launcher-access-'))
    process.env.BOX_PLAY_LIBRARY_PATH = root
    addWorld('main-map', 'main', true)
    addWorld('sub-map', 'submap', true)
    addWorld('closed-map', 'main', false)

    expect(getPlayerLauncherWorlds().map((world) => world.id)).toEqual(['main-map'])
  })
})
