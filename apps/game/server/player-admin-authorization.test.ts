import { describe, expect, test } from '@jest/globals';

import { roleHasPlayerAdminPermission } from './player-admin-authorization';

describe('player administration role policy', () => {
  test('ordinary players cannot enter the administration console', () => {
    expect(roleHasPlayerAdminPermission('player', 'read')).toBe(false);
    expect(roleHasPlayerAdminPermission('player', 'moderate')).toBe(false);
    expect(roleHasPlayerAdminPermission('player', 'owner')).toBe(false);
  });

  test('moderators can inspect and moderate players but cannot perform owner actions', () => {
    expect(roleHasPlayerAdminPermission('moderator', 'read')).toBe(true);
    expect(roleHasPlayerAdminPermission('moderator', 'moderate')).toBe(true);
    expect(roleHasPlayerAdminPermission('moderator', 'owner')).toBe(false);
  });

  test('admin accounts can perform every player administration action', () => {
    expect(roleHasPlayerAdminPermission('admin', 'read')).toBe(true);
    expect(roleHasPlayerAdminPermission('admin', 'moderate')).toBe(true);
    expect(roleHasPlayerAdminPermission('admin', 'owner')).toBe(true);
  });
});
