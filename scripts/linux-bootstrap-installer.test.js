'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const installer = path.join(root, 'distribution/server/bootstrap.sh')

function executable(file, source) {
  fs.writeFileSync(file, source, { mode: 0o755 })
}

test('Linux bootstrap selects the matching release and preserves existing state', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'box3-bootstrap-'))
  try {
    const mockBin = path.join(temporaryRoot, 'bin')
    const packageRoot = path.join(temporaryRoot, 'fixture', 'BOX3-Engine-Server-9.8.7-linux-amd64')
    const installRoot = path.join(temporaryRoot, 'install')
    const dockerCalls = path.join(temporaryRoot, 'docker-calls.log')
    const dnfCalls = path.join(temporaryRoot, 'dnf-calls.log')
    const osRelease = path.join(temporaryRoot, 'os-release')
    fs.mkdirSync(mockBin, { recursive: true })
    fs.mkdirSync(packageRoot, { recursive: true })
    fs.mkdirSync(installRoot, { recursive: true })
    fs.writeFileSync(path.join(temporaryRoot, 'machine-id'), 'test-machine\n')
    fs.writeFileSync(osRelease, 'ID=alinux\nVERSION_ID="3"\n')
    fs.writeFileSync(
      path.join(installRoot, '.env'),
      [
        'PRESERVED=yes',
        'BOX_IMAGE_TAG=v1.0.0-linux-amd64',
        'BOX_PLAY_PLATFORM=linux/amd64',
        'BOX_SERVER_MANAGER_BIND_IP=127.0.0.1',
        'BOX_SERVER_MANAGER_PORT=3130',
        'BOX_LAN_IP=192.168.10.20',
        'BOX_SERVER_MANAGER_TOKEN=manager-test-token',
        'BOX_PLAY_ADMIN_TOKEN=owner-test-token',
        '',
      ].join('\n'),
    )
    fs.writeFileSync(path.join(installRoot, 'compose.yml'), 'services: {}\n')
    fs.writeFileSync(path.join(packageRoot, 'compose.yml'), 'services: {}\n')
    fs.writeFileSync(
      path.join(packageRoot, '.env.example'),
      'BOX_IMAGE_TAG=v9.8.7-linux-amd64\nBOX_PLAY_PLATFORM=linux/amd64\n',
    )
    executable(
      path.join(packageRoot, 'verify.sh'),
      '#!/bin/sh\nset -eu\ntouch "$(dirname "$0")/.verified"\n',
    )
    executable(
      path.join(packageRoot, 'install.sh'),
      '#!/bin/sh\nset -eu\ntouch "$(dirname "$0")/.installed"\n',
    )

    const fixtureZip = path.join(temporaryRoot, 'package.zip')
    const zipped = spawnSync('zip', ['-rq', fixtureZip, path.basename(packageRoot)], {
      cwd: path.dirname(packageRoot),
      encoding: 'utf8',
    })
    assert.equal(zipped.status, 0, zipped.stderr)

    executable(path.join(mockBin, 'id'), '#!/bin/sh\n[ "${1:-}" = "-u" ] && printf "0\\n"\n')
    executable(
      path.join(mockBin, 'uname'),
      '#!/bin/sh\ncase "${1:-}" in -s) echo Linux;; -m) echo x86_64;; *) echo Linux;; esac\n',
    )
    executable(
      path.join(mockBin, 'dnf'),
      `#!/bin/sh
set -eu
printf '%s\n' "$*" >> "$DNF_CALLS"
cp "$MOCK_BIN/docker-template" "$MOCK_BIN/docker"
chmod +x "$MOCK_BIN/docker"
`,
    )
    executable(
      path.join(mockBin, 'docker-template'),
      `#!/bin/sh
set -eu
printf '%s\n' "$*" >> "$DOCKER_CALLS"
case "$*" in
  *'ps --services --filter status=running'*)
    printf 'play\nmanaged-postgres\ncreator\n'
    ;;
esac
`,
    )
    executable(path.join(mockBin, 'systemctl'), '#!/bin/sh\nexit 0\n')
    executable(
      path.join(mockBin, 'curl'),
      `#!/bin/sh
set -eu
output=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o|--output) output=$2; shift 2 ;;
    -w) shift 2 ;;
    *) shift ;;
  esac
done
if [ "$output" = '/dev/null' ]; then
  printf 'https://example.test/releases/tag/v9.8.7'
elif [ -z "$output" ]; then
  printf '203.0.113.10'
else
  cp "$FIXTURE_ZIP" "$output"
fi
`,
    )

    const result = spawnSync('sh', [installer], {
      env: {
        ...process.env,
        PATH: `${mockBin}:/usr/bin:/bin`,
        MOCK_BIN: mockBin,
        FIXTURE_ZIP: fixtureZip,
        DOCKER_CALLS: dockerCalls,
        DNF_CALLS: dnfCalls,
        BOX3_REPOSITORY_URL: 'https://example.test/project',
        BOX3_INSTALL_DIRECTORY: installRoot,
        BOX3_MACHINE_ID_FILE: path.join(temporaryRoot, 'machine-id'),
        BOX3_OS_RELEASE_FILE: osRelease,
      },
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr || result.stdout)
    const environment = fs.readFileSync(path.join(installRoot, '.env'), 'utf8')
    assert.match(environment, /^PRESERVED=yes$/m)
    assert.match(environment, /^BOX_IMAGE_TAG=v9\.8\.7-linux-amd64$/m)
    assert.match(environment, /^BOX_PLAY_PLATFORM=linux\/amd64$/m)
    assert.match(environment, /^BOX_SERVER_MANAGER_BIND_IP=0\.0\.0\.0$/m)
    assert.ok(
      fs.existsSync(path.join(installRoot, '.installed')),
      `${result.stdout}\n${result.stderr}\ninstalled files: ${fs.readdirSync(installRoot).join(', ')}`,
    )
    assert.ok(fs.existsSync(path.join(installRoot, 'compose.yml')))
    assert.match(result.stdout, /BOX3 Engine 9\.8\.7（linux\/amd64）/)
    assert.match(result.stdout, /BOX3 Engine 面板账户登录信息/)
    assert.match(result.stdout, /内网面板地址：\s+http:\/\/192\.168\.10\.20:3130/)
    assert.match(result.stdout, /外网 IPv4 面板地址：http:\/\/203\.0\.113\.10:3130/)
    assert.match(result.stdout, /管理端登录密钥：manager-test-token/)
    assert.match(result.stdout, /服主管理密钥：\s+owner-test-token/)
    assert.match(result.stdout, /安装耗时：\d+ 分 \d+ 秒/)
    const dockerInvocations = fs.readFileSync(dockerCalls, 'utf8')
    assert.match(dockerInvocations, /up .*play creator/)
    assert.doesNotMatch(dockerInvocations, /up .*managed-postgres/)
    const dnfInvocations = fs.readFileSync(dnfCalls, 'utf8')
    assert.match(dnfInvocations, /dnf-plugin-releasever-adapter --repo alinux3-plus/)
    assert.match(dnfInvocations, /docker-compose-plugin/)
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
  }
})
