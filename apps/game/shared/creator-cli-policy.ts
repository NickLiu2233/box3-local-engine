/**
 * CLI Token authorization is independent from the Creator UI authorization on
 * a player's basic profile. It may gain CLI-only operations over time.
 */
export const CREATOR_CLI_CAPABILITIES = [
  'projects.list',
  'resources.list',
  'scripts.read',
  'scripts.update',
  'storage.read',
  'storage.write',
  'runtime.view',
  'runtime.control',
  'scene.capture',
  'voxa.project.read',
  'voxa.project.edit',
  'voxa.project.export',
  'voxa.scene.capture',
] as const;
export type CreatorCliCapability = typeof CREATOR_CLI_CAPABILITIES[number];

export type CreatorCliCapabilityMeta = Readonly<{
  label: string;
  description: string;
  group: string;
}>;

export const CREATOR_CLI_CAPABILITY_META: Readonly<Record<CreatorCliCapability, CreatorCliCapabilityMeta>> = Object.freeze({
  'projects.list': { label: '查看地图', description: '查看指定 Creator 服务器中的地图列表与永久地图 ID', group: '地图与资源' },
  'resources.list': { label: '同步资源索引', description: '读取地图引用的模型、图片、音频与 UI 资源清单', group: '地图与资源' },
  'scripts.read': { label: '读取脚本', description: '读取指定地图的客户端、服务端脚本，用于同步与差异比较', group: '脚本' },
  'scripts.update': { label: '更新脚本', description: '上传或覆盖指定地图的客户端、服务端脚本', group: '脚本' },
  'storage.read': { label: '查看数据空间', description: '读取地图工程或地图组数据空间中的键和值', group: '数据空间' },
  'storage.write': { label: '修改数据空间', description: '写入或删除地图工程或地图组数据空间中的键和值', group: '数据空间' },
  'runtime.view': { label: '查看预览日志', description: '查看地图预览运行状态，并订阅客户端与服务端控制台', group: '预览运行' },
  'runtime.control': { label: '控制预览运行', description: '启动或停止地图预览运行', group: '预览运行' },
  'scene.capture': { label: '截取编辑场景', description: '请求当前已授权编辑会话返回场景截图', group: '编辑场景' },
  'voxa.project.read': { label: '读取 VOXA 工程', description: '读取模型工程摘要、节点结构和校验信息', group: 'VOXA 模型' },
  'voxa.project.edit': { label: '编辑 VOXA 工程', description: '控制已打开的 VOXA 编辑器，执行体素、多部件、旋转、动画、碰撞和保存操作', group: 'VOXA 模型' },
  'voxa.project.export': { label: '交换 VOXA 工程', description: '导入、删除和导出服务器上的模型或皮肤工程文件', group: 'VOXA 模型' },
  'voxa.scene.capture': { label: '截取 VOXA 模型', description: '获取 VOXA 当前模型的实时预览截图', group: 'VOXA 模型' },
});
export const FULL_CREATOR_CLI_CAPABILITIES = [...CREATOR_CLI_CAPABILITIES] as CreatorCliCapability[];

export function normalizeCreatorCliCapabilities(value: unknown): CreatorCliCapability[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(CREATOR_CLI_CAPABILITIES);
  return [...new Set(value.map(String).filter((permission) => allowed.has(permission)))] as CreatorCliCapability[];
}
