'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const engineDockerfile = fs.readFileSync(path.join(root, 'apps/local-engine/Dockerfile'), 'utf8')
const portalDockerfile = fs.readFileSync(
  path.join(root, 'apps/player-auth-portal/Dockerfile'),
  'utf8',
)
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8')
const runtimeGate = fs.readFileSync(path.join(root, 'packages/license/runtime-gate.js'), 'utf8')
const processGuard = fs.readFileSync(path.join(root, 'packages/license/process-guard.js'), 'utf8')
const trustedTime = fs.readFileSync(path.join(root, 'packages/license/trusted-time.js'), 'utf8')
const serverManager = fs.readFileSync(
  path.join(root, 'apps/server-manager-rust/src/main.rs'),
  'utf8',
)
const serverManagerCommands = fs.readFileSync(
  path.join(root, 'apps/server-manager-rust/src/http/commands.rs'),
  'utf8',
)
const serverManagerTransport = fs.readFileSync(
  path.join(root, 'apps/deployment-manager/src/transport.js'),
  'utf8',
)
const headlessInstaller = fs.readFileSync(path.join(root, 'distribution/server/install.sh'), 'utf8')
const dockerIgnore = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8')
const issuerDockerIgnore = fs.readFileSync(
  path.join(root, 'apps/license-server/Dockerfile.dockerignore'),
  'utf8',
)
const releaseWorkflow = fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8')
const issuerCompose = fs.readFileSync(
  path.join(root, 'apps/license-server/docker-compose.yml'),
  'utf8',
)
const desktopPackageBuilder = fs.readFileSync(
  path.join(root, 'scripts/build-desktop-offline-installer.js'),
  'utf8',
)
const headlessPackageBuilder = fs.readFileSync(
  path.join(root, 'scripts/build-headless-server-package.js'),
  'utf8',
)

assert.match(runtimeGate, /const licenseTimer = setInterval/)
assert.match(runtimeGate, /const LICENSE_RECHECK_INTERVAL_MS = 60 \* 60 \* 1000/)
assert.match(processGuard, /const LICENSE_RECHECK_INTERVAL_MS = 60 \* 60 \* 1000/)
assert.match(
  runtimeGate,
  /verifyLicenseFiles\(\{ \.\.\.verification, now: clock\.currentTime\(\) \}\)/,
)
assert.match(runtimeGate, /await clock\.refresh\(\)/)
assert.match(runtimeGate, /process\.exit\(78\)/)
assert.match(
  processGuard,
  /verifyLicenseFiles\(\{ \.\.\.verification, now: clock\.currentTime\(\) \}\)/,
)
assert.match(processGuard, /const timer = setInterval/)
assert.match(trustedTime, /TIME_TOKEN_PREFIX = 'box3t1'/)
assert.match(trustedTime, /检测到系统时间回拨/)
assert.match(serverManagerCommands, /"get_license_status" => license/)
assert.match(serverManagerCommands, /"install_license" => license/)
assert.match(serverManager, /请先安装有效许可证/)
assert.match(
  serverManagerTransport,
  /postApiCommandsNameRaw\([\s\S]*?path: \{ name: command \}/,
)
assert.match(headlessInstaller, /up -d --no-build --remove-orphans(?: --wait)? server-manager/)
assert.match(headlessInstaller, /\/etc\/machine-id/)
assert.doesNotMatch(headlessInstaller, /up -d --no-build --remove-orphans\s*$/m)
assert.match(compose, /\/etc\/machine-id:\/run\/host-machine-id:ro/)

// The issuer is an internal control-plane service. User releases may contain
// the verification library and public key, but never the issuer application,
// its admin console, image, configuration or signing key.
// Rush reads every registered project manifest during a filtered install. The
// public image context may therefore include the issuer package manifest, but
// it must continue to exclude the issuer source, console and signing material.
assert.match(dockerIgnore, /^apps\/license-server\/\*$/m)
assert.match(dockerIgnore, /^!apps\/license-server\/package\.json$/m)
assert.doesNotMatch(dockerIgnore, /^!apps\/license-server\/$/m)
assert.doesNotMatch(dockerIgnore, /^!apps\/license-server\/\*\*$/m)
assert.match(issuerDockerIgnore, /^apps\/license-server\/\.local\/$/m)
assert.match(issuerDockerIgnore, /^apps\/license-server\/\.env$/m)
assert.doesNotMatch(releaseWorkflow, /box-local-engine-license-server/)
assert.doesNotMatch(releaseWorkflow, /docker compose build license-server/)
assert.doesNotMatch(desktopPackageBuilder, /apps\/license-server/)
assert.doesNotMatch(headlessPackageBuilder, /apps\/license-server/)
assert.doesNotMatch(engineDockerfile, /COPY[^\n]*apps\/license-server/)
assert.doesNotMatch(portalDockerfile, /COPY[^\n]*apps\/license-server/)
assert.doesNotMatch(engineDockerfile, /time-private-key\.pem/)
assert.doesNotMatch(portalDockerfile, /time-private-key\.pem/)
assert.match(engineDockerfile, /license-time-public-key\.pem/)
assert.match(portalDockerfile, /license-time-public-key\.pem/)
assert.doesNotMatch(issuerCompose, /postgres|BOX_LICENSE_DATABASE/i)
assert.match(issuerCompose, /127\.0\.0\.1:\$\{BOX_LICENSE_PORT:-3220\}:3220/)

for (const feature of ['creator', 'play', 'player-service', 'voxa']) {
  assert.match(
    engineDockerfile,
    new RegExp(
      `ENTRYPOINT \\["tini", "--", "node", "/app/license/runtime-gate\\.js", "${feature}", "--"\\]`,
    ),
    `${feature} image must verify its license before starting`,
  )
  assert.match(
    engineDockerfile,
    new RegExp(`BOX_LICENSE_FEATURE=${feature}`),
    `${feature} image must expose its feature to the in-process guard`,
  )
}
assert.match(
  portalDockerfile,
  /ENTRYPOINT \["node", "\/app\/license\/runtime-gate\.js", "player-auth-portal", "--"\]/,
  'player-auth-portal image must verify its license before starting',
)
assert.match(portalDockerfile, /BOX_LICENSE_FEATURE=player-auth-portal/)
assert.match(engineDockerfile, /process-guard\.js packages\/license\/trusted-time\.js/)
assert.match(portalDockerfile, /process-guard\.js packages\/license\/trusted-time\.js/)

for (const service of ['player-service', 'player-auth-portal', 'creator', 'play', 'voxa']) {
  const nextService = compose.indexOf(`\n  ${service}:`) + `\n  ${service}:`.length
  assert.ok(nextService > `\n  ${service}:`.length, `missing Compose service ${service}`)
  const remaining = compose.slice(nextService)
  const boundary = remaining.search(/\n {2}[a-z][a-z0-9-]*:/)
  const block = boundary >= 0 ? remaining.slice(0, boundary) : remaining
  assert.match(block, /BOX_LICENSE_FILE[^\n]*:\/run\/secrets\/box3-license\.boxlic:ro/)
  assert.match(block, /BOX_LICENSE_DEVICE_FILE[^\n]*:\/run\/secrets\/box3-device-id:ro/)
}

console.log('License image boundary checks passed')
