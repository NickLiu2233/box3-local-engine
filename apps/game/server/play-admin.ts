import fs from 'fs';
import os from 'os';
import path from 'path';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

import { getPlayWorlds } from './play-worlds';

const tarStream = require('tar-stream') as {
  extract(): NodeJS.WritableStream & {
    on(
      event: 'entry',
      listener: (
        header: { name: string; type: string; size: number },
        stream: NodeJS.ReadableStream,
        next: (error?: Error) => void,
      ) => void,
    ): void;
  };
};

const idPattern = /^[a-z0-9][a-z0-9-]{0,62}$/;
const MAX_EXPANDED_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_FILES = 200000;
const DIRECTORY_RETRY_ERRORS = new Set(['EBUSY', 'ENOTEMPTY', 'EPERM']);

function removeDirectoryWithRetry(target: string, retries = 5, retryDelay = 120) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay });
      return;
    } catch (error) {
      lastError = error;
      const code = (error as NodeJS.ErrnoException).code;
      if (!DIRECTORY_RETRY_ERRORS.has(code || '') || attempt === retries) throw error;
      // Docker Desktop can briefly report a bind-mounted directory as busy
      // while its file synchronization catches up. Keep the retry synchronous
      // so callers never observe a half-cleaned staging directory.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, retryDelay);
    }
  }
  throw lastError;
}

function cleanupDirectoryQuietly(target: string) {
  try {
    removeDirectoryWithRetry(target);
  } catch (error) {
    // Preserve the installation/validation error; the orphaned path is left
    // for diagnostics if Docker keeps reporting it as busy.
    console.warn(`无法清理游玩包临时目录 ${target}: ${(error as Error).message}`);
  }
}

// fs.cpSync preserves archive file modes. Docker Desktop can represent a
// host-side 0600 file as 0200 in a Linux bind mount, which makes a staged
// world unreadable and later impossible to clean up. Create every destination
// path with the explicit modes used by the Play runtime instead.
function copyReadableFile(source: string, destination: string) {
  fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o755 });
  const input = fs.openSync(source, 'r');
  const output = fs.openSync(destination, 'w', 0o644);
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(input, buffer, 0, buffer.length, null);
      if (bytesRead) fs.writeSync(output, buffer, 0, bytesRead);
    } while (bytesRead);
  } finally {
    fs.closeSync(input);
    fs.closeSync(output);
  }
}

function copyReadableDirectory(source: string, destination: string) {
  fs.mkdirSync(destination, { recursive: true, mode: 0o755 });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyReadableDirectory(sourcePath, destinationPath);
    else if (entry.isFile()) copyReadableFile(sourcePath, destinationPath);
    else throw new Error(`游玩包包含不支持的文件类型：${sourcePath}`);
  }
}

function libraryRoot() {
  const root = process.env.BOX_PLAY_LIBRARY_PATH;
  if (!root) throw new Error('游玩地图库未配置');
  return path.resolve(root);
}

function assertWorldId(id: string) {
  if (!idPattern.test(id)) throw new Error('地图 ID 不合法');
  return id;
}

const mapUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function assertMapUuid(value: unknown, label = '地图 UUID') {
  const mapUuid = String(value || '').toLowerCase();
  if (!mapUuidPattern.test(mapUuid)) throw new Error(`${label}无效`);
  return mapUuid;
}

function assertPublicId(value: unknown) {
  const publicId = String(value || '').trim().toLowerCase();
  if (!idPattern.test(publicId)) {
    throw new Error('地图 ID 只能包含小写字母、数字和连字符，长度为 1–63 个字符');
  }
  return publicId;
}

function safeArchivePath(value: string) {
  const normalized = value.replace(/^\.\//, '').replace(/\/$/, '');
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    normalized.includes('\\') ||
    normalized.split('/').includes('..')
  ) {
    throw new Error('游玩包包含不安全的文件路径');
  }
  return normalized;
}

