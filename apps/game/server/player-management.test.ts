import { describe, expect, test } from '@jest/globals';

import type { PlayerAccountView } from './local-player-identity';
import { serializeManagedPlayersCsv } from './local-player-identity';

function player(changes: Partial<PlayerAccountView> = {}): PlayerAccountView {
  return {
    subjectId: '0123456789abcdef0123456789abcdef',
    userId: '42',
    username: 'player_42',
    boxId: '',
    displayName: '玩家四十二',
    avatar: '',
    role: 'player',
    status: 'active',
    guest: false,
    userKey: 'local:0123456789abcdef0123456789abcdef',
    firstSeenIp: '127.0.0.1',
    lastSeenIp: '127.0.0.1',
    registrationIp: '127.0.0.1',
    lastLoginIp: '127.0.0.1',
    loginCount: 3,
    activeSessionCount: 1,
    adminNote: '',
    tags: [],
    banReason: '',
    ...changes,
  };
}

describe('player management CSV export', () => {
  test('keeps Chinese data and escapes commas, quotes and newlines', () => {
    const csv = serializeManagedPlayersCsv([player({
      displayName: '冷鱼,测试',
      adminNote: '第一行\n"第二行"',
      tags: ['测试员', '重点关注'],
    })]);

    expect(csv.startsWith('\uFEFF用户ID,身份ID')).toBe(true);
    expect(csv).toContain('"冷鱼,测试"');
    expect(csv).toContain('测试员|重点关注');
    expect(csv).toContain('"第一行\n""第二行"""');
  });

  test('neutralizes spreadsheet formulas from player-controlled fields', () => {
    const csv = serializeManagedPlayersCsv([player({
      displayName: '=HYPERLINK("https://example.invalid")',
      adminNote: '+cmd',
      tags: ['@danger'],
    })]);

    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'@danger");
    expect(csv).toContain("'+cmd");
  });

  test('exports the optional legacy Box ID independently from the local username', () => {
    const csv = serializeManagedPlayersCsv([player({
      username: 'local_player',
      boxId: 'legacy_box_player',
    })]);

    expect(csv).toContain('神岛ID');
    expect(csv).toContain('local_player,legacy_box_player');
  });
});
