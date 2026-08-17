import fs from 'node:fs';
import path from 'node:path';

const pagesDirectory = path.resolve(__dirname, '../pages');
const pageSource = fs.readFileSync(path.join(pagesDirectory, 'players.tsx'), 'utf8');
const styleSource = fs.readFileSync(path.join(pagesDirectory, 'player-management.module.css'), 'utf8');
const identitySource = fs.readFileSync(path.resolve(__dirname, 'local-player-identity.ts'), 'utf8');

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

  test('uses the Box Web palette and brand treatment instead of generic dashboard colors', () => {
    for (const color of ['#383838', '#262626', '#404040', '#ffdb00', '#d9b500']) {
      expect(styleSource).toContain(color);
    }
    for (const color of ['#111214', '#17181b', '#1b1c20']) {
      expect(styleSource).not.toContain(color);
    }
    expect(styleSource).toContain('font-family: MiSans, Montserrat, "Microsoft YaHei"');
    expect(styleSource).toMatch(/\.sidebar nav \.navActive\s*\{[^}]*background:\s*var\(--brand\);/s);
  });

  test('keeps player administration text and dialogs readable', () => {
    expect(styleSource).toMatch(/\.adminShell\s*\{[^}]*grid-template-columns:\s*256px[^}]*font-size:\s*14px;/s);
    expect(styleSource).toMatch(/\.sidebar nav button div\s*\{[^}]*font-size:\s*14px;/s);
    expect(styleSource).toMatch(/\.tableCard td,\s*\.tableCard td strong\s*\{[^}]*font-size:\s*12px;/s);
    expect(styleSource).toMatch(/\.detailTabs button strong\s*\{[^}]*font-size:\s*12px;/s);
    expect(styleSource).toMatch(/\.loginDialog input\s*\{[^}]*font-size:\s*13px;/s);
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

  test('does not ship an embedded player login page', () => {
    expect(fs.existsSync(path.join(pagesDirectory, 'account.tsx'))).toBe(false);
    expect(styleSource).not.toContain('.accountShell');
    expect(styleSource).not.toContain('.accountForm');
  });

  test('provides a permission-gated user creation workflow', () => {
    expect(pageSource).toContain('<UserPlus size={14} />新增用户');
    expect(pageSource).toContain("fetch('/api/play-admin/players'");
    expect(pageSource).toContain('aria-labelledby="create-user-title"');
    expect(pageSource).toContain('autoComplete="new-password"');
    expect(pageSource).toContain("setNotice(`用户“${data.player.displayName}”已创建");
  });

  test('keeps ban errors and confirmation visible inside the player drawer', () => {
    expect(pageSource).toContain('className={styles.drawerNotice}');
    expect(pageSource).toContain("selected.status === 'banned'");
    expect(pageSource).toContain('封禁已经生效');
    expect(styleSource).toContain('.drawerNotice');
  });

  test('lets only owners assign layered administrator capabilities', () => {
    expect(identitySource).toContain('admin_permissions TEXT[]');
    expect(pageSource).toContain('PLAYER_ADMIN_GRANTABLE_CAPABILITIES.map');
    expect(pageSource).toContain("adminPermissions: selected.role === 'moderator'");
    expect(pageSource).toContain('只有服主可以设置角色和授权');
    expect(pageSource).toContain("detailTab === 'danger' && ownerAccess");
    expect(styleSource).toContain('.permissionGrid');
  });

  test('supports persistent account, IP and random-device bans', () => {
    expect(identitySource).toContain("const DEVICE_COOKIE_NAME = 'box_local_player_device'");
    expect(identitySource).toContain("kind TEXT NOT NULL CHECK (kind IN ('ip', 'device'))");
    expect(identitySource).toContain("WHERE created_ip = $1 OR last_seen_ip = $1");
    expect(identitySource).toContain("WHERE device_hash = $1");
    expect(identitySource).toContain("if (ipBan) throw new Error('IP_BANNED')");
    expect(identitySource).toContain("if (deviceBan) throw new Error('DEVICE_BANNED')");
    expect(pageSource).toContain("banSource('ip'");
    expect(pageSource).toContain("banSource('device'");
    expect(pageSource).toContain('IP 与设备处罚');
  });
});
