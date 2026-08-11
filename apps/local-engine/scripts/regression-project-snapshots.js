'use strict'

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'box-project-snapshots-'))
process.env.BOX_LOCAL_PROJECTS_PATH = temporaryRoot
process.env.BOX_PROJECT_BACKUP_PATH = path.join(temporaryRoot, '.backups')

const manager = require('../src/project-manager')

try {
  const project = manager.createProject({ id: 'snapshot-test', name: 'Snapshot test' })
  const sourceRoot = path.join(temporaryRoot, project.id, 'source')
  const blobRoot = path.join(sourceRoot, 'blobs')
  fs.mkdirSync(blobRoot, { recursive: true })

  const writeVersion = (permissionHash, marker) => {
    fs.writeFileSync(path.join(blobRoot, permissionHash), JSON.stringify({ type: 'permission', marker }))
    fs.writeFileSync(path.join(sourceRoot, 'project-state.json'), JSON.stringify({ permissionHash, marker }))
  }

  writeVersion('permission-one', 'one')
  const first = manager.createProjectSnapshot(project.id, 'manual')
  assert.equal(first.created, true)

  writeVersion('permission-two', 'two')
  const second = manager.createProjectSnapshot(project.id, 'manual')
  assert.equal(second.created, true)

  const snapshots = manager.listProjectSnapshots(project.id)
  assert.equal(snapshots.length, 2)
  assert.ok(snapshots.every((snapshot) => snapshot.size > 0 && snapshot.createdAt))

  const firstName = path.basename(first.archivePath)
  const restored = manager.restoreProjectSnapshot(project.id, firstName)
  assert.equal(restored.restored, true)
  const state = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'project-state.json'), 'utf8'))
  assert.equal(state.marker, 'one')
  assert.ok(manager.listProjectSnapshots(project.id).some((snapshot) => snapshot.name === path.basename(second.archivePath)))

  assert.throws(
    () => manager.restoreProjectSnapshot(project.id, '../../outside.tar.gz'),
    /快照不存在/,
  )
  const backup = manager.createProjectBackup(project.id, 'manual')
  assert.equal(backup.created, true)
  assert.ok(fs.existsSync(backup.archivePath))
  assert.equal(manager.listProjectBackups(project.id).length, 1)
  const imported = manager.importProject(backup.archivePath)
  assert.equal(imported.name, project.name)
  const duplicate = manager.createProjectBackup(project.id, 'manual')
  assert.equal(duplicate.created, false)
  const backupRun = manager.runProjectBackups('automatic')
  assert.equal(backupRun.state, 'ready')
  assert.equal(manager.readBackupStatus().completedProjects, 2)

  console.log('PASS: project snapshots restore safely and validated .boxproject backups are retained without duplicates')
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}