async function extractArchive(archivePath: string, destination: string) {
  const extract = tarStream.extract();
  let expandedBytes = 0;
  let fileCount = 0;
  let extractionError: Error | undefined;

  extract.on('entry', (header, entry, next) => {
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      if (error && !extractionError) extractionError = error;
      next(error);
    };
    try {
      const relative = safeArchivePath(header.name);
      if (relative.split('/').some((segment) => segment === '.DS_Store' || segment.startsWith('._'))) {
        entry.resume();
        entry.on('end', () => finish());
        return;
      }
      if (header.type !== 'file' && header.type !== 'directory') {
        entry.resume();
        finish(new Error('游玩包不能包含链接或特殊文件'));
        return;
      }
      fileCount += 1;
      expandedBytes += Number(header.size) || 0;
      if (fileCount > MAX_FILES || expandedBytes > MAX_EXPANDED_BYTES) {
        entry.resume();
        finish(new Error('游玩包解压后的内容过大'));
        return;
      }

      const target = path.join(destination, ...relative.split('/'));
      if (!target.startsWith(`${destination}${path.sep}`)) {
        entry.resume();
        finish(new Error('游玩包包含不安全的文件路径'));
        return;
      }
      if (header.type === 'directory') {
        fs.mkdirSync(target, { recursive: true });
        entry.resume();
        entry.on('end', () => finish());
        return;
      }

      fs.mkdirSync(path.dirname(target), { recursive: true });
      // Docker Desktop maps host mode 0600 files to mode 0200 inside Linux
      // bind mounts, making imported worlds unreadable by the Play runtime.
      // Published assets are not secrets; use 0644 so host and container agree.
      const output = fs.createWriteStream(target, { flags: 'wx', mode: 0o644 });
      output.on('error', finish);
      entry.on('error', finish);
      output.on('finish', () => finish());
      entry.pipe(output);
    } catch (error) {
      entry.resume();
      finish(error as Error);
    }
  });

  await pipeline(fs.createReadStream(archivePath), createGunzip(), extract);
  if (extractionError) throw extractionError;
}

function findWorldRoots(root: string) {
  const matches: string[] = [];
  const pending = [{ directory: root, depth: 0 }];
  while (pending.length) {
    const current = pending.pop()!;
    if (
      fs.existsSync(path.join(current.directory, 'manifest.json')) &&
      fs.existsSync(path.join(current.directory, 'data', 'project-state.json')) &&
      fs.existsSync(path.join(current.directory, 'data', 'blobs'))
    ) {
      matches.push(current.directory);
      continue;
    }
    if (current.depth >= 3) continue;
    for (const entry of fs.readdirSync(current.directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        pending.push({ directory: path.join(current.directory, entry.name), depth: current.depth + 1 });
      }
    }
  }
  return matches;
}

function validateWorld(root: string) {
  const rootEntries = fs.readdirSync(root);
  if (rootEntries.some((entry) => entry !== 'manifest.json' && entry !== 'data')) {
    throw new Error('游玩包的地图目录包含未发布的工程文件');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const state = JSON.parse(fs.readFileSync(path.join(root, 'data', 'project-state.json'), 'utf8'));
  const id = assertWorldId(String(manifest.id || ''));
  const publicId = assertPublicId(manifest.publicId || id);
  manifest.mapUuid = assertMapUuid(manifest.mapUuid);
  manifest.mapGroupUuid = assertMapUuid(manifest.mapGroupUuid, '地图组 UUID');
  validateAssetDistribution(manifest.assetDistribution);
  if (!manifest.permissionHash || state.permissionHash !== manifest.permissionHash) {
    throw new Error('地图权限数据不完整或不一致');
  }
  if (!fs.statSync(path.join(root, 'data', 'blobs')).isDirectory()) {
    throw new Error('地图资源目录不存在');
  }
  return { id, publicId, manifest };
}

function validateAssetDistribution(value: unknown) {
  if (value === undefined) return;
  if (!value || typeof value !== 'object') throw new Error('游玩包资源分发配置无效');
  const distribution = value as { formatVersion?: unknown; mode?: unknown; cdnBaseUrl?: unknown; pathTemplate?: unknown; hashes?: unknown };
  if (
    distribution.formatVersion !== 1 ||
    distribution.mode !== 'external-cdn' ||
    distribution.pathTemplate !== 'engine/m/{hash}' ||
    !Array.isArray(distribution.hashes) ||
    distribution.hashes.some((hash) => !/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|[A-Za-z0-9_-]{43})$/.test(String(hash)))
  ) {
    throw new Error('游玩包资源分发配置无效');
  }
  try {
    const url = new URL(String(distribution.cdnBaseUrl || ''));
    if (url.username || url.password || url.search || url.hash || url.protocol !== 'https:') {
      throw new Error('invalid');
    }
  } catch {
    throw new Error('游玩包的外部资源地址不安全，只允许 HTTPS 地址');
  }
}

