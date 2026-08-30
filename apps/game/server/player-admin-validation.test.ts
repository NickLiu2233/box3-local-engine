import { describe, expect, test } from '@jest/globals';

import { PlayerAdminRequestError } from './player-admin-errors';
import {
  parseCreateAdminAccount,
  parseCreateManagedPlayer,
  parseCreatePermissionGroup,
  parsePlayerBatch,
  parsePlayerItemOperation,
  parsePlayerListQuery,
  parseUpdateAdminAccount,
  parseUuid,
} from './player-admin-validation';

const subjectId = '0123456789abcdef0123456789abcdef';
const secondSubjectId = 'abcdef0123456789abcdef0123456789';

function expectRequestError(callback: () => unknown, message?: string) {
  expect(callback).toThrow(PlayerAdminRequestError);
  if (message) expect(callback).toThrow(message);
}

describe('player administration request validation', () => {
  test('normalizes supported player fields and rejects unknown fields', () => {
    expect(parsePlayerItemOperation('PATCH', subjectId, {
      displayName: '  测试玩家  ',
      tags: ['常驻', '常驻', '建筑'],
      boxId: '  island-user  ',
    })).toEqual({
      kind: 'patch',
      subjectId,
      changes: {
        displayName: '测试玩家',
        tags: ['常驻', '建筑'],
        boxId: 'island-user',
      },
    });

    expectRequestError(
      () => parsePlayerItemOperation('PATCH', subjectId, { displayName: '玩家', extra: true }),
      '请求包含不支持的字段',
    );
  });

  test('never accepts legacy player role, admin permission, or avatar fields', () => {
    for (const body of [
      { role: 'admin' },
      { adminPermissions: ['players.view'] },
    ]) {
      expectRequestError(
        () => parsePlayerItemOperation('PATCH', subjectId, body),
        '玩家账号不能授予后台权限',
      );
      expectRequestError(
        () => parseCreateManagedPlayer({
          username: 'tester_01',
          displayName: '测试玩家',
          password: 'password-123',
          ...body,
        }),
        '玩家账号不能授予后台权限',
      );
    }

    expectRequestError(
      () => parsePlayerItemOperation('PATCH', subjectId, { avatar: 'data:image/png;base64,AA==' }),
      '玩家头像上传功能已停用',
    );
  });

  test('deduplicates batches, caps them at 100 players, and validates action fields', () => {
    expect(parsePlayerBatch({
      action: 'add-tag',
      subjectIds: [subjectId, subjectId, secondSubjectId],
      tag: '  活跃  ',
    })).toEqual({
      action: 'add-tag',
      subjectIds: [subjectId, secondSubjectId],
      tag: '活跃',
    });

    expectRequestError(() => parsePlayerBatch({
      action: 'unban',
      subjectIds: Array.from({ length: 101 }, (_, index) => index.toString(16).padStart(32, '0')),
    }));
    expectRequestError(() => parsePlayerBatch({
      action: 'revoke-sessions',
      subjectIds: [subjectId],
      reason: '这个动作不接受原因',
    }), '请求包含不支持的字段');
  });

  test('admin accounts cannot be assigned the owner role', () => {
    const base = {
      username: 'admin_user',
      displayName: '管理员',
      password: 'strong-password',
      permissions: [],
    };
    expect(parseCreateAdminAccount({ ...base, role: 'admin' }).role).toBe('admin');
    expect(parseCreateAdminAccount({ ...base, role: 'moderator' }).role).toBe('moderator');
    expectRequestError(() => parseCreateAdminAccount({ ...base, role: 'owner' }));
    expectRequestError(() => parseUpdateAdminAccount({ role: 'owner' }));
  });

  test('permission groups only accept grantable capabilities', () => {
    expect(parseCreatePermissionGroup({
      name: '日常管理',
      permissions: ['players.manage', 'players.manage', 'audit.view'],
    })).toEqual({
      name: '日常管理',
      permissions: ['players.manage', 'audit.view'],
    });
    expectRequestError(() => parseCreatePermissionGroup({
      name: '越权权限组',
      permissions: ['players.view'],
    }));
    expectRequestError(() => parseCreatePermissionGroup({
      name: '服主权限组',
      permissions: ['owner'],
    }));
  });

  test('list queries have bounded pagination and known enum defaults', () => {
    expect(parsePlayerListQuery({})).toEqual({
      search: '',
      page: 1,
      pageSize: 30,
      identity: 'all',
      role: 'player',
      online: 'all',
      sort: 'lastSeen',
    });
    expect(parsePlayerListQuery({
      page: '-4',
      pageSize: '1000',
      identity: 'unexpected',
      online: 'unexpected',
      sort: 'unexpected',
    })).toMatchObject({
      page: 1,
      pageSize: 30,
      identity: 'all',
      online: 'all',
      sort: 'lastSeen',
    });
  });

  test('administrator and permission-group identifiers must be UUIDs', () => {
    expect(parseUuid('550e8400-e29b-41d4-a716-446655440000', '管理员账号 ID')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
    expectRequestError(() => parseUuid('not-a-uuid', '管理员账号 ID'), '管理员账号 ID无效');
  });
});
