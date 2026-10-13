'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { markdownFiles, assertLocalLinks } = require('./lib/documentation-links.cjs');
const { documentationDirectories } = require('./lib/owned-code-config.cjs');

const root = path.resolve(__dirname, '..');
const docsRoot = path.join(root, 'docs');
const projectVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

const coreFiles = [
    path.join(root, 'README.md'),
    path.join(root, 'CONTRIBUTING.md'),
    ...markdownFiles(docsRoot),
];
const files = [
    ...coreFiles,
    ...documentationDirectories
        .filter((directory) => directory !== 'docs')
        .flatMap((directory) => markdownFiles(path.join(root, directory))),
];

const docsIndex = fs.readFileSync(path.join(docsRoot, 'README.md'), 'utf8');
for (const file of markdownFiles(docsRoot)) {
    if (file === path.join(docsRoot, 'README.md')) {
        continue;
    }
    const reference = `./${path.relative(docsRoot, file).split(path.sep).join('/')}`;
    assert.ok(docsIndex.includes(reference), `docs/README.md does not index ${reference}`);
    if (/-\d{8}\.md$/.test(file)) {
        const introduction = fs.readFileSync(file, 'utf8').split('\n').slice(0, 8).join('\n');
        assert.ok(introduction.includes('历史'), `${reference} needs a historical status notice`);
    }
}

const portalVersion = JSON.parse(
    fs.readFileSync(path.join(root, 'apps/player-auth-portal/package.json'), 'utf8'),
).version;
const portalReadme = fs.readFileSync(path.join(root, 'apps/player-auth-portal/README.md'), 'utf8');
for (const example of [
    `box3-login-example:${portalVersion}`,
    `box3-login-template-${portalVersion}.tar.gz`,
]) {
    assert.ok(portalReadme.includes(example), `login portal README has outdated ${example}`);
}

const publishedDocs = coreFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const obsolete of [
    'ONE-CLICK-DEPLOY.cmd',
    'windows-11-arm',
    'macos-13',
    'Node.js 20 或更高版本',
]) {
    assert.ok(
        !publishedDocs.includes(obsolete),
        `documentation still contains obsolete: ${obsolete}`,
    );
}

for (const obsoleteCommand of [
    'pnpm install',
    'pnpm --filter',
    'pnpm --dir',
    'pnpm dev',
    'pnpm verify',
]) {
    assert.ok(
        !publishedDocs.includes(obsoleteCommand),
        `documentation still contains direct pnpm Workspace command: ${obsoleteCommand}`,
    );
}

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
for (const supportedTarget of [
    'Windows x64',
    'Windows ARM64',
    'Apple Silicon macOS',
    'Linux x64',
    'Linux ARM64',
]) {
    assert.ok(
        readme.includes(supportedTarget),
        `README is missing release target ${supportedTarget}`,
    );
}

assert.ok(
    readme.includes(`当前源码版本：\`${projectVersion}\``),
    'README does not identify the current source version',
);
assert.ok(readme.includes('docs/source-access.md'), 'README is missing invitation access guidance');
assert.ok(readme.includes('MIT'), 'README is missing the code license');
const accessGuide = fs.readFileSync(path.join(docsRoot, 'source-access.md'), 'utf8');
for (const required of [
    '先获得仓库访问',
    '不增加“禁止分享源码”“不得商用”',
    '撤销仓库访问也不等于撤销',
    '安装包下载分别管理',
]) {
    assert.ok(accessGuide.includes(required), `source access guide is missing: ${required}`);
}
assert.ok(
    !accessGuide.includes('git clone https://github.com/<your-account>'),
    'invitation access must not require a public fork',
);
for (const file of [
    'CONTRIBUTING.md',
    'docs/developer-guide.md',
    'docs/release-and-distribution.md',
    'docs/cloud-server-quickstart.md',
]) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of source.matchAll(
        /(?:BOX-Local-Engine-|box-local-engine-images-v|BOX3-Engine-Server-)(\d+\.\d+\.\d+)-/g,
    )) {
        assert.equal(
            match[1],
            projectVersion,
            `${file} contains an outdated current-build example`,
        );
    }
}
assert.ok(readme.includes('rush install'), 'README does not explain Rush installation');
assert.ok(readme.includes('rush verify'), 'README does not explain Rush verification');
assert.ok(readme.includes('npm run api:docs'), 'README does not explain standalone API docs');
assert.ok(
    readme.includes('http://127.0.0.1:8000/'),
    'README does not identify the standalone Player Admin development address',
);
assert.ok(
    readme.includes('Player Admin 在发行镜像中构建进 Player Service'),
    'README does not explain the Player Admin development/production boundary',
);
assert.ok(
    readme.includes('地图导入和日常管理统一在玩家管理后台'),
    'README does not identify Player Admin as the play-map management entry',
);
assert.ok(
    !readme.includes('当前版本：`0.1.1`'),
    'README still identifies the obsolete project version 0.1.1',
);

