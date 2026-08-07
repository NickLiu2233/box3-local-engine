import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { once } from 'events';
import { MuWriteStream } from '@box-local/mudb/stream';
import {
  ExtraProjectInfoSchema,
  getMeshPath,
} from '@box-local/schema/project/hot-schema';
import {
  getCloudEngineData,
  migrateMapGroupProject,
  migrateProjectModels,
  resolveMapHash,
  type CloudEngineData,
  type EngineMode,
  type EngineModel,
  type EnginePhoto,
  type EngineScriptList,
} from './engine-api';

const EXACT_CID_PATTERN = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
const CID_PATTERN = /Qm[1-9A-HJ-NP-Za-km-z]{44}/g;
// Cloud projects contain both CIDv0 objects (`Qm…`) and url-safe SHA-256
// asset hashes (43 base64url characters).  They use the same local blob
// store, so both have to be carried into an offline project export.
const EXACT_CONTENT_HASH_PATTERN = /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}(?:\.(?:png|jpe?g|webp|gif|mp3|wav|ogg|m4a|lut))?|[A-Za-z0-9_-]{43})$/i;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

type Limits = { maxBlobs: number; maxTotalBytes: number; maxBlobBytes: number };
type ExportInput = {
  hash?: string;
  mapId?: number;
  mode?: EngineMode;
  projectName?: string;
};
export type ResourceSourceKind =
  | 'content'
  | 'voxel-model'
  | 's3-model'
  | 's3-script'
  | 's3-skin';
type ReferencedResource = { hash: string; sourceKind: ResourceSourceKind };
export type SkippedBlob = { hash: string; parentHash?: string; reason: string };
export type MigrationProgress = {
  stage: 'validating' | 'backend' | 'resolving' | 'scanning' | 'downloading' | 'packaging';
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
  const normalizedHash = hash.split('.')[0];
  const apiBase = process.env.BOX_MIGRATOR_CONTENT_API_URL?.trim();
  if (apiBase) {
    urls.push(apiBase.includes('{hash}')
      ? apiBase.replaceAll('{hash}', encodeURIComponent(normalizedHash))
      : `${apiBase.replace(/\/$/, '')}/block/get?arg=${encodeURIComponent(normalizedHash)}`);
  }
  const base = process.env.BOX_MIGRATOR_CONTENT_URL?.trim();
  if (base) {
    urls.push(base.includes('{hash}')
      ? base.replaceAll('{hash}', encodeURIComponent(hash))
      : `${base.replace(/\/$/, '')}/block/${encodeURIComponent(hash)}`);
    if (normalizedHash !== hash) {
      urls.push(base.includes('{hash}')
        ? base.replaceAll('{hash}', encodeURIComponent(normalizedHash))
        : `${base.replace(/\/$/, '')}/block/${encodeURIComponent(normalizedHash)}`);
    }
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

function blobFileName(hash: string) {
  return hash.split('.')[0];
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
  const normalizedHash = hash.split('.')[0];
  const groups = sourceKind === 's3-model'
    ? [[ossURL(hash, '/engine/m/')]]
    : sourceKind === 's3-script'
      ? (EXACT_CID_PATTERN.test(normalizedHash)
        ? [contentUrls(hash), [ossURL(hash, '/engine/s/')]]
        : [[ossURL(hash, '/engine/s/')]])
      : sourceKind === 's3-skin'
        ? [[ossURL(hash, '/avatar/m/')], [ossURL(hash, '/engine/m/')]]
        : sourceKind === 'voxel-model'
          ? (EXACT_CID_PATTERN.test(normalizedHash)
            ? [contentUrls(hash), [ossURL(hash, '/engine/m/')]]
            : [[ossURL(hash, '/engine/m/')]])
          : [EXACT_CID_PATTERN.test(normalizedHash) ? contentUrls(hash) : ossUrls(hash)];

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

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}

function encodeBase58(buffer: Uint8Array) {
  const digits = [0];
  for (const byte of buffer) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      carry += digits[index] << 8;
      digits[index] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let result = '';
  for (const byte of buffer) {
    if (byte !== 0) break;
    result += BASE58_ALPHABET[0];
  }
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    result += BASE58_ALPHABET[digits[index]];
  }
  return result;
}

export function contentHash(content: Uint8Array) {
  const digest = createHash('sha256').update(content).digest();
  return encodeBase58(Buffer.concat([Buffer.from([0x12, 0x20]), digest]));
}

async function storeBlob(blobsRoot: string, content: Uint8Array) {
  const hash = contentHash(content);
  await fs.writeFile(path.join(blobsRoot, hash), content, { flag: 'wx', mode: 0o644 })
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;
    });
  return hash;
}

