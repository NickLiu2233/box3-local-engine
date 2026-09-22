import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { PlayerAdminRequestError } from './player-admin-errors';

type RuntimeMode = 'play' | 'creator';
type PlayMapReference = {
  id: string;
  permanentMapId: string;
  name: string;
  version?: string;
  mapGroupId?: string;
  mapRole?: 'main' | 'submap';
  mainProjectId?: string;
};
type MapRuntimeProfile = {
  permanentMapId: string;
  mode: 'play';
  playerLimit: number;
  roomLimit: number;
  idleTimeoutMs: number;
  cpuMilli: number | null;
  memoryMb: number | null;
  resourceGroupId?: string;
  configurationScope: 'group' | 'map';
  configurationRootId: string;
};
export type RuntimeResourceGroup = {
  id: string;
  name: string;
  cpuMilli: number;
  memoryMb: number;
};

type RuntimeStatus = {
  phase: string;
  percent: number;
  message: string;
  updatedAt?: string;
  cpuPercent?: number;
  memoryBytes?: number;
  uptimeMs?: number;
  processCount?: number;
  onlineCount?: number;
  rooms?: Array<{ roomId: string; active: boolean; createdAt?: number; lastAccessAt?: number }>;
};

const mapIdPattern = /^[a-z0-9][a-z0-9-]{0,62}$/;
const defaultProfile = {
  playerLimit: Number(process.env.BOX_LOCAL_PLAYER_LIMIT || 70),
  roomLimit: Number(process.env.BOX_TELEPORT_MAX_ROOMS || 64),
  idleTimeoutMs: Number(process.env.BOX_RUNTIME_IDLE_TIMEOUT_MS || 900000),
};

function memoryLimitMb(value: unknown, fallback: number) {
  const text = String(value || '').trim().toLowerCase();
  const match = text.match(/^(\d+(?:\.\d+)?)\s*([gm]?)b?$/);
  if (!match) return fallback;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? Math.round(amount * (match[2] === 'g' ? 1024 : 1)) : fallback;
}

function runtimeDefaults(mode: RuntimeMode) {
  const prefix = mode === 'play' ? 'BOX_PLAY' : 'BOX_CREATOR';
  const cpuCores = Number(process.env[`${prefix}_CPU_LIMIT`] || 4);
  return {
    ...defaultProfile,
    cpuMilli: Number.isFinite(cpuCores) && cpuCores > 0 ? Math.round(cpuCores * 1000) : 4000,
    memoryMb: memoryLimitMb(process.env[`${prefix}_MEMORY_LIMIT`], 4096),
  };
}

function dataPath() {
  return process.env.BOX_MAP_RUNTIME_PROFILES_PATH
    || path.resolve(process.cwd(), '../local-engine/data/map-runtime-profiles.json');
}

function creatorProjectsPath() {
  return process.env.BOX_CREATOR_PROJECTS_PATH
    || path.resolve(process.cwd(), '../local-engine/projects');
}

function positiveInteger(value: unknown, label: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} 必须是 ${minimum} 到 ${maximum} 的整数`);
  }
  return parsed;
}

export function normalizeMapRuntimeProfile(input: Record<string, unknown>): MapRuntimeProfile {
  const permanentMapId = String(input.permanentMapId || '').trim();
  if (!mapIdPattern.test(permanentMapId)) throw new Error('地图永久 ID 格式无效');
  const resourceGroupId = String(input.resourceGroupId || '').trim();
  if (resourceGroupId && !mapIdPattern.test(resourceGroupId)) throw new Error('资源组 ID 格式无效');
  return {
    permanentMapId,
    mode: 'play',
    playerLimit: positiveInteger(input.playerLimit, '人数上限', 1, 10000),
    roomLimit: positiveInteger(input.roomLimit, '房间上限', 1, 10000),
    idleTimeoutMs: positiveInteger(input.idleTimeoutMs, '无用户时存活时间（ms）', 1000, 604800000),
    // Resource limits are deliberately group-only.  Historical per-map
    // values are ignored so an old JSON document cannot silently keep a
    // container isolated after the UI has moved to resource groups.
    cpuMilli: null,
    memoryMb: null,
    ...(resourceGroupId ? { resourceGroupId } : {}),
    configurationScope: input.configurationScope === 'group' ? 'group' : 'map',
    configurationRootId: String(input.configurationRootId || permanentMapId),
  };
}

export function normalizeRuntimeResourceGroup(input: Record<string, unknown>, id = String(input.id || '').trim()): RuntimeResourceGroup {
  if (!mapIdPattern.test(id)) throw new Error('资源组 ID 格式无效');
  const name = String(input.name || '').trim();
  if (!name || name.length > 64) throw new Error('资源组名称不能为空且不能超过 64 个字符');
  return {
    id,
    name,
    cpuMilli: positiveInteger(input.cpuMilli, 'CPU 上限（m）', 1, 128000),
    memoryMb: positiveInteger(input.memoryMb, '内存上限（MB）', 64, 1048576),
  };
}

async function profileDocument() {
  try {
    const value = JSON.parse(await fs.readFile(dataPath(), 'utf8'));
    return { version: 2, profiles: Array.isArray(value?.profiles) ? value.profiles : [], resourceGroups: Array.isArray(value?.resourceGroups) ? value.resourceGroups : [] };
  } catch (error: any) {
    if (error?.code === 'ENOENT') return { version: 2, profiles: [], resourceGroups: [] };
    throw new Error(`无法读取地图容器配置：${error.message}`);
  }
}

async function writeProfileDocument(document: { version: number; profiles: unknown[]; resourceGroups?: unknown[] }) {
  await fs.mkdir(path.dirname(dataPath()), { recursive: true });
  await fs.writeFile(dataPath(), `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
}

