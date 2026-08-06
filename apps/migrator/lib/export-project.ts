import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { once } from 'events';

const EXACT_CID_PATTERN = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
const CID_PATTERN = /Qm[1-9A-HJ-NP-Za-km-z]{44}/g;
// Cloud projects contain both CIDv0 objects (`Qm…`) and url-safe SHA-256
// asset hashes (43 base64url characters).  They use the same local blob
// store, so both have to be carried into an offline project export.
const EXACT_CONTENT_HASH_PATTERN = /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|[A-Za-z0-9_-]{43})$/;

type Limits = { maxBlobs: number; maxTotalBytes: number; maxBlobBytes: number };
type ExportInput = { hash: string; projectName?: string };
export type ResourceSourceKind = 'content' | 'voxel-model' | 's3-model';
type ReferencedResource = { hash: string; sourceKind: ResourceSourceKind };
export type SkippedBlob = { hash: string; parentHash?: string; reason: string };
export type MigrationProgress = {
  stage: 'validating' | 'resolving' | 'scanning' | 'downloading' | 'packaging';
  blobCount: number;
  totalBytes: number;
  discoveredCount: number;
  traversedCount: number;
  skippedCount: number;
  skippedBlobs: SkippedBlob[];
  activeDownloadCount: number;
  detail: string;
  currentHash?: string;
  parentHash?: string;
  source?: string;
  attempt?: number;
};

