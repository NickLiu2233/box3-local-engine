'use strict'

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'box-project-identity-'))
process.env.BOX_LOCAL_PROJECTS_PATH = temporaryRoot

const manager = require('../src/project-manager')
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

try {
  const main = manager.createProject({ id: 'readable-directory-key', name: '主地图' })
  assert.match(main.mapUuid, uuidPattern)

  const before = manager.projectStorageIdentity(main.id)
  manager.updateProject(main.id, { publicId: 'editable-player-link' })
  const after = manager.projectStorageIdentity(main.id)
  assert.deepEqual(after, before, 'changing the public route must not change storage identity')

  const submap = manager.createSubmap(main.id, {
    id: 'readable-submap-key',
    name: '副地图',
  })
  const submapIdentity = manager.projectStorageIdentity(submap.id)
  assert.match(submapIdentity.mapUuid, uuidPattern)
  assert.notEqual(submapIdentity.mapUuid, before.mapUuid)
  assert.equal(submapIdentity.mapGroupUuid, before.mapUuid)

  const legacyPath = path.join(temporaryRoot, submap.id, 'project.json')
  const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'))
  delete legacy.mapUuid
  fs.writeFileSync(legacyPath, `${JSON.stringify(legacy, null, 2)}\n`)
  const migrated = manager.getProject(submap.id)
  assert.match(migrated.mapUuid, uuidPattern)
  assert.equal(manager.getProject(submap.id).mapUuid, migrated.mapUuid)

  console.log('project storage identity regression passed')
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}
