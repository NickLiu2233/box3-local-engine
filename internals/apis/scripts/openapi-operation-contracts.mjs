const ref = (name) => ({ $ref: `#/components/schemas/${name}` })
const array = (name) => ({ type: 'array', items: ref(name) })
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  required,
  properties,
})

const contracts = {
  'get /api/health-check': object({ status: { type: 'string' }, runtime: { type: 'string' } }, ['status']),
  'get /api/player-launcher/bootstrap': ref('PlayerLauncherBootstrap'),
  'get /api/player-launcher/maps': object({ worlds: array('PlayerLauncherWorld') }),
  'get /api/player-launcher/maps/{mapId}/descriptor': ref('PlayerLauncherPackageDescriptor'),
  'get /api/player-launcher/maps/{mapId}/download-plan': ref('PlayerLauncherDownloadPlan'),
  'post /api/auth/login': object({ player: ref('PlayerLauncherSessionPlayer') }),
  'get /api/auth/session': object({
    player: { oneOf: [ref('PlayerLauncherSessionPlayer'), { type: 'null' }] },
    registrationEnabled: { type: 'boolean' },
  }, ['player']),
  'post /api/auth/logout': object({ loggedOut: { type: 'boolean' } }),
  'patch /api/play-profile': object({ player: ref('PlayerLauncherSessionPlayer') }),
  'get /api/play-library': object({
    player: ref('PlayerLauncherSessionPlayer'),
    entries: array('PlayerMapLibraryEntry'),
    libraryEnabled: { type: 'boolean' },
  }),
  'get /api/play-admin/activity': object({
    events: array('PlayerAdminActivity'),
    total: { type: 'integer' },
  }),
  'get /api/play-admin/admins': object({ admins: array('PlayerAdminAccount') }),
  'get /api/play-admin/container-resource-groups': object({
    resourceGroups: array('ContainerResourceGroup'),
  }),
  'get /api/play-admin/containers': ref('ContainerCatalog'),
  'get /api/play-admin/identity-bans': object({
    bans: array('IdentityBan'),
    total: { type: 'integer' },
  }),
  'get /api/play-admin/permission-groups': object({ groups: array('PermissionGroup') }),
  'get /api/play-admin/players': object({
    players: array('Player'),
    total: { type: 'integer' },
  }),
  'post /api/play-admin/players': object({ player: ref('Player') }),
  'get /api/play-admin/players/overview': object({
    totals: { type: 'object', additionalProperties: { type: 'number' } },
  }),
  'post /api/play-admin/login': object({ actor: ref('PlayerAdminActor') }),
  'post /api/play-admin/owner-session': object({ actor: ref('PlayerAdminActor') }),
  'get /api/play-admin/verify': object({ actor: ref('PlayerAdminActor') }),
}

const requestContracts = {
  'patch /api/play-library': object({
    mapId: { type: 'string', pattern: '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$' },
    favorite: { type: 'boolean' },
    played: { type: 'boolean' },
  }, ['mapId']),
  'patch /api/play-profile': object({ displayName: { type: 'string' }, avatarSkinId: { type: 'string' } }, []),
  'post /api/auth/login': object({ username: { type: 'string' }, password: { type: 'string' } }),
  'post /api/auth/logout': object({}),
  'post /api/player-auth/login': object({ username: { type: 'string' }, password: { type: 'string' } }),
  'post /api/play-admin/login': object({ username: { type: 'string' }, password: { type: 'string' } }),
  'post /api/play-admin/admins': object({
    username: { type: 'string' },
    displayName: { type: 'string' },
    password: { type: 'string' },
    permissionGroupId: { type: 'string' },
  }, ['username', 'displayName', 'password']),
  'post /api/play-admin/permission-groups': object({
    name: { type: 'string' },
    permissions: { type: 'array', items: { type: 'string' } },
  }),
  'post /api/play-admin/container-resource-groups': ref('ContainerResourceGroup'),
  'patch /api/play-admin/container-resource-groups/{id}': ref('ContainerResourceGroup'),
  // This endpoint accepts either a raw .boxplay archive or a JSON confirm command.
  'post /api/play-admin/library/import': {},
}

export function applyOperationContracts(paths) {
  for (const [key, schema] of Object.entries(contracts)) {
    const [method, apiPath] = key.split(' ')
    const operation = paths[apiPath]?.[method]
    if (!operation) continue
    operation.responses[200].content['application/json'].schema = schema
  }
  for (const [key, schema] of Object.entries(requestContracts)) {
    const [method, apiPath] = key.split(' ')
    const operation = paths[apiPath]?.[method]
    if (!operation) continue
    operation.requestBody = {
      required: true,
      content: { 'application/json': { schema } },
    }
  }
  const libraryUpdate = paths['/api/play-library']?.patch
  if (libraryUpdate) {
    delete libraryUpdate.responses[200]
    libraryUpdate.responses[204] = { description: '玩家收藏或最近游玩记录已更新。' }
  }
  const blobDownload = paths['/api/player-launcher/maps/{mapId}/blobs/{hash}']?.get
  if (blobDownload?.responses?.['200']) {
    blobDownload.parameters = [
      ...(blobDownload.parameters || []),
      {
        name: 'Range',
        in: 'header',
        required: false,
        description: '续传公开地图资源时使用的字节起始偏移。',
        schema: { type: 'string', pattern: '^bytes=[0-9]+-$' },
      },
    ]
    blobDownload.responses['200'].content = {
      'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
    }
  }
}