function positiveInteger(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function limits(): Limits {
  return {
    maxBlobs: positiveInteger('BOX_MIGRATOR_MAX_BLOBS', 20_000),
    maxTotalBytes: positiveInteger('BOX_MIGRATOR_MAX_TOTAL_BYTES', 1024 * 1024 * 1024),
    maxBlobBytes: positiveInteger('BOX_MIGRATOR_MAX_BLOB_BYTES', 64 * 1024 * 1024),
  };
}

function contentUrls(hash: string) {
  const urls: string[] = [];
  const apiBase = process.env.BOX_MIGRATOR_CONTENT_API_URL?.trim();
  if (apiBase) {
    urls.push(apiBase.includes('{hash}')
      ? apiBase.replaceAll('{hash}', encodeURIComponent(hash))
      : `${apiBase.replace(/\/$/, '')}/block/get?arg=${encodeURIComponent(hash)}`);
  }
  const base = process.env.BOX_MIGRATOR_CONTENT_URL?.trim();
  if (base) {
    urls.push(base.includes('{hash}')
      ? base.replaceAll('{hash}', encodeURIComponent(hash))
      : `${base.replace(/\/$/, '')}/block/${encodeURIComponent(hash)}`);
  }
  if (!urls.length) {
    throw new Error('迁移器尚未配置 BOX_MIGRATOR_CONTENT_API_URL 或 BOX_MIGRATOR_CONTENT_URL');
  }
  return urls;
}

function ossURL(hash: string, prefix: string) {
  const base = (process.env.BOX_MIGRATOR_OSS_URL?.trim() || 'https://assets.box3.fun').replace(/\/$/, '');
  return `${base}${prefix}${encodeURIComponent(hash)}`;
}

function ossUrls(hash: string) {
  // Cloud OSS assets are stored by category. The project graph only records
  // the content hash, so probe the public categories used by creator. This
  // is deliberately separate from `/block`, which only accepts IPFS refs.
  return ['/engine/m/', '/engine/s/', '/avatar/m/', '/tmp/', '/engine/rusty/']
    .map((prefix) => ossURL(hash, prefix));
}

function safeProjectName(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : '';
  return (name || '云端迁移地图').slice(0, 80);
}

function fileName(name: string, hash: string) {
  const safe = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || '云端迁移地图';
  return `${safe.slice(0, 60)}_${hash.slice(-10)}.boxproject`;
}

/**
 * A .boxproject is imported into a Local Engine project directory.  Besides
 * the map blobs, that directory must contain the engine's bundled client and
 * avatar blobs: production launchers deliberately do not generate them on
 * demand.  The image supplies this read-only template separately so that a
 * cloud import is as runnable as a project created locally.
 */
function runtimeTemplatePath() {
  const template = process.env.BOX_MIGRATOR_RUNTIME_TEMPLATE?.trim();
  if (!template) throw new Error('迁移器镜像缺少本地运行时资源模板');
  return path.resolve(template);
}

async function seedRuntimeAssets(sourceRoot: string) {
  const template = runtimeTemplatePath();
  const requiredClientBlob = path.join(
    template,
    'blobs',
    'QmUQg6ayL7bLmdso8b4Hc7nfxBUSJawPsQ7vsSUPhXNdv5',
  );
  if (!(await fs.stat(requiredClientBlob).catch(() => undefined))) {
    throw new Error('迁移器镜像中的本地运行时资源模板不完整');
  }
  await fs.cp(template, sourceRoot, { recursive: true, force: false });
}

export async function fetchBlob(
  hash: string,
  cap: number,
  onAttempt: (source: string, attempt: number) => void = () => undefined,
  withRequestSlot: <T>(task: () => Promise<T>) => Promise<T> = async (task) => task(),
  sourceKind: ResourceSourceKind = 'content',
) {
  const headers = new Headers();
  const authorization = process.env.BOX_MIGRATOR_AUTHORIZATION?.trim();
  if (authorization) headers.set('authorization', authorization);
  const errors: string[] = [];
  const timeoutMs = positiveInteger('BOX_MIGRATOR_REQUEST_TIMEOUT_MS', 8_000);
  const groups = sourceKind === 's3-model'
    ? [[ossURL(hash, '/engine/m/')]]
    : sourceKind === 'voxel-model'
      ? (EXACT_CID_PATTERN.test(hash)
        ? [contentUrls(hash), [ossURL(hash, '/engine/m/')]]
        : [[ossURL(hash, '/engine/m/')]])
      : [EXACT_CID_PATTERN.test(hash) ? contentUrls(hash) : ossUrls(hash)];

  for (const urls of groups) {
    const controllers = urls.map(() => new AbortController());
    try {
      return await Promise.any(urls.map(async (url, index) => {
        let source = url;
        try {
          source = new URL(url).hostname;
        } catch {}
        try {
          return await withRequestSlot(async () => {
            onAttempt(source, 1);
            const response = await fetch(url, {
              headers,
              cache: 'no-store',
              signal: AbortSignal.any([controllers[index].signal, AbortSignal.timeout(timeoutMs)]),
            });
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            const declaredLength = Number(response.headers.get('content-length') || '0');
            if (declaredLength > cap) throw new Error(`blob ${hash} 超过单文件大小限制`);
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.byteLength > cap) throw new Error(`blob ${hash} 超过单文件大小限制`);
            return bytes;
          });
        } catch (error) {
          errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      }));
    } catch {
      // Match boxes' migrateVoxel behavior: only after every configured IPFS
      // endpoint fails do voxel models fall back to OSS /engine/m/.
    } finally {
      for (const controller of controllers) controller.abort();
    }
  }
  throw new Error(`无法下载 blob ${hash}（${errors.join('；') || 'network error'}）`);
}

type JSONContainer = Record<string, unknown> | unknown[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function parseJSON(bytes: Uint8Array): JSONContainer | undefined {
  try {
    const value = JSON.parse(Buffer.from(bytes).toString('utf8'));
    return value && typeof value === 'object' ? value as JSONContainer : undefined;
  } catch {
    return undefined;
  }
}

export function referencedHashes(value: unknown, result = new Set<string>()) {
  if (typeof value === 'string') {
    if (EXACT_CONTENT_HASH_PATTERN.test(value)) result.add(value);
    return result;
  }
  if (Array.isArray(value)) {
    for (const child of value) referencedHashes(child, result);
    return result;
  }
  if (!value || typeof value !== 'object') return result;
  for (const [key, child] of Object.entries(value)) {
    // Version history is intentionally excluded: a migration creates one
    // editable snapshot of the current master branch, not an archive.
    // Asset catalog previewImage values are display-only filenames. Some
    // happen to look exactly like a CID while others append `.jpeg`; neither
    // is a runtime dependency of the referenced mesh/audio asset.
    if (key !== 'prevHash' && key !== 'previewImage') referencedHashes(child, result);
  }
  return result;
}

/**
 * Preserve the asset type carried by boxes' project schema. In particular,
 * AssetType.VOXEL_MODEL (2) may use a Qm hash while living in OSS rather than
 * IPFS. Model metadata's dataHash is always retrieved from the same OSS model
 * namespace.
 */
export function referencedResources(
  value: unknown,
  parentSourceKind: ResourceSourceKind = 'content',
): ReferencedResource[] {
  const resources = new Map<string, ResourceSourceKind>();
  const priority: Record<ResourceSourceKind, number> = {
    content: 0,
    'voxel-model': 1,
    's3-model': 2,
  };
  const add = (hash: string, sourceKind: ResourceSourceKind) => {
    if (!EXACT_CONTENT_HASH_PATTERN.test(hash)) return;
    const previous = resources.get(hash);
    if (!previous || priority[sourceKind] > priority[previous]) resources.set(hash, sourceKind);
  };
  const visit = (node: unknown, sourceKind: ResourceSourceKind) => {
    if (typeof node === 'string') {
      add(node, sourceKind === 's3-model' ? 's3-model' : 'content');
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) visit(child, sourceKind);
      return;
    }
    if (!isRecord(node)) return;

    const voxelHash = node.type === 2 && typeof node.hash === 'string'
      ? node.hash
      : undefined;
    if (voxelHash) add(voxelHash, 'voxel-model');

    for (const [key, child] of Object.entries(node)) {
      if (key === 'prevHash' || key === 'previewImage') continue;
      if (key === 'hash' && voxelHash === child) continue;
      if (key === 'dataHash'
        && (sourceKind === 'voxel-model' || sourceKind === 's3-model')
        && typeof child === 'string') {
        add(child, 's3-model');
        continue;
      }
      visit(child, sourceKind);
    }
  };
  visit(value, parentSourceKind);
  return [...resources].map(([hash, sourceKind]) => ({ hash, sourceKind }));
}

function referencedCidsInBytes(bytes: Uint8Array) {
  // Group/extra projects can be binary records instead of JSON. Their mesh
  // entries still embed CIDv0 strings directly, and must be copied before
  // local prebaking can resolve voxel data offline.
  return new Set(Buffer.from(bytes).toString('latin1').match(CID_PATTERN) || []);
}

export async function drainDynamicQueue<T>(
  initial: T[],
  concurrency: number,
  keyOf: (item: T) => string,
  worker: (item: T) => Promise<Iterable<T>>,
) {
  const queue = [...initial];
  const scheduled = new Set(initial.map(keyOf));
  let cursor = 0;
  let active = 0;
  let fatalError: unknown;

  await new Promise<void>((resolve, reject) => {
    const pump = () => {
      if (fatalError) {
        if (active === 0) reject(fatalError);
        return;
      }
      while (active < concurrency && cursor < queue.length) {
        const item = queue[cursor++];
        active += 1;
        void worker(item).then((children) => {
          for (const child of children) {
            const key = keyOf(child);
            if (scheduled.has(key)) continue;
            scheduled.add(key);
            queue.push(child);
          }
        }).catch((error) => {
          fatalError = error;
        }).finally(() => {
          active -= 1;
          if (!fatalError && active === 0 && cursor >= queue.length) {
            resolve();
            return;
          }
          pump();
        });
      }
      if (active === 0 && cursor >= queue.length) resolve();
    };
    pump();
  });
}

export function createConcurrencyGate(limit: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async function withSlot<T>(task: () => Promise<T>) {
    if (active >= limit) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    } else {
      active += 1;
    }
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active -= 1;
    }
  };
}

