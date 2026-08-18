const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require(path.join(__dirname, '../apps/game/node_modules/typescript'))

const root = path.resolve(__dirname, '..')
const forbidden = [
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
]

const resourceSource = fs.readFileSync(path.join(root, 'apps/game/src/resource/api.ts'), 'utf8')
const hash = resourceSource.match(/`([^`]+)`/)?.[1]
assert.ok(hash, 'apps/game/src/resource/api.ts has no declaration blob hash')

const files = [
  'apps/game/scripts/assets/api/js/api/js/api.d.ts',
  'packages/script-api/dts/server-api-types.dts',
  `apps/local-engine/data/blobs/${hash}`,
]

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  for (const api of forbidden) {
    assert.equal(source.includes(api), false, `${file} still declares ${api}`)
  }
}

function inspectEditorHints(declarations) {
  const source = ['world.onPlayerJoin(({ entity }) => {', '  world.teleport(', '});'].join('\n')
  const sourceFile = '/index.js'
  const sources = {
    '/server-api.d.ts': declarations,
    [sourceFile]: source,
  }
  const host = {
    getScriptFileNames: () => Object.keys(sources),
    getScriptVersion: () => '1',
    getScriptSnapshot: (fileName) =>
      sources[fileName] === undefined ? undefined : ts.ScriptSnapshot.fromString(sources[fileName]),
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => ({
      allowJs: true,
      checkJs: false,
      noEmit: true,
      target: ts.ScriptTarget.ES2020,
    }),
    getDefaultLibFileName: () => '/lib.d.ts',
    fileExists: (fileName) => sources[fileName] !== undefined,
    readFile: (fileName) => sources[fileName],
    readDirectory: () => [],
  }
  const languageService = ts.createLanguageService(host)
  const signature = languageService.getSignatureHelpItems(
    sourceFile,
    source.indexOf('world.teleport(') + 'world.teleport('.length,
    {},
  )
  const entity = languageService.getQuickInfoAtPosition(sourceFile, source.indexOf('entity') + 1)
  return {
    entity: entity ? ts.displayPartsToString(entity.displayParts) : '',
    parameters:
      signature?.items[0]?.parameters.map((parameter) =>
        ts.displayPartsToString(parameter.displayParts),
      ) || [],
  }
}

// These are the synchronous declarations installed before the content blob
// request finishes. Editor hints must not depend on that network request.
const controllerSource = fs.readFileSync(
  path.join(root, 'apps/game/src/client/edit/code-editor/code-editor-client-controller.ts'),
  'utf8',
)
assert.match(controllerSource, /import LOCAL_API_DECLARATIONS from/)
const bundledDeclarations = [
  'apps/game/src/resource/api-declarations.dts',
  'packages/script-api/dts/server-api-types.dts',
]
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n')
const editorHints = inspectEditorHints(bundledDeclarations)
assert.equal(
  editorHints.entity.includes('any'),
  false,
  `onPlayerJoin callback is untyped: ${editorHints.entity}`,
)
assert.deepEqual(editorHints.parameters, [
  'mapId: string',
  'players: GameEntity[]',
  'serverId?: string',
])

console.log(`local Monaco declaration checks passed (${hash})`)
