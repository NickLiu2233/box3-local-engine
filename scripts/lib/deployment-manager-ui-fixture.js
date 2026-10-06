'use strict'

const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const { pathToFileURL } = require('node:url')

const root = path.resolve(__dirname, '../..')
const app = path.join(root, 'apps/deployment-manager')
const src = path.join(app, 'src')
const appRequire = createRequire(path.join(app, 'package.json'))
const entrySource = `
import ${JSON.stringify(path.join(src, 'main.js'))}
import { state } from ${JSON.stringify(path.join(src, 'core/state.js'))}
import { render } from ${JSON.stringify(path.join(src, 'app/render.js'))}
import { setup } from ${JSON.stringify(path.join(src, 'views/setup/index.js'))}
import { getServiceUrl } from ${JSON.stringify(path.join(src, 'configuration/addresses.js'))}
import { copyOwnerSecret } from ${JSON.stringify(path.join(src, 'operations/owner-secrets.js'))}
import { saveConfiguration } from ${JSON.stringify(path.join(src, 'operations/configuration.js'))}
import { confirmBackupAction } from ${JSON.stringify(path.join(src, 'operations/backups.js'))}
globalThis.manager = { state, render, setup, getServiceUrl, copyOwnerSecret, saveConfiguration, confirmBackupAction }
`
const adapterSource = `
export const invoke = (...args) => globalThis.adapterInvoke(...args)
export const isWebManager = () => globalThis.webManager
export const hasWebManagerToken = () => Boolean(globalThis.managerToken)
export const setWebManagerToken = value => { globalThis.managerToken = value }
export const dockerPlatform = () => ({ name: 'Docker', hint: 'fixture', action: '连接', busy: '连接中', canStart: false })
export const subscribeManager = () => () => {}
export const listen = (name, callback) => { globalThis.progressListeners.set(name, callback); return Promise.resolve(() => {}) }
export const openExternal = () => Promise.resolve()
export const selectBackup = () => Promise.resolve(null)
export const exportBackupFile = () => Promise.resolve(null)
export const exportDiagnosticsFile = () => Promise.resolve(null)
`

async function buildFixtureBundle(source = entrySource) {
  const { build } = await import(pathToFileURL(appRequire.resolve('vite')).href)
  const result = await build({
    configFile: false, root: app, logLevel: 'silent',
    plugins: [{
      name: 'manager-fixture',
      enforce: 'pre',
      resolveId(id) {
        if (id === 'virtual:manager-fixture') return '\0manager-fixture.js'
        if (id.endsWith('/transport.js') || id === './transport.js') return '\0manager-adapter.js'
        if (id.endsWith('.css')) return '\0manager-styles.js'
      },
      load(id) {
        if (id === '\0manager-fixture.js') return source
        if (id === '\0manager-adapter.js') return adapterSource
        if (id === '\0manager-styles.js') return ''
      },
    }],
    build: {
      write: false, minify: false,
      rollupOptions: { input: 'virtual:manager-fixture', output: { format: 'iife' } },
    },
  })
  return result.output.find(item => item.type === 'chunk').code
}

let bundlePromise
class FixtureElement {
  constructor(dataset = {}) { this.dataset = dataset; this.listeners = new Map(); this.scrollTop = 0 }
  addEventListener(name, handler) { this.listeners.set(name, handler) }
  async click() { return this.listeners.get('click')?.({ currentTarget: this, target: this, preventDefault() {} }) }
}
class FixtureInput extends FixtureElement {
  constructor(name, value, checked = false) { super(); this.name = name; this.value = value; this.checked = checked }
}
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&')
class FixtureForm extends FixtureElement {
  constructor(markup) {
    super()
    this.values = new Map()
    this.inputs = new Map()
    for (const [tag] of markup.matchAll(/<input\b[^>]*>/g)) {
      const attributes = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, decode(value)]))
      if (!attributes.name) continue
      const checked = /\bchecked\b/.test(tag)
      const input = new FixtureInput(attributes.name, attributes.value || '', checked)
      this.inputs.set(attributes.name, input)
      if (attributes.disabled || /\bdisabled\b/.test(tag)) continue
      if (attributes.type === 'checkbox' && !checked) continue
      this.values.set(attributes.name, attributes.value || (attributes.type === 'checkbox' ? 'on' : ''))
    }
    this.elements = { namedItem: name => this.inputs.get(name) || null }
  }
  checkValidity() { return true }
  setValue(name, value) { this.values.set(name, value); if (this.inputs.has(name)) this.inputs.get(name).value = value }
}
class FixtureFormData {
  constructor(form) { this.values = new Map(form.values) }
  entries() { return this.values.entries() }
  has(key) { return this.values.has(key) }
  [Symbol.iterator]() { return this.entries() }
}

