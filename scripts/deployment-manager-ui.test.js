'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createFixture } = require('./lib/deployment-manager-ui-fixture')

test('about page lists the current engine release first without player launcher notes', async () => {
  const app = await createFixture()
  app.api.state.page = 'about'
  app.api.render()
  const notes = app.html.slice(app.html.indexOf('about-changelog-list'))
  assert.ok(notes.indexOf('v0.3.0') < notes.indexOf('v0.2.0'))
  for (const feature of ['地图脚本与后台管理', 'world.moderation', '登录与账号', 'scaleTarget']) {
    assert.ok(notes.includes(feature), `missing release note: ${feature}`)
  }
  assert.ok(!notes.includes('玩家启动器'))
  assert.equal(require('../package.json').version, '0.3.0')
})

test('native bootstrap loads the console; unauthenticated Web bootstrap shows the login gate', async () => {
  const native = await createFixture()
  assert.equal(native.api.state.page, 'overview')
  assert.match(native.html, /服务总览/)
  assert.ok(native.calls.some(call => call.command === 'get_install_config'))
  assert.ok(native.context.progressListeners.has('install-progress'))
  const web = await createFixture({ webManager: true })
  assert.equal(web.api.state.page, 'web-login')
  assert.match(web.html, /web-login-form/)
  assert.equal(web.calls.length, 0)
})

test('all pages render through the module renderer and preserve scroll on same-page updates', async () => {
  const app = await createFixture()
  app.api.state.performance = { services: [] }
  app.api.state.projectRuntimesLoaded = true
  for (const [page, marker] of [
    ['overview', '服务总览'], ['setup', 'setup-form'], ['backups', '立即备份'],
    ['runtimes', '地图容器管理'], ['performance', '性能监控'], ['license', '许可证管理'],
    ['about', 'about-page'], ['web-login', 'web-login-form'],
  ]) {
    app.api.state.page = page
    app.api.render()
    assert.ok(app.html.includes(marker), `page ${page} did not render`)
  }
  app.api.state.page = 'setup'
  app.api.state.setupSection = 'network'
  app.api.render()
  app.document.querySelector('main').scrollTop = 120
  app.document.querySelector('.setup-panels').scrollTop = 250
  app.api.render()
  assert.equal(app.document.querySelector('main').scrollTop, 120)
  assert.equal(app.document.querySelector('.setup-panels').scrollTop, 250)
})

test('public address edits and service overrides survive local/LAN/public event transitions', async () => {
  const app = await createFixture()
  app.api.state.page = 'setup'
  app.api.state.setupSection = 'network'
  app.api.render()
  app.form.setValue('publicAddress', 'https://changed.example.test')
  app.form.setValue('playPublicAddressOverride', 'http://play.example.test:4121')
  await app.clickMode('local')
  assert.equal(app.api.state.config.publicAddress, 'https://changed.example.test')
  assert.equal(app.api.getServiceUrl('play'), 'http://127.0.0.1:3121/')
  assert.equal(app.form.values.get('publicAddress'), 'https://changed.example.test')
  await app.clickMode('lan')
  assert.equal(app.api.getServiceUrl('play'), 'http://192.168.1.20:3121/')
  await app.clickMode('public')
  assert.equal(app.form.values.get('publicAddress'), 'https://changed.example.test')
  assert.equal(app.form.values.get('playPublicAddressOverride'), 'http://play.example.test:4121')
  assert.equal(app.api.getServiceUrl('play'), 'http://play.example.test:4121/')
  assert.equal(app.api.state.config.authPortalPublicAddressOverride, 'https://auth.example.test')
})

test('configuration submission keeps public URLs and converts numeric fields without starting services', async () => {
  const app = await createFixture()
  app.api.state.page = 'setup'
  app.api.render()
  app.form.setValue('publicAddress', 'http://shared.example.test')
  app.form.setValue('playPort', '4201')
  const form = app.form
  await app.api.saveConfiguration({ currentTarget: form, preventDefault() {} })
  const saved = app.calls.find(call => call.command === 'save_configuration_command')
  assert.ok(saved)
  assert.equal(saved.payload.config.publicAddress, 'http://shared.example.test')
  assert.equal(saved.payload.config.playPort, 4201)
  assert.equal(saved.payload.config.databasePort, '5432')
  assert.equal(saved.payload.config.playPublicAddressOverride, 'https://play.example.test')
  assert.ok(!app.calls.some(call => call.command === 'start_services'))
  assert.equal(app.api.state.busy, false)
})

