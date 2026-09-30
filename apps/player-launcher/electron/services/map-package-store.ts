import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { validateDescriptor, validHashShape, verifyHashFile } from './package-descriptor'
import { assertSubdirectories, ensureDirectory, ensureSubdirectories, readRegularFile } from './fs-safe'
import type { InstalledPackage, InstallPlan, PackageAsset, PackageDescriptor, TrustedSigningKey, VerifiedPackageRecord } from '../types'

export function serverStorageKey(serverId: string): string {
  return crypto.createHash('sha256').update(serverId).digest('base64url')
}

function packagePath(root: string, descriptor: PackageDescriptor): string {
  return path.join(root, 'packages', descriptor.permanentMapId, descriptor.manifestDigest)
}

function requiredHashes(descriptor: PackageDescriptor): string[] {
  return descriptor.required.map((asset) => asset.hash)
}

function installedPackage(descriptor: PackageDescriptor): InstalledPackage {
  return {
    permanentMapId: descriptor.permanentMapId,
    releaseVersion: descriptor.releaseVersion,
    manifestDigest: descriptor.manifestDigest,
    requiredCount: descriptor.required.length,
  }
}

async function regularFile(filename: string): Promise<boolean> {
  try {
    const stat = await fs.promises.lstat(filename)
    return stat.isFile() && !stat.isSymbolicLink()
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

async function readVerifiedRecord(filename: string): Promise<VerifiedPackageRecord | null> {
  const contents = await readRegularFile(filename)
  if (!contents) return null
  try { return JSON.parse(contents.toString('utf8')) } catch { return null }
}

async function readVerifiedRecordForIndex(filename: string): Promise<VerifiedPackageRecord | null> {
  const stat = await fs.promises.lstat(filename).catch((error) => error.code === 'ENOENT' ? null : Promise.reject(error))
  if (!stat) return null
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('地图包校验记录不是普通文件，已停止清理')
  const contents = await readRegularFile(filename)
  if (!contents) throw new Error('无法读取地图包引用索引，已停止清理')
  try { return JSON.parse(contents.toString('utf8')) } catch {
    throw new Error('地图包引用索引损坏，已停止清理')
  }
}

function packageRecordMatches(record: VerifiedPackageRecord | null, descriptor: PackageDescriptor): boolean {
  return record?.formatVersion === 1
    && record.permanentMapId === descriptor.permanentMapId
    && record.releaseVersion === descriptor.releaseVersion
    && record.manifestDigest === descriptor.manifestDigest
    && Array.isArray(record.required)
    && JSON.stringify(record.required) === JSON.stringify(requiredHashes(descriptor))
}

async function writeJsonAtomic(filename: string, value: unknown): Promise<void> {
  await fs.promises.mkdir(path.dirname(filename), { recursive: true })
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`
  try {
    await fs.promises.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    await fs.promises.rename(temporary, filename)
  } catch (error) {
    await fs.promises.rm(temporary, { force: true }).catch(() => undefined)
    throw error
  }
}

async function removeTreeIfDirectory(filename: string, userError: string): Promise<boolean> {
  let stat
  try { stat = await fs.promises.lstat(filename) } catch (error) {
    if (error.code === 'ENOENT') return false
    throw new Error(userError)
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(userError)
  await fs.promises.rm(filename, { recursive: true, force: false })
  return true
}

async function* packageDirectories(root: string): AsyncGenerator<{ path: string; record: VerifiedPackageRecord }> {
  let rootStat
  try { rootStat = await fs.promises.lstat(root) } catch (error) {
    if (error.code === 'ENOENT') return
    throw new Error('无法检查本地地图包索引')
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('本地地图包索引目录无效')
  for (const mapEntry of await fs.promises.readdir(root, { withFileTypes: true })) {
    const mapPath = path.join(root, mapEntry.name)
    const mapStat = await fs.promises.lstat(mapPath).catch(() => null)
    if (!mapStat?.isDirectory() || mapStat.isSymbolicLink()) continue
    for (const packageEntry of await fs.promises.readdir(mapPath, { withFileTypes: true })) {
      const current = path.join(mapPath, packageEntry.name)
      const currentStat = await fs.promises.lstat(current).catch(() => null)
      if (!currentStat?.isDirectory() || currentStat.isSymbolicLink()) continue
      const record = await readVerifiedRecordForIndex(path.join(current, 'verified.json'))
      if (record) yield { path: current, record }
    }
  }
}

function availableBytes(root: string): number {
  try {
    const { bavail, bsize } = fs.statfsSync(root)
    return Number(BigInt(bavail) * BigInt(bsize))
  } catch {
    return 0
  }
}

export interface MapPackageStore {
  root: string
  blobRoot: string
  downloadsRoot: string
  ensureDownloadPaths(serverId: string, digest: string): Promise<void>
  plan(serverId: string, descriptor: string | PackageDescriptor, trustedKey: string | TrustedSigningKey): Promise<InstallPlan>
  resumeOffset(serverId: string, descriptor: string | PackageDescriptor, trustedKey: string | TrustedSigningKey, hash: string): Promise<number>
  commit(serverId: string, descriptor: string | PackageDescriptor, trustedKey: string | TrustedSigningKey): Promise<InstalledPackage>
  verifyInstalled(serverId: string, descriptor: string | PackageDescriptor, trustedKey: string | TrustedSigningKey): Promise<InstalledPackage & { descriptor: PackageDescriptor }>
  associateWithServer(serverId: string, accessIds: string[], trustedKey: string | TrustedSigningKey): Promise<number>
  removeServer(serverId: string): Promise<number>
}

export function createMapPackageStore(root: string): MapPackageStore {
  const blobRoot = path.join(root, 'blobs')
  const downloadsRoot = path.join(root, 'downloads')

  async function ensureDownloadPaths(serverKey, digest) {
    await ensureDirectory(root)
    await ensureSubdirectories(root, 'blobs')
    await ensureSubdirectories(root, 'downloads', serverKey, digest)
  }

  async function adoptCompletePartial(serverKey, descriptor, asset) {
    await ensureDownloadPaths(serverKey, descriptor.manifestDigest)
    const partialPath = path.join(downloadsRoot, serverKey, descriptor.manifestDigest, `${asset.hash}.partial`)
    const targetPath = path.join(blobRoot, asset.hash)
    let stat
    try { stat = await fs.promises.lstat(partialPath) } catch (error) {
      if (error.code === 'ENOENT') return false
      throw new Error('无法检查地图下载临时文件')
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== asset.size || !await verifyHashFile(asset.hash, partialPath, asset.size)) {
      if (stat.isFile() && !stat.isSymbolicLink() && stat.size === asset.size) await fs.promises.rm(partialPath, { force: true })
      return false
    }
    const targetExists = await fs.promises.lstat(targetPath).then(() => true, (error) => error.code === 'ENOENT' ? false : Promise.reject(error))
    if (targetExists) await fs.promises.rm(targetPath, { force: true })
    await fs.promises.rename(partialPath, targetPath)
    return true
  }

  async function plan(serverKey, descriptor) {
    await ensureDownloadPaths(serverKey, descriptor.manifestDigest)
    let missingBytes = 0
    const missingHashes = []
    for (const asset of descriptor.required) {
      const blob = path.join(blobRoot, asset.hash)
      if (await verifyHashFile(asset.hash, blob, asset.size) || await adoptCompletePartial(serverKey, descriptor, asset)) continue
      missingHashes.push(asset.hash)
      const partial = path.join(downloadsRoot, serverKey, descriptor.manifestDigest, `${asset.hash}.partial`)
      const stat = await fs.promises.lstat(partial).catch((error) => error.code === 'ENOENT' ? null : Promise.reject(error))
      const partialSize = stat?.isFile() && !stat.isSymbolicLink() && stat.size <= asset.size ? stat.size : 0
      if (stat && partialSize === 0) await fs.promises.rm(partial, { force: true })
      missingBytes += asset.size - partialSize
    }
    const freeBytes = availableBytes(root)
    return {
      permanentMapId: descriptor.permanentMapId,
      manifestDigest: descriptor.manifestDigest,
      requiredCount: descriptor.required.length,
      missingHashes,
      missingBytes,
      availableBytes: freeBytes,
      insufficientStorage: missingBytes > freeBytes,
    }
  }

  return Object.freeze({
    root,
    blobRoot,
    downloadsRoot,
    ensureDownloadPaths(serverId, digest) {
      return ensureDownloadPaths(serverStorageKey(serverId), digest)
    },
    plan(serverId, descriptorInput, trustedKeyInput) {
      const descriptor = validateDescriptor(descriptorInput, trustedKeyInput)
      return plan(serverStorageKey(serverId), descriptor)
    },
    async resumeOffset(serverId, descriptorInput, trustedKeyInput, hash) {
      const descriptor = validateDescriptor(descriptorInput, trustedKeyInput)
      await ensureDownloadPaths(serverStorageKey(serverId), descriptor.manifestDigest)
      const asset = descriptor.required.find((item) => item.hash === hash)
      if (!asset) throw new Error('资源不在签名描述符的必需资源清单中')
      const serverKey = serverStorageKey(serverId)
      if (await adoptCompletePartial(serverKey, descriptor, asset)) return 0
      const partial = path.join(downloadsRoot, serverKey, descriptor.manifestDigest, `${asset.hash}.partial`)
      const stat = await fs.promises.lstat(partial).catch((error) => error.code === 'ENOENT' ? null : Promise.reject(error))
      if (!stat) return 0
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > asset.size) {
        await fs.promises.rm(partial, { force: true })
        return 0
      }
      return stat.size
    },
    async commit(serverId, descriptorInput, trustedKeyInput) {
      const descriptor = validateDescriptor(descriptorInput, trustedKeyInput)
      await ensureDirectory(root)
      await ensureSubdirectories(root, 'blobs')
      await ensureSubdirectories(root, 'packages', descriptor.permanentMapId)
      const serverKey = serverStorageKey(serverId)
      for (const asset of descriptor.required) {
        if (!await verifyHashFile(asset.hash, path.join(blobRoot, asset.hash), asset.size)) {
          throw new Error('地图资源尚未完整校验，暂不能标记为已准备')
        }
      }
      const destination = packagePath(root, descriptor)
      const verifiedPath = path.join(destination, 'verified.json')
      const record = await readVerifiedRecord(verifiedPath)
      if (record && packageRecordMatches(record, descriptor)) {
        if (!record.servers.includes(serverKey)) {
          record.servers.push(serverKey)
          await writeJsonAtomic(verifiedPath, record)
        }
        return installedPackage(descriptor)
      }
      if (await fs.promises.lstat(destination).then(() => true, (error) => error.code === 'ENOENT' ? false : Promise.reject(error))) {
        await removeTreeIfDirectory(destination, '本地地图包目录状态异常，已停止修复')
      }
      const parent = path.dirname(destination)
      const temporary = path.join(parent, `.${descriptor.manifestDigest}.${process.pid}.${crypto.randomUUID()}.tmp`)
      await fs.promises.mkdir(temporary)
      try {
        await writeJsonAtomic(path.join(temporary, 'descriptor.json'), descriptor)
        await writeJsonAtomic(path.join(temporary, 'verified.json'), {
          formatVersion: 1,
          permanentMapId: descriptor.permanentMapId,
          releaseVersion: descriptor.releaseVersion,
          manifestDigest: descriptor.manifestDigest,
          required: requiredHashes(descriptor),
          servers: [serverKey],
          verifiedAt: Math.floor(Date.now() / 1000),
        })
        await fs.promises.rename(temporary, destination)
      } catch (error) {
        await fs.promises.rm(temporary, { recursive: true, force: true })
        throw error
      }
      return installedPackage(descriptor)
    },
    async verifyInstalled(serverId, descriptorInput, trustedKeyInput) {
      const descriptor = validateDescriptor(descriptorInput, trustedKeyInput)
      const destination = packagePath(root, descriptor)
      if (!await assertSubdirectories(root, 'packages', descriptor.permanentMapId, descriptor.manifestDigest)) {
        throw new Error('本地地图资源包尚未准备完成')
      }
      const dirStat = await fs.promises.lstat(destination).catch(() => null)
      if (!dirStat?.isDirectory() || dirStat.isSymbolicLink()) throw new Error('本地地图资源包尚未准备完成')
      const record = await readVerifiedRecord(path.join(destination, 'verified.json'))
      if (!packageRecordMatches(record, descriptor)) throw new Error('本地地图包状态损坏，请重新准备地图')
      if (!Array.isArray(record.servers) || !record.servers.includes(serverStorageKey(serverId))) {
        throw new Error('该服务器尚未关联这份地图资源，请重新准备地图')
      }
      for (const asset of descriptor.required) {
        if (!await verifyHashFile(asset.hash, path.join(blobRoot, asset.hash), asset.size)) {
          throw new Error('本地地图资源缺失或损坏，请重新准备地图')
        }
      }
      return { ...installedPackage(descriptor), descriptor }
    },
    async associateWithServer(serverId, accessIds, trustedKeyInput) {
      if (!Array.isArray(accessIds) || accessIds.length > 20_000) throw new Error('服务器地图目录超出本地登记上限')
      const acceptedIds = new Set(accessIds)
      const key = serverStorageKey(serverId)
      let associated = 0
      for await (const entry of packageDirectories(path.join(root, 'packages'))) {
        const descriptorPath = path.join(entry.path, 'descriptor.json')
        const contents = await readRegularFile(descriptorPath)
        if (!contents) continue
        let descriptor
        try { descriptor = validateDescriptor(contents.toString('utf8'), trustedKeyInput) } catch { continue }
        if (!acceptedIds.has(descriptor.accessId) || !packageRecordMatches(entry.record, descriptor) || entry.record.servers.includes(key)) continue
        const filesExist = await Promise.all(descriptor.required.map((asset) => regularFile(path.join(blobRoot, asset.hash))))
        if (!filesExist.every(Boolean)) continue
        entry.record.servers.push(key)
        await writeJsonAtomic(path.join(entry.path, 'verified.json'), entry.record)
        associated += 1
      }
      return associated
    },
    async removeServer(serverId) {
      await ensureDirectory(root)
      await ensureSubdirectories(root, 'downloads')
      const key = serverStorageKey(serverId)
      const packagesRoot = path.join(root, 'packages')
      const allPackages = []
      for await (const entry of packageDirectories(packagesRoot)) allPackages.push(entry)
      let removedPackages = 0
      for (const entry of allPackages) {
        if (!Array.isArray(entry.record.servers) || !entry.record.servers.includes(key)) continue
        entry.record.servers = entry.record.servers.filter((owner) => owner !== key)
        if (entry.record.servers.length === 0) {
          await removeTreeIfDirectory(entry.path, '本地地图包目录状态异常，已停止删除以保护数据')
          removedPackages += 1
        } else {
          await writeJsonAtomic(path.join(entry.path, 'verified.json'), entry.record)
        }
      }
      const referenced = new Set()
      for await (const entry of packageDirectories(packagesRoot)) {
        if (!Array.isArray(entry.record.required) || entry.record.required.some((hash) => !validHashShape(hash))) {
          throw new Error('地图包资源引用无效，已停止清理')
        }
        for (const hash of entry.record.required) referenced.add(hash)
      }
      const blobRootStat = await fs.promises.lstat(blobRoot).catch((error) => error.code === 'ENOENT' ? null : Promise.reject(error))
      if (blobRootStat) {
        if (!blobRootStat.isDirectory() || blobRootStat.isSymbolicLink()) throw new Error('本地地图资源目录状态异常，已停止清理')
        for (const name of await fs.promises.readdir(blobRoot)) {
          if (!validHashShape(name) || referenced.has(name)) continue
          const filename = path.join(blobRoot, name)
          if (await regularFile(filename)) await fs.promises.rm(filename)
        }
      }
      await removeTreeIfDirectory(path.join(downloadsRoot, key), '该服务器的地图下载目录状态异常，已停止删除')
      return removedPackages
    },
  })
}
