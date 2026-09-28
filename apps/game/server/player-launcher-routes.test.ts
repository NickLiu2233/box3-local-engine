import type { NextApiRequest, NextApiResponse } from 'next'
import { afterAll, beforeEach, describe, expect, test } from '@jest/globals'
import fs from 'fs'
import os from 'os'
import path from 'path'

import { createPlayerLauncherBootstrapHandler } from '../pages/api/player-launcher/bootstrap'
import { createPlayerLauncherMapsHandler } from '../pages/api/player-launcher/maps'
import { createPlayerLauncherDescriptorHandler } from '../pages/api/player-launcher/maps/[mapId]/descriptor'
import { createPlayerLauncherBlobHandler } from '../pages/api/player-launcher/maps/[mapId]/blobs/[hash]'
import { PlayerAuthenticationRequiredError } from './player-service-client'
import { createPlayerLauncherDownloadTicket } from './player-launcher-map-packages'

function request(method = 'GET') {
  return {
    method,
    headers: {},
    query: {},
    body: {},
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as NextApiRequest
}

function response() {
  const result = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this },
    setHeader(name: string, value: string) { this.headers[name] = value; return this },
    json(body: unknown) { this.body = body; return this },
    end() { return this },
  }
  return result as unknown as NextApiResponse & typeof result
}