async function storeJSONBlob(blobsRoot: string, value: unknown) {
  return storeBlob(blobsRoot, Buffer.from(stableStringify(value)));
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
    's3-script': 2,
    's3-skin': 2,
  };
  const add = (hash: string, sourceKind: ResourceSourceKind) => {
    if (!EXACT_CONTENT_HASH_PATTERN.test(hash)) return;
    const previous = resources.get(hash);
    if (!previous || priority[sourceKind] > priority[previous]) resources.set(hash, sourceKind);
  };
  const visit = (node: unknown, sourceKind: ResourceSourceKind) => {
    if (typeof node === 'string') {
      add(node, sourceKind === 'content' || sourceKind === 'voxel-model'
        ? 'content'
        : sourceKind);
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) visit(child, sourceKind);
      return;
    }
    if (!isRecord(node)) return;

    const assetType = typeof node.type === 'number' ? node.type : undefined;
    const assetHash = typeof node.hash === 'string' ? node.hash : undefined;
    const previewImage = typeof node.previewImage === 'string'
      ? node.previewImage
      : undefined;
    let assetSourceKind: ResourceSourceKind | undefined;
    if (assetType === 1 || assetType === 7) assetSourceKind = 's3-script';
    if (assetType === 2) assetSourceKind = 'voxel-model';
    if (assetType === 8 || assetType === 9) assetSourceKind = 's3-model';
    if (assetHash && assetSourceKind) add(assetHash, assetSourceKind);
    if (previewImage && (assetType === 2 || assetType === 8 || assetType === 9)) {
      add(previewImage, 's3-model');
    }

    for (const [key, child] of Object.entries(node)) {
      if (key === 'prevHash' || key === 'deleteAssets') continue;
      if (key === 'previewImage') continue;
      if (key === 'hash' && assetHash === child && assetSourceKind) continue;
      if (key === 'dataHash'
        && (sourceKind === 'voxel-model'
          || sourceKind === 's3-model'
          || sourceKind === 's3-skin')
        && typeof child === 'string') {
        add(child, sourceKind === 's3-skin' ? 's3-skin' : 's3-model');
        continue;
      }
      visit(child, sourceKind);
    }
  };
  visit(value, parentSourceKind);
  return [...resources].map(([hash, sourceKind]) => ({ hash, sourceKind }));
}

/**
 * Lightweight migration keeps code and visual UI resources in this legacy
 * mixed catalog, but deliberately drops external models, GLTF files and audio
 * entries. Terrain chunks, UI pictures and the separately validated audio
 * catalog are handled by their dedicated project fields.
 */
export function lightweightAssetIndex(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, asset]) => {
      if (!isRecord(asset)) return false;
      // Terrain, UI and code are stored in voxels, pictureAssets and
      // scriptAssets. Only retain standalone image/script entries here for
      // compatibility with older project versions that mixed those catalogs.
      return asset.type === 1 || asset.type === 5 || asset.type === 7 || asset.type === 8;
    }),
  );
}

export function emptyEntitiesTree() {
  return {
    ROOT_ID: {
      childrenIds: [],
      id: 'ROOT_ID',
      name: 'Root',
      parentId: '',
      type: 0,
    },
  };
}

function cloneJSON<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clearSoundSamples(value: unknown) {
  const copy = cloneJSON(value ?? {});
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isRecord(node)) return;
    for (const [key, child] of Object.entries(node)) {
      if (key === 'sample') node[key] = '';
      else visit(child);
    }
  };
  visit(copy);
  return copy;
}

export function lightweightEnvironment(value: unknown, preserveBakedShadow = false) {
  const environment = isRecord(value) ? cloneJSON(value) : {};
  if (!preserveBakedShadow && isRecord(environment.bakedShadow)) {
    environment.bakedShadow.data = '';
    environment.bakedShadow.texture = '';
  }
  if (isRecord(environment.snow)) environment.snow.texture = '';
  return environment;
}

export function lightweightPlayer(value: unknown) {
  return clearSoundSamples(value);
}

export function lightweightAmbientSound(value: unknown) {
  return clearSoundSamples(value);
}

