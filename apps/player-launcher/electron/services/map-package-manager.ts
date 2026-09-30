import * as fs from 'node:fs'
import * as path from 'node:path'
import { normalizeEndpoint } from './api-transport'
import { serverStorageKey, createMapPackageStore } from './map-package-store'
import { validateDescriptor, verifyHashFile } from './package-descriptor'
import type { ApiRequest, AssetDownloadOptions, AssetDownloadProgress, AssetDownloadResult, InstallAssetPayload, InstalledPackage, InstallPlan, PackageDescriptor, PlayerServerRecord, PlayerServerState, TrustedSigningKey } from '../types'

interface InstallResult {
  hash: string
  alreadyPresent: boolean
  bytesWritten: number
}

export interface MapPackageManager {
  prepare(serverId: string, descriptor: string | PackageDescriptor, trustedSigningKey: string | TrustedSigningKey): Promise<InstallPlan>
  resumeOffset(serverId: string, descriptor: string | PackageDescriptor, trustedSigningKey: string | TrustedSigningKey, hash: string): Promise<number>
  install(input: InstallAssetPayload): Promise<InstallResult>
  commit(serverId: string, descriptor: string | PackageDescriptor, trustedSigningKey: string | TrustedSigningKey): Promise<InstalledPackage>
  associate(serverId: string, accessIds: string[], trustedSigningKey: string | TrustedSigningKey): Promise<number>
  verifyInstalled(serverId: string, descriptor: string | PackageDescriptor, trustedSigningKey: string | TrustedSigningKey): Promise<InstalledPackage & { descriptor: PackageDescriptor }>
  removeServer(serverId: string): Promise<number>
}

interface MapPackageManagerOptions {
  root: string
  serverStore: { load(): PlayerServerState }
  apiTransport: { downloadAsset(options: AssetDownloadOptions): Promise<AssetDownloadResult> }
  onProgress?: (progress: AssetDownloadProgress) => void
}

function apiErrorMessage(body: string, status: number): string {
  try {
    const data = JSON.parse(body)
    if (typeof data.message === 'string') return data.message
  } catch { /* The server may return a non-JSON error body. */ }
  return `地图资源下载失败（HTTP ${status}）`
}

export function validateBlobRequest(request: ApiRequest, server: PlayerServerRecord, descriptor: PackageDescriptor, hash: string): void {
  if (request.method !== 'GET' || request.body != null) throw new Error('地图资源下载必须使用无请求体的 GET 请求')
  let url
  try { url = new URL(request.url) } catch { throw new Error('地图资源下载地址无效') }
  const suffix = `/api/player-launcher/maps/${descriptor.accessId}/blobs/${hash}`
  if (!url.pathname.endsWith(suffix) || url.origin !== new URL(server.endpoint).origin) {
    throw new Error('地图资源下载地址与签名描述符不匹配')
  }
  const ticket = url.searchParams.get('ticket') || ''
  if (url.searchParams.get('digest') !== descriptor.manifestDigest || !ticket || ticket.length > 2048) {
    throw new Error('地图下载授权缺失或与当前版本不匹配')
  }
}

