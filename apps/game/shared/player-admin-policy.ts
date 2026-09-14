export const PLAYER_ADMIN_CAPABILITIES = [
  'players.view',
  'players.manage',
  'players.ban',
  'sessions.manage',
  'identity-bans.manage',
  'players.create',
  'players.export',
  'passwords.reset',
  'creator-tokens.manage',
  'audit.view',
] as const;

export type PlayerAdminCapability = typeof PLAYER_ADMIN_CAPABILITIES[number];
export type PlayerAdminRequirement = PlayerAdminCapability | 'owner';
export type PlayerAdminRole = 'owner' | 'admin' | 'moderator';

export const PLAYER_ADMIN_GRANTABLE_CAPABILITIES = PLAYER_ADMIN_CAPABILITIES.filter(
  (capability) => capability !== 'players.view',
) as Exclude<PlayerAdminCapability, 'players.view'>[];

export const PLAYER_ADMIN_CAPABILITY_META: Record<PlayerAdminCapability, {
  label: string;
  description: string;
}> = {
  'players.view': { label: '查看玩家', description: '进入后台并查看玩家目录、资料和概览' },
  'players.manage': { label: '维护玩家资料', description: '修改昵称、标签、备注与神岛 ID' },
  'players.ban': { label: '账号封禁', description: '临时或永久封禁普通玩家账号并解除处罚' },
  'sessions.manage': { label: '会话管理', description: '撤销登录会话并让普通玩家立即下线' },
  'identity-bans.manage': { label: 'IP 与设备封禁', description: '封禁或解除登录 IP 和设备标识' },
  'players.create': { label: '新增普通玩家', description: '创建普通玩家账号，不能创建管理员或服主' },
  'players.export': { label: '导出玩家数据', description: '导出玩家目录 CSV' },
  'passwords.reset': { label: '重置玩家密码', description: '为普通玩家设置临时密码并撤销旧会话' },
  'creator-tokens.manage': { label: '管理 Creator CLI Token', description: '为已获创作权限的玩家签发或撤销 CLI Token，不会提升其创作权限' },
  'audit.view': { label: '查看安全审计', description: '查看登录风险、关联线索和管理操作记录' },
};

export function normalizePlayerAdminCapabilities(value: unknown): PlayerAdminCapability[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(PLAYER_ADMIN_GRANTABLE_CAPABILITIES);
  return [...new Set(value.map(String).filter((capability) => allowed.has(capability)))] as PlayerAdminCapability[];
}

export function effectivePlayerAdminCapabilities(
  role: PlayerAdminRole,
  assigned: readonly string[] = [],
): PlayerAdminCapability[] {
  if (role === 'owner' || role === 'admin') return [...PLAYER_ADMIN_CAPABILITIES];
  if (role !== 'moderator') return [];
  return ['players.view', ...normalizePlayerAdminCapabilities(assigned)];
}

export function roleHasPlayerAdminPermission(
  role: PlayerAdminRole,
  requirement: PlayerAdminRequirement,
  assigned: readonly string[] = [],
) {
  // Owner access is never role-grantable. The authorization seam must also
  // verify that the identity came from a server-owner key session.
  if (requirement === 'owner') return false;
  return effectivePlayerAdminCapabilities(role, assigned).includes(requirement);
}
