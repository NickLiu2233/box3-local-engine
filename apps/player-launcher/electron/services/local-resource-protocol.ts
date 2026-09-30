import { Readable } from 'node:stream'
import * as path from 'node:path'
import { validHashShape } from './package-descriptor'
import { openRegularFile } from './fs-safe'
import type { PackageDescriptor } from '../types'

const HASH_SUFFIXES = ['.mp3', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ogg', '.wav', '.lut']

export interface AllowedLocalAsset {
  filename: string
  size: number
  contentType: string
}

export interface ActiveLaunchSession {
  id: string
  origin: string
  assets: Map<string, AllowedLocalAsset>
  expiresAt: number
}

export interface ProtocolRequest extends Request {
  initiatorOrigin?: string | null
}

export function parseResourceRoute(url: URL): { sessionId: string; hash: string } | null {
  if (url.protocol !== 'boxplay:' || url.hostname.toLowerCase() !== 'localhost' || url.search || url.hash) return null
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length === 2 && segments[1] === 'block') return null
  if (segments.length === 3 && segments[1] === 'block') return { sessionId: segments[0], hash: segments[2] }
  if (segments.length === 4 && segments[1] === 'engine' && segments[2] === 'm') return { sessionId: segments[0], hash: segments[3] }
  return null
}

export function findAllowedAsset(assets: Map<string, AllowedLocalAsset>, requestHash: string): AllowedLocalAsset | null {
  const exact = assets.get(requestHash)
  if (exact) return exact
  for (const suffix of HASH_SUFFIXES) {
    if (!requestHash.endsWith(suffix)) continue
    const hash = requestHash.slice(0, -suffix.length)
    if (!validHashShape(hash)) return null
    const asset = assets.get(hash)
    if (asset) return asset
  }
  return null
}

export function parseRange(value: string, totalSize: number): [number, number] | null {
  if (!value.startsWith('bytes=') || value.includes(',') || totalSize <= 0) return null
  const range = value.slice(6)
  const separator = range.indexOf('-')
  if (separator < 0) return null
  const startText = range.slice(0, separator)
  const endText = range.slice(separator + 1)
  if (!startText) {
    if (!/^\d+$/.test(endText)) return null
    const suffix = Number(endText)
    if (suffix <= 0 || !Number.isSafeInteger(suffix)) return null
    return [Math.max(0, totalSize - suffix), totalSize - 1]
  }
  if (!/^\d+$/.test(startText) || (endText && !/^\d+$/.test(endText))) return null
  const start = Number(startText)
  const requestedEnd = endText ? Number(endText) : totalSize - 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start >= totalSize || requestedEnd < start) return null
  return [start, Math.min(requestedEnd, totalSize - 1)]
}

function response(status: number, body: BodyInit | null, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers })
}

export function createLocalResourceProtocol({
  getSession,
  now = Date.now,
}: {
  getSession: (id: string) => ActiveLaunchSession | undefined
  now?: () => number
}): (request: ProtocolRequest) => Promise<Response> {
  return async function handle(request: ProtocolRequest): Promise<Response> {
    let url
    try { url = new URL(request.url) } catch { return response(404, 'resource not found') }
    const route = parseResourceRoute(url)
    if (!route) return response(404, 'resource not found')
    const session = getSession(route.sessionId)
    if (!session || session.expiresAt <= now()) return response(404, 'resource not found')
    const initiatorOrigin = request.initiatorOrigin === undefined
      ? request.headers.get('origin')
      : request.initiatorOrigin
    if (initiatorOrigin !== session.origin) return response(403, 'resource session unavailable')
    const asset = findAllowedAsset(session.assets, route.hash)
    if (!asset) return response(404, 'resource not found')

    const cors = {
      'Access-Control-Allow-Origin': session.origin,
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Length, Content-Range, Content-Type',
      'Access-Control-Max-Age': '600',
      'Vary': 'Origin',
      'Cache-Control': 'no-store',
    }
    if (request.method === 'OPTIONS') return response(204, null, cors)
    if (request.method !== 'GET' && request.method !== 'HEAD') return response(405, 'method not allowed', cors)

    let opened
    try { opened = await openRegularFile(asset.filename, asset.size) } catch {
      return response(404, 'resource not found', cors)
    }
    if (!opened) return response(404, 'resource not found', cors)
    const metadata = opened.stat
    const rangeHeader = request.headers.get('range')
    let range = null
    if (rangeHeader) {
      range = parseRange(rangeHeader, metadata.size)
      if (!range) {
        await opened.handle.close()
        return response(416, 'range not satisfiable', {
          ...cors,
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes */${metadata.size}`,
        })
      }
    }
    const start = range?.[0] ?? 0
    const end = range?.[1] ?? metadata.size - 1
    const length = end - start + 1
    const status = range ? 206 : 200
    const headers = {
      ...cors,
      'Accept-Ranges': 'bytes',
      'Content-Type': asset.contentType,
      'Content-Length': String(length),
      ...(range ? { 'Content-Range': `bytes ${start}-${end}/${metadata.size}` } : {}),
    }
    if (request.method === 'HEAD') {
      await opened.handle.close()
      return response(status, null, headers)
    }
    const stream = opened.handle.createReadStream({ start, end, autoClose: true })
    return response(status, Readable.toWeb(stream) as unknown as BodyInit, headers)
  }
}

export function createLaunchSession(
  descriptor: PackageDescriptor,
  blobRoot: string,
  origin: string,
  id: string,
  expiresAt: number,
): ActiveLaunchSession {
  const assets = new Map<string, AllowedLocalAsset>(descriptor.required.map((asset) => [asset.hash, {
    filename: path.join(blobRoot, asset.hash),
    size: asset.size,
    contentType: asset.contentType,
  }]))
  return { id, origin, assets, expiresAt }
}