export function localScriptAssets(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([name, asset]) => {
    if (!isRecord(asset) || (asset.type !== 1 && asset.type !== 7)) return [];
    return [[name, { ...asset, contentId: 0, ownerId: 0 }]];
  }));
}

export function restoreRuntimeBundles(
  scriptAssets: unknown,
  deleteAssets: unknown,
): Record<string, Record<string, unknown>> {
  const restored = isRecord(scriptAssets)
    ? cloneJSON(scriptAssets) as Record<string, Record<string, unknown>>
    : {};
  if (!Array.isArray(deleteAssets)) return restored;
  const candidates = new Map<string, Record<string, unknown>>();
  for (const item of deleteAssets) {
    if (!isRecord(item) || typeof item.key !== 'string' || !isRecord(item.value)) continue;
    if (item.key !== '_server_bundle.js' && item.key !== '_client_bundle.js') continue;
    if ((item.value.type !== 1 && item.value.type !== 7) || typeof item.value.hash !== 'string') continue;
    candidates.set(item.key, { ...item.value, contentId: 0, ownerId: 0 });
  }
  for (const [name, asset] of candidates) {
    if (!(name in restored)) restored[name] = asset;
  }
  return restored;
}

export function safeScriptLauncherSource(originalEntry: string) {
  return `try {\n  require(${JSON.stringify(`./${originalEntry}`)});\n} catch (error) {\n  console.error('[迁移器] 原入口脚本启动失败：', error);\n}\n`;
}

export function localAudioAssets(value: unknown): Record<string, Record<string, unknown>> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([name, asset]) => {
    if (!isRecord(asset) || asset.type !== 6 || typeof asset.hash !== 'string') return [];
    return [[name, { ...asset, contentId: 0, ownerId: 0 }]];
  })) as Record<string, Record<string, unknown>>;
}

export function mergeCloudPhotos(
  pictureAssets: unknown,
  photos: EnginePhoto[],
): Record<string, unknown> {
  const merged = isRecord(pictureAssets)
    ? cloneJSON(pictureAssets)
    : {};
  for (const photo of photos) {
    if (!photo || typeof photo.name !== 'string' || typeof photo.hash !== 'string') continue;
    const name = photo.name.trim();
    if (!name || !EXACT_CONTENT_HASH_PATTERN.test(photo.hash)) continue;
    merged[name] = {
      hash: photo.hash,
      id: typeof photo.id === 'string' ? photo.id : '',
      previewImage: typeof photo.previewImage === 'string' ? photo.previewImage : '',
      size: Number.isFinite(photo.size) ? Number(photo.size) : 0,
      type: 8,
      updateAt: Number(photo.updateAt ?? photo.updatedAt ?? photo.createdAt ?? 0),
    };
  }
  return merged;
}

export function cloudExtraProject(
  models: EngineModel[],
  skins: EngineModel[],
  defaultSkin: EngineModel | null,
  scripts: EngineScriptList,
) {
  const extra = ExtraProjectInfoSchema.clone(ExtraProjectInfoSchema.identity);
  for (const model of models) {
    if (!model?.modelId || !model.modelName || !model.modelFileHash) continue;
    extra.meshAssets[getMeshPath(model.modelName)] = {
      modelId: model.modelId,
      hash: model.modelFileHash,
      modelPreviewHash: model.modelPreviewHash || '',
      animated: Boolean(model.animated),
      updatedAt: model.updatedAt || '',
    };
  }
  for (const skin of skins) {
    if (!skin?.modelName || !skin.modelFileHash) continue;
    extra.skinAssets[skin.modelName] = { hash: skin.modelFileHash };
  }
  if (defaultSkin?.modelName) extra.defaultSkinName = defaultSkin.modelName;
  const appendScripts = (rows: EngineScriptList['clientScripts'], isClient: boolean) => {
    rows.forEach((script, index) => {
      if (!script?.id || !script.name) return;
      extra.scriptAssets[script.id] = {
        hash: script.hash || '',
        name: script.name,
        isClient,
        isShare: Boolean(script.share),
        order: index + 1,
        lockedMapTitle: script.lockedMapTitle || '',
        lockedMapId: script.lockedMapId || 0,
        id: script.id,
      };
    });
  };
  appendScripts(scripts.clientScripts || [], true);
  appendScripts(scripts.serverScripts || [], false);
  return extra;
}

