import fs from 'fs';
import os from 'os';
import path from 'path';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';

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

function libraryRoot() {
  const root = process.env.BOX_PLAY_LIBRARY_PATH;
  if (!root) throw new Error('游玩地图库未配置');
  return path.resolve(root);
}

function assertWorldId(id: string) {
  if (!idPattern.test(id)) throw new Error('地图 ID 不合法');
  return id;
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
  if (!manifest.permissionHash || state.permissionHash !== manifest.permissionHash) {
    throw new Error('地图权限数据不完整或不一致');
  }
  if (!fs.statSync(path.join(root, 'data', 'blobs')).isDirectory()) {
    throw new Error('地图资源目录不存在');
  }
  return { id, publicId, manifest };
}

function validateMapGroupBundle(
  temporaryRoot: string,
  worlds: Array<{ id: string; manifest: Record<string, unknown>; root: string }>,
) {
  if (new Set(worlds.map((world) => world.id)).size !== worlds.length) {
    throw new Error('游玩包包含重复地图');
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
    worlds.some((world) =>
      world.manifest.mapGroupId !== descriptor.mapGroupId ||
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
        fs.cpSync(world.root, staging.get(world.id)!, { recursive: true, errorOnExist: true });
      }
      for (const world of validated) {
        fs.renameSync(staging.get(world.id)!, path.join(root, world.id));
        installed.push(world.id);
      }
    } catch (error) {
      for (const target of staging.values()) fs.rmSync(target, { recursive: true, force: true });
      for (const id of installed) fs.rmSync(path.join(root, id), { recursive: true, force: true });
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
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

export function deletePlayWorld(id: string) {
  const safeId = assertWorldId(id);
  const target = path.join(libraryRoot(), safeId);
  if (!fs.existsSync(target)) throw new Error('地图不存在');
  try {
    fs.rmSync(target, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EROFS' || (error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error('地图目录是只读的，请设置 BOX_PLAY_LIBRARY_READ_ONLY=false 后重启游玩端');
    }
    throw error;
  }
}

export function updatePlayWorld(id: string, patch: Record<string, unknown>) {
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
  if (typeof patch.name === 'string' && patch.name.trim()) manifest.projectName = patch.name.trim().slice(0, 40);
  if (typeof patch.author === 'string') manifest.author = patch.author.trim().slice(0, 80);
  if (typeof patch.description === 'string') manifest.description = patch.description.trim().slice(0, 300);
  if (typeof patch.cover === 'string') {
    if (patch.cover && (!/^data:image\/(png|jpeg|webp);base64,/.test(patch.cover) || Buffer.byteLength(patch.cover, 'utf8') > 2 * 1024 * 1024)) {
      throw new Error('封面必须是小于 2MB 的 PNG、JPG 或 WebP 图片');
    }
    manifest.cover = patch.cover;
  }
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

function safeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 80) || '作品';
}

export function createPlayBundle(id: string) {
  const safeId = assertWorldId(id);
  const installed = getPlayWorlds();
  const world = installed.find((entry) => entry.id === safeId);
  if (!world) throw new Error('地图不存在或数据不完整');
  const groupId = world.mapGroupId || world.id;
  const worlds = installed.filter((entry) => (entry.mapGroupId || entry.id) === groupId);
  const mainProjectId = world.mainProjectId || world.id;
  const main = worlds.find((entry) => entry.id === mainProjectId);
  if (!main) throw new Error('地图组缺少主地图，无法导出完整游玩包');
  const archive = archiver('tar', { gzip: true, gzipOptions: { level: 6 } });
  archive.append(JSON.stringify({
    formatVersion: 1,
    type: 'map-group-play-bundle',
    mapGroupId: groupId,
    mainProjectId,
    createdAt: new Date().toISOString(),
    members: worlds.map((entry) => ({
      id: entry.id,
      publicId: entry.publicId,
      name: entry.name,
      version: entry.version,
      mapRole: entry.mapRole,
      mainProjectId: entry.mainProjectId,
    })),
  }, null, 2), { name: 'bundle.json' });
  for (const entry of worlds) {
    archive.directory(path.join(libraryRoot(), entry.id), `worlds/${entry.id}`, (archiveEntry) => {
      const segments = archiveEntry.name.split('/');
      if (segments.some((segment) => segment === '.DS_Store' || segment.startsWith('._'))) {
        return false;
      }
      return archiveEntry;
    });
  }
  return {
    archive,
    filename: `${safeFilename(main.name)}_${groupId}_${safeFilename(main.version || 'latest')}.boxplay`,
    mapCount: worlds.length,
    mapGroupId: groupId,
  };
}
