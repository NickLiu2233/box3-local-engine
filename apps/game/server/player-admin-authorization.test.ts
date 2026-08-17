import { describe, expect, test } from '@jest/globals';

import { roleHasPlayerAdminPermission } from './player-admin-authorization';

describe('player administration role policy', () => {
  test('ordinary players cannot enter the administration console', () => {
    expect(roleHasPlayerAdminPermission('player', 'players.view')).toBe(false);
    expect(roleHasPlayerAdminPermission('player', 'players.ban')).toBe(false);
    expect(roleHasPlayerAdminPermission('player', 'owner')).toBe(false);
  });

  test('administrators only receive the capabilities assigned by an owner', () => {
    expect(roleHasPlayerAdminPermission('moderator', 'players.view')).toBe(true);
    expect(roleHasPlayerAdminPermission('moderator', 'players.ban')).toBe(false);
    expect(roleHasPlayerAdminPermission('moderator', 'players.ban', ['players.ban'])).toBe(true);
    expect(roleHasPlayerAdminPermission('moderator', 'sessions.manage', ['players.ban'])).toBe(false);
    expect(roleHasPlayerAdminPermission('moderator', 'owner')).toBe(false);
  });

  test('owner accounts keep every capability and owner-only operations', () => {
    expect(roleHasPlayerAdminPermission('admin', 'players.view')).toBe(true);
    expect(roleHasPlayerAdminPermission('admin', 'identity-bans.manage')).toBe(true);
    expect(roleHasPlayerAdminPermission('admin', 'owner')).toBe(true);
  });

  test('unknown stored permission values never become effective permissions', () => {
    expect(roleHasPlayerAdminPermission('moderator', 'players.ban', ['owner', 'players.delete'])).toBe(false);
  });
});
