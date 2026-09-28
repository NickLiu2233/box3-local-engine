import {
  allowedPlayerAdminViews,
  canOpenPlayerAdminView,
  playerAdminFallbackView,
  PLAYER_ADMIN_VIEWS,
} from '../shared/player-admin-navigation';

describe('player-admin navigation permissions', () => {
  const moderator = {
    role: 'moderator' as const,
    permissions: ['players.view', 'players.manage', 'sessions.view'],
  };

  test('does not expose pages whose capability was not granted', () => {
    expect(allowedPlayerAdminViews(moderator)).toEqual([
      'overview',
      'players',
      'online-sessions',
    ]);
    expect(canOpenPlayerAdminView(moderator, 'account-bans')).toBe(false);
    expect(canOpenPlayerAdminView(moderator, 'security')).toBe(false);
    expect(playerAdminFallbackView(moderator)).toBe('players');
  });

  test('owner can open all pages', () => {
    expect(allowedPlayerAdminViews({ role: 'owner', permissions: [] })).toHaveLength(
      PLAYER_ADMIN_VIEWS.length,
    );
  });

  test('delegates the play-map page only to groups with map visibility', () => {
    expect(canOpenPlayerAdminView(moderator, 'play-maps')).toBe(false);
    expect(canOpenPlayerAdminView({
      role: 'moderator',
      permissions: ['players.view', 'play-maps.view'],
    }, 'play-maps')).toBe(true);
  });

  test('keeps the server-wide resource cache switch out of delegated groups', () => {
    expect(canOpenPlayerAdminView({
      role: 'moderator',
      permissions: ['players.view', 'play-maps.manage'],
    }, 'play-resource-cache')).toBe(false);
    expect(canOpenPlayerAdminView({ role: 'admin', permissions: [] }, 'play-resource-cache')).toBe(true);
    expect(canOpenPlayerAdminView({
      role: 'moderator',
      permissions: ['players.view', 'play-launcher-resources.view'],
    }, 'play-launcher-access')).toBe(false);
    expect(canOpenPlayerAdminView({ role: 'owner', permissions: [] }, 'play-launcher-access')).toBe(true);
  });

  test('delegates both container views only to groups with container visibility', () => {
    expect(canOpenPlayerAdminView(moderator, 'container-play')).toBe(false);
    expect(canOpenPlayerAdminView({
      role: 'moderator',
      permissions: ['players.view', 'containers.view'],
    }, 'container-play')).toBe(true);
    expect(canOpenPlayerAdminView({
      role: 'moderator',
      permissions: ['players.view', 'containers.view'],
    }, 'container-creator')).toBe(true);
  });
});
