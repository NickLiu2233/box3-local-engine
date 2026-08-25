const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const ts = require('typescript')

const sourcePath = path.resolve(__dirname, '../lib/export-project.ts')
const compiledPath = path.resolve(__dirname, `box-migrator-export-${process.pid}.cjs`)
const engineApiSourcePath = path.resolve(__dirname, '../lib/engine-api.ts')
const engineApiCompiledPath = path.resolve(__dirname, 'engine-api.js')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText

fs.writeFileSync(compiledPath, compiled)
fs.writeFileSync(
  engineApiCompiledPath,
  ts.transpileModule(fs.readFileSync(engineApiSourcePath, 'utf8'), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
)
;(async () => {
  const {
    applyCloudModelIds,
    availableSoundConfig,
    cloudExtraProject,
    cloudModelPreviews,
    cloudModelProjects,
    localizeCloudModelResources,
    cloudSkinPreviews,
    cloudSkinProjects,
    cloudRetainedHashes,
    createConcurrencyGate,
    contentHash,
    drainDynamicQueue,
    emptyEntitiesTree,
    fetchBlob,
    lightweightAmbientSound,
    lightweightAssetIndex,
    lightweightEnvironment,
    lightweightPlayer,
    localAudioAssets,
    localScriptAssets,
    mergeCloudScriptsIntoProject,
    mergeCloudPhotos,
    parseJSON,
    referencedHashes,
    referencedResources,
    restoreRuntimeBundles,
    scriptLauncherSource,
    stableStringify,
  } = require(compiledPath)
  const engineApi = require(engineApiCompiledPath)
  const actualHash = 'QmS1jvj2GQDwwJpSbpxAJSLbmWvncTQ3Xc69md4KxXhSUf'
  const previewName = 'QmZc3bR7rJHXuYBtSe2VZoS5EYZ7m5kHzpK2cJ1hPzb3QU.jpeg'
  const extensionlessPreview = 'QmUkQqR3S7vT7yswnuFkQzYEu8c1WVL8HbcCoV2mmYfHXv'
  const document = parseJSON(
    Buffer.from(
      JSON.stringify([
        { hash: actualHash, previewImage: previewName },
        { hash: actualHash, previewImage: extensionlessPreview },
      ]),
    ),
  )
  const references = [...referencedHashes(document)]

  assert.deepEqual(references, [actualHash])
  console.log('PASS: legacy hash scanner remains limited to content graph hashes')

  assert.deepEqual(
    lightweightAssetIndex({
      'server.js': { type: 1, hash: 'script' },
      'mesh/model.vb': { type: 2, hash: 'model' },
      'lut/test.lut': { type: 3, hash: 'lut' },
      'picture/ui.png': { type: 8, hash: 'picture' },
      'audio/test.mp3': { type: 6, hash: 'audio' },
      'mesh/test.glb': { type: 9, hash: 'gltf' },
    }),
    {
      'server.js': { type: 1, hash: 'script' },
      'picture/ui.png': { type: 8, hash: 'picture' },
    },
  )
  assert.deepEqual(emptyEntitiesTree(), {
    ROOT_ID: { childrenIds: [], id: 'ROOT_ID', name: 'Root', parentId: '', type: 0 },
  })
  console.log(
    'PASS: legacy mixed assets drop models/audio entries while retaining code and UI assets',
  )

  assert.deepEqual(
    localScriptAssets({
      'server.js': { type: 1, hash: 'server-hash', contentId: 123, ownerId: 456 },
      'client.js': { type: 7, hash: 'client-hash', contentId: 789, ownerId: 456 },
      'audio.mp3': { type: 6, hash: 'audio-hash' },
    }),
    {
      'server.js': { type: 1, hash: 'server-hash', contentId: 0, ownerId: 0 },
      'client.js': { type: 7, hash: 'client-hash', contentId: 0, ownerId: 0 },
    },
  )
  const visibleSharedServerHash = 'QmTbxj3AzsiBZJFPPcEAgFkEdfMkdCJer8WYZhMwfiPfs7'
  const visibleSharedClientHash = 'qF-VAp6cUsBYgpzHVmsfNTd3GHBmMyICVlLDUsocg1c'
  assert.deepEqual(
    mergeCloudScriptsIntoProject(
      {
        'index.js': { type: 1, hash: actualHash },
      },
      {
        serverScripts: [
          {
            id: '18114',
            name: '_server_bundle_hundshen3.js',
            hash: visibleSharedServerHash,
            share: true,
          },
        ],
        clientScripts: [
          {
            id: '18115',
            name: '_client_bundle_hundshen3.js',
            hash: visibleSharedClientHash,
            share: true,
          },
        ],
      },
    ),
    {
      'index.js': { type: 1, hash: actualHash, contentId: 0, ownerId: 0 },
      '_server_bundle_hundshen3.js': {
        animated: false,
        bounds: [0, 0, 0],
        contentId: 0,
        hash: visibleSharedServerHash,
        ownerId: 0,
        previewImage: '',
        size: 0,
        type: 1,
      },
      '_client_bundle_hundshen3.js': {
        animated: false,
        bounds: [0, 0, 0],
        contentId: 0,
        hash: visibleSharedClientHash,
        ownerId: 0,
        previewImage: '',
        size: 0,
        type: 7,
      },
    },
  )
  assert.deepEqual(
    restoreRuntimeBundles(
      {
        'index.js': { type: 1, hash: 'index-hash' },
        'clientIndex.js': { type: 7, hash: 'client-index-hash' },
      },
      [
        { key: '_server_bundle.js', value: { type: 1, hash: 'old-server-bundle' } },
        { key: '_server_bundle.js', value: { type: 1, hash: 'current-server-bundle' } },
        { key: '_client_bundle.js', value: { type: 7, hash: 'client-bundle' } },
        { key: '_server_bundle_hundshen3.js', value: { type: 1, hash: 'shared-server-bundle' } },
        { key: '_client_bundle_hundshen3.js', value: { type: 7, hash: 'shared-client-bundle' } },
        { key: 'deleted-gameplay.js', value: { type: 1, hash: 'must-not-restore' } },
      ],
    ),
    {
      'index.js': { type: 1, hash: 'index-hash' },
      'clientIndex.js': { type: 7, hash: 'client-index-hash' },
      '_server_bundle.js': { type: 1, hash: 'current-server-bundle', contentId: 0, ownerId: 0 },
      '_client_bundle.js': { type: 7, hash: 'client-bundle', contentId: 0, ownerId: 0 },
      '_server_bundle_hundshen3.js': {
        type: 1,
        hash: 'shared-server-bundle',
        contentId: 0,
        ownerId: 0,
      },
      '_client_bundle_hundshen3.js': {
        type: 7,
        hash: 'shared-client-bundle',
        contentId: 0,
        ownerId: 0,
      },
    },
  )
  assert.equal(scriptLauncherSource('index.js'), 'require("./index.js");\n')
  console.log(
    'PASS: run mode restores only required runtime bundles and preserves the entry script',
  )
  assert.deepEqual(lightweightAmbientSound({ ambient: { sample: 'audio/music.mp3', gain: 1 } }), {
    ambient: { sample: '', gain: 1 },
  })
  assert.deepEqual(lightweightPlayer({ playerSounds: { jump: { sample: 'audio/jump.mp3' } } }), {
    playerSounds: { jump: { sample: '' } },
  })
  assert.deepEqual(
    lightweightEnvironment({
      bakedShadow: { data: 'shadow-data', texture: 'shadow-texture', chunkShift: 6 },
      snow: { texture: 'snow/snow.part', density: 1 },
    }),
    {
      bakedShadow: { data: '', texture: '', chunkShift: 6 },
      snow: { texture: '', density: 1 },
    },
  )
  assert.deepEqual(
    lightweightEnvironment(
      {
        bakedShadow: { data: 'shadow-data', texture: 'shadow-texture', chunkShift: 6 },
        snow: { texture: 'snow/snow.part', density: 1 },
      },
      true,
    ),
    {
      bakedShadow: { data: 'shadow-data', texture: 'shadow-texture', chunkShift: 6 },
      snow: { texture: '', density: 1 },
    },
  )
  assert.deepEqual(
    localAudioAssets({
      'audio/music.mp3': { type: 6, hash: `${actualHash}.mp3`, contentId: 123, ownerId: 456 },
      'mesh/model.vb': { type: 2, hash: actualHash },
    }),
    {
      'audio/music.mp3': { type: 6, hash: `${actualHash}.mp3`, contentId: 0, ownerId: 0 },
    },
  )
  assert.deepEqual(
    availableSoundConfig(
      {
        music: { sample: 'audio/music.mp3' },
        jump: { sample: 'audio/missing.mp3' },
      },
      new Set(['audio/music.mp3']),
    ),
    {
      music: { sample: 'audio/music.mp3' },
      jump: { sample: '' },
    },
  )
  console.log(
    'PASS: removed audio/environment dependencies are cleared without dropping their valid config shapes',
  )

  const cloudPictureHash = 'wEn4lLYcRR1cGTdbmG8MGE8IxO4oi34hpANYryEwhxk'
  const cloudPicturePreviewHash = 'KcL67ffbRPubZAshh3Ui4aWH7I6icdpb6iXifJQnHM0'
  const cloudModelHash = 'QmSKfrPgmkCoomW2tbpHkynGL5aCd4qRA2JSBG1QDhRJzJ'
  const cloudScriptHash = 'zMJxlt1eI742QDprZx4hx7veQmAiEyoILO2ezNpDIsc'
  assert.deepEqual(
    mergeCloudPhotos(
      {
        'picture/existing.png': { id: 'old', hash: actualHash, type: 8 },
      },
      [
        {
          id: 'photo-1',
          name: 'picture/cloud.png',
          hash: cloudPictureHash,
          previewImage: cloudPicturePreviewHash,
          size: 12,
          updateAt: 34,
        },
      ],
    ),
    {
      'picture/existing.png': { id: 'old', hash: actualHash, type: 8 },
      'picture/cloud.png': {
        id: 'photo-1',
        hash: cloudPictureHash,
        previewImage: cloudPicturePreviewHash,
        size: 12,
        type: 8,
        updateAt: 34,
      },
    },
  )
  const cloudModels = [
    {
      modelId: 99,
      modelName: 'Cloud Model',
      modelFileHash: cloudModelHash,
      modelPreviewHash: 'model-preview',
      projectFileHash: 'model-project',
    },
  ]
  assert.deepEqual(cloudModelPreviews(cloudModels), {
    'Cloud Model': 'model-preview',
  })
  assert.deepEqual(cloudModelProjects(cloudModels), {
    'Cloud Model': 'model-project',
  })
  const cloudResourceId = 'Jh-ROpjh0o99ewON7WoYot4XQmohxR2MvOLrM6UmI6Y'
  const localProjectHash = contentHash(Buffer.from('editable voxa project'))
  const localizedCloudModels = localizeCloudModelResources(
    [
      {
        modelId: 100,
        modelName: 'Editable Cloud Model',
        modelFileHash: cloudResourceId,
        modelPreviewHash: cloudPicturePreviewHash,
        projectFileHash: cloudResourceId,
      },
    ],
    new Map([
      [cloudResourceId, localProjectHash],
      [cloudPicturePreviewHash, actualHash],
    ]),
  )
  assert.equal(localizedCloudModels[0].modelFileHash, localProjectHash)
  assert.equal(localizedCloudModels[0].modelPreviewHash, actualHash)
  assert.equal(localizedCloudModels[0].projectFileHash, localProjectHash)
  assert.equal(cloudModelProjects(localizedCloudModels)['Editable Cloud Model'], localProjectHash)
  assert.equal(
    cloudExtraProject(localizedCloudModels, [], null, { clientScripts: [], serverScripts: [] })
      .meshAssets['mesh/Editable Cloud Model.vb'].hash,
    localProjectHash,
  )
  console.log('PASS: cloud UUID model resources are rewritten to local content hashes')
  assert.deepEqual(
    cloudSkinPreviews(
      [
        { modelName: 'Cloud Skin', modelFileHash: 'skin-hash', modelPreviewHash: 'skin-preview' },
        { modelName: 'No Preview', modelFileHash: 'skin-hash-2' },
      ],
      null,
    ),
    { 'Cloud Skin': 'skin-preview' },
  )
  assert.deepEqual(
    cloudSkinProjects(
      [{ modelName: 'Cloud Skin', projectFileHash: 'skin-project' }, { modelName: 'No Project' }],
      null,
    ),
    { 'Cloud Skin': 'skin-project' },
  )
  const cloudScripts = {
    clientScripts: [
      { id: 'client-1', name: 'shared-client.js', hash: cloudScriptHash, share: true },
    ],
    serverScripts: [{ id: 'server-1', name: 'shared-server.js', hash: actualHash, share: true }],
  }
  const extra = cloudExtraProject(cloudModels, [], null, cloudScripts)
  assert.equal(extra.meshAssets['mesh/Cloud Model.vb'].modelId, 99)
  assert.equal(extra.scriptAssets['client-1'].isClient, true)
  assert.equal(extra.scriptAssets['server-1'].isClient, false)
  assert.equal(
    applyCloudModelIds(
      { entity: { value: { mesh: 'mesh/Cloud Model.vb', meshId: 1 } } },
      cloudModels,
    ).entity.value.meshId,
    99,
  )
  console.log('PASS: backend photos, models and scripts map to boxes project schemas')

  const reusedAudioIndexHash = 'QmNdm8Fr3PCSU7GqmtEyJ2GAmfDBrSu4LufjmW4SjZxbDk'
  const retainedCloudHashes = cloudRetainedHashes({
    groupProject: { version: '0.3.31', audioAssets: reusedAudioIndexHash },
    scripts: cloudScripts,
    photos: [],
    models: cloudModels,
    skins: [],
    defaultSkin: null,
  })
  assert.equal(retainedCloudHashes.has(reusedAudioIndexHash), true)
  assert.equal(retainedCloudHashes.has(cloudModelHash), true)
  assert.equal(retainedCloudHashes.has(cloudScriptHash), true)
  console.log(
    'PASS: source hashes reused by group metadata remain protected from obsolete-graph cleanup',
  )

  const stableA = Buffer.from(stableStringify({ b: 2, a: 1 }))
  const stableB = Buffer.from(stableStringify({ a: 1, b: 2 }))
  assert.equal(stableA.toString(), '{"a":1,"b":2}')
  assert.equal(contentHash(stableA), contentHash(stableB))
  assert.match(contentHash(stableA), /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/)
  console.log('PASS: rewritten migration documents receive deterministic CIDv0 content hashes')

  const modelHash = 'QmSKfrPgmkCoomW2tbpHkynGL5aCd4qRA2JSBG1QDhRJzJ'
  const modelDataHash = 'QmTCCZ2me7uELkxvCMBkwa6t2o1DRXQ9CcwMAYGZ8wbxF8'
  assert.deepEqual(
    referencedResources([
      {
        key: 'mesh/test.vb',
        value: { type: 2, hash: modelHash, previewImage: `${actualHash}.jpeg` },
      },
    ]),
    [
      { hash: modelHash, sourceKind: 'voxel-model' },
      { hash: `${actualHash}.jpeg`, sourceKind: 's3-model' },
    ],
  )
  console.log('PASS: voxel assets retain model metadata and preview dependencies')

  const pictureMetadataHash = 'wEn4lLYcRR1cGTdbmG8MGE8IxO4oi34hpANYryEwhxk'
  const pictureDataHash = 'KcL67ffbRPubZAshh3Ui4aWH7I6icdpb6iXifJQnHM0'
  assert.deepEqual(
    referencedResources({
      'picture/test.png': {
        type: 8,
        hash: pictureMetadataHash,
        previewImage: pictureDataHash,
      },
    }),
    [
      { hash: pictureMetadataHash, sourceKind: 's3-model' },
      { hash: pictureDataHash, sourceKind: 's3-model' },
    ],
  )
  console.log('PASS: picture metadata and image bytes use boxes engine/m storage')

  const scriptHash = 'zMJxlt1eI742QDprZx4hx7veQmAiEyoILO2ezNpDIsc'
  assert.deepEqual(
    referencedResources({
      'shared.js': { type: 7, hash: scriptHash, previewImage: '' },
    }),
    [{ hash: scriptHash, sourceKind: 's3-script' }],
  )
  console.log('PASS: server and client scripts use boxes engine/s storage')

  assert.deepEqual(
    referencedResources({
      'audio/music.mp3': { type: 6, hash: `${actualHash}.mp3` },
    }),
    [{ hash: `${actualHash}.mp3`, sourceKind: 'content' }],
  )
  console.log('PASS: audio hashes with filename extensions remain content-store dependencies')

  const originalFetch = global.fetch
  let attempts = 0
  global.fetch = async () => {
    attempts += 1
    throw new Error('simulated timeout')
  }
  await assert.rejects(() => fetchBlob(actualHash, 1024), /无法下载 blob/)
  global.fetch = originalFetch
  assert.equal(attempts, 1, 'the built-in content source must be attempted once without retrying')
  console.log('PASS: failed blobs try the built-in content source once without retries')

  process.env.BOX_MIGRATOR_OSS_URL = 'https://oss.invalid.test'
  const requestedURLs = []
  global.fetch = async (url) => {
    requestedURLs.push(String(url))
    if (String(url) === `https://oss.invalid.test/engine/m/${modelHash}`) {
      return new Response(
        JSON.stringify({ version: 7, bounds: [1, 2, 3], dataHash: modelDataHash }),
      )
    }
    return new Response('', { status: 404 })
  }
  const modelMetadata = await fetchBlob(modelHash, 1024, undefined, undefined, 'voxel-model')
  global.fetch = originalFetch
  assert.equal(JSON.parse(Buffer.from(modelMetadata).toString()).dataHash, modelDataHash)
  assert.ok(requestedURLs.some((url) => url.endsWith(`/engine/m/${modelHash}`)))
  assert.ok(!requestedURLs.some((url) => url.includes('/avatar/m/')))
  console.log('PASS: boxes-style voxel lookup falls back from IPFS to engine/m only')

  const timing = {}
  await drainDynamicQueue(
    [{ id: 'slow' }, { id: 'fast' }],
    2,
    (item) => item.id,
    async (item) => {
      timing[`${item.id}Start`] = Date.now()
      await new Promise((resolve) => setTimeout(resolve, item.id === 'slow' ? 80 : 5))
      timing[`${item.id}End`] = Date.now()
      return item.id === 'fast' ? [{ id: 'child' }] : []
    },
  )
  assert.ok(
    timing.childStart < timing.slowEnd,
    'a freed slot must start newly discovered work immediately',
  )
  console.log('PASS: graph downloads continuously refill free concurrency slots')

  const withSlot = createConcurrencyGate(3)
  let activeRequests = 0
  let peakRequests = 0
  await Promise.all(
    Array.from({ length: 24 }, () =>
      withSlot(async () => {
        activeRequests += 1
        peakRequests = Math.max(peakRequests, activeRequests)
        await new Promise((resolve) => setTimeout(resolve, 5))
        activeRequests -= 1
      }),
    ),
  )
  assert.equal(peakRequests, 3, 'the HTTP gate must cap actual active requests')
  console.log('PASS: actual HTTP requests respect the configured concurrency cap')

  // A CDN can send response headers and then stall forever while streaming the
  // body. AbortSignal.timeout() only reaches fetch; keep this regression at
  // the body-read seam so a migration slot cannot remain occupied forever.
  const originalRequestTimeout = process.env.BOX_MIGRATOR_REQUEST_TIMEOUT_MS
  process.env.BOX_MIGRATOR_REQUEST_TIMEOUT_MS = '20'
  global.fetch = async () => ({
    ok: true,
    headers: new Headers(),
    arrayBuffer: () => new Promise(() => undefined),
  })
  await assert.rejects(
    () =>
      Promise.race([
        fetchBlob(
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          1024,
          undefined,
          undefined,
          's3-model',
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('body stream was never timed out')), 100),
        ),
      ]),
    /无法下载 blob/,
    'a response body that never finishes must release the migration request slot',
  )
  global.fetch = originalFetch
  if (originalRequestTimeout === undefined) delete process.env.BOX_MIGRATOR_REQUEST_TIMEOUT_MS
  else process.env.BOX_MIGRATOR_REQUEST_TIMEOUT_MS = originalRequestTimeout
  console.log('PASS: stalled response bodies respect the migration request timeout')

  process.env.BOX_MIGRATOR_ENGINE_API_URL = 'https://engine.invalid.test'
  process.env.BOX_MIGRATOR_ENGINE_API_KEY = 'fixed-key'
  const engineRequests = []
  global.fetch = async (url, init) => {
    const parsed = new URL(String(url))
    engineRequests.push({ parsed, init })
    let data
    if (parsed.pathname === '/engine/map/hash') data = actualHash
    else if (parsed.pathname === '/engine/map-group-project')
      data = { version: '0.3.31', pictureAssets: actualHash }
    else if (parsed.pathname === '/engine/script/list') data = cloudScripts
    else if (parsed.pathname === '/engine/photo/list') data = []
    else if (parsed.pathname === '/engine/model/skin/default') data = null
    else if (parsed.pathname === '/engine/models') data = { count: 0, rows: [] }
    else throw new Error(`unexpected API ${parsed.pathname}`)
    return new Response(JSON.stringify({ code: 200, data, msg: '' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  assert.equal(await engineApi.resolveMapHash(123, 'edit'), actualHash)
  const engineData = await engineApi.getCloudEngineData(123, 'edit')
  global.fetch = originalFetch
  assert.equal(engineData.groupProject.version, '0.3.31')
  assert.ok(
    engineRequests.every(
      ({ init }) => init.headers.get('request-header-fixed-key') === 'fixed-key',
    ),
  )
  assert.ok(
    engineRequests.some(
      ({ parsed }) =>
        parsed.pathname === '/engine/models' && parsed.searchParams.get('modelType') === '2',
    ),
  )
  assert.ok(
    engineRequests.some(
      ({ parsed }) =>
        parsed.pathname === '/engine/models' && parsed.searchParams.get('modelType') === '3',
    ),
  )
  console.log(
    'PASS: production engine API client sends boxes-compatible paths, parameters and credentials',
  )

  // boxes retries map-group migration while another cloud editor holds its
  // short-lived lock. The migrator must use the same behavior instead of
  // failing the export on the first lock response.
  const originalMigrationRetries = process.env.BOX_MIGRATOR_MAP_GROUP_MIGRATION_RETRIES
  const originalMigrationRetryDelay = process.env.BOX_MIGRATOR_MAP_GROUP_MIGRATION_RETRY_DELAY_MS
  process.env.BOX_MIGRATOR_MAP_GROUP_MIGRATION_RETRIES = '3'
  process.env.BOX_MIGRATOR_MAP_GROUP_MIGRATION_RETRY_DELAY_MS = '1'
  let migrationAttempts = 0
  global.fetch = async (url) => {
    const parsed = new URL(String(url))
    assert.equal(parsed.pathname, '/engine/map-group-project/migration')
    assert.equal(parsed.searchParams.get('mapId'), '100017201')
    migrationAttempts += 1
    const locked = migrationAttempts < 3
    return new Response(
      JSON.stringify({ code: locked ? 500 : 200, data: null, msg: locked ? 'lock failed' : '' }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    )
  }
  await engineApi.migrateMapGroupProject(100017201)
  assert.equal(migrationAttempts, 3, 'map-group migration should wait for a transient cloud lock')
  global.fetch = originalFetch
  if (originalMigrationRetries === undefined)
    delete process.env.BOX_MIGRATOR_MAP_GROUP_MIGRATION_RETRIES
  else process.env.BOX_MIGRATOR_MAP_GROUP_MIGRATION_RETRIES = originalMigrationRetries
  if (originalMigrationRetryDelay === undefined)
    delete process.env.BOX_MIGRATOR_MAP_GROUP_MIGRATION_RETRY_DELAY_MS
  else process.env.BOX_MIGRATOR_MAP_GROUP_MIGRATION_RETRY_DELAY_MS = originalMigrationRetryDelay
  console.log('PASS: cloud map-group migration retries transient locks like boxes')
})()
  .finally(() => {
    fs.rmSync(compiledPath, { force: true })
    fs.rmSync(engineApiCompiledPath, { force: true })
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