const releaseGuide = fs.readFileSync(path.join(docsRoot, 'release-and-distribution.md'), 'utf8');
assert.ok(
    releaseGuide.includes('Release 工作流不会重复运行完整 Verify'),
    'release guide does not explain the Tag Release verification boundary',
);

const creatorCliApi = fs.readFileSync(path.join(docsRoot, 'creator-cli-http-api.md'), 'utf8');
for (const scope of [
    'projects.list',
    'resources.list',
    'scripts.read',
    'scripts.update',
    'storage.read',
    'storage.write',
    'runtime.view',
    'runtime.control',
    'scene.capture',
]) {
    assert.ok(
        creatorCliApi.includes(`\`${scope}\``),
        `Creator CLI API guide is missing scope ${scope}`,
    );
}

for (const [label, snippet] of [
    ['current Play port', '`http://127.0.0.1:3121/`'],
    ['current Creator port', '`http://127.0.0.1:3127/`'],
    ['client script trust boundary', '客户端地图脚本运行在玩家浏览器页面中'],
    ['server script trust boundary', '服务端地图脚本在 game-server 的隔离运行时中执行'],
    ['headless package boundary', '服务器安装 ZIP 不内置 Docker 镜像'],
    ['runtime cache boundary', '`box-play-runtime-cache` 只保存可再生成的预烘焙和构建产物'],
]) {
    assert.ok(readme.includes(snippet), `README is missing ${label}`);
}

const parity = fs.readFileSync(path.join(docsRoot, 'boxes-parity.md'), 'utf8');
for (const removedApi of [
    'world.onPlayerPurchaseSuccess',
    'world.nextPlayerPurchaseSuccess',
    'GamePurchaseSuccessEvent',
    'SocialType',
    'SocialStatisticType',
]) {
    assert.ok(
        parity.includes(removedApi),
        `boxes parity does not record removed API ${removedApi}`,
    );
}

const securityAudit = fs.readFileSync(path.join(docsRoot, 'security-audit.md'), 'utf8');
for (const boundary of ['DTS 不构成沙箱', '不使用平台域名白名单', '前端隐藏按钮不作为授权依据']) {
    assert.ok(securityAudit.includes(boundary), `security audit is missing boundary: ${boundary}`);
}

const contributorGuide = fs.readFileSync(path.join(root, 'CONTRIBUTING.md'), 'utf8');
for (const required of [
    'cd apps/player-admin',
    'npm run dev',
    '`@box/apis`',
    '迁移器是明确例外',
    'rush dev --infra',
]) {
    assert.ok(
        contributorGuide.includes(required),
        `CONTRIBUTING.md is missing contributor guidance: ${required}`,
    );
}

const infrastructure = fs.readFileSync(path.join(docsRoot, 'local-infrastructure.md'), 'utf8');
for (const boundary of [
    'PostgreSQL 是必需的永久数据源',
    'Redis DB 0',
    'Redis DB 1',
    '`box-play-runtime-cache`',
    '`box-local-engine_box-play-storage`',
]) {
    assert.ok(infrastructure.includes(boundary), `local infrastructure is missing: ${boundary}`);
}

const linuxGuide = fs.readFileSync(path.join(docsRoot, 'linux-web-manager.md'), 'utf8');
for (const required of [
    '从纯 Linux 系统部署 BOX3 Engine',
    'docker-compose-v2',
    './verify.sh',
    './install.sh',
    'ssh -L 3130:127.0.0.1:3130',
    '不要手工修改 `.runtime.env`',
    '不要用删除数据库卷的方式处理凭据问题',
]) {
    assert.ok(linuxGuide.includes(required), `Linux deployment guide is missing: ${required}`);
}

assertLocalLinks(files, root)
    .then(() => console.log(`documentation checks passed: ${files.length} Markdown files`))
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
