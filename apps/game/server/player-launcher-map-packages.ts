import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

import { findPlayWorld } from './play-worlds'
import { getPlayResourceSigningIdentity, signPlayResourcePayload } from './play-resource-cache'

const HASH_PATTERN = /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|[A-Za-z0-9_-]{43})$/
const MAX_REQUIRED_ASSETS = 20_000
const MAX_REQUIRED_BLOB_BYTES = 512 * 1024 * 1024
const MAX_REQUIRED_TOTAL_BYTES = 20 * 1024 * 1024 * 1024

export type PlayerLauncherPackageAsset = {
  hash: string
  size: number
  kind: 'static'
  contentType: 'application/octet-stream'
}

export type PlayerLauncherPackageDescriptor = {
  formatVersion: 1
  permanentMapId: string
  accessId: string
  releaseVersion: string
  manifestDigest: string
  required: PlayerLauncherPackageAsset[]
  optional: PlayerLauncherPackageAsset[]
  signature: {
    algorithm: 'ES256'
    keyId: string
    publicKey: Record<string, string>
    value: string
  }
}

type PlayerLauncherDownloadClaims = {
  subjectId: string
  permanentMapId: string
  manifestDigest: string
  expiresAt: number
}

const descriptorCache = new Map<string, { expiresAt: number; descriptor: PlayerLauncherPackageDescriptor }>()

function playLibraryRoot() {
  const value = String(process.env.BOX_PLAY_LIBRARY_PATH || '').trim()
  if (!value) throw new Error('游玩地图库未配置')
  return path.resolve(value)
}

function readManifestHashes(filePath: string) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { hashes?: unknown }
  if (!Array.isArray(parsed.hashes) || !parsed.hashes.every((hash) => typeof hash === 'string' && HASH_PATTERN.test(hash))) {
    throw new Error('发布资源索引格式无效')
  }
  return parsed.hashes as string[]
}

function canonicalJson(value: unknown) {
  return JSON.stringify(value)
}

export function getPlayerLauncherPackageDescriptor(reference: string): PlayerLauncherPackageDescriptor {
  const libraryRoot = playLibraryRoot()
  const cacheKey = `${libraryRoot}\0${reference}`
  const cached = descriptorCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.descriptor
  const world = findPlayWorld(reference)
  if (!world) throw new Error('地图不存在')

  const worldRoot = path.join(playLibraryRoot(), world.id)
  const dataRoot = path.join(worldRoot, 'data')
  const runtimeHashes = readManifestHashes(path.join(dataRoot, 'runtime-blobs.json'))
  const privateHashes = new Set(readManifestHashes(path.join(dataRoot, 'private-blobs.json')))
  const hashes = [...new Set(runtimeHashes)].filter((hash) => !privateHashes.has(hash)).sort()
  if (hashes.length > MAX_REQUIRED_ASSETS) throw new Error('地图公开资源数量超出启动器上限')

  let totalBytes = 0
  const required = hashes.map((hash) => {
    const blobPath = path.join(dataRoot, 'blobs', hash)
    const stat = fs.statSync(blobPath)
    if (!stat.isFile() || stat.size > MAX_REQUIRED_BLOB_BYTES) {
      throw new Error('地图包含无效或过大的公开资源')
    }
    totalBytes += stat.size
    if (totalBytes > MAX_REQUIRED_TOTAL_BYTES) throw new Error('地图公开资源总量超出启动器上限')
    return {
      hash,
      size: stat.size,
      kind: 'static' as const,
      contentType: 'application/octet-stream' as const,
    }
  })

  const identity = getPlayResourceSigningIdentity()
  const unsigned = {
    formatVersion: 1 as const,
    permanentMapId: world.permanentMapId,
    accessId: world.publicId,
    releaseVersion: world.version,
    required,
    optional: [] as PlayerLauncherPackageAsset[],
  }
  const manifestDigest = crypto
    .createHash('sha256')
    .update(canonicalJson(unsigned))
    .digest('base64url')
  const signed = { ...unsigned, manifestDigest }
  const descriptor = {
    ...signed,
    signature: {
      algorithm: 'ES256' as const,
      keyId: identity.keyId,
      publicKey: identity.publicKey,
      value: signPlayResourcePayload(canonicalJson(signed)),
    },
  }
  descriptorCache.set(cacheKey, { expiresAt: Date.now() + 3_000, descriptor })
  return descriptor
}

export function getPlayerLauncherBlobPath(reference: string, hash: string) {
  if (!HASH_PATTERN.test(hash)) throw new Error('资源标识无效')
  const descriptor = getPlayerLauncherPackageDescriptor(reference)
  const asset = descriptor.required.find((entry) => entry.hash === hash)
  if (!asset) throw new Error('该资源不属于此地图的公开资源清单')
  return {
    descriptor,
    path: path.join(playLibraryRoot(), findPlayWorld(reference)!.id, 'data', 'blobs', hash),
    asset,
  }
}

export function getPlayerLauncherSigningPublicKey() {
  return getPlayResourceSigningIdentity()
}

function downloadTicketSecret() {
  const secret = String(process.env.PERMISSION_TOKEN_SECRET || '')
  if (secret.length < 32) throw new Error('玩家启动器下载票据密钥未配置')
  return secret
}

export function createPlayerLauncherDownloadTicket(
  claims: Omit<PlayerLauncherDownloadClaims, 'expiresAt'>,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const payload: PlayerLauncherDownloadClaims = { ...claims, expiresAt: nowSeconds + 300 }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', downloadTicketSecret()).update(encoded).digest('base64url')
  return { ticket: `${encoded}.${signature}`, expiresAt: payload.expiresAt }
}

export function verifyPlayerLauncherDownloadTicket(
  ticket: string,
  expected: Omit<PlayerLauncherDownloadClaims, 'expiresAt'>,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  try {
    if (ticket.length > 2_048) return false
    const [encoded, signature, extra] = ticket.split('.')
    if (!encoded || !signature || extra) return false
    const actualSignature = Buffer.from(signature, 'base64url')
    const expectedSignature = crypto.createHmac('sha256', downloadTicketSecret()).update(encoded).digest()
    if (actualSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(actualSignature, expectedSignature)) return false
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PlayerLauncherDownloadClaims
    return claims.subjectId === expected.subjectId
      && claims.permanentMapId === expected.permanentMapId
      && claims.manifestDigest === expected.manifestDigest
      && Number.isInteger(claims.expiresAt)
      && claims.expiresAt > nowSeconds
      && claims.expiresAt <= nowSeconds + 300
  } catch {
    return false
  }
}
