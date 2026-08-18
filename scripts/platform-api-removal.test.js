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
]

for (const file of sourceFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  for (const api of forbiddenScriptApis) {
    assert.equal(source.includes(api), false, `${file} still exposes ${api}`)
  }
}

for (const removed of [
  'packages/analytics/build/client.js',
  'packages/analytics/build/http.js',
  'packages/analytics/build/protocol.js',
  'services/game-server/src/apis/index.ts',
  'services/game-server/src/storage/java-storage-api.ts',
]) {
  assert.equal(fs.existsSync(path.join(root, removed)), false, `${removed} still exists`)
}

console.log('platform API and analytics removal checks passed')
