import fs from 'node:fs';
import path from 'node:path';

const pagesDirectory = path.resolve(__dirname, '../pages');
const pageSource = fs.readFileSync(path.join(pagesDirectory, 'players.tsx'), 'utf8');
const accountSource = fs.readFileSync(path.join(pagesDirectory, 'account.tsx'), 'utf8');
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

  test('uses one token system for explicit and system dark themes', () => {
    expect(styleSource).toContain(".themeRoot[data-theme='dark']");
    expect(styleSource).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*\.themeRoot\[data-theme='system'\]/);
    expect(styleSource.match(/@media\s*\(prefers-color-scheme:\s*dark\)/g)).toHaveLength(1);
    expect(pageSource).toContain('data-theme={theme}');
    expect(pageSource).toContain("localStorage.setItem(THEME_KEY, next)");
  });

  test('constrains the workspace before wide tables can overflow on narrow screens', () => {
    expect(styleSource).toMatch(/@media\s*\(max-width:\s*820px\)[\s\S]*\.workspace\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100vw;/);
    expect(styleSource).toMatch(/@media\s*\(max-width:\s*1100px\)[\s\S]*\.tableCard\s*\{[^}]*overflow-x:\s*auto;/);
  });

  test('gives every player detail screen one focused responsibility', () => {
    expect(pageSource).toContain("type PlayerDetailTab = 'profile' | 'identity' | 'boxId' | 'permissions' | 'sessions' | 'logins' | 'ban' | 'password' | 'related' | 'history' | 'danger';");
    for (const label of ['基本资料', '身份档案', '神岛 ID', '角色权限', '会话设备', '登录记录', '封禁管理', '密码重置', '关联线索', '管理记录', '删除身份']) {
      expect(pageSource).toContain(`<strong>${label}</strong>`);
    }
    expect(pageSource).not.toContain('>资料与权限</button>');
    expect(pageSource).not.toContain('>会话与登录</button>');
    expect(pageSource).not.toContain('>安全与恢复</button>');
    expect(pageSource).toContain('className={styles.detailWorkspace}');
  });

  test('keeps legacy Box ID binding in its own administrator-managed screen', () => {
    expect(pageSource).toContain("boxId: string;");
    expect(pageSource).toContain("detailTab === 'boxId'");
    expect(pageSource).toContain('onClick={saveBoxId}');
    expect(pageSource).toContain("body: JSON.stringify({ boxId: selected.boxId })");
  });

  test('gives directory, sessions, bans and roles distinct tables and default actions', () => {
    for (const section of ['players', 'sessions', 'bans', 'roles']) {
      expect(pageSource).toContain(`section === '${section}' ? <table>`);
    }
    for (const label of ['账号标识', '有效会话', '处罚类型', '权限范围']) {
      expect(pageSource).toContain(`<th>${label}</th>`);
    }
    expect(pageSource).not.toContain('styles.managementShortcuts');
  });

  test('supports keyboard search, escape dismissal and copyable identity fields', () => {
    expect(pageSource).toContain('aria-keyshortcuts="/"');
    expect(pageSource).toContain("event.key === 'Escape'");
    expect(pageSource).toContain('navigator.clipboard.writeText(value)');
  });

  test('keeps account login inside the same themed player-service experience', () => {
    expect(accountSource).toContain('className={`${styles.themeRoot} ${styles.accountShell}`}');
    expect(accountSource).toContain('data-theme={theme}');
    expect(accountSource).toContain("localStorage.setItem(THEME_KEY, next)");
    expect(accountSource).toContain('className={styles.accountCard}');
    expect(accountSource).toContain('className={styles.accountForm}');
    expect(styleSource).toContain('.accountShell');
    expect(styleSource).toContain('.accountCard');
    expect(styleSource).toContain('.accountForm');
    expect(accountSource).not.toContain('accountIntro');
    expect(accountSource).not.toContain('accountBenefits');
    expect(accountSource).not.toContain('accountIdentityList');
  });

  test('provides accessible login, registration and signed-in account states', () => {
    expect(accountSource).toContain('role="tablist"');
    expect(accountSource).toContain('aria-selected={mode === \'login\'}');
    expect(accountSource).toContain('aria-live="polite"');
    expect(accountSource).toContain("mode === 'login' ? 'current-password' : 'new-password'");
    expect(accountSource).toContain('minLength={8}');
    expect(accountSource).toContain('accountUnavailable');
  });
});