function validateMapGroupBundle(
  temporaryRoot: string,
  worlds: Array<{ id: string; manifest: Record<string, unknown>; root: string }>,
) {
  if (new Set(worlds.map((world) => world.id)).size !== worlds.length) {
    throw new Error('游玩包包含重复地图');
  }
  if (new Set(worlds.map((world) => world.manifest.mapUuid)).size !== worlds.length) {
    throw new Error('游玩包包含重复的地图 UUID');
  }
  const referenceOwners = new Map<string, string>();
  for (const world of worlds) {
    for (const reference of [world.id, assertPublicId(world.manifest.publicId || world.id)]) {
      const owner = referenceOwners.get(reference);
      if (owner && owner !== world.id) throw new Error('游玩包包含重复的地图 ID');
      referenceOwners.set(reference, world.id);
    }
  }
  if (worlds.length === 1) return;

  const descriptorPath = path.join(temporaryRoot, 'bundle.json');
  if (!fs.existsSync(descriptorPath)) throw new Error('多地图游玩包缺少地图组关系');
  const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
  if (
    descriptor?.formatVersion !== 1 ||
    descriptor?.type !== 'map-group-play-bundle' ||
    !Array.isArray(descriptor.members)
  ) {
    throw new Error('地图组游玩包描述无效');
  }
  const ids = worlds.map((world) => world.id).sort();
  const describedIds = descriptor.members.map((member: { id?: unknown }) => String(member?.id || '')).sort();
  if (JSON.stringify(ids) !== JSON.stringify(describedIds)) {
    throw new Error('地图组游玩包成员与关系描述不一致');
  }
  const mainMaps = worlds.filter((world) => world.manifest.mapRole === 'main');
  if (
    mainMaps.length !== 1 ||
    mainMaps[0].id !== descriptor.mainProjectId ||
    descriptor.mapGroupUuid !== mainMaps[0].manifest.mapUuid ||
    worlds.some((world) =>
      world.manifest.mapGroupId !== descriptor.mapGroupId ||
      world.manifest.mapGroupUuid !== descriptor.mapGroupUuid ||
      world.manifest.mainProjectId !== descriptor.mainProjectId ||
      (world.id === descriptor.mainProjectId
        ? world.manifest.mapRole !== 'main'
        : world.manifest.mapRole !== 'submap'),
    )
  ) {
    throw new Error('地图组游玩包主副地图关系无效');
  }
}

export async function importPlayBundle(archivePath: string) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'box-play-import-'));
  try {
    await extractArchive(archivePath, temporaryRoot);
    const candidates = findWorldRoots(temporaryRoot);
    if (!candidates.length) throw new Error('游玩包中未找到有效地图');
    const validated = candidates.map((candidate) => ({
      ...validateWorld(candidate),
      root: candidate,
    }));
    validateMapGroupBundle(temporaryRoot, validated);
    const root = libraryRoot();
    fs.mkdirSync(root, { recursive: true });
    const installedReferences = new Set(
      getPlayWorlds().flatMap((world) => [world.id, world.publicId]),
    );
    for (const world of validated) {
      if (fs.existsSync(path.join(root, world.id))) {
        throw new Error(`同 ID 地图“${world.manifest.projectName || world.id}”已经存在，请先删除旧地图`);
      }
      if (installedReferences.has(world.id) || installedReferences.has(world.publicId)) {
        throw new Error(`地图 ID“${world.publicId}”已经被其他地图使用`);
      }
    }
    const nonce = `${process.pid}-${Date.now()}`;
    const staging = new Map(
      validated.map((world) => [world.id, path.join(root, `.${world.id}-importing-${nonce}`)]),
    );
    const installed: string[] = [];
    try {
      for (const world of validated) {
        copyReadableDirectory(world.root, staging.get(world.id)!);
      }
      for (const world of validated) {
        fs.renameSync(staging.get(world.id)!, path.join(root, world.id));
        installed.push(world.id);
      }
    } catch (error) {
      for (const target of staging.values()) cleanupDirectoryQuietly(target);
      for (const id of installed) cleanupDirectoryQuietly(path.join(root, id));
      if ((error as NodeJS.ErrnoException).code === 'EROFS' || (error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new Error('地图目录是只读的，请设置 BOX_PLAY_LIBRARY_READ_ONLY=false 后重启游玩端');
      }
      throw error;
    }
    const installedWorlds = getPlayWorlds().filter((world) => installed.includes(world.id));
    const mainProjectId = String(validated[0].manifest.mainProjectId || validated[0].id);
    return {
      world: installedWorlds.find((world) => world.id === mainProjectId) || installedWorlds[0],
      worlds: installedWorlds,
      mapCount: installedWorlds.length,
      mainProjectId,
    };
  } finally {
    cleanupDirectoryQuietly(temporaryRoot);
  }
}

