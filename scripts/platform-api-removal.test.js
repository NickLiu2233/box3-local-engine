const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const sourceFiles = [
  'internals/apis/src/createra/createra.ts',
  'internals/apis/dist/createra/createra.d.ts',
  'internals/apis/dist/index.js',
  'internals/schema/api/js/api.ts',
  'services/game-server/src/script/script-shell.ts',
  'services/game-server/src/script/script-host.ts',
  'services/game-server/src/script/bindings/world-synchronizer.ts',
  'services/game-server/src/script/bindings/entity-synchronizer.ts',
]
const forbiddenScriptApis = [
  'getMiaoShells',
  'querySocial',
  'querySocialStatistic',
  'createTempChat',
  'destroyTempChat',
  'addTempChatPlayer',
  'removeTempChatPlayer',
  'getTempChats',
  'getTempChatUsers',
  'openMarketplace',
  'openUserProfileDialog',
  'containerTeleport',
  'getSocialRelationUsingGet',
  'getSocialRelationInfoUsingGet',
  'createTempChatUsingPost',
  'deleteTempChatUsingDelete',
  'addTempChatUserUsingPost',
  'tempChatIdsUsingGet',
  'removeTempChatUserUsingPost',
  'getTempChatUsersUsingGet',
  'SocialType',
  'SocialStatisticType',
  'onPlayerPurchaseSuccess',
  'nextPlayerPurchaseSuccess',
  'GamePurchaseSuccessEvent',
]

for (const file of sourceFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  for (const api of forbiddenScriptApis) {
    assert.equal(source.includes(api), false, `${file} still exposes ${api}`)
  }
}

for (const removed of [
  'internals/apis/src/java',
  'internals/apis/src/maas',
  'internals/apis/src/group',
  'internals/apis/src/signature',
  'internals/apis/src/ai/vobi.ts',
  'apps/game/src/apis/api-java',
  'apps/game/src/assets/maas_logo_white.svg',
  'apps/game/src/assets/maas_default_cover.png',
  'packages/analytics/build/client.js',
  'packages/analytics/build/http.js',
  'packages/analytics/build/protocol.js',
  'services/game-server/src/apis/index.ts',
  'services/game-server/src/storage/java-storage-api.ts',
  'internals/schema/events/market-event-schema.ts',
  'packages/utils/src/whitelist.ts',
  'packages/utils/build/whitelist.js',
]) {
  assert.equal(fs.existsSync(path.join(root, removed)), false, `${removed} still exists`)
}

for (const legacyClientName of [
  'JavaAuth',
  'JavaUser',
  'MaasAuth',
  'CodemaoLoginUsingPost',
  'FirebaseLoginUsingPost',
  'FlashLoginUsingPost',
]) {
  assert.equal(
    fs
      .readFileSync(path.join(root, 'internals/apis/dist/index.js'), 'utf8')
      .includes(legacyClientName),
    false,
    `@box/apis still bundles ${legacyClientName}`,
  )
}

for (const [file, legacyIdentifier] of [
  ['apps/game/assets/icons.svg', 'icon-logo-maas'],
  ['apps/game/configs/server.ts', 'MOCK_JAVA_BACKEND'],
  ['apps/game/src/utils/appEdition.ts', 'isMaas'],
  ['packages/utils/src/createra-permissions.ts', 'JavaPermissionsMap'],
]) {
  assert.equal(
    fs.readFileSync(path.join(root, file), 'utf8').includes(legacyIdentifier),
    false,
    `${file} still exposes ${legacyIdentifier}`,
  )
}

const localConfig = JSON.parse(
  fs.readFileSync(path.join(root, 'apps/local-engine/config/local.config.json'), 'utf8'),
)
assert.equal('DOMAIN_WHITELIST' in localConfig.common, false)
assert.equal('SCRIPT_WHITELIST' in localConfig.common, false)

for (const file of [
  'internals/env/src/schemas/common.ts',
  'apps/game/configs/client.ts',
  'services/game-server/src/script/script-protocol.ts',
  'services/game-server/src/script/script-host.ts',
]) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  assert.equal(source.includes('DOMAIN_WHITELIST'), false, `${file} still exposes DOMAIN_WHITELIST`)
  assert.equal(source.includes('SCRIPT_WHITELIST'), false, `${file} still exposes SCRIPT_WHITELIST`)
  assert.equal(source.includes('scriptWhiteList'), false, `${file} still exposes scriptWhiteList`)
}

console.log('platform API and analytics removal checks passed')
