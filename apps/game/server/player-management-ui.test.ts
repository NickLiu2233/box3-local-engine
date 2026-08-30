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

  test('renders a dedicated sign-in screen before exposing the administration shell', () => {
    const signedOutGuard = pageSource.indexOf('if (!actor) {');
    const adminShell = pageSource.indexOf('<main className={styles.adminShell}>');
    const verificationRequest = pageSource.indexOf("const verifyResponse = await fetch('/api/play-admin/verify'");
    const playerRequest = pageSource.indexOf('const [playersResponse, overviewResponse] = await Promise.all([');
    expect(signedOutGuard).toBeGreaterThan(-1);
    expect(signedOutGuard).toBeLessThan(adminShell);
    expect(verificationRequest).toBeGreaterThan(-1);
    expect(verificationRequest).toBeLessThan(playerRequest);
    expect(pageSource).toContain('className={styles.signedOutShell}');
    expect(pageSource).not.toContain('className={styles.loginBackdrop}');
  });

  test('uses Radix dialogs with one shared header and readable themed titles', () => {
    expect(pageSource).toContain("from '@radix-ui/react-dialog'");
    expect(pageSource.match(/<Dialog\.Root/g)).toHaveLength(3);
    expect(pageSource.match(/<AdminDialogHeader/g)).toHaveLength(3);
    expect(pageSource.match(/styles\.modalDialog/g)).toHaveLength(3);
    expect(styleSource).toMatch(/\.dialogHeader h2\s*\{[^}]*color:\s*var\(--text\);/s);
    expect(styleSource).toMatch(/\.modalDialog\s*\{[^}]*color:\s*var\(--text\);/s);
  });

  test('constrains the workspace before wide tables can overflow on narrow screens', () => {
    expect(styleSource).toMatch(/@media\s*\(max-width:\s*820px\)[\s\S]*\.workspace\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100vw;/);
    expect(styleSource).toMatch(/@media\s*\(max-width:\s*1100px\)[\s\S]*\.tableCard\s*\{[^}]*overflow-x:\s*auto;/);
  });

  test('gives every player detail screen one focused responsibility', () => {
    expect(pageSource).toContain("type PlayerDetailTab = 'profile' | 'identity' | 'boxId' | 'sessions' | 'logins' | 'ban' | 'password' | 'related' | 'history' | 'danger';");
    for (const label of ['基本资料', '身份档案', '神岛 ID', '会话设备', '登录记录', '封禁管理', '密码重置', '关联线索', '管理记录', '删除身份']) {
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

  test('gives directory, sessions and bans distinct tables and default actions', () => {
    for (const section of ['players', 'sessions', 'bans']) {
      expect(pageSource).toContain(`section === '${section}' ? <table>`);
    }
    for (const label of ['账号标识', '有效会话', '处罚类型', '权限组']) {
      expect(pageSource).toContain(`<th>${label}</th>`);
    }
    expect(pageSource).not.toContain('styles.managementShortcuts');
  });

  test('keeps administrator accounts and permission groups in a compact two-panel workspace', () => {
    expect(pageSource).toContain('className={styles.rolesWorkspace}');
    expect(pageSource.match(/className=\{styles\.rolesPanel\}/g)).toHaveLength(2);
    expect(pageSource).toContain('className={styles.permissionGroupList}');
    expect(pageSource).toContain('className={styles.rolesEmpty}');
    expect(pageSource).not.toContain('className={styles.rolesToolbar}');
    expect(pageSource).not.toContain('className={styles.permissionGroupsPanel}');
    expect(styleSource).toMatch(/\.rolesWorkspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.65fr\)[^}]*minmax\(320px,\s*\.75fr\)/s);
    expect(styleSource).toMatch(/\.rolesEmpty\s*\{[^}]*min-height:\s*178px;/s);
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
    expect(pageSource).toContain('<AdminDialogHeader title="新增用户"');
    expect(pageSource).toContain('autoComplete="new-password"');
    expect(pageSource).toContain("setNotice(`用户“${data.player.displayName}”已创建");
  });

  test('creates players without submitting administrator-only identity fields', () => {
    const start = pageSource.indexOf('async function submitCreateUser()');
    const end = pageSource.indexOf('\n  if (!actor) {', start);
    const submitSource = pageSource.slice(start, end);
    expect(submitSource).not.toContain("role: 'player'");
    expect(submitSource).not.toContain('adminPermissions');
  });

  test('edits administrator details deliberately instead of writing on select changes', () => {
    expect(pageSource).toContain("from '@radix-ui/react-dropdown-menu'");
    expect(pageSource).toContain('function openAdminAccount(admin?: AdminAccount)');
    expect(pageSource).toContain("editing ? `/api/play-admin/admins/${editingAdminId}`");
    expect(pageSource).toContain("method: editing ? 'PATCH' : 'POST'");
    expect(pageSource).toContain("editingAdminId ? '编辑管理账号' : '新增管理账号'");
    expect(pageSource).toContain("editingAdminId ? <label>账号状态");
    expect(pageSource).toContain('id="admin-account-password"');
    expect(pageSource).not.toContain('async function resetAdminPassword');
  });

  test('never reuses a player account or stores the owner key in browser storage', () => {
    expect(pageSource).not.toContain('使用当前管理员账号');
    expect(pageSource).not.toContain('sessionStorage');
    expect(pageSource).not.toContain('localStorage.setItem(TOKEN_KEY');
    expect(pageSource).toContain("fetch('/api/play-admin/login'");
    expect(pageSource).toContain("fetch('/api/play-admin/owner-session'");
  });

  test('keeps ban errors and confirmation visible inside the player drawer', () => {
    expect(pageSource).toContain('className={styles.drawerNotice}');
    expect(pageSource).toContain("selected.status === 'banned'");
    expect(pageSource).toContain('封禁已经生效');
    expect(styleSource).toContain('.drawerNotice');
  });

  test('keeps authentication, data loading and logout states distinct', () => {
    const verifiedActor = pageSource.indexOf('setActor(verifiedActor);');
    const playerDataRequest = pageSource.indexOf('const [playersResponse, overviewResponse] = await Promise.all([');
    expect(verifiedActor).toBeGreaterThan(-1);
    expect(verifiedActor).toBeLessThan(playerDataRequest);
    expect(pageSource).toContain("if (!response.ok && response.status !== 401)");
    expect(pageSource).toContain("throw new Error(data.message || '退出登录失败，请稍后重试')");
  });

  test('redirects direct links to owner-only and audit-only sections when access is absent', () => {
    expect(pageSource).toContain("section === 'roles' && !ownerAccess");
    expect(pageSource).toContain("section === 'audit' && !canViewAudit");
    expect(pageSource).toContain("if (forbidden) navigateSection('overview');");
  });

  test('does not expose dead-end audit and batch controls without matching permissions', () => {
    expect(pageSource).toContain("canViewAudit ? <button onClick={() => navigateSection('audit')}");
    expect(pageSource).toContain('const canSelectPlayers = canManageProfiles || canManageBans || canManageSessions;');
    expect(pageSource).toContain("section === 'players'");
    expect(pageSource).toContain("section === 'sessions'");
    expect(pageSource).toContain("section === 'bans' && canManageBans");
    expect(pageSource).toContain('{canSelectPlayers ? <th className={styles.checkCell}>');
    expect(pageSource).toContain('{canManageSessions ? <th className={styles.checkCell}>');
    expect(pageSource).toContain('{canManageBans ? <th className={styles.checkCell}>');
  });

  test('does not mention the removed player-avatar feature', () => {
    expect(pageSource).not.toContain('昵称、头像、标签和备注');
  });

  test('lets owners reuse permission groups across independent administrators', () => {
    const adminIdentitySource = fs.readFileSync(path.resolve(__dirname, 'player-admin-identity.ts'), 'utf8');
    expect(adminIdentitySource).toContain("CREATE TABLE IF NOT EXISTS ${table('admin_accounts')}");
    expect(adminIdentitySource).toContain("CREATE TABLE IF NOT EXISTS ${table('admin_permission_groups')}");
    expect(adminIdentitySource).toContain('permission_group_id');
    expect(pageSource).toContain('PLAYER_ADMIN_GRANTABLE_CAPABILITIES.map');
    expect(pageSource).toContain("fetch('/api/play-admin/admins'");
    expect(pageSource).toContain("fetch('/api/play-admin/permission-groups'");
    expect(pageSource).toContain('permissionGroupId');
    expect(pageSource).not.toContain('输入要授权的能力标识');
    expect(pageSource).toContain("detailTab === 'danger' && ownerAccess");
    expect(styleSource).toContain('.permissionGrid');
  });

  test('keeps the owner identity exclusive to the server owner key', () => {
    const adminIdentitySource = fs.readFileSync(path.resolve(__dirname, 'player-admin-identity.ts'), 'utf8');
    expect(pageSource).not.toContain('<option value="owner">服主</option>');
    expect(adminIdentitySource).toContain("CHECK (role IN ('admin', 'moderator'))");
    expect(adminIdentitySource).toContain('服主只能通过服主密钥进入，不能分配给管理账号');
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
