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
  if (!manifest.permissionHash || state.permissionHash !== manifest.permissionHash) {
    throw new Error('地图权限数据不完整或不一致');
  }
  if (!fs.statSync(path.join(root, 'data', 'blobs')).isDirectory()) {
    throw new Error('地图资源目录不存在');
  }
  return { id, manifest };
}

export async function importPlayBundle(archivePath: string) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'box-play-import-'));
  try {
    await extractArchive(archivePath, temporaryRoot);
    const candidates = findWorldRoots(temporaryRoot);
    if (candidates.length !== 1) {
      throw new Error(candidates.length ? '游玩包中包含多个地图' : '游玩包中未找到有效地图');
    }
    const { id } = validateWorld(candidates[0]);
    const root = libraryRoot();
    fs.mkdirSync(root, { recursive: true });
    const destination = path.join(root, id);
    if (fs.existsSync(destination)) throw new Error('同 ID 地图已经存在，请先删除旧地图');
    const staging = path.join(root, `.${id}-importing-${process.pid}-${Date.now()}`);
    try {
      fs.cpSync(candidates[0], staging, { recursive: true, errorOnExist: true });
      fs.renameSync(staging, destination);
    } catch (error) {
      fs.rmSync(staging, { recursive: true, force: true });
      if ((error as NodeJS.ErrnoException).code === 'EROFS' || (error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new Error('地图目录是只读的，请设置 BOX_PLAY_LIBRARY_READ_ONLY=false 后重启游玩端');
      }
      throw error;
    }
    return getPlayWorlds().find((world) => world.id === id);
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

function safeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 80) || '作品';
}

export function createPlayBundle(id: string) {
  const safeId = assertWorldId(id);
  const world = getPlayWorlds().find((entry) => entry.id === safeId);
  if (!world) throw new Error('地图不存在或数据不完整');
  const archive = archiver('tar', { gzip: true, gzipOptions: { level: 6 } });
  archive.directory(path.join(libraryRoot(), safeId), safeId, (entry) => {
    const segments = entry.name.split('/');
    if (segments.some((segment) => segment === '.DS_Store' || segment.startsWith('._'))) {
      return false;
    }
    return entry;
  });
  return {
    archive,
    filename: `${safeFilename(world.name)}_${safeId}_${safeFilename(world.version || 'latest')}.boxplay`,
  };
}
