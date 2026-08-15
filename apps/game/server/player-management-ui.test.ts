import fs from 'node:fs';
import path from 'node:path';

const pagesDirectory = path.resolve(__dirname, '../pages');
const pageSource = fs.readFileSync(path.join(pagesDirectory, 'players.tsx'), 'utf8');
const styleSource = fs.readFileSync(path.join(pagesDirectory, 'player-management.module.css'), 'utf8');

describe('player management visual consistency', () => {
  test('keeps operator identity separate from page actions', () => {
    expect(pageSource).toContain('className={styles.headerIdentity}');
    expect(pageSource).toContain('className={styles.headerActions}');
    expect(pageSource).not.toContain('className={styles.headerButtons}');
  });

  test('keeps the security summary separated from the activity filters', () => {
    expect(styleSource).toMatch(/\.securityGrid\s*\{[^}]*margin-bottom:\s*14px;/s);
  });

  test('overrides the table header cell background in dark mode', () => {
    expect(styleSource).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)[\s\S]*\.tableCard thead th\s*\{[^}]*background:\s*#23262b;/);
  });

  test('constrains the workspace before wide tables can overflow on narrow screens', () => {
    expect(styleSource).toMatch(/@media\s*\(max-width:\s*900px\)[\s\S]*\.workspace\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100vw;/);
    expect(styleSource).toMatch(/@media\s*\(max-width:\s*900px\)[\s\S]*\.sidebar\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100vw;[^}]*overflow:\s*hidden;/);
  });

  test('gives every player detail screen one focused responsibility', () => {
    expect(pageSource).toContain("type PlayerDetailTab = 'profile' | 'identity' | 'permissions' | 'sessions' | 'logins' | 'ban' | 'password' | 'related' | 'history' | 'danger';");
    for (const label of ['基本资料', '身份档案', '角色权限', '会话设备', '登录记录', '封禁管理', '密码重置', '关联线索', '管理记录', '删除身份']) {
      expect(pageSource).toContain(`<strong>${label}</strong>`);
    }
    expect(pageSource).not.toContain('>资料与权限</button>');
    expect(pageSource).not.toContain('>会话与登录</button>');
    expect(pageSource).not.toContain('>安全与恢复</button>');
    expect(pageSource).toContain('className={styles.detailWorkspace}');
  });
});
