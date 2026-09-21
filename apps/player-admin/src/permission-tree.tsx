import {
  PLAYER_ADMIN_CAPABILITY_META,
  PLAYER_ADMIN_GRANTABLE_CAPABILITIES,
} from '../../game/shared/player-admin-policy'

const categories = [
  {
    key: 'players',
    title: '玩家管理',
    sections: [
      {
        key: 'read',
        title: '只读',
        capabilities: ['players.export'],
      },
      {
        key: 'write',
        title: '编辑与处置',
        capabilities: [
          'players.manage',
          'players.create',
          'players.ban',
          'players.delete',
          'passwords.reset',
        ],
      },
    ],
  },
  {
    key: 'security',
    title: '安全管理',
    sections: [
      {
        key: 'read',
        title: '只读',
        capabilities: ['audit.view', 'identity-bans.view'],
      },
      {
        key: 'write',
        title: '编辑与处置',
        capabilities: ['sessions.manage', 'identity-bans.manage'],
      },
    ],
  },
  {
    key: 'creator',
    title: '创作管理',
    sections: [
      {
        key: 'write',
        title: '编辑与处置',
        capabilities: ['creator-access.view', 'creator-tokens.view'],
      },
    ],
  },
  {
    key: 'play',
    title: '游玩管理',
    sections: [
      {
        key: 'read',
        title: '只读',
        capabilities: ['play-maps.view'],
      },
      {
        key: 'write',
        title: '编辑与处置',
        capabilities: ['play-maps.manage'],
      },
    ],
  },
  {
    key: 'containers',
    title: '容器管理',
    sections: [
      {
        key: 'read',
        title: '只读',
        capabilities: ['containers.view'],
      },
      {
        key: 'write',
        title: '编辑与处置',
        capabilities: ['containers.manage'],
      },
    ],
  },
]

/** UI-only category values make category-wide selection possible; callers must persist leaves only. */
export const permissionTree = categories.map((category) => ({
  key: `category:${category.key}`,
  value: `category:${category.key}`,
  title: category.title,
  selectable: false,
  children: category.sections.map((section) => ({
    key: `category:${category.key}:${section.key}`,
    value: `category:${category.key}:${section.key}`,
    title: section.title,
    selectable: false,
    children: [
      ...(category.key === 'players' && section.key === 'read'
        ? [
            {
              key: 'readonly:players.view',
              value: 'readonly:players.view',
              title: '查看玩家目录（默认）',
              selectable: false,
              checkable: false,
            },
          ]
        : []),
      ...section.capabilities
        .filter((capability) => PLAYER_ADMIN_GRANTABLE_CAPABILITIES.includes(capability as never))
        .map((capability) => ({
          value: capability,
          title: (
            <span className="player-admin-permission-option">
              <strong>
                {
                  PLAYER_ADMIN_CAPABILITY_META[capability as keyof typeof PLAYER_ADMIN_CAPABILITY_META]
                    .label
                }
              </strong>
            </span>
          ),
        })),
    ],
  })),
}))

export const capabilityLeaves = (values: string[] = []) =>
  values.filter((value) => !value.startsWith('category:') && !value.startsWith('readonly:'))
