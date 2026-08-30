import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from '@jest/globals';

import {
  actorHasPlayerAdminPermission,
  roleHasPlayerAdminPermission,
} from './player-admin-authorization';

describe('player administration role policy', () => {
  test('player identity resolution is absent from the authorization seam', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'player-admin-authorization.ts'),
      'utf8',
    );
    expect(source).toContain('resolvePlayerAdminSession');
    expect(source).not.toContain('resolvePlayerIdentity');
    expect(source).not.toContain('getAssignedPlayerAdminCapabilities');
  });

  test('administrators only receive the capabilities assigned by an owner', () => {
    expect(roleHasPlayerAdminPermission('moderator', 'players.view')).toBe(true);
    expect(roleHasPlayerAdminPermission('moderator', 'players.ban')).toBe(false);
    expect(roleHasPlayerAdminPermission('moderator', 'players.ban', ['players.ban'])).toBe(true);
    expect(roleHasPlayerAdminPermission('moderator', 'sessions.manage', ['players.ban'])).toBe(false);
    expect(roleHasPlayerAdminPermission('moderator', 'owner')).toBe(false);
  });

  test('advanced administrators keep player-management capabilities but not owner operations', () => {
    expect(roleHasPlayerAdminPermission('admin', 'players.view')).toBe(true);
    expect(roleHasPlayerAdminPermission('admin', 'identity-bans.manage')).toBe(true);
    expect(roleHasPlayerAdminPermission('admin', 'owner')).toBe(false);
    expect(roleHasPlayerAdminPermission('owner', 'owner')).toBe(false);
    expect(actorHasPlayerAdminPermission({
      actorRole: 'owner',
      actorPermissions: [],
      credential: 'owner-session',
    }, 'owner')).toBe(true);
    expect(actorHasPlayerAdminPermission({
      actorRole: 'owner',
      actorPermissions: [],
      credential: 'account',
    }, 'owner')).toBe(false);
  });

  test('unknown stored permission values never become effective permissions', () => {
    expect(roleHasPlayerAdminPermission('moderator', 'players.ban', ['owner', 'players.delete'])).toBe(false);
  });

  test('admin sessions use dedicated cookies instead of player cookies', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'player-admin-identity.ts'),
      'utf8',
    );
    expect(source).toContain("'box_local_admin_session'");
    expect(source).toContain("'box_local_admin_csrf'");
    expect(source).not.toContain('box_local_player_session');
    expect(source).toContain("sameSite: 'strict'");
    expect(source).toContain('LOGIN_IP_LIMIT');
    expect(source).toContain('LOGIN_ACCOUNT_LIMIT');
    expect(source).toContain('服主只能通过服主密钥进入，不能分配给管理账号');
    expect(source).toContain("CHECK (role IN ('admin', 'moderator'))");
    expect(source).toContain("WHERE role = 'owner'");
    expect(source).toContain('admin_sessions_identity_check');
    expect(source).toContain('function requireOwnerIdentity');
    expect(source).toContain("actor.credential !== 'owner-session'");
  });

  test('mutations require both same-origin validation and a CSRF token', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'player-admin-authorization.ts'),
      'utf8',
    );
    expect(source).toContain("fetchSite === 'cross-site'");
    expect(source).toContain('requestOrigins(req).has(supplied)');
    expect(source).toContain("requireCsrf: !SAFE_METHODS.has(req.method || 'GET')");
  });

  test('permission groups are owner-managed and resolved on every admin session request', () => {
    const identitySource = fs.readFileSync(
      path.resolve(__dirname, 'player-admin-identity.ts'),
      'utf8',
    );
    const collectionRoute = fs.readFileSync(
      path.resolve(__dirname, '../pages/api/play-admin/permission-groups/index.ts'),
      'utf8',
    );
    const itemRoute = fs.readFileSync(
      path.resolve(__dirname, '../pages/api/play-admin/permission-groups/[id].ts'),
      'utf8',
    );
    expect(collectionRoute).toContain("authorizePlayerAdmin(req, res, 'owner')");
    expect(itemRoute).toContain("authorizePlayerAdmin(req, res, 'owner')");
    expect(identitySource).toContain(
      "LEFT JOIN ${table('admin_permission_groups')} g ON g.id = a.permission_group_id",
    );
    expect(identitySource).toContain('row.permission_group_permissions || []');
  });

  test('every owner-only API passes through the credential-aware authorization seam', () => {
    for (const route of [
      '../pages/api/play-admin/admins/index.ts',
      '../pages/api/play-admin/admins/[id].ts',
      '../pages/api/play-admin/permission-groups/index.ts',
      '../pages/api/play-admin/permission-groups/[id].ts',
      '../pages/api/play-admin/maintenance.ts',
      '../pages/api/play-admin/players/[subjectId].ts',
    ]) {
      const source = fs.readFileSync(path.resolve(__dirname, route), 'utf8');
      expect(source).toContain("authorizePlayerAdmin(req, res, 'owner')");
    }
  });
});