export function cloudSkinPreviews(
  skins: EngineModel[],
  defaultSkin: EngineModel | null,
  skippedHashes: ReadonlySet<string> = new Set(),
) {
  const previews: Record<string, string> = {};
  for (const skin of [...skins, ...(defaultSkin ? [defaultSkin] : [])]) {
    const name = skin?.modelName?.trim();
    const previewHash = skin?.modelPreviewHash?.trim();
    if (!name || !previewHash || skippedHashes.has(previewHash)) continue;
    previews[name] = previewHash;
  }
  return previews;
}

export function cloudSkinProjects(
  skins: EngineModel[],
  defaultSkin: EngineModel | null,
  skippedHashes: ReadonlySet<string> = new Set(),
) {
  const projects: Record<string, string> = {};
  for (const skin of [...skins, ...(defaultSkin ? [defaultSkin] : [])]) {
    const name = skin?.modelName?.trim();
    const projectHash = skin?.projectFileHash?.trim();
    if (!name || !projectHash || skippedHashes.has(projectHash)) continue;
    projects[name] = projectHash;
  }
  return projects;
}

export function encodeCloudExtraProject(data: CloudEngineData) {
  const extra = cloudExtraProject(
    data.models,
    data.skins,
    data.defaultSkin,
    data.scripts,
  );
  const stream = new MuWriteStream(1);
  try {
    ExtraProjectInfoSchema.diff(ExtraProjectInfoSchema.identity, extra, stream);
    return new Uint8Array(stream.bytes());
  } finally {
    stream.destroy();
  }
}

export function applyCloudModelIds(entitiesTree: unknown, models: EngineModel[]) {
  const copy = cloneJSON(entitiesTree ?? {});
  if (!isRecord(copy)) return copy;
  const ids = new Map(
    models
      .filter((model) => model?.modelId && model.modelName)
      .map((model) => [getMeshPath(model.modelName), model.modelId]),
  );
  for (const node of Object.values(copy)) {
    if (!isRecord(node) || !isRecord(node.value) || typeof node.value.mesh !== 'string') continue;
    const modelId = ids.get(node.value.mesh);
    if (modelId) node.value.meshId = modelId;
  }
  return copy;
}

function cloudRuntimeResources(data: CloudEngineData): ReferencedResource[] {
  const resources = new Map<string, ResourceSourceKind>();
  const add = (hash: unknown, sourceKind: ResourceSourceKind) => {
    if (typeof hash === 'string' && EXACT_CONTENT_HASH_PATTERN.test(hash)) {
      resources.set(hash, sourceKind);
    }
  };
  for (const script of [...data.scripts.clientScripts, ...data.scripts.serverScripts]) {
    add(script.hash, 's3-script');
  }
  for (const photo of data.photos) {
    add(photo.hash, 's3-model');
    add(photo.previewImage, 's3-model');
  }
  for (const model of data.models) {
    add(model.fileHash, 's3-model');
    add(model.modelFileHash, 's3-model');
    add(model.modelPreviewHash, 's3-model');
    add(model.projectFileHash, 's3-model');
  }
  for (const skin of data.skins) {
    add(skin.fileHash, 's3-skin');
    add(skin.modelFileHash, 's3-skin');
    add(skin.modelPreviewHash, 's3-skin');
    add(skin.projectFileHash, 's3-skin');
  }
  if (data.defaultSkin) {
    add(data.defaultSkin.modelFileHash, 's3-skin');
    add(data.defaultSkin.modelPreviewHash, 's3-skin');
  }
  return [...resources].map(([hash, sourceKind]) => ({ hash, sourceKind }));
}

export function cloudRetainedHashes(data: CloudEngineData | undefined) {
  if (!data) return new Set<string>();
  return new Set<string>([
    ...Object.entries(data.groupProject)
      .filter(([key, hash]) => key !== 'version' && typeof hash === 'string')
      .map(([, hash]) => hash),
    ...cloudRuntimeResources(data).map(({ hash }) => hash),
  ]);
}