describe('Player Launcher Play endpoints', () => {
  const previousMode = process.env.BOX_DEPLOYMENT_MODE
  const previousTicketSecret = process.env.PERMISSION_TOKEN_SECRET

  beforeEach(() => { process.env.BOX_DEPLOYMENT_MODE = 'play' })

  afterAll(() => {
    if (previousMode === undefined) delete process.env.BOX_DEPLOYMENT_MODE
    else process.env.BOX_DEPLOYMENT_MODE = previousMode
    if (previousTicketSecret === undefined) delete process.env.PERMISSION_TOKEN_SECRET
    else process.env.PERMISSION_TOKEN_SECRET = previousTicketSecret
  })

  test('bootstrap reveals only basic server state and never a map list', async () => {
    const handler = createPlayerLauncherBootstrapHandler(() => ({ enabled: false }))
    const res = response()
    await handler(request(), res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      protocolVersion: 1,
      serverName: '',
      resourceAccessEnabled: false,
      loginRequired: true,
      loginApiUrl: '',
      signingKey: null,
    })
  })

  test('closed server denies map discovery before authentication', async () => {
    let authenticationAttempted = false
    const handler = createPlayerLauncherMapsHandler({
      readSettings: () => ({ enabled: false }),
      getWorlds: () => [],
      getPlayerIp: () => '127.0.0.1',
      resolveIdentity: async () => {
        authenticationAttempted = true
        return { identity: {} as never, assertion: 'signed' }
      },
    })
    const res = response()
    await handler(request(), res)
    expect(res.statusCode).toBe(403)
    expect(res.body).toMatchObject({ code: 'PLAYER_LAUNCHER_RESOURCES_DISABLED' })
    expect(authenticationAttempted).toBe(false)
  })

  test('enabled server requires an authenticated player before returning maps', async () => {
    let mapListRead = false
    const handler = createPlayerLauncherMapsHandler({
      readSettings: () => ({ enabled: true }),
      getWorlds: () => { mapListRead = true; return [] },
      getPlayerIp: () => '127.0.0.1',
      resolveIdentity: async () => { throw new PlayerAuthenticationRequiredError() },
    })
    const res = response()
    await handler(request(), res)
    expect(res.statusCode).toBe(401)
    expect(res.body).toMatchObject({ code: 'AUTH_REQUIRED' })
    expect(mapListRead).toBe(false)
  })

  test('enabled server returns map details only after identity verification', async () => {
    const handler = createPlayerLauncherMapsHandler({
      readSettings: () => ({ enabled: true }),
      getPlayerIp: () => '127.0.0.1',
      resolveIdentity: async () => ({ identity: {} as never, assertion: 'signed' }),
      getWorlds: () => [{
        id: 'map-one',
        permanentMapId: 'permanent-one',
        publicId: 'map-one',
        name: '地图一',
        author: '作者',
        description: '',
        cover: '',
        version: 'v1',
        mapGroupId: 'map-one',
        mapRole: 'main',
        mainProjectId: 'map-one',
        playEnabled: true,
      }],
    })
    const res = response()
    await handler(request(), res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ worlds: [{ permanentMapId: 'permanent-one', name: '地图一' }] })
  })

  test('descriptor endpoint checks server setting, player session, and map visibility', async () => {
    let descriptorRequested = false
    const dependencies = {
      readSettings: () => ({ enabled: true }),
      getWorlds: () => [{ id: 'world-one', publicId: 'world-one' }] as never,
      getDescriptor: (() => { descriptorRequested = true; return { manifestDigest: 'signed-digest' } }) as never,
      getPlayerIp: () => '127.0.0.1',
      resolveIdentity: async () => { throw new PlayerAuthenticationRequiredError() },
    }
    const handler = createPlayerLauncherDescriptorHandler(dependencies)
    const requestFor = (mapId: string) => ({ ...request(), query: { mapId } }) as unknown as NextApiRequest
    const unauthorized = response()
    await handler(requestFor('world-one'), unauthorized)
    expect(unauthorized.statusCode).toBe(401)
    expect(descriptorRequested).toBe(false)

    const authenticatedHandler = createPlayerLauncherDescriptorHandler({
      ...dependencies,
      resolveIdentity: async () => ({ identity: {} as never, assertion: 'signed' }),
    })
    const hidden = response()
    await authenticatedHandler(requestFor('private-world'), hidden)
    expect(hidden.statusCode).toBe(404)
    expect(descriptorRequested).toBe(false)

    const allowed = response()
    await authenticatedHandler(requestFor('world-one'), allowed)
    expect(allowed.statusCode).toBe(200)
    expect(allowed.body).toEqual({ manifestDigest: 'signed-digest' })
  })

  test('blob endpoint requires a player/map/digest-bound short-lived download ticket', async () => {
    process.env.PERMISSION_TOKEN_SECRET = 'player-launcher-route-test-secret-123456'
    const handler = createPlayerLauncherBlobHandler({
      readSettings: () => ({ enabled: true }),
      getWorlds: () => [{ id: 'world-one', publicId: 'world-one' }] as never,
      getBlob: () => ({
        path: '/unused-for-invalid-ticket',
        asset: {} as never,
        descriptor: { permanentMapId: 'permanent-one', manifestDigest: 'digest-one' } as never,
      }),
      getPlayerIp: () => '127.0.0.1',
      resolveIdentity: async () => ({ identity: { subjectId: 'player-one' } as never, assertion: 'signed' }),
    })
    const req = {
      ...request(),
      query: { mapId: 'world-one', hash: 'A'.repeat(43), digest: 'digest-one', ticket: 'tampered.ticket' },
    } as unknown as NextApiRequest
    const res = response()
    await handler(req, res)
    expect(res.statusCode).toBe(403)
    expect(res.body).toMatchObject({ code: 'DOWNLOAD_TICKET_INVALID' })
  })

  test('blob endpoint rejects malformed byte ranges while keeping ticket and map gates', async () => {
    process.env.PERMISSION_TOKEN_SECRET = 'player-launcher-range-test-secret-long-enough'
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'player-launcher-range-test-'))
    const filePath = path.join(directory, 'blob')
    const content = Buffer.from('range fixture')
    fs.writeFileSync(filePath, content)
    try {
      const identity = { subjectId: 'player-range-test' }
      const descriptor = { permanentMapId: 'permanent-one', manifestDigest: 'digest-range' }
      const ticket = createPlayerLauncherDownloadTicket({
        subjectId: identity.subjectId,
        permanentMapId: descriptor.permanentMapId,
        manifestDigest: descriptor.manifestDigest,
      }).ticket
      const handler = createPlayerLauncherBlobHandler({
        readSettings: () => ({ enabled: true }),
        getWorlds: () => [{ id: 'world-one', publicId: 'world-one' }] as never,
        getBlob: () => ({
          path: filePath,
          asset: { contentType: 'application/octet-stream' } as never,
          descriptor: descriptor as never,
        }),
        getPlayerIp: () => '127.0.0.1',
        resolveIdentity: async () => ({ identity: identity as never, assertion: 'signed' }),
      })
      const req = {
        ...request(),
        headers: { range: 'bytes=-3' },
        query: { mapId: 'world-one', hash: 'A'.repeat(43), digest: 'digest-range', ticket },
      } as unknown as NextApiRequest
      const res = response()
      await handler(req, res)
      expect(res.statusCode).toBe(416)
      expect(res.headers['Content-Range']).toBe(`bytes */${content.length}`)
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })
})
