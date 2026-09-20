import {
  allowedPlayerAdminViews,
  canOpenPlayerAdminView,
  playerAdminFallbackView,
} from '../shared/player-admin-navigation';

describe('player-admin navigation permissions', () => {
  const moderator = {
    role: 'moderator' as const,
    permissions: ['players.view', 'players.manage'],
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
    expect(allowedPlayerAdminViews({ role: 'owner', permissions: [] })).toHaveLength(10);
  });
});
