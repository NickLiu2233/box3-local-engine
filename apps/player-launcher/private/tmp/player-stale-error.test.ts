import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bindServerEvents } from '../src/features/servers/events'
import { createInitialState } from '../src/application/state'
import { expirePlayerSession } from '../src/features/player/session'

test('A refresh failure cannot overwrite A after session expiry and A -> B -> C -> A', async () => {
  const previousDocument = Reflect.get(globalThis, 'document')
  const previousElement = Reflect.get(globalThis, 'Element')
  const state = createInitialState()
  state.servers = ['a', 'b', 'c'].map((id) => ({
    id,
    endpoint: 'https://' + id + '.example.test',
    name: id,
  }))
  state.selectedId = 'a'
  state.page = 'servers'
  state.player = { username: 'fixture' }
  state.serverBootstrap = { supported: true } as any
  let rejectOld!: (error: Error) => void
  const pending = new Promise((_, reject) => {
    rejectOld = reject
  })
  let first = true
  let discovery!: () => void
  const clicks = new Map<string, () => Promise<void>>()
  class FakeElement {
    closest() {
      return null
    }
  }
  Reflect.set(globalThis, 'Element', FakeElement)
  const nodes = state.servers.map((server) => ({
    dataset: { selectServer: server.id },
    addEventListener(_name, handler) {
      clicks.set(server.id, () => handler({ target: new FakeElement() }))
    },
  }))
  Reflect.set(globalThis, 'document', {
    querySelector: (selector) =>
      selector === '[data-action="discover"]'
        ? {
            addEventListener(_name, handler) {
              discovery = handler
            },
          }
        : null,
    querySelectorAll: (selector) => (selector === '[data-select-server]' ? nodes : []),
  })
  try {
    bindServerEvents({
      state,
      remoteApi: {},
      render: () => {},
      selectedServer: () => state.servers.find((server) => server.id === state.selectedId),
      refreshPlayerSession: async () => {},
      playerInvoke: async (command, payload) => {
        if (command !== 'get_server_bootstrap') return
        if (first) {
          first = false
          return pending
        }
        return { supported: true, serverName: payload.endpoint }
      },
    })
    discovery()
    // A delayed library/session 401 is an actual path that releases the busy flag.
    expirePlayerSession(state, 'a')
    await clicks.get('b')!()
    await clicks.get('c')!()
    await clicks.get('a')!()
    assert.equal(state.serverBootstrap?.supported, true)
    rejectOld(new Error('服务器连接被中断'))
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(state.selectedId, 'a')
    assert.equal(state.serverBootstrap?.supported, true)
    assert.equal(state.serverBootstrap?.error, undefined)
  } finally {
    if (previousDocument === undefined) Reflect.deleteProperty(globalThis, 'document')
    else Reflect.set(globalThis, 'document', previousDocument)
    if (previousElement === undefined) Reflect.deleteProperty(globalThis, 'Element')
    else Reflect.set(globalThis, 'Element', previousElement)
  }
})
