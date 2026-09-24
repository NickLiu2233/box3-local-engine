const ref = (name) => ({ $ref: `#/components/schemas/${name}` })
const array = (name) => ({ type: 'array', items: ref(name) })
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  required,
  properties,
})

const contracts = {
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
}