export async function listRuntimeResourceGroups() {
  const document = await profileDocument();
  return document.resourceGroups
    .map((item: Record<string, unknown>) => normalizeRuntimeResourceGroup(item))
    .sort((left: RuntimeResourceGroup, right: RuntimeResourceGroup) => left.name.localeCompare(right.name));
}

export async function saveRuntimeResourceGroup(input: Record<string, unknown>) {
  const document = await profileDocument();
  const requestedId = String(input.id || '').trim();
  const id = requestedId || `resource-${randomUUID().replace(/-/g, '').slice(0, 32)}`;
  let group: RuntimeResourceGroup;
  try {
    group = normalizeRuntimeResourceGroup(input, id);
  } catch (error) {
    throw new PlayerAdminRequestError(
      error instanceof Error ? error.message : '资源组配置无效',
      400,
    );
  }
  document.resourceGroups = document.resourceGroups.filter((item: RuntimeResourceGroup) => item.id !== group.id);
  document.resourceGroups.push(group);
  await writeProfileDocument(document);
  return group;
}

export async function deleteRuntimeResourceGroup(id: string) {
  if (!mapIdPattern.test(id)) throw new Error('资源组 ID 格式无效');
  const document = await profileDocument();
  const inUse = document.profiles.some((item: MapRuntimeProfile) => item.resourceGroupId === id);
  if (inUse) {
    throw new PlayerAdminRequestError('该资源组仍被地图容器配置使用，无法删除', 409);
  }
  document.resourceGroups = document.resourceGroups.filter((item: RuntimeResourceGroup) => item.id !== id);
  await writeProfileDocument(document);
}

export async function listMapRuntimeProfiles() {
  const document = await profileDocument();
  return document.profiles
    .map((item: Record<string, unknown>) => normalizeMapRuntimeProfile(item))
    .sort((left, right) => left.permanentMapId.localeCompare(right.permanentMapId));
}

export async function saveMapRuntimeProfile(input: Record<string, unknown>) {
  const profile = normalizeMapRuntimeProfile(input);
  const document = await profileDocument();
  document.profiles = document.profiles.filter((item: MapRuntimeProfile) => item.permanentMapId !== profile.permanentMapId);
  document.profiles.push(profile);
  await writeProfileDocument(document);
  return profile;
}

export async function deleteMapRuntimeProfile(permanentMapId: string) {
  if (!mapIdPattern.test(permanentMapId)) throw new Error('地图永久 ID 格式无效');
  const document = await profileDocument();
  document.profiles = document.profiles.filter((item: MapRuntimeProfile) => item.permanentMapId !== permanentMapId);
  await writeProfileDocument(document);
}

function runtimeBaseURL(mode: RuntimeMode) {
  const value = mode === 'play'
    ? process.env.BOX_PLAY_INTERNAL_URL || process.env.BOX_PLAY_PUBLIC_URL
    : process.env.BOX_CREATOR_RUNTIME_INTERNAL_URL || 'http://creator:9967';
  return String(value || '').replace(/\/$/, '');
}

export function runtimeControlURL(mode: RuntimeMode, projectId: string) {
  const prefix = mode === 'play' ? '/p' : '';
  return `${runtimeBaseURL(mode)}${prefix}/${encodeURIComponent(projectId)}`;
}

