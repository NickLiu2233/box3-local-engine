const ref = (name) => ({ $ref: `#/components/schemas/${name}` })
const array = (name) => ({ type: 'array', items: ref(name) })
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  required,
  properties,
})

const contracts = {
  'patch /api/auth/profile': object({ player: ref('PlayerSelfProfile') }),
  'patch /api/player-auth/profile': object({ player: ref('PlayerSelfProfile') }),
  'post /api/auth/password': object({ changed: { type: 'boolean', const: true }, reloginRequired: { type: 'boolean', const: true } }),
  'post /api/player-auth/password': object({ changed: { type: 'boolean', const: true }, reloginRequired: { type: 'boolean', const: true } }),
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
  'patch /api/auth/profile': { ...object({ displayName: { type: 'string', minLength: 1, maxLength: 32 } }), additionalProperties: false },
  'patch /api/player-auth/profile': { ...object({ displayName: { type: 'string', minLength: 1, maxLength: 32 } }), additionalProperties: false },
  'post /api/auth/password': { ...object({
    currentPassword: { type: 'string', minLength: 1, maxLength: 128, writeOnly: true },
    newPassword: { type: 'string', minLength: 10, maxLength: 128, writeOnly: true },
  }), additionalProperties: false },
  'post /api/player-auth/password': { ...object({
    currentPassword: { type: 'string', minLength: 1, maxLength: 128, writeOnly: true },
    newPassword: { type: 'string', minLength: 10, maxLength: 128, writeOnly: true },
  }), additionalProperties: false },
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
  for (const apiPath of ['/api/auth/profile', '/api/player-auth/profile', '/api/auth/password', '/api/player-auth/password']) {
    const password = apiPath.endsWith('/password')
    const operation = paths[apiPath]?.[password ? 'post' : 'patch']
    if (!operation) continue
    operation.description = password
      ? '仅修改当前登录玩家的密码，必须验证原密码。成功后撤销该玩家全部会话并清除当前会话 Cookie，需要重新登录；正在游玩的会话也会收到撤销通知。'
      : '仅修改当前登录玩家的昵称；不接受身份 ID、角色、头像或权限字段。'
    for (const [status, description] of Object.entries({ 400: '字段无效，或原密码不正确。', 401: '缺少有效会话或服务端凭据。', 403: '账号或访问来源被封禁。', 429: '操作过于频繁；按 Retry-After 重试。', 503: '账号服务暂时不可用。' })) {
      operation.responses[status] = { description, content: { 'application/json': { schema: ref('ApiError') } } }
    }
    operation.responses[429].headers = { 'Retry-After': { description: '建议等待的秒数。', schema: { type: 'integer', minimum: 1 } } }
  }
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