export function availableSoundConfig(value: unknown, availablePaths: ReadonlySet<string>) {
  const copy = cloneJSON(value ?? {});
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isRecord(node)) return;
    for (const [key, child] of Object.entries(node)) {
      if (key === 'sample' && typeof child === 'string' && child && !availablePaths.has(child)) {
        node[key] = '';
      } else {
        visit(child);
      }
    }
  };
  visit(copy);
  return copy;
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
  const requestedHash = String(input.hash || '').trim();
  const mapId = Number(input.mapId || 0);
  const mode: EngineMode = input.mode === 'play' ? 'play' : 'edit';
  if (!requestedHash && (!Number.isSafeInteger(mapId) || mapId <= 0)) {
    throw new Error('请输入云端地图 ID，或提供有效的 permission hash');
  }
  if (requestedHash && !EXACT_CID_PATTERN.test(requestedHash)) {
    throw new Error('地图工程 hash 必须是有效的 Qm CIDv0');
  }
  if (input.mapId !== undefined && (!Number.isSafeInteger(mapId) || mapId <= 0)) {
    throw new Error('云端地图 ID 必须是正整数');
  }
  let rootHash = requestedHash;

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

    if (mapId) {
      report({
        stage: 'backend',
        detail: `正在通过引擎后端解析地图 ${mapId} 的 ${mode} 工程…`,
        currentHash: undefined,
      });
      if (mode === 'edit') {
        report({
          stage: 'backend',
          detail: '正在按 boxes 流程升级旧版工程组数据…',
          currentHash: undefined,
        });
        await migrateMapGroupProject(mapId);
      }
      const resolvedHash = String(await resolveMapHash(mapId, mode) || '').trim();
      if (!EXACT_CID_PATTERN.test(resolvedHash)) {
        throw new Error('引擎后端没有返回有效的地图 permission hash');
      }
      if (requestedHash && requestedHash !== resolvedHash) {
        throw new Error(`输入的 hash 与地图 ${mapId} 当前 ${mode} 工程不一致`);
      }
      rootHash = resolvedHash;
    }
    if (!EXACT_CID_PATTERN.test(rootHash)) {
      throw new Error('无法确定有效的地图 permission hash');
    }
    const retrieve = async (
      hash: string,
      parentHash?: string,
      sourceKind: ResourceSourceKind = 'content',
    ): Promise<Uint8Array> => {
      discovered.add(hash);
      const storedName = blobFileName(hash);
      const target = path.join(blobsRoot, storedName);
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
          ? await fs.readFile(path.join(persistentCacheRoot, storedName)).catch(() => undefined)
            || await fs.readFile(path.join(persistentCacheRoot, hash)).catch(() => undefined)
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
          const cacheTarget = path.join(persistentCacheRoot, storedName);
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
    const retrieveJSON = async (hash: unknown, parentHash: string, label: string) => {
      if (typeof hash !== 'string' || !EXACT_CID_PATTERN.test(hash)) {
        throw new Error(`${label}缺少有效 hash`);
      }
      const value = parseJSON(await retrieve(hash, parentHash));
      if (!value) throw new Error(`${label}格式无效`);
      return value;
    };
    const recordSkippedDownload = (hash: string, parentHash: string | undefined, error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error);
      if (!reason.startsWith(`无法下载 blob ${hash}`)) throw error;
      if (!skippedHashes.has(hash)) {
        skippedHashes.add(hash);
        skippedBlobs.push({ hash, parentHash, reason });
      }
      report({
        stage: 'downloading',
        detail: '资源首次下载失败，已跳过并继续迁移。',
        currentHash: hash,
        parentHash,
        source: undefined,
        attempt: undefined,
      });
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
          recordSkippedDownload(hash, parentHash, error);
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
    const versionControlHash = permission.versionControl;
    if (typeof versionControlHash !== 'string' || !EXACT_CID_PATTERN.test(versionControlHash)) {
      throw new Error('权限版本缺少 versionControl，无法定位当前地图工程');
    }
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
    const projectDocument = parseJSON(await retrieve(projectHash, versionControlHash));
    if (!isRecord(projectDocument)) {
      throw new Error('master 地图工程格式无效');
    }
    report({
      stage: 'resolving',
      detail: mapId
        ? '工程主版本有效，正在读取完整资源索引与后端工程数据…'
        : '工程主版本有效，正在读取 Hash 图内可用资源…',
      currentHash: projectHash,
      parentHash: versionControlHash,
    });
    const [
      assets,
      scriptAssets,
      deleteAssets,
      audioAssets,
      entitiesTree,
      pictureAssets,
      environment,
      player,
      ambientSound,
    ] = await Promise.all([
      retrieveJSON(projectDocument.assets, projectHash, '工程资源索引'),
      retrieveJSON(projectDocument.scriptAssets, projectHash, '工程脚本索引'),
      retrieveJSON(projectDocument.deleteAssets, projectHash, '工程删除资源索引'),
      retrieveJSON(projectDocument.audioAssets, projectHash, '工程音频索引'),
      retrieveJSON(projectDocument.entitiesTree, projectHash, '工程实体树'),
      retrieveJSON(projectDocument.pictureAssets, projectHash, '工程图片索引'),
      retrieveJSON(projectDocument.environment, projectHash, '工程环境配置'),
      retrieveJSON(projectDocument.player, projectHash, '工程玩家配置'),
      retrieveJSON(projectDocument.ambientSound, projectHash, '工程环境音配置'),
    ]);

    let cloudData: CloudEngineData | undefined;
    if (mapId) {
      const needsModelMigration = isRecord(assets) && Object.values(assets)
        .some((asset) => isRecord(asset) && asset.type === 2);
      if (needsModelMigration) {
        report({
          stage: 'backend',
          detail: '检测到旧版项目模型，正在等待云端模型迁移完成…',
          currentHash: projectHash,
        });
        await migrateProjectModels(mapId, (state) => report({
          stage: 'backend',
          detail: `云端项目模型迁移状态：${state === 0 ? '初始化' : state === 1 ? '处理中' : state === 2 ? '完成' : '失败'}`,
          currentHash: projectHash,
        }));
      }
      report({
        stage: 'backend',
        detail: '正在拉取工程组、图库、完整脚本、项目模型和皮肤索引…',
        currentHash: rootHash,
      });
      cloudData = await getCloudEngineData(mapId, mode);
      const groupResources = Object.entries(cloudData.groupProject)
        .filter(([key, hash]) => key !== 'version' && EXACT_CONTENT_HASH_PATTERN.test(hash))
        .map(([, hash]) => ({ hash, sourceKind: 'content' as const }));
      await retrieveForest([
        ...groupResources,
        ...cloudRuntimeResources(cloudData),
      ]);
      cloudData = {
        ...cloudData,
        groupProject: Object.fromEntries(Object.entries(cloudData.groupProject)
          .filter(([key, hash]) => key === 'version' || !skippedHashes.has(hash))),
        scripts: {
          clientScripts: cloudData.scripts.clientScripts
            .filter((script) => !script.hash || !skippedHashes.has(script.hash)),
          serverScripts: cloudData.scripts.serverScripts
            .filter((script) => !script.hash || !skippedHashes.has(script.hash)),
        },
        photos: cloudData.photos.filter((photo) => !skippedHashes.has(photo.hash)),
        models: cloudData.models.filter((model) =>
          Boolean(model.modelFileHash) && !skippedHashes.has(String(model.modelFileHash))),
        skins: cloudData.skins.filter((skin) =>
          Boolean(skin.modelFileHash) && !skippedHashes.has(String(skin.modelFileHash))),
        defaultSkin: cloudData.defaultSkin?.modelFileHash
          && !skippedHashes.has(cloudData.defaultSkin.modelFileHash)
          ? cloudData.defaultSkin
          : null,
      };
    }

    const candidateScriptAssets = restoreRuntimeBundles(
      localScriptAssets(scriptAssets),
      deleteAssets,
    );
    const verifiedScriptAssets: Record<string, Record<string, unknown>> = {};
    await Promise.all(Object.entries(candidateScriptAssets).map(async ([name, asset]) => {
      const scriptHash = typeof asset.hash === 'string' ? asset.hash : '';
      const scriptType = asset.type;
      if (!scriptHash || (scriptType !== 1 && scriptType !== 7)) return;
      try {
        await retrieve(scriptHash, String(projectDocument.scriptAssets), 's3-script');
        verifiedScriptAssets[name] = asset;
      } catch (error) {
        recordSkippedDownload(scriptHash, String(projectDocument.scriptAssets), error);
      }
    }));
    if ('_client_bundle.js' in candidateScriptAssets
      && !('_client_bundle.js' in verifiedScriptAssets)) {
      for (const [name, asset] of Object.entries(verifiedScriptAssets)) {
        if (asset.type === 7) delete verifiedScriptAssets[name];
      }
    }
    const originalScriptIndex = typeof projectDocument.scriptIndex === 'string'
      ? projectDocument.scriptIndex
      : '';
    let migratedScriptIndex = '';
    if (originalScriptIndex && originalScriptIndex in verifiedScriptAssets) {
      let launcherName = '_migrated_index.js';
      while (launcherName in verifiedScriptAssets) launcherName = `_${launcherName}`;
      const launcherBytes = Buffer.from(safeScriptLauncherSource(originalScriptIndex));
      const launcherHash = await storeBlob(blobsRoot, launcherBytes);
      verifiedScriptAssets[launcherName] = {
        animated: false,
        bounds: [0, 0, 0],
        contentId: 0,
        hash: launcherHash,
        ownerId: 0,
        previewImage: '',
        size: launcherBytes.byteLength,
        type: 1,
      };
      migratedScriptIndex = launcherName;
    }

    const verifiedAudioAssets: Record<string, unknown> = {};
    const candidateAudioAssets = localAudioAssets(audioAssets);
    await Promise.all(Object.entries(candidateAudioAssets).map(async ([name, asset]) => {
      const audioHash = isRecord(asset) && typeof asset.hash === 'string' ? asset.hash : '';
      if (!audioHash) return;
      try {
        await retrieve(audioHash, String(projectDocument.audioAssets));
        verifiedAudioAssets[name] = asset;
      } catch (error) {
        recordSkippedDownload(audioHash, String(projectDocument.audioAssets), error);
      }
    }));
    const availableAudioPaths = new Set(Object.keys(verifiedAudioAssets));

    let preserveBakedShadow = false;
    const bakedShadow = isRecord(environment) && isRecord(environment.bakedShadow)
      ? environment.bakedShadow
      : undefined;
    const bakedShadowHashes = bakedShadow
      ? [bakedShadow.data, bakedShadow.texture]
        .filter((value): value is string => typeof value === 'string' && EXACT_CONTENT_HASH_PATTERN.test(value))
      : [];
    if (bakedShadowHashes.length === 2) {
      const results = await Promise.all(bakedShadowHashes.map(async (hash) => {
        try {
          await retrieve(hash, String(projectDocument.environment));
          return true;
        } catch (error) {
          recordSkippedDownload(hash, String(projectDocument.environment), error);
          return false;
        }
      }));
      preserveBakedShadow = results.every(Boolean);
    }

    const [
      assetsHash,
      scriptAssetsHash,
      entitiesTreeHash,
      audioAssetsHash,
      deleteAssetsHash,
      pictureAssetsHash,
      environmentHash,
      playerHash,
      ambientSoundHash,
    ] = await Promise.all([
      storeJSONBlob(blobsRoot, cloudData ? assets : lightweightAssetIndex(assets)),
      storeJSONBlob(blobsRoot, verifiedScriptAssets),
      storeJSONBlob(blobsRoot, cloudData
        ? applyCloudModelIds(entitiesTree, cloudData.models)
        : emptyEntitiesTree()),
      storeJSONBlob(blobsRoot, verifiedAudioAssets),
      storeJSONBlob(blobsRoot, []),
      storeJSONBlob(blobsRoot, mergeCloudPhotos(pictureAssets, cloudData?.photos || [])),
      storeJSONBlob(blobsRoot, cloudData
        ? environment
        : lightweightEnvironment(environment, preserveBakedShadow)),
      storeJSONBlob(blobsRoot, availableSoundConfig(player, availableAudioPaths)),
      storeJSONBlob(blobsRoot, availableSoundConfig(ambientSound, availableAudioPaths)),
    ]);
    const migratedProject = {
      ...projectDocument,
      ambientSound: ambientSoundHash,
      assets: assetsHash,
      audioAssets: audioAssetsHash,
      collisionFilter: [],
      committerId: 0,
      deleteAssets: deleteAssetsHash,
      entitiesTree: entitiesTreeHash,
      environment: environmentHash,
      pictureAssets: pictureAssetsHash,
      player: playerHash,
      prevHash: '',
      scriptAssets: scriptAssetsHash,
      // Run through a guarded local launcher. The original source remains
      // editable, while a top-level migration incompatibility is logged
      // instead of immediately terminating run mode.
      scriptIndex: migratedScriptIndex,
      timestamp: new Date(0).toISOString(),
    };
    const migratedProjectHash = await storeJSONBlob(blobsRoot, migratedProject);
    const migratedVersionControlHash = await storeJSONBlob(blobsRoot, {
      branches: { master: { headHash: migratedProjectHash, name: 'master' } },
      currentBranch: 'master',
    });
    const [groupsHash, usersHash, bannedHash, collaboratorsHash] = await Promise.all([
      storeJSONBlob(blobsRoot, {}),
      storeJSONBlob(blobsRoot, {}),
      storeJSONBlob(blobsRoot, {}),
      storeJSONBlob(blobsRoot, []),
    ]);
    const migratedPermissionHash = await storeJSONBlob(blobsRoot, {
      ...permission,
      accessLevel: 1,
      banned: bannedHash,
      collaborators: collaboratorsHash,
      groups: groupsHash,
      owner: '0',
      prevHash: '',
      timestamp: new Date(0).toISOString(),
      users: usersHash,
      versionControl: migratedVersionControlHash,
    });
    const extraProjectHash = cloudData
      ? await storeBlob(blobsRoot, encodeCloudExtraProject(cloudData))
      : '';
    const groupProjectVersion = cloudData?.groupProject.version;
    const groupProjectMetaData = cloudData && groupProjectVersion
      ? {
        version: groupProjectVersion,
        hashes: Object.fromEntries(Object.entries(cloudData.groupProject)
          .filter(([key, hash]) => key !== 'version' && EXACT_CONTENT_HASH_PATTERN.test(hash))),
      }
      : undefined;
    report({
      stage: 'scanning',
      detail: cloudData
        ? '完整工程快照已生成，正在校验所有离线依赖…'
        : 'Hash 图工程已生成，正在扫描地形、UI 与代码依赖…',
      currentHash: migratedProjectHash,
      parentHash: migratedVersionControlHash,
    });
    await retrieveForest([{
      hash: migratedPermissionHash,
      sourceKind: 'content',
    }]);

    // Some group-project indexes intentionally reuse hashes from the source
    // map (audioAssets is the common case). They are still required by the
    // local build system through groupProjectMetaData, so they must survive
    // the cleanup of obsolete source graph nodes below.
    const retainedCloudHashes = cloudRetainedHashes(cloudData);

    // The original permission graph contains cloud account/member data and
    // superseded heavy project records. It was needed only as migration input;
    // do not leak unreachable private blobs into the exported package.
    const obsoleteHashes = new Set<string>([
      rootHash,
      String(versionControlHash),
      projectHash,
      ...['groups', 'users', 'banned', 'collaborators']
        .map((key) => permission[key])
        .filter((value): value is string => typeof value === 'string'),
      ...['assets', 'scriptAssets', 'entitiesTree', 'audioAssets', 'deleteAssets', 'pictureAssets', 'environment', 'player', 'ambientSound']
        .map((key) => projectDocument[key])
        .filter((value): value is string => typeof value === 'string'),
    ]);
    for (const hash of obsoleteHashes) {
      if (hash === migratedPermissionHash
        || hash === migratedVersionControlHash
        || hash === migratedProjectHash
        || retainedCloudHashes.has(hash)
        || [assetsHash, scriptAssetsHash, entitiesTreeHash, audioAssetsHash, deleteAssetsHash,
          pictureAssetsHash, environmentHash, playerHash, ambientSoundHash, groupsHash, usersHash, bannedHash,
          collaboratorsHash].includes(hash)) continue;
      await fs.rm(path.join(blobsRoot, hash), { force: true });
    }

    const id = `cloud-${createHash('sha256').update(rootHash).digest('hex').slice(0, 16)}`;
    const now = new Date().toISOString();
    await fs.writeFile(path.join(temporaryRoot, 'project.json'), `${JSON.stringify({
      formatVersion: 1, id, name: projectName, author: '', description: `从云端工程 ${rootHash} 迁移`, theme: 'ocean', createdAt: now, updatedAt: now, releases: [],
    }, null, 2)}\n`);
    await fs.writeFile(path.join(temporaryRoot, 'source', 'project-state.json'), `${JSON.stringify({
      formatVersion: 1,
      permissionHash: migratedPermissionHash,
      extraProjectHash,
      extraProjectMode: extraProjectHash ? 'embedded' : '',
      ...(cloudData
        ? {
            skinPreviews: cloudSkinPreviews(cloudData.skins, cloudData.defaultSkin, skippedHashes),
            skinProjects: cloudSkinProjects(cloudData.skins, cloudData.defaultSkin, skippedHashes),
          }
        : {}),
      ...(mapId ? { cloudMapId: mapId } : {}),
      ...(groupProjectMetaData ? { groupProjectMetaData } : {}),
      updatedAt: now,
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