test('owner credential stays masked before and after clipboard copying', async () => {
  const app = await createFixture()
  app.api.render()
  assert.ok(!app.html.includes('private-owner-fixture'))
  await app.api.copyOwnerSecret('playAdminToken')
  assert.deepEqual(app.copied, ['private-owner-fixture'])
  assert.equal(app.api.state.ownerSecretCopied, 'playAdminToken')
  assert.ok(!app.html.includes('private-owner-fixture'))
})

test('restoring backups retains successful results and optional cleanup warnings', async () => {
  for (const warning of [null, '旧数据目录清理失败，请手动清理。']) {
    const app = await createFixture({ responses: { restore_backup: warning } })
    app.api.state.page = 'backups'
    app.api.state.backupDialog = { action: 'restore', archive: 'old.zip' }
    await app.api.confirmBackupAction()
    assert.equal(app.api.state.backupMessage,
      '恢复完成，请在服务总览检查并按需启动服务。' + (warning ? ` 清理提示：${warning}` : ''))
    assert.equal(app.api.state.error, '')
    assert.equal(app.api.state.busy, false)
    assert.ok(app.calls.some(call => call.command === 'restore_backup' && call.payload.archive === 'old.zip'))
  }
})

test('page and visibility transitions retain one appropriate polling timer', async () => {
  const app = await createFixture()
  app.api.render()
  assert.equal(app.intervals.size, 1)
  assert.equal([...app.intervals.values()][0].delay, 10000)
  app.document.hidden = true
  await app.emitDocument('visibilitychange')
  assert.equal(app.intervals.size, 1)
  assert.equal([...app.intervals.values()][0].delay, 60000)
  app.document.hidden = false
  app.api.state.performance = { services: [] }
  app.api.state.page = 'performance'
  app.api.render()
  assert.equal(app.intervals.size, 1)
  assert.equal([...app.intervals.values()][0].delay, 5000)
  app.api.state.page = 'setup'
  app.api.render()
  assert.equal(app.intervals.size, 0)
})

test('backup metadata is escaped at the view interface', async () => {
  const app = await createFixture()
  app.api.state.page = 'backups'
  app.api.state.backups = [{ name: '<img src=x onerror=alert(1)>', path: 'fixture.tar', size: 1 }]
  app.api.render()
  assert.ok(app.html.includes('&lt;img'))
  assert.ok(!app.html.includes('<img src=x'))
})

test('saving a changed login image refreshes only the running login container and supports restoring default', async () => {
  const app = await createFixture()
  app.api.state.status.services.push({ name: 'player-auth-portal', running: true })
  app.api.state.page = 'setup'
  app.api.state.setupSection = 'network'
  app.api.render()
  app.results.save_configuration_command = ({ config }) => { app.results.get_install_config = { ...config } }
  app.form.setValue('authPortalImage', 'ghcr.io/owner/login:1.0')
  await app.api.saveConfiguration({ currentTarget: app.form, preventDefault() {} })
  assert.equal(app.api.state.config.authPortalImage, 'ghcr.io/owner/login:1.0')
  const starts = app.calls.filter(call => call.command === 'control_service')
  assert.equal(starts.length, 1)
  assert.equal(starts[0].payload.service, 'player-auth-portal')
  assert.equal(starts[0].payload.action, 'start')
  await app.document.querySelector('#restore-default-login-image').click()
  assert.equal(app.form.values.get('authPortalImage'), `box-local-engine-player-auth-portal:${require('../package.json').version}`)
  await app.api.saveConfiguration({ currentTarget: app.form, preventDefault() {} })
  assert.equal(app.api.state.config.authPortalImage, '')
  assert.equal(app.calls.filter(call => call.command === 'control_service').length, 2)
})