export function deletePlayWorld(id: string) {
  const safeId = assertWorldId(id);
  const installed = getPlayWorlds();
  const target = installed.find((world) => world.id === safeId);
  if (!target) throw new Error('地图不存在');
  // 主地图是地图组的入口。删除它时必须一并删除所有副地图，避免留下
  // 无法正常管理、也无法还原关系的孤立地图。
  const targets = target.mapRole === 'main'
    ? installed.filter((world) => (world.mapGroupId || world.mainProjectId || world.id) === (target.mapGroupId || target.id))
    : [target];
  try {
    for (const world of targets) {
      fs.rmSync(path.join(libraryRoot(), world.id), { recursive: true });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EROFS' || (error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error('地图目录是只读的，请设置 BOX_PLAY_LIBRARY_READ_ONLY=false 后重启游玩端');
    }
    throw error;
  }
  return targets.map((world) => world.id);
}

export type PlayWorldResourceStatus = {
  id: string;
  bytes: number;
  importedAt: string;
};

function directoryBytes(root: string) {
  let total = 0;
  const pending = [root];
  while (pending.length) {
    const current = pending.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (entry.isFile()) total += fs.statSync(target).size;
    }
  }
  return total;
}

/**
 * 资源统计只供已通过服主验证的管理界面按需读取，不加入 getPlayWorlds，
 * 避免普通玩家打开首页时遍历大型资源目录。
 */
export function getPlayWorldResourceStatuses(): PlayWorldResourceStatus[] {
  const root = libraryRoot();
  return getPlayWorlds().map((world) => {
    const directory = path.join(root, world.id);
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
    const directoryStat = fs.statSync(directory);
    return {
      id: world.id,
      bytes: directoryBytes(directory),
      importedAt: String(manifest.installedAt || directoryStat.birthtime.toISOString()),
    };
  });
}

export function updatePlayWorld(id: string, patch: Record<string, unknown>) {
  const protectedFields = ['name', 'author', 'description', 'cover'];
  if (protectedFields.some((field) => Object.prototype.hasOwnProperty.call(patch, field))) {
    throw new Error('游玩端不允许修改地图封面、标题、作者或简介');
  }
  const safeId = assertWorldId(id);
  const manifestPath = path.join(libraryRoot(), safeId, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('地图不存在');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const publicId = typeof patch.publicId === 'string'
    ? assertPublicId(patch.publicId)
    : assertPublicId(manifest.publicId || safeId);
  if (getPlayWorlds().some(
    (world) => world.id !== safeId && (world.id === publicId || world.publicId === publicId),
  )) {
    throw new Error(`地图 ID“${publicId}”已经被其他地图使用`);
  }
  manifest.publicId = publicId;
  const temporaryPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
    fs.renameSync(temporaryPath, manifestPath);
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    if ((error as NodeJS.ErrnoException).code === 'EROFS' || (error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error('地图目录是只读的，请设置 BOX_PLAY_LIBRARY_READ_ONLY=false 后重启游玩端');
    }
    throw error;
  }
  return getPlayWorlds().find((world) => world.id === safeId);
}

export function setPlayWorldGroupAvailability(id: string, playEnabled: boolean) {
  const safeId = assertWorldId(id);
  const installed = getPlayWorlds();
  const target = installed.find((world) => world.id === safeId);
  if (!target) throw new Error('地图不存在');
  const groupId = target.mapGroupId || target.mainProjectId || target.id;
  const members = installed.filter((world) => (world.mapGroupId || world.mainProjectId || world.id) === groupId);
  for (const world of members) {
    const manifestPath = path.join(libraryRoot(), world.id, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.playEnabled = playEnabled;
    const temporaryPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
    fs.renameSync(temporaryPath, manifestPath);
  }
  return getPlayWorlds().filter((world) => (world.mapGroupId || world.mainProjectId || world.id) === groupId);
}