async function runTar(root: string, archive: string) {
  // BSD tar on macOS otherwise writes AppleDouble `._*` entries for extended
  // attributes. The creator importer's archive allowlist correctly rejects
  // those entries, so disable metadata copying for portable .boxproject files.
  const child = spawn('tar', ['-czf', archive, '-C', root, 'project.json', 'source'], {
    stdio: 'ignore',
    env: { ...process.env, COPYFILE_DISABLE: '1' },
  });
  const [code] = await once(child, 'close') as [number | null];
  if (code !== 0) throw new Error('无法创建 .boxproject 压缩包');
}

export type GeneratedProject = { archivePath: string; filename: string; blobCount: number; totalBytes: number; skippedBlobs: SkippedBlob[] };

export async function generateProjectArchive(
  input: ExportInput,
  onProgress: (progress: MigrationProgress) => void = () => undefined,
): Promise<GeneratedProject> {
  const rootHash = String(input.hash || '').trim();
  if (!EXACT_CID_PATTERN.test(rootHash)) throw new Error('地图工程 hash 必须是有效的 Qm CIDv0');

  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'box-migrator-'));
  const blobsRoot = path.join(temporaryRoot, 'source', 'blobs');
  const archivePath = path.join(os.tmpdir(), `box-migrator-${randomUUID()}.boxproject`);
  const persistentCacheRoot = process.env.BOX_MIGRATOR_CACHE_DIR?.trim()
    ? path.resolve(process.env.BOX_MIGRATOR_CACHE_DIR)
    : undefined;
  const projectName = safeProjectName(input.projectName);
  const limit = limits();
  // Fetching and traversing are separate states. Permission and version
  // documents are read once during validation, but must still be traversed
  // later; conflating these states silently skipped their child resources.
  const retrieved = new Set<string>();
  const inFlight = new Map<string, Promise<Uint8Array>>();
  const traversed = new Set<string>();
  const downloaded = new Set<string>();
  const discovered = new Set<string>();
  const skippedHashes = new Set<string>();
  const skippedBlobs: SkippedBlob[] = [];
  // Match boxes' preload model: create all lightweight retrieval promises,
  // then let the content layer gate only true network misses. This prevents
  // requests waiting for a network slot from blocking later disk-cache hits.
  const scanConcurrency = Math.min(
    limit.maxBlobs,
    positiveInteger('BOX_MIGRATOR_SCAN_CONCURRENCY', limit.maxBlobs),
  );
  const requestConcurrency = Math.min(128, positiveInteger('BOX_MIGRATOR_CONCURRENCY', 32));
  const withRequestSlot = createConcurrencyGate(requestConcurrency);
  let activeDownloadCount = 0;
  let totalBytes = 0;
  const progress: MigrationProgress = {
    stage: 'validating',
    blobCount: 0,
    totalBytes: 0,
    discoveredCount: 0,
    traversedCount: 0,
    skippedCount: 0,
    skippedBlobs: [],
    activeDownloadCount: 0,
    detail: '迁移任务已创建，正在连接云端…',
  };
  const report = (patch: Partial<MigrationProgress>) => {
    Object.assign(progress, patch, {
      blobCount: downloaded.size,
      totalBytes,
      discoveredCount: discovered.size,
      traversedCount: traversed.size,
      skippedCount: skippedBlobs.length,
      skippedBlobs: [...skippedBlobs],
      activeDownloadCount,
    });
    onProgress({ ...progress });
  };

  try {
    // Seed before downloading map data.  Map blobs are then simply added to
    // the same content-addressed store included in the imported project.
    await seedRuntimeAssets(path.join(temporaryRoot, 'source'));
    await fs.mkdir(blobsRoot, { recursive: true });
    if (persistentCacheRoot) await fs.mkdir(persistentCacheRoot, { recursive: true });
    const retrieve = async (
      hash: string,
      parentHash?: string,
      sourceKind: ResourceSourceKind = 'content',
    ): Promise<Uint8Array> => {
      discovered.add(hash);
      const target = path.join(blobsRoot, hash);
      if (retrieved.has(hash)) return new Uint8Array(await fs.readFile(target));
      const active = inFlight.get(hash);
      if (active) return active;
      const task = (async () => {
        const existing = await fs.readFile(target).catch(() => undefined);
        if (existing) {
          retrieved.add(hash);
          return new Uint8Array(existing);
        }
        const cached = persistentCacheRoot
          ? await fs.readFile(path.join(persistentCacheRoot, hash)).catch(() => undefined)
          : undefined;
        if (cached) {
          if (downloaded.size >= limit.maxBlobs) throw new Error(`工程引用的 blob 超过 ${limit.maxBlobs} 个限制`);
          totalBytes += cached.byteLength;
          if (totalBytes > limit.maxTotalBytes) throw new Error('工程总大小超过迁移器限制');
          await fs.writeFile(target, cached, { flag: 'wx', mode: 0o644 });
          retrieved.add(hash);
          downloaded.add(hash);
          report({
            stage: 'downloading',
            detail: '已从本地缓存恢复资源。',
            currentHash: hash,
            parentHash,
            source: 'persistent-cache',
            attempt: undefined,
          });
          return new Uint8Array(cached);
        }
        if (downloaded.size >= limit.maxBlobs) throw new Error(`工程引用的 blob 超过 ${limit.maxBlobs} 个限制`);
        const bytes = await fetchBlob(
          hash,
          limit.maxBlobBytes,
          (source, attempt) => report({
            stage: 'downloading',
            detail: `正在高速下载资源（HTTP 上限 ${requestConcurrency}）…`,
            currentHash: hash,
            parentHash,
            source,
            attempt,
          }),
          (task) => withRequestSlot(async () => {
            activeDownloadCount += 1;
            try {
              return await task();
            } finally {
              activeDownloadCount -= 1;
            }
          }),
          sourceKind,
        );
        totalBytes += bytes.byteLength;
        if (totalBytes > limit.maxTotalBytes) throw new Error('工程总大小超过迁移器限制');
        await fs.writeFile(target, bytes, { flag: 'wx', mode: 0o644 });
        if (persistentCacheRoot) {
          const cacheTarget = path.join(persistentCacheRoot, hash);
          const temporaryCacheTarget = `${cacheTarget}.${randomUUID()}.tmp`;
          await fs.writeFile(temporaryCacheTarget, bytes, { mode: 0o644 }).then(async () => {
            await fs.link(temporaryCacheTarget, cacheTarget).catch((error: NodeJS.ErrnoException) => {
              if (error.code !== 'EEXIST') throw error;
            });
          }).catch(() => undefined).finally(() => fs.rm(temporaryCacheTarget, { force: true }));
        }
        retrieved.add(hash);
        downloaded.add(hash);
        report({
          stage: 'downloading',
          detail: `资源下载完成，正在继续扫描…`,
          currentHash: hash,
          parentHash,
          attempt: undefined,
        });
        return bytes;
      })();
      inFlight.set(hash, task);
      try {
        return await task;
      } finally {
        inFlight.delete(hash);
      }
    };
    type PendingBlob = { hash: string; parentHash?: string; sourceKind: ResourceSourceKind };
    const retrieveForest = async (roots: PendingBlob[]) => {
      for (const root of roots) discovered.add(root.hash);
      await drainDynamicQueue(roots, scanConcurrency, (item) => item.hash, async ({
        hash,
        parentHash,
        sourceKind,
      }) => {
        if (traversed.has(hash) || skippedHashes.has(hash)) return [];
        try {
          const bytes = await retrieve(hash, parentHash, sourceKind);
          traversed.add(hash);
          report({
            stage: 'scanning',
            detail: '正在解析资源并持续补充下载队列…',
            currentHash: hash,
            parentHash,
            source: undefined,
            attempt: undefined,
          });
          const document = parseJSON(bytes);
          const childResources = document
            ? referencedResources(document, sourceKind)
            : [...referencedCidsInBytes(bytes)].map((childHash) => ({
              hash: childHash,
              sourceKind: 'content' as const,
            }));
          const children: PendingBlob[] = [];
          for (const { hash: childHash, sourceKind: childSourceKind } of childResources) {
            if (traversed.has(childHash) || skippedHashes.has(childHash)) continue;
            discovered.add(childHash);
            children.push({ hash: childHash, parentHash: hash, sourceKind: childSourceKind });
          }
          return children;
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          if (!reason.startsWith(`无法下载 blob ${hash}`)) throw error;
          skippedHashes.add(hash);
          skippedBlobs.push({ hash, parentHash, reason });
          report({
            stage: 'downloading',
              detail: '资源首次下载失败，已跳过并继续迁移。',
            currentHash: hash,
            parentHash,
            source: undefined,
            attempt: undefined,
          });
          return [];
        }
      });
    };

    report({ stage: 'validating', detail: '正在读取权限入口并验证工程 hash…', currentHash: rootHash });
    const permissionDocument = parseJSON((await retrieve(rootHash))!);
    if (!isRecord(permissionDocument)
      || !(permissionDocument.type === 'permission' || permissionDocument.type === 'permissions')) {
      throw new Error('该 hash 不是地图权限版本。请从云端地图当前编辑版本获取 permission hash。');
    }
    const permission = permissionDocument;
    const permissionReferences = ['versionControl', 'groups', 'users', 'banned', 'collaborators']
      .map((key) => permission[key])
      .filter((value): value is string => typeof value === 'string' && EXACT_CID_PATTERN.test(value));
    const versionControlHash = permissionReferences[0];
    if (!versionControlHash) throw new Error('权限版本缺少 versionControl，无法定位当前地图工程');
    report({
      stage: 'resolving',
      detail: '权限入口有效，正在定位 master 分支…',
      currentHash: versionControlHash,
      parentHash: rootHash,
    });
    const versionControlDocument = parseJSON(await retrieve(versionControlHash, rootHash));
    const versionControl = isRecord(versionControlDocument) ? versionControlDocument : undefined;
    const branches = versionControl?.branches as Record<string, { headHash?: unknown }> | undefined;
    const projectHash = branches?.master?.headHash;
    if (typeof projectHash !== 'string' || !EXACT_CID_PATTERN.test(projectHash)) {
      throw new Error('权限版本没有可迁移的 master 地图工程');
    }
    // The permission, version-control and current master documents are the
    // minimum viable project. Keep them fatal; only descendant assets may be
    // skipped after three failed requests.
    await retrieve(projectHash, versionControlHash);
    report({
      stage: 'scanning',
      detail: '已找到当前 master 地图，正在扫描完整资源图…',
      currentHash: projectHash,
      parentHash: versionControlHash,
    });
    // The permission object also links group/extra-project resources which
    // are not necessarily referenced by the master project document itself.
    // Traverse every direct child, while `referencedHashes` skips `prevHash`
    // history so an export still represents one editable snapshot.
    const roots: PendingBlob[] = referencedResources(permission)
      .map(({ hash, sourceKind }) => ({ hash, parentHash: rootHash, sourceKind }));
    roots.push({ hash: projectHash, parentHash: versionControlHash, sourceKind: 'content' });
    await retrieveForest(roots);

    const id = `cloud-${createHash('sha256').update(rootHash).digest('hex').slice(0, 16)}`;
    const now = new Date().toISOString();
    await fs.writeFile(path.join(temporaryRoot, 'project.json'), `${JSON.stringify({
      formatVersion: 1, id, name: projectName, author: '', description: `从云端工程 ${rootHash} 迁移`, theme: 'ocean', createdAt: now, updatedAt: now, releases: [],
    }, null, 2)}\n`);
    await fs.writeFile(path.join(temporaryRoot, 'source', 'project-state.json'), `${JSON.stringify({
      formatVersion: 1, permissionHash: rootHash, extraProjectHash: '', updatedAt: now,
    }, null, 2)}\n`);
    report({
      stage: 'packaging',
      detail: '资源图扫描完成，正在生成 .boxproject…',
      currentHash: undefined,
      parentHash: undefined,
      source: undefined,
      attempt: undefined,
    });
    await runTar(temporaryRoot, archivePath);
    return { archivePath, filename: fileName(projectName, rootHash), blobCount: downloaded.size, totalBytes, skippedBlobs };
  } catch (error) {
    await fs.rm(archivePath, { force: true });
    throw error;
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}