test('login image has its own access-settings card with the current official image and an upgrade-following default', async () => {
  const image = 'box-local-engine-player-auth-portal:v0.2.0-linux-arm64'
  const app = await createFixture({ responses: { get_about_info: { imageTag: 'v0.2.0-linux-arm64' } } })
  app.api.state.page = 'setup'
  app.api.state.setupSection = 'network'
  for (const mode of ['local', 'lan', 'public']) {
    app.api.state.accessMode = mode
    app.api.render()
    assert.ok(app.html.includes('class="network-service-card login-image-card"'))
    assert.equal(app.form.values.get('authPortalImage'), image)
    assert.equal([...app.html.matchAll(/name="authPortalImage"/g)].length, 1)
    const accountCard = app.html.indexOf('class="network-service-card player-service-card"')
    const accountEnd = app.html.indexOf('</section>', accountCard)
    assert.ok(app.html.indexOf('class="network-service-card login-image-card"') > accountEnd)
  }
  app.api.state.status.services.push({ name: 'player-auth-portal', running: true })
  app.results.save_configuration_command = ({ config }) => { app.results.get_install_config = { ...config } }
  await app.api.saveConfiguration({ currentTarget: app.form, preventDefault() {} })
  assert.equal(app.api.state.config.authPortalImage, '')
  assert.ok(!app.calls.some(call => call.command === 'control_service'))
  app.results.get_about_info = { imageTag: 'v0.3.0-linux-arm64' }
  await app.api.saveConfiguration({ currentTarget: app.form, preventDefault() {} })
  app.api.render()
  assert.equal(app.form.values.get('authPortalImage'), 'box-local-engine-player-auth-portal:v0.3.0-linux-arm64')
})

test('custom login image stays editable across access-mode changes and is escaped in its standalone card', async () => {
  const app = await createFixture()
  app.api.state.page = 'setup'
  app.api.state.setupSection = 'network'
  app.api.render()
  app.form.setValue('authPortalImage', 'my-login:1.0')
  await app.clickMode('public')
  assert.equal(app.form.values.get('authPortalImage'), 'my-login:1.0')
  await app.clickMode('local')
  assert.equal(app.form.values.get('authPortalImage'), 'my-login:1.0')
  app.results.save_configuration_command = ({ config }) => { app.results.get_install_config = { ...config } }
  app.results.get_about_info = { imageTag: 'v0.3.0-linux-arm64' }
  await app.api.saveConfiguration({ currentTarget: app.form, preventDefault() {} })
  assert.equal(app.api.state.config.authPortalImage, 'my-login:1.0')
  assert.equal(app.form.values.get('authPortalImage'), 'my-login:1.0')
  app.api.state.config.authPortalImage = '\"/><img src=x onerror=alert(1)>'
  app.api.render()
  assert.ok(app.html.includes('&quot;/&gt;&lt;img'))
  assert.ok(!app.html.includes('<img src=x'))
})

test('login image changes remain saved when applying fails and do not start a stopped portal', async () => {
  const stopped = await createFixture()
  stopped.api.state.page = 'setup'
  stopped.api.render()
  stopped.results.save_configuration_command = ({ config }) => { stopped.results.get_install_config = { ...config } }
  stopped.form.setValue('authPortalImage', 'ghcr.io/owner/login:1.0')
  await stopped.api.saveConfiguration({ currentTarget: stopped.form, preventDefault() {} })
  assert.ok(!stopped.calls.some(call => call.command === 'control_service'))
  assert.match(stopped.api.state.notice, /下次启动/)
  const failed = await createFixture()
  failed.api.state.status.services.push({ name: 'player-auth-portal', running: true })
  failed.api.state.page = 'setup'
  failed.api.render()
  failed.results.save_configuration_command = ({ config }) => { failed.results.get_install_config = { ...config } }
  failed.results.control_service = () => { throw new Error('download failed') }
  failed.form.setValue('authPortalImage', 'ghcr.io/owner/login:2.0')
  await failed.api.saveConfiguration({ currentTarget: failed.form, preventDefault() {} })
  assert.equal(failed.api.state.config.authPortalImage, 'ghcr.io/owner/login:2.0')
  assert.match(failed.api.state.error, /配置已保存，但登录页面更新失败/)
  assert.equal(failed.api.state.busy, false)
})