export function createMapPackageManager({ root, serverStore, apiTransport, onProgress = () => {} }: MapPackageManagerOptions): MapPackageManager {
  const store = createMapPackageStore(root)

  function requireServer(serverId: string): PlayerServerRecord {
    const server = serverStore.load().servers.find((item) => item.id === serverId)
    if (!server) throw new Error('这个服务器已不在列表中')
    return server
  }

  return Object.freeze({
    prepare(serverId: string, descriptor: string | PackageDescriptor, trustedSigningKey: string | TrustedSigningKey): Promise<InstallPlan> {
      requireServer(serverId)
      return store.plan(serverId, descriptor, trustedSigningKey)
    },
    resumeOffset(serverId: string, descriptor: string | PackageDescriptor, trustedSigningKey: string | TrustedSigningKey, hash: string): Promise<number> {
      requireServer(serverId)
      return store.resumeOffset(serverId, descriptor, trustedSigningKey, hash)
    },
    async install({ payload }: InstallAssetPayload): Promise<InstallResult> {
      const server = requireServer(payload.serverId)
      const request = payload.request
      if (normalizeEndpoint(request.endpoint).toString().replace(/\/$/, '') !== server.endpoint) {
        throw new Error('地图资源下载服务器与已选择的服务器不匹配')
      }
      const descriptor = validateDescriptor(payload.descriptor, payload.trustedSigningKey)
      validateBlobRequest(request, server, descriptor, payload.hash)
      const asset = descriptor.required.find((item) => item.hash === payload.hash)
      if (!asset) throw new Error('资源不在签名描述符的必需资源清单中')
      const serverKey = serverStorageKey(payload.serverId)
      await store.ensureDownloadPaths(payload.serverId, descriptor.manifestDigest)
      const target = path.join(store.blobRoot, asset.hash)
      if (await verifyHashFile(asset.hash, target, asset.size)) {
        return { hash: asset.hash, alreadyPresent: true, bytesWritten: 0 }
      }
      const temp = path.join(store.downloadsRoot, serverKey, descriptor.manifestDigest, `${asset.hash}.partial`)
      const partialStat = await fs.promises.lstat(temp).catch((error) => error.code === 'ENOENT' ? null : Promise.reject(error))
      let existingBytes = partialStat?.isFile() && !partialStat.isSymbolicLink() && partialStat.size <= asset.size ? partialStat.size : 0
      if (partialStat && existingBytes === 0) await fs.promises.rm(temp, { force: true })
      if (existingBytes === asset.size) {
        if (await verifyHashFile(asset.hash, temp, asset.size)) {
          await fs.promises.rm(target, { force: true })
          await fs.promises.rename(temp, target)
          return { hash: asset.hash, alreadyPresent: true, bytesWritten: 0 }
        }
        await fs.promises.rm(temp, { force: true })
        existingBytes = 0
      }
      await fs.promises.mkdir(store.root, { recursive: true })
      const free = fs.statfsSync(store.root)
      const availableBytes = Number(BigInt(free.bavail) * BigInt(free.bsize))
      if (availableBytes < asset.size - existingBytes) throw new Error('设备可用空间不足，无法安全准备该地图')
      const rangeHeader = (request.headers || []).find(([name]) => String(name).toLowerCase() === 'range')?.[1]
      if ((existingBytes === 0 && rangeHeader) || (existingBytes > 0 && rangeHeader !== `bytes=${existingBytes}-`)) {
        throw new Error('地图资源续传位置与本地临时文件不一致')
      }
      const result = await apiTransport.downloadAsset({
        request,
        filename: temp,
        expectedSize: asset.size,
        expectedContentType: asset.contentType,
        existingBytes,
        hash: asset.hash,
        onProgress,
      })
      if (![200, 206].includes(result.status)) throw new Error(apiErrorMessage(result.body, result.status))
      if (!await verifyHashFile(asset.hash, temp, asset.size)) {
        await fs.promises.rm(temp, { force: true })
        throw new Error('下载的地图资源完整性校验失败')
      }
      await fs.promises.rm(target, { force: true })
      await fs.promises.rename(temp, target)
      return { hash: asset.hash, alreadyPresent: false, bytesWritten: result.downloadedBytes }
    },
    commit(serverId: string, descriptor: string | PackageDescriptor, trustedSigningKey: string | TrustedSigningKey): Promise<InstalledPackage> {
      requireServer(serverId)
      return store.commit(serverId, descriptor, trustedSigningKey)
    },
    associate(serverId: string, accessIds: string[], trustedSigningKey: string | TrustedSigningKey): Promise<number> {
      requireServer(serverId)
      return store.associateWithServer(serverId, accessIds, trustedSigningKey)
    },
    verifyInstalled(serverId: string, descriptor: string | PackageDescriptor, trustedSigningKey: string | TrustedSigningKey): Promise<InstalledPackage & { descriptor: PackageDescriptor }> {
      requireServer(serverId)
      return store.verifyInstalled(serverId, descriptor, trustedSigningKey)
    },
    removeServer(serverId: string): Promise<number> {
      return store.removeServer(serverId)
    },
  })
}