async function createFixture({ webManager = false, token = '', bundle, responses = {} } = {}) {
  if (!bundle) { bundlePromise ||= buildFixtureBundle(); bundle = await bundlePromise }
  const calls = [], copied = [], events = new Map(), intervals = new Map(), timeouts = new Map()
  let html = '', form = null, modes = [], resetLoginImage = null, timerId = 0
  const mainScroll = new FixtureElement(), setupScroll = new FixtureElement()
  const fixtureConfig = {
    databaseMode: 'managed', databasePort: '5432', redisMode: 'disabled', redisPort: '6379',
    publicHost: 'engine.example.test', publicAddress: 'http://engine.example.test',
    playNetworkMode: 'public', creatorNetworkMode: 'public', creatorHost: 'engine.example.test',
    lanIp: '192.168.1.20', playPort: 3121, creatorPort: 3127, voxaPort: 3123,
    playerServicePort: 3124, authPortalPort: 3125, hasPlayAdminToken: true,
    playPublicAddressOverride: 'https://play.example.test', authPortalPublicAddressOverride: 'https://auth.example.test',
  }
  const results = {
    get_system_status: { dockerReady: true, configured: true, allHealthy: true, services: [{ name: 'play', running: true }, { name: 'creator', running: true }, { name: 'managed-postgres', running: true }] },
    get_install_config: fixtureConfig, get_about_info: {}, get_license_status: { valid: true, deviceId: 'device-fixture' },
    get_managed_service_info: { configured: true, ready: true, imageAvailable: true },
    get_data_storage_info: { path: '/tmp/engine-fixture' }, get_raw_environment: 'FIXTURE=true',
    list_backups: [], get_project_runtime_status: { creator: [], play: [], playMaps: [] },
    get_owner_secrets: { playAdminToken: 'private-owner-fixture', playerAuthApiKey: 'auth-fixture', permissionTokenSecret: 'runtime-fixture' },
    ...responses,
  }
  const appElement = {
    get innerHTML() { return html },
    set innerHTML(value) {
      html = value
      form = html.includes('id="setup-form"') ? new FixtureForm(html) : null
      resetLoginImage = html.includes('id="restore-default-login-image"') ? new FixtureElement() : null
      modes = [...html.matchAll(/data-network-mode="([^"]+)"/g)].map(([, networkMode]) => new FixtureElement({ networkMode }))
    },
  }
  const document = {
    hidden: false,
    head: { appendChild() {} },
    createElement() { return { relList: { supports: () => true } } },
    documentElement: { dataset: {}, removeAttribute(name) { if (name === 'data-theme') delete this.dataset.theme } },
    addEventListener(name, handler) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(handler) },
    removeEventListener(name, handler) { events.get(name)?.delete(handler) },
    querySelector(selector) {
      if (selector === '#app') return appElement
      if (selector === '#setup-form') return form
      if (selector === '#restore-default-login-image') return resetLoginImage
      if (selector === 'main') return mainScroll
      if (selector === '.setup-panels') return setupScroll
      if (selector === '.shell' && html.includes('data-rendered-page=')) return {
        dataset: { renderedPage: html.match(/data-rendered-page="([^"]+)"/)[1] },
        querySelector: inner => inner === '.setup-panel.active'
          ? { dataset: { setupPanel: html.match(/class="setup-panel[^"\n]*active[^"\n]*" data-setup-panel="([^"]+)"/)?.[1] } }
          : document.querySelector(inner),
      }
      return null
    },
    querySelectorAll(selector) { return selector === '[data-network-mode]' ? modes : [] },
  }
  const localValues = new Map()
  const context = vm.createContext({
    console, URL, document, webManager, managerToken: token,
    progressListeners: new Map(), navigator: { clipboard: { async writeText(value) { copied.push(value) } } },
    localStorage: { getItem: key => localValues.get(key) || null, setItem: (key, value) => localValues.set(key, value) },
    Element: FixtureElement, HTMLInputElement: FixtureInput, FormData: FixtureFormData, CSS: { escape: value => value },
    setInterval: (handler, delay) => { intervals.set(++timerId, { handler, delay }); return timerId },
    clearInterval: id => intervals.delete(id), clearTimeout: id => timeouts.delete(id),
    window: {
      setTimeout: (handler, delay) => { timeouts.set(++timerId, { handler, delay }); return timerId },
      setInterval: (handler, delay) => { intervals.set(++timerId, { handler, delay }); return timerId },
    },
    async adapterInvoke(command, payload) {
      calls.push({ command, payload })
      const response = results[command]
      return typeof response === 'function' ? response(payload) : response
    },
  })
  vm.runInContext(bundle, context)
  await new Promise(resolve => setImmediate(resolve))
  return { context, api: context.manager, calls, copied, document, intervals, timeouts, results,
    get html() { return html }, get form() { return form },
    clickMode: mode => modes.find(node => node.dataset.networkMode === mode).click(),
    emitDocument: async name => { for (const handler of events.get(name) || []) await handler({}) },
  }
}

module.exports = { buildFixtureBundle, createFixture }
