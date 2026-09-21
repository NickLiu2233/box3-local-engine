import type { PlayerAdminCapability } from './player-admin-policy';

export const PLAYER_ADMIN_VIEWS = [
  'overview',
  'players',
  'online-sessions',
  'account-bans',
  'identity-bans',
  'security',
  'admins',
  'permission-groups',
  'play-maps',
  'container-play',
  'container-creator',
  'container-profiles',
  'creator-access',
  'creator-tokens',
] as const;

export type PlayerAdminView = typeof PLAYER_ADMIN_VIEWS[number];

export type PlayerAdminNavigationActor = {
  role: 'moderator' | 'admin' | 'owner';
  permissions: readonly string[];
};

/** The least privilege needed to reveal and open each console page. */
export const PLAYER_ADMIN_VIEW_REQUIREMENTS: Record<
  PlayerAdminView,
  PlayerAdminCapability | 'owner'
> = {
  overview: 'players.view',
  players: 'players.view',
  'online-sessions': 'players.view',
  'account-bans': 'players.ban',
  'identity-bans': 'identity-bans.view',
  security: 'audit.view',
  admins: 'owner',
  'permission-groups': 'owner',
  'play-maps': 'play-maps.view',
  'container-play': 'containers.view',
  'container-creator': 'containers.view',
  'container-profiles': 'containers.view',
  'creator-access': 'creator-access.view',
  'creator-tokens': 'creator-tokens.view',
};

export function canOpenPlayerAdminView(
  actor: PlayerAdminNavigationActor | undefined,
  view: PlayerAdminView,
) {
  if (!actor) return false;
  if (actor.role === 'owner') return true;
  const requirement = PLAYER_ADMIN_VIEW_REQUIREMENTS[view];
  return requirement !== 'owner' && actor.permissions.includes(requirement);
}

export function allowedPlayerAdminViews(actor: PlayerAdminNavigationActor | undefined) {
  return PLAYER_ADMIN_VIEWS.filter((view) => canOpenPlayerAdminView(actor, view));
}

export function playerAdminFallbackView(actor: PlayerAdminNavigationActor | undefined): PlayerAdminView {
  const available = allowedPlayerAdminViews(actor);
  return available.includes('players') ? 'players' : (available[0] || 'players');
}
