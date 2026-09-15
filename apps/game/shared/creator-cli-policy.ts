/**
 * CLI Token authorization is independent from the Creator UI authorization on
 * a player's basic profile. It may gain CLI-only operations over time.
 */
export const CREATOR_CLI_CAPABILITIES = [
  'projects.list',
  'resources.list',
  'scripts.update',
] as const;
export type CreatorCliCapability = typeof CREATOR_CLI_CAPABILITIES[number];

export const CREATOR_CLI_CAPABILITY_META: Readonly<Record<CreatorCliCapability, Readonly<{ label: string; description: string }>>> = Object.freeze({
  'projects.list': { label: '查看地图', description: '查看指定 Creator 服务器中的地图列表与永久地图 ID' },
  'resources.list': { label: '同步资源索引', description: '读取地图引用的模型、图片、音频与 UI 资源清单' },
  'scripts.update': { label: '更新脚本', description: '上传或覆盖指定地图的客户端、服务端脚本' },
});
export const FULL_CREATOR_CLI_CAPABILITIES = [...CREATOR_CLI_CAPABILITIES] as CreatorCliCapability[];

export function normalizeCreatorCliCapabilities(value: unknown): CreatorCliCapability[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(CREATOR_CLI_CAPABILITIES);
  return [...new Set(value.map(String).filter((permission) => allowed.has(permission)))] as CreatorCliCapability[];
}
