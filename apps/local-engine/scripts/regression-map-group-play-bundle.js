'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'box-map-group-play-'))
const projectsRoot = path.join(temporaryRoot, 'projects')
process.env.BOX_LOCAL_PROJECTS_PATH = projectsRoot

const manager = require('../src/project-manager')

function hash(character) {
  return `Qm${character.repeat(44)}`
}

function saveProject(id, characters) {
  const sourceRoot = path.join(projectsRoot, id, 'source')
  const blobRoot = path.join(sourceRoot, 'blobs')
  const permissionHash = hash(characters[0])
  const versionControlHash = hash(characters[1])
  const projectHash = hash(characters[2])
  const scriptAssetsHash = hash(characters[3])
  const scriptHash = hash(characters[4])

  fs.mkdirSync(blobRoot, { recursive: true })
  fs.writeFileSync(path.join(blobRoot, permissionHash), JSON.stringify({
    accessLevel: 1,
    versionControl: versionControlHash,
  }))
  fs.writeFileSync(path.join(blobRoot, versionControlHash), JSON.stringify({
    branches: { master: { headHash: projectHash } },
  }))
  fs.writeFileSync(path.join(blobRoot, projectHash), JSON.stringify({
    scriptAssets: scriptAssetsHash,
  }))
  fs.writeFileSync(path.join(blobRoot, scriptAssetsHash), JSON.stringify({
    'index.js': { type: 1, hash: scriptHash },
  }))
  fs.writeFileSync(path.join(blobRoot, scriptHash), 'module.exports = {}\n')
  fs.writeFileSync(path.join(sourceRoot, 'project-state.json'), JSON.stringify({
    formatVersion: 1,
    permissionHash,
  }))
}

try {
  manager.createProject({ id: 'release-main', name: '发布主地图' })
  manager.createSubmap('release-main', {
    id: 'release-dungeon',
    name: '发布副地图',
  })
  saveProject('release-main', '12345')

  assert.throws(
    () => manager.publishMapGroup('release-main', 'v1'),
    /请先打开并保存地图“发布副地图”/,
    'an unsaved member must reject the complete group before publishing starts',
  )
  assert.equal(
    fs.existsSync(path.join(projectsRoot, 'release-main', 'releases', 'v1')),
    false,
    'a rejected group publish must not leave a main-map release behind',
  )

  saveProject('release-dungeon', '6789A')
  const published = manager.publishMapGroup('release-dungeon', 'v1', '整组回归')
  assert.equal(published.type, 'map-group-release')
  assert.equal(published.mainProjectId, 'release-main')
  assert.equal(published.mapCount, 2)

  const mainManifest = JSON.parse(fs.readFileSync(
    path.join(projectsRoot, 'release-main', 'releases', 'v1', 'manifest.json'),
    'utf8',
  ))
  const submapManifest = JSON.parse(fs.readFileSync(
    path.join(projectsRoot, 'release-dungeon', 'releases', 'v1', 'manifest.json'),
    'utf8',
  ))
  assert.equal(mainManifest.mapRole, 'main')
  assert.equal(submapManifest.mapRole, 'submap')
  assert.equal(mainManifest.mapGroupId, 'release-main')
  assert.equal(submapManifest.mainProjectId, 'release-main')

  const bundle = manager.exportPlayBundle('release-dungeon@v1')
  assert.equal(bundle.mapCount, 2)
  const entries = execFileSync('tar', ['-tzf', bundle.archivePath], { encoding: 'utf8' })
    .trim()
    .split('\n')
  assert(entries.includes('bundle.json'))
  assert(entries.includes('worlds/release-main/manifest.json'))
  assert(entries.includes('worlds/release-dungeon/manifest.json'))
  const descriptor = JSON.parse(execFileSync(
    'tar',
    ['-xOzf', bundle.archivePath, 'bundle.json'],
    { encoding: 'utf8' },
  ))
  assert.equal(descriptor.type, 'map-group-play-bundle')
  assert.equal(descriptor.mainProjectId, 'release-main')
  assert.deepEqual(
    descriptor.members.map((member) => [member.id, member.mapRole]),
    [
      ['release-main', 'main'],
      ['release-dungeon', 'submap'],
    ],
  )

  fs.rmSync(bundle.archivePath, { force: true })
  fs.rmSync(bundle.temporaryRoot, { recursive: true, force: true })
  console.log('map group play bundle regression passed')
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}