async function runtimeStatus(mode: RuntimeMode, projectId: string): Promise<RuntimeStatus> {
  try {
    const response = await fetch(`${runtimeControlURL(mode, projectId)}/__local_runtime/status`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { phase: 'unavailable', percent: 0, message: '运行时未启动' };
    const result = await response.json();
    return {
      phase: String(result.phase || 'idle'), percent: Number(result.percent || 0), message: String(result.message || ''),
      updatedAt: result.updatedAt, cpuPercent: Number.isFinite(Number(result.cpuPercent)) ? Number(result.cpuPercent) : undefined,
      memoryBytes: Number.isFinite(Number(result.memoryBytes)) ? Number(result.memoryBytes) : undefined,
      uptimeMs: Number.isFinite(Number(result.uptimeMs)) ? Number(result.uptimeMs) : undefined,
      processCount: Number.isFinite(Number(result.processCount)) ? Number(result.processCount) : undefined,
      onlineCount: Number.isFinite(Number(result.onlineCount)) ? Number(result.onlineCount) : undefined,
      rooms: Array.isArray(result.rooms) ? result.rooms : [],
    };
  } catch {
    return { phase: 'unavailable', percent: 0, message: '运行时未启动' };
  }
}

async function creatorMaps() {
  try {
    const entries = await fs.readdir(creatorProjectsPath(), { withFileTypes: true });
    const maps = await Promise.all(entries.filter((entry) => entry.isDirectory() && mapIdPattern.test(entry.name)).map(async (entry) => {
      try {
        const project = JSON.parse(await fs.readFile(path.join(creatorProjectsPath(), entry.name, 'project.json'), 'utf8'));
        return { id: entry.name, permanentMapId: String(project.permanentMapId || entry.name), name: String(project.name || entry.name), mapRole: project.mapRole === 'submap' ? 'submap' : 'main', mainProjectId: String(project.mainProjectId || entry.name) };
      } catch { return null; }
    }));
    return maps.filter(Boolean) as Array<{ id: string; permanentMapId: string; name: string; mapRole: 'main' | 'submap'; mainProjectId: string }>;
  } catch { return []; }
}

async function playMaps() {
  const token = String(process.env.BOX_PLAY_ADMIN_TOKEN || '').trim();
  if (!token) return [];
  try {
    const response = await fetch(`${runtimeBaseURL('play')}/api/play-admin/worlds`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return [];
    const result = await response.json();
    return Array.isArray(result.worlds) ? result.worlds : [];
  } catch { return []; }
}

async function playPresenceCounts(permanentMapIds: string[]) {
  if (!permanentMapIds.length) return {} as Record<string, number>;
  try {
    const response = await fetch(`${runtimeBaseURL('play')}/api/play-presence?maps=${encodeURIComponent(permanentMapIds.join(','))}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return {} as Record<string, number>;
    const result = await response.json();
    return Object.fromEntries(Object.entries(result?.maps || {}).map(([mapId, value]) => [mapId, Number((value as { onlineCount?: unknown })?.onlineCount || 0)]));
  } catch {
    return {} as Record<string, number>;
  }
}

function groupKey(map: PlayMapReference) {
  return String(map.mapGroupId || map.mainProjectId || map.id);
}

function playMapGroup(maps: PlayMapReference[], permanentMapId: string) {
  const selected = maps.find((map) => map.permanentMapId === permanentMapId);
  if (!selected) throw new Error('请选择当前已导入的游玩地图');
  const members = maps.filter((map) => groupKey(map) === groupKey(selected));
  const main = members.find((map) => map.mapRole === 'main')
    || members.find((map) => map.id === selected.mainProjectId)
    || selected;
  return { main, members };
}

/** Saving a map group mirrors its profile onto every submap runtime. */
export async function savePlayMapGroupRuntimeProfile(input: Record<string, unknown>) {
  const maps = await playMaps() as PlayMapReference[];
  let mapGroup: ReturnType<typeof playMapGroup>;
  try {
    mapGroup = playMapGroup(maps, String(input.permanentMapId || ''));
  } catch (error) {
    throw new PlayerAdminRequestError(
      error instanceof Error ? error.message : '地图容器配置无效',
      400,
    );
  }
  const { main, members } = mapGroup;
  const configurationScope = input.configurationScope === 'map' ? 'map' : 'group';
  const root = configurationScope === 'group' ? main : members.find((map) => map.permanentMapId === String(input.permanentMapId))!;
  let profile: MapRuntimeProfile;
  try {
    profile = normalizeMapRuntimeProfile({ ...input, permanentMapId: root.permanentMapId, configurationScope, configurationRootId: root.permanentMapId });
  } catch (error) {
    throw new PlayerAdminRequestError(
      error instanceof Error ? error.message : '地图容器配置无效',
      400,
    );
  }
  const document = await profileDocument();
  if (profile.resourceGroupId && !document.resourceGroups.some((item: RuntimeResourceGroup) => item.id === profile.resourceGroupId)) {
    throw new PlayerAdminRequestError('所选资源组不存在或已删除', 400);
  }
  const targetIds = configurationScope === 'group' ? new Set(members.map((map) => map.permanentMapId)) : new Set([root.permanentMapId]);
  document.profiles = document.profiles.filter((item: MapRuntimeProfile) => !targetIds.has(item.permanentMapId));
  document.profiles.push(...(configurationScope === 'group'
    ? members.map((map) => ({ ...profile, permanentMapId: map.permanentMapId }))
    : [profile]));
  await writeProfileDocument(document);
  return profile;
}

export async function deletePlayMapGroupRuntimeProfile(permanentMapId: string, configurationScope: 'group' | 'map' = 'group') {
  const maps = await playMaps() as PlayMapReference[];
  const { members } = playMapGroup(maps, permanentMapId);
  const document = await profileDocument();
  const memberIds = new Set(members.map((map) => map.permanentMapId));
  document.profiles = document.profiles.filter((item: MapRuntimeProfile) => configurationScope === 'group'
    ? !(memberIds.has(item.permanentMapId) && item.configurationScope === 'group')
    : !(item.permanentMapId === permanentMapId && item.configurationScope !== 'group'));
  await writeProfileDocument(document);
}

export async function getContainerCatalog(mode: RuntimeMode) {
  const maps = mode === 'play' ? await playMaps() : await creatorMaps();
  const onlineByMap = mode === 'play' ? await playPresenceCounts(maps.map((map) => String(map.permanentMapId))) : {};
  const storedProfiles = mode === 'play' ? await listMapRuntimeProfiles() : [];
  const resourceGroups = mode === 'play' ? await listRuntimeResourceGroups() : [];
  const profiles = mode === 'play'
    ? storedProfiles.filter((profile, index, items) => profile.configurationScope !== 'group'
      || items.findIndex((item) => item.configurationScope === 'group' && item.configurationRootId === profile.configurationRootId) === index)
    : [];
  const profileByMap = new Map(storedProfiles.map((profile) => [profile.permanentMapId, profile]));
  const withStatus = await Promise.all(maps.map(async (map) => ({
    ...map,
    status: { ...(await runtimeStatus(mode, String(map.id))), ...(mode === 'play' ? { onlineCount: onlineByMap[String(map.permanentMapId)] || 0 } : {}) },
    profile: profileByMap.get(String(map.permanentMapId)),
  })));
  return {
    mode,
    defaults: runtimeDefaults(mode),
    profiles,
    resourceGroups,
    allMaps: maps,
    availableMaps: mode === 'play'
      ? maps.filter((map) => map.mapRole !== 'submap').map((map) => ({
          ...map,
          memberCount: maps.filter((candidate) => groupKey(candidate as PlayMapReference) === groupKey(map as PlayMapReference)).length,
        }))
      : maps,
    maps: withStatus.filter((map) => !['idle', 'unavailable'].includes(map.status.phase)),
  };
}

export async function destroyContainerRuntime(mode: RuntimeMode, projectId: string, roomId?: string) {
  if (!mapIdPattern.test(projectId)) throw new Error('地图 ID 格式无效');
  if (roomId && !/^[a-zA-Z0-9_-]{1,128}$/.test(roomId)) throw new Error('房间 ID 格式无效');
  const suffix = roomId
    ? `/__room/${encodeURIComponent(roomId)}/__local_runtime/destroy`
    : '/__local_runtime/destroy';
  const response = await fetch(`${runtimeControlURL(mode, projectId)}${suffix}`, { method: 'POST', signal: AbortSignal.timeout(10000) });
  if (!response.ok && response.status !== 204) throw new Error(`销毁运行时失败（HTTP ${response.status}）`);
}

/**
 * A restart is deliberately expressed as destroy + explicit start.  The
 * runtime managers keep an already-ready process alive on a plain start
 * request, so merely sending the restart header would not actually reload it.
 */
export async function restartContainerRuntime(mode: RuntimeMode, projectId: string) {
  if (!mapIdPattern.test(projectId)) throw new Error('地图 ID 格式无效');
  await destroyContainerRuntime(mode, projectId);
  const response = await fetch(`${runtimeControlURL(mode, projectId)}/__local_runtime/start`, {
    method: 'POST',
    headers: { 'x-box-runtime-restart': '1' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok && response.status !== 202) throw new Error(`启动运行时失败（HTTP ${response.status}）`);
}
