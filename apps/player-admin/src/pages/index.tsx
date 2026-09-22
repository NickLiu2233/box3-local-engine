import {
  DashboardOutlined,
  CodeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileImageOutlined,
  KeyOutlined,
  LockOutlined,
  LogoutOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SoundOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Collapse,
  Col,
  Descriptions,
  Drawer as AntDrawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Layout as AntLayout,
  Menu as AntMenu,
  message,
  notification,
  Modal as AntModal,
  Pagination,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table as AntTable,
  Tabs,
  Tag,
  Tooltip,
  TreeSelect,
} from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { CREATOR_CAPABILITIES, CREATOR_CAPABILITY_META } from '../../../game/shared/creator-policy'
import { CREATOR_CLI_CAPABILITIES, CREATOR_CLI_CAPABILITY_META } from '../../../game/shared/creator-cli-policy'
import { PLAYER_ADMIN_CAPABILITY_META } from '../../../game/shared/player-admin-policy'
import {
  allowedPlayerAdminViews,
  canOpenPlayerAdminView,
  PLAYER_ADMIN_VIEWS,
  playerAdminFallbackView,
  type PlayerAdminView,
} from '../../../game/shared/player-admin-navigation'
import { playerAdminApi as api, playerAdminRoutes as routes } from '../player-admin-api'
import {
  capabilityLeaves,
  expandPermissionSelection,
  isViewRequiredBySelection,
  permissionTree,
} from '../permission-tree'
import { dateTime, formatBytes } from '../player-admin-format'
import type {
  Activity,
  Actor,
  Admin,
  ContainerCatalog,
  ContainerProfile,
  Detail,
  Group,
  IdentityBan,
  PlayBundleReview,
  PlayMap,
  PlayMapResourceStatus,
  PlayMapTableRow,
  Player,
  View,
} from '../player-admin-types'
import { ContainerResourceGroupsPage } from './container-resource-groups-page'
import { ContainerManagementPage } from './container-management-page'
const viewFromLocation = (): View => {
  if (typeof window === 'undefined') return 'players'
  const value = new URLSearchParams(window.location.search).get('view')
  return PLAYER_ADMIN_VIEWS.includes(value as View) ? (value as View) : 'players'
}
const askText = (title: string, placeholder: string, onOk: (value: string) => void) => {
  let value = ''
  Modal.confirm({
    title,
    content: (
      <Input
        autoFocus
        placeholder={placeholder}
        onChange={(event) => {
          value = event.target.value
        }}
      />
    ),
    okText: '确认',
    cancelText: '取消',
    onOk: () => {
      if (!value.trim()) return Promise.reject(new Error('请输入内容'))
      onOk(value.trim())
    },
  })
}

let detailController: any
let directoryController: any
let creatorPageController: any
let creatorDialogController: any
let banDialogController: any
function Menu(props: ComponentProps<typeof AntMenu>) {
  const selectedKey = String(props.selectedKeys?.[0] || '')
  const group =
    selectedKey === 'players' || selectedKey === 'online-sessions'
      ? 'player-center'
      : selectedKey === 'account-bans' ||
          selectedKey === 'identity-bans' ||
          selectedKey === 'security'
        ? 'security-center'
        : selectedKey === 'creator-access' || selectedKey === 'creator-tokens'
          ? 'creator-center'
          : selectedKey === 'play-maps'
            ? 'play-center'
            : selectedKey === 'container-play' || selectedKey === 'container-creator' || selectedKey === 'container-profiles' || selectedKey === 'container-resource-groups'
              ? 'container-center'
            : selectedKey === 'admins' || selectedKey === 'permission-groups'
            ? 'owner-center'
            : ''
  const [openKeys, setOpenKeys] = useState<string[]>(group ? [group] : [])
  useEffect(() => {
    if (!group) return
    setOpenKeys((current) => (current.includes(group) ? current : [...current, group]))
  }, [group])
  return (
    <AntMenu
      {...props}
      openKeys={openKeys}
      onOpenChange={(keys) => setOpenKeys(keys as string[])}
    />
  )
}
function CreatorManagementPage({ mode }: { mode: 'creator-access' | 'creator-tokens' }) {
  const c = creatorPageController
  const [tokenFilter, setTokenFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const hasTokens = (player: Player) => Boolean(player.creatorAccess)
  const creatorPlayers = (c?.players || []).filter((player: Player) => hasTokens(player))
  const rows = mode === 'creator-tokens'
    ? creatorPlayers.filter((player: Player) =>
        tokenFilter === 'all'
          ? true
          : tokenFilter === 'assigned'
            ? (player.activeCreatorTokenCount || 0) > 0
            : (player.activeCreatorTokenCount || 0) === 0,
      )
    : creatorPlayers
  const title = mode === 'creator-access' ? '玩家创作权限' : 'CLI Token'
  return (
    <>
      <Row justify="space-between" align="middle" className="player-admin-page-toolbar">
        <Col>
          <h1 className="player-admin-page-title">{title}</h1>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => c?.loadPlayers()}>
              刷新
            </Button>
            {mode === 'creator-access' && c?.can('creator-access.manage') ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => c?.openCreatorPicker()}>
                新增
              </Button>
            ) : null}
            {mode === 'creator-tokens' ? (
              <Select
                value={tokenFilter}
                onChange={setTokenFilter}
                style={{ width: 120 }}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'assigned', label: '已分配' },
                  { value: 'unassigned', label: '未分配' },
                ]}
              />
            ) : null}
          </Space>
        </Col>
      </Row>
      <Card className="player-admin-panel">
        <Table
          dataSource={rows}
          rowKey="subjectId"
          pagination={{
            current: c?.page,
            total: mode === 'creator-tokens' ? rows.length : c?.total,
            pageSize: c?.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['20', '30', '50', '100'],
            onChange: (next) => c?.setPage(next),
            onShowSizeChange: (_, size) => c?.setPageSize(size),
          }}
          onRow={(player: Player) => ({ onClick: () => c?.openCreatorDialog(player, mode) })}
          columns={[
            {
              title: '玩家',
              render: (_: unknown, player: Player) => (
                <div className="player-admin-player">
                  <Avatar>{(player.displayName || player.username).slice(0, 1)}</Avatar>
                  <span>
                    <div className="player-admin-player-name">
                      {player.displayName || player.username}
                    </div>
                    <div className="player-admin-player-meta">@{player.username}</div>
                  </span>
                </div>
              ),
            },
            {
              title: '创作端访问',
              render: (_: unknown, player: Player) =>
                player.creatorAccess ? <Tag color="success">已开启</Tag> : <Tag>未开启</Tag>,
            },
            {
              title: mode === 'creator-tokens' ? '已授权 Token 数' : '已授予能力',
              render: (_: unknown, player: Player) =>
                mode === 'creator-tokens'
                  ? `${player.activeCreatorTokenCount || 0} 个`
                  : player.creatorAccess
                    ? `${player.creatorPermissions?.length || 0} 项`
                    : '—',
            },
            {
              title: '操作',
              render: (_: unknown, player: Player) => (
                <Button
                  type="link"
                  onClick={(event) => {
                    event.stopPropagation()
                    c?.openCreatorDialog(player, mode)
                  }}
                >
                  管理
                </Button>
              ),
            },
          ]}
          locale={{
            emptyText: (
              <Empty
                description={mode === 'creator-tokens' ? '暂无已开启创作端的玩家' : '暂无玩家'}
              />
            ),
          }}
        />
      </Card>
    </>
  )
}
function CreatorDialog() {
  const c = creatorDialogController
  const state = c?.state
  const player: Player | undefined = state?.player
  const detail: Detail | undefined = state?.detail
  if (!state || !player) return null
  const isAccess = state.mode === 'creator-access'
  return (
    <AntModal
      title={`${isAccess ? '创作权限' : 'CLI Token'} · ${player.displayName || player.username}`}
      open
      onCancel={c.close}
      footer={null}
      width={620}
      destroyOnClose
    >
      {!detail ? (
        <Card loading bordered={false} />
      ) : isAccess ? (
        <div className="player-admin-creator-access">
          <div className="player-admin-creator-access-header">
            <strong>启用创作端</strong>
            <Switch
              checked={Boolean(detail.player.creatorAccess)}
              disabled={!c.can('creator-access.manage') || detail.player.guest}
              onChange={(enabled) =>
                c.updateCreator({
                  creatorAccess: enabled,
                  creatorPermissions: enabled
                    ? detail.player.creatorPermissions?.length
                      ? detail.player.creatorPermissions
                      : CREATOR_CAPABILITIES.filter((capability) => capability !== 'projects.view')
                    : [],
                })
              }
            />
          </div>
          {detail.player.creatorAccess ? (
            <div className="player-admin-creator-permissions-section">
              <span>创作能力</span>
              <Checkbox.Group
                className="player-admin-creator-permissions"
                value={detail.player.creatorPermissions || []}
                disabled={!c.can('creator-access.manage')}
                options={CREATOR_CAPABILITIES.filter(
                  (capability) => capability !== 'projects.view',
                ).map((capability) => ({
                  value: capability,
                  label: <strong>{CREATOR_CAPABILITY_META[capability].label}</strong>,
                }))}
                onChange={(values) =>
                  c.updateCreator({ creatorAccess: true, creatorPermissions: values as string[] })
                }
              />
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未授予创作端访问权限" />
          )}
        </div>
      ) : <CliTokenPanel controller={c} detail={detail} />}
      <AntModal
        title="CLI Token 已签发"
        open={Boolean(c.issuedCliToken)}
        closable={false}
        maskClosable={false}
        footer={<Button type="primary" onClick={c.dismissIssuedCliToken}>我已保存</Button>}
      >
        <p>此 Token 仅显示一次，请立即复制并妥善保存。</p>
        <Input.TextArea
          className="player-admin-issued-token"
          readOnly
          value={c.issuedCliToken?.token || ''}
          autoSize={{ minRows: 3, maxRows: 6 }}
        />
        <Button
          style={{ marginTop: 12 }}
          onClick={async () => {
            await navigator.clipboard?.writeText(c.issuedCliToken?.token || '')
            message.success('Token 已复制')
          }}
        >
          复制 Token
        </Button>
      </AntModal>
    </AntModal>
  )
}
function CliTokenPanel({ controller: c, detail }: { controller: any; detail: Detail }) {
  const [editor, setEditor] = useState<any>()
  const [form] = Form.useForm()
  const editable = c.can('creator-tokens.manage') && detail.player.creatorAccess
  const openEditor = (token?: any) => {
    form.setFieldsValue({ name: token?.name || '', scopes: token?.scopes || [] })
    setEditor(token || {})
  }
  const submit = async () => {
    const values = await form.validateFields()
    await c.command(
      editor?.id
        ? { action: 'update-cli-token', tokenId: editor.id, scopes: values.scopes || [] }
        : { action: 'create-cli-token', name: values.name, scopes: values.scopes || [] },
      editor?.id ? 'CLI Token 权限已更新' : 'CLI Token 已签发',
    )
    setEditor(undefined)
  }
  return <>
    <div className="player-admin-token-toolbar">
      <strong>CLI Token</strong>
      {editable ? <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>新增 Token</Button> : null}
    </div>
    <Table size="small" rowKey="id" pagination={false} dataSource={detail.cliTokens.filter((token) => !token.revokedAt)} columns={[
      { title: '名称', dataIndex: 'name' },
      { title: '权限数', dataIndex: 'scopes', render: (v: string[]) => `${v.length} 项` },
      { title: '状态', render: (_: any, r: any) => r.revokedAt ? <Tag>已撤销</Tag> : <Tag color="success">有效</Tag> },
      { title: '最近使用', dataIndex: 'lastUsedAt', render: dateTime },
      { title: '操作', render: (_: any, r: any) => editable && !r.revokedAt ? <Space><Button type="link" onClick={() => openEditor(r)}>编辑</Button><Button danger type="link" onClick={() => c.confirmCommand('确定撤销这个 CLI Token？', { action: 'revoke-cli-token', tokenId: r.id }, 'CLI Token 已撤销')}>撤销</Button></Space> : '—' },
    ]} />
    <AntModal title={editor?.id ? '编辑 CLI Token' : '新增 CLI Token'} open={Boolean(editor)} onCancel={() => setEditor(undefined)} onOk={() => void submit()}>
      <Form form={form} layout="vertical"><Form.Item name="name" label="名称" rules={[{ required: true }]}><Input disabled={Boolean(editor?.id)} /></Form.Item><Form.Item name="scopes" label="权限"><CliTokenScopes /></Form.Item></Form>
    </AntModal>
  </>
}
function CliTokenScopes({ value = [], onChange }: { value?: string[]; onChange?: (value: string[]) => void }) {
  const groups = CREATOR_CLI_CAPABILITIES.reduce<Record<string, typeof CREATOR_CLI_CAPABILITIES[number][]>>((result, capability) => {
    const group = CREATOR_CLI_CAPABILITY_META[capability].group
    ;(result[group] ||= []).push(capability)
    return result
  }, {})
  return <div className="player-admin-token-scope-groups">{Object.entries(groups).map(([group, capabilities]) => <section key={group}><strong>{group}</strong><Checkbox.Group value={value.filter((item) => capabilities.includes(item as typeof capabilities[number]))} onChange={(next) => onChange?.([...value.filter((item) => !capabilities.includes(item as typeof capabilities[number])), ...(next as string[])])} options={capabilities.map((capability) => ({ value: capability, label: CREATOR_CLI_CAPABILITY_META[capability].label }))} /></section>)}</div>
}
function BanDialog() {
  const c = banDialogController
  const state = c?.state
  const detail: Detail | undefined = state?.detail
  const duration = Form.useWatch('duration', c?.form)
  if (!state) return null
  const ips = [
    detail?.player.lastLoginIp,
    detail?.player.lastSeenIp,
    ...(detail?.sessions || []).flatMap((session) => [session.createdIp, session.lastSeenIp]),
    ...(detail?.loginHistory || []).map((entry) => entry.ip),
  ].filter((value): value is string => Boolean(value))
  const devices = [
    ...new Set(
      [...(detail?.sessions || []), ...(detail?.loginHistory || [])]
        .map((entry) => entry.deviceHash)
        .filter((value): value is string => Boolean(value)),
    ),
  ]
  const uniqueIps = [...new Set(ips)]
  return (
    <AntModal
      title={`封禁 · ${state.player.displayName || state.player.username}`}
      open
      onCancel={c.close}
      onOk={c.submit}
      okText="确认封禁"
      okButtonProps={{ danger: true, disabled: !detail }}
      destroyOnClose
    >
      <Form
        form={c.form}
        layout="vertical"
        initialValues={{ targets: ['account'], duration: 'permanent' }}
      >
        <Form.Item
          name="targets"
          label="封禁对象"
          rules={[{ required: true, type: 'array', min: 1, message: '请至少选择一个封禁对象' }]}
        >
          <Checkbox.Group className="player-admin-ban-targets">
            <Checkbox value="account">封禁账号</Checkbox>
            {uniqueIps.length || devices.length ? (
              <Collapse ghost>
                {uniqueIps.length ? (
                  <Collapse.Panel key="ip" header={`关联 IP（${uniqueIps.length}）`}>
                    <div className="player-admin-ban-options">
                      {uniqueIps.map((value) => (
                        <Checkbox key={value} value={`ip:${value}`}>
                          封禁 IP：{value}
                        </Checkbox>
                      ))}
                    </div>
                  </Collapse.Panel>
                ) : null}
                {devices.length ? (
                  <Collapse.Panel key="device" header={`关联设备（${devices.length}）`}>
                    <div className="player-admin-ban-options">
                      {devices.map((value) => (
                        <Checkbox key={value} value={`device:${value}`}>
                          封禁设备：{value.slice(0, 16)}…
                        </Checkbox>
                      ))}
                    </div>
                  </Collapse.Panel>
                ) : null}
              </Collapse>
            ) : null}
          </Checkbox.Group>
        </Form.Item>
        <Form.Item
          name="reason"
          label="封禁理由"
          rules={[{ required: true, max: 500, message: '请填写不超过 500 个字符的封禁理由' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="例如：多次恶意破坏游戏规则"
            maxLength={500}
            showCount
          />
        </Form.Item>
        <Form.Item name="duration" label="封禁期限">
          <Select
            options={[
              { value: 'permanent', label: '永久封禁' },
              { value: 'temporary', label: '指定到期时间' },
            ]}
          />
        </Form.Item>
        {duration === 'temporary' ? (
          <Form.Item
            name="bannedUntil"
            label="到期时间"
            rules={[{ required: true, message: '请选择封禁到期时间' }]}
          >
            <Input type="datetime-local" />
          </Form.Item>
        ) : null}
      </Form>
    </AntModal>
  )
}
const Layout = Object.assign((props: any) => <AntLayout {...props} />, {
  Sider: AntLayout.Sider,
  Content: (props: any) => {
    const mode = creatorPageController?.view
    return (
      <AntLayout.Content {...props}>
        {mode === 'creator-access' || mode === 'creator-tokens' ? (
          <CreatorManagementPage mode={mode} />
        ) : (
          props.children
        )}
      </AntLayout.Content>
    )
  },
})
const Modal = Object.assign((props: any) => <AntModal {...props} />, {
  confirm: AntModal.confirm,
})
function Table<RecordType extends object>(props: TableProps<RecordType>) {
  if ((props as any).className !== 'player-admin-table') return <AntTable {...props} />
  const c = directoryController
  const ids: string[] = c?.selectedIds || []
  return (
    <>
      <AntTable
        {...props}
        rowSelection={{
          selectedRowKeys: ids,
          onChange: (keys) => c?.setSelectedIds(keys as string[]),
        }}
        onRow={(row) => ({
          onClick: (event) => {
            if (
              !(event.target as HTMLElement).closest(
                'button,a,input,.ant-dropdown-trigger,.ant-dropdown-menu,.ant-dropdown-menu-item',
              )
            )
              c?.openDetails(row)
          },
        })}
      />
      {ids.length ? (
        <div className="player-admin-batchbar">
          <span>
            已选择 <strong>{ids.length}</strong> 个玩家
          </span>
          <Space>
            <Button
              onClick={() =>
                Modal.confirm({
                  title: `确定让 ${ids.length} 个玩家全部下线？`,
                  okText: '确认下线',
                  onOk: () => c?.batchPlayers('revoke-sessions', ids),
                })
              }
            >
              强制下线
            </Button>
            <Button
              danger
              onClick={() =>
                Modal.confirm({
                  title: `确定封禁 ${ids.length} 个玩家？`,
                  okText: '确认封禁',
                  okButtonProps: { danger: true },
                  onOk: () => c?.batchPlayers('ban', ids),
                })
              }
            >
              批量封禁
            </Button>
            <Button
              onClick={() =>
                Modal.confirm({
                  title: `确定解除 ${ids.length} 个玩家的封禁？`,
                  okText: '确认解除',
                  onOk: () => c?.batchPlayers('unban', ids),
                })
              }
            >
              解除封禁
            </Button>
            <Button
              onClick={() =>
                askText('批量添加标签', '输入 1–32 个字符的标签', (tag) =>
                  c?.batchPlayers('add-tag', ids, tag),
                )
              }
            >
              添加标签
            </Button>
            <Button
              onClick={() =>
                askText('批量移除标签', '输入要移除的标签', (tag) =>
                  c?.batchPlayers('remove-tag', ids, tag),
                )
              }
            >
              移除标签
            </Button>
            <Button type="text" onClick={() => c?.setSelectedIds([])}>
              取消选择
            </Button>
          </Space>
        </div>
      ) : null}
    </>
  )
}
function Drawer(props: any) {
  const c = detailController
  const detail: Detail | undefined = c?.details
  const player: Player | undefined = c?.selected
  if (!detail || !player)
    return (
      <AntDrawer {...props}>
        <Card loading bordered={false} />
      </AntDrawer>
    )
  const command = (value: Record<string, unknown>, ok: string) => void c.command(value, ok)
  const items = [
    { key: 'profile', label: '账号资料', children: props.children },
    {
      key: 'identity',
      label: '身份档案',
      children: (
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="身份 ID">{player.subjectId}</Descriptions.Item>
          <Descriptions.Item label="用户 Key">{player.userKey || '—'}</Descriptions.Item>
          <Descriptions.Item label="本地账号 ID">{player.userId || '未注册'}</Descriptions.Item>
          <Descriptions.Item label="登录用户名">{player.username || '未设置'}</Descriptions.Item>
          <Descriptions.Item label="注册时间">
            {dateTime(player.registeredAt || player.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="最后登录">{dateTime(player.lastLoginAt)}</Descriptions.Item>
          <Descriptions.Item label="最后在线">{dateTime(player.lastSeenAt)}</Descriptions.Item>
          <Descriptions.Item label="登录 IP">{player.lastLoginIp || '—'}</Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'password',
      label: '密码重置',
      children: (
        <Card size="small">
          <p>重置后，该玩家所有设备会立即退出。</p>
          {c.can('passwords.reset') && !player.guest ? (
            <Button
              onClick={() =>
                askText('重置登录密码', '输入 10–128 位新密码', (password) =>
                  command({ action: 'reset-password', password }, '密码已重置，所有会话已撤销'),
                )
              }
            >
              重置密码
            </Button>
          ) : (
            <span>当前账号没有重置密码权限。</span>
          )}
        </Card>
      ),
    },
    {
      key: 'related',
      label: `关联线索 · ${detail.relatedAccounts.length}`,
      children: (
        <Table
          size="small"
          rowKey={(r: any) => `${r.subjectId}-${r.sharedIp}`}
          pagination={false}
          dataSource={detail.relatedAccounts}
          columns={[
            { title: '玩家', render: (_: any, r: any) => r.displayName || r.username },
            { title: '用户名', dataIndex: 'username' },
            { title: '共享 IP', dataIndex: 'sharedIp' },
            { title: '最近在线', dataIndex: 'lastSeenAt', render: dateTime },
          ]}
        />
      ),
    },
    {
      key: 'history',
      label: `管理记录 · ${detail.adminHistory.length}`,
      children: (
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={detail.adminHistory}
          columns={[
            { title: '时间', dataIndex: 'createdAt', render: dateTime },
            { title: '操作', dataIndex: 'action' },
            { title: '操作者', render: (_: any, r: any) => r.actorDisplayName || r.actor },
          ]}
        />
      ),
    },
  ]
  return (
    <AntDrawer {...props} width={860} className="player-admin-detail">
      <Tabs tabPosition="left" activeKey={c.detailTab} onChange={c.setDetailTab} items={items} />
    </AntDrawer>
  )
}

function PlayerDirectory(props: {
  players: Player[]
  total: number
  page: number
  search: string
  identity: string
  status: string
  columns: ColumnsType<Player>
  selectedIds: string[]
  setPage: (page: number) => void
  setSearch: (value: string) => void
  setIdentity: (value: string) => void
  setStatus: (value: string) => void
  setSelectedIds: (ids: string[]) => void
  openDetails: (player: Player) => void
  create: () => void
  batch: (
    action: 'revoke-sessions' | 'ban' | 'unban' | 'add-tag' | 'remove-tag',
    ids: string[],
    tag?: string,
  ) => void
}) {
  const {
    players,
    total,
    page,
    search,
    identity,
    status,
    columns,
    selectedIds,
    setPage,
    setSearch,
    setIdentity,
    setStatus,
    setSelectedIds,
    openDetails,
    create,
    batch,
  } = props
  const selected = players.filter((player) => selectedIds.includes(player.subjectId))
  return (
    <>
      <Row justify="space-between" align="middle" className="player-admin-page-toolbar">
        <Col>
          <h1 className="player-admin-page-title">玩家账号</h1>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={create}>
            新增玩家
          </Button>
        </Col>
      </Row>
      <Card className="player-admin-panel player-admin-directory">
        <div className="player-admin-filterbar">
          <Input
            prefix={<SearchOutlined />}
            allowClear
            placeholder="昵称、用户名、身份 ID"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <Select
            value={identity}
            onChange={(value) => {
              setIdentity(value)
              setPage(1)
            }}
            options={[
              { value: 'all', label: '全部账号' },
              { value: 'user', label: '普通账号' },
              { value: 'banned', label: '已封禁' },
            ]}
          />
          <Select
            value={status}
            onChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'online', label: '当前在线' },
              { value: 'offline', label: '当前离线' },
            ]}
          />
        </div>
        <Table
          className="player-admin-table"
          columns={columns}
          dataSource={players}
          rowKey="subjectId"
          pagination={false}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys as string[]),
          }}
          onRow={(row) => ({ onDoubleClick: () => openDetails(row) })}
        />
        <div className="player-admin-pagination">
          <span className="player-admin-muted">共 {total} 个账号</span>
          <Pagination
            current={page}
            total={total}
            pageSize={30}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      </Card>
      {selected.length ? (
        <div className="player-admin-batchbar">
          <span>
            已选择 <strong>{selected.length}</strong> 个玩家
          </span>
          <Space>
            <Button
              onClick={() =>
                Modal.confirm({
                  title: `确定让 ${selected.length} 个玩家全部下线？`,
                  okText: '确认下线',
                  onOk: () => batch('revoke-sessions', selectedIds),
                })
              }
            >
              强制下线
            </Button>
            <Button
              danger
              onClick={() =>
                Modal.confirm({
                  title: `确定封禁 ${selected.length} 个玩家？`,
                  okText: '确认封禁',
                  okButtonProps: { danger: true },
                  onOk: () => batch('ban', selectedIds),
                })
              }
            >
              批量封禁
            </Button>
            <Button
              onClick={() =>
                Modal.confirm({
                  title: `确定解除 ${selected.length} 个玩家的封禁？`,
                  okText: '确认解除',
                  onOk: () => batch('unban', selectedIds),
                })
              }
            >
              解除封禁
            </Button>
            <Button type="text" onClick={() => setSelectedIds([])}>
              取消选择
            </Button>
          </Space>
        </div>
      ) : null}
    </>
  )
}

function Login({ onSuccess }: { onSuccess: (actor: Actor) => void }) {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'admin' | 'owner'>('admin')
  const [form] = Form.useForm()
  const submit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const result =
        mode === 'admin'
          ? await api<{ actor: Actor }>('/api/play-admin/login', {
              method: 'POST',
              body: JSON.stringify(values),
            })
          : await api<{ actor: Actor }>('/api/play-admin/owner-session', {
              method: 'POST',
              headers: { Authorization: `Bearer ${values.password}` },
              body: '{}',
            })
      onSuccess(result.actor)
      message.success('登录成功')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ''
      if (errorMessage) message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }
  return (
    <main className="player-admin-login">
      <Card className="player-admin-login-card" bordered={false}>
        <div className="player-admin-brand player-admin-login-brand">
          <span className="player-admin-brand-mark">B</span>BOX3 Engine
        </div>
        <h1 className="player-admin-login-title">玩家账号管理</h1>
        <div className="player-admin-login-tabs">
          <button
            className={mode === 'admin' ? 'active' : ''}
            onClick={() => {
              setMode('admin')
              form.resetFields()
            }}
          >
            管理员登录
          </button>
          <button
            className={mode === 'owner' ? 'active' : ''}
            onClick={() => {
              setMode('owner')
              form.resetFields()
            }}
          >
            服主登录
          </button>
        </div>
        <Form form={form} layout="vertical" onFinish={submit}>
          {mode === 'admin' ? (
            <>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input prefix={<UserOutlined />} />
              </Form.Item>
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              name="password"
              label="服主管理令牌"
              rules={[{ required: true, message: '请输入服主管理令牌' }]}
            >
              <Input.Password prefix={<SafetyCertificateOutlined />} autoComplete="off" />
            </Form.Item>
          )}
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录后台
          </Button>
        </Form>
      </Card>
    </main>
  )
}

function PlayMapsPage({ canManage }: { canManage: boolean }) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const [worlds, setWorlds] = useState<PlayMap[]>([])
  const [statuses, setStatuses] = useState<Record<string, PlayMapResourceStatus>>({})
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<PlayMap>()
  const [review, setReview] = useState<PlayBundleReview>()
  const [reviewFile, setReviewFile] = useState<File>()
  const [preview, setPreview] = useState<{ resource: PlayBundleReview['resources'][number]; content: string }>()
  const [reviewWorldId, setReviewWorldId] = useState('')
  const [reviewCategory, setReviewCategory] = useState('script')
  const [form] = Form.useForm()
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [maps, resourceStatus] = await Promise.all([
        api<{ worlds: PlayMap[] }>('/api/play-admin/library/worlds'),
        api<{ worlds: PlayMapResourceStatus[] }>('/api/play-admin/library/world-status'),
      ])
      setWorlds(maps.worlds || [])
      setStatuses(Object.fromEntries((resourceStatus.worlds || []).map((item) => [item.id, item])))
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])
  const groups = useMemo(() => {
    const grouped = new Map<string, PlayMap[]>()
    worlds.forEach((world) => {
      const key = world.mapGroupId || world.mainProjectId || world.id
      grouped.set(key, [...(grouped.get(key) || []), world])
    })
    return [...grouped.entries()].map(([id, members]) => {
      const main = members.find((item) => item.id === members[0].mainProjectId) || members.find((item) => item.mapRole === 'main') || members[0]
      return { id, main, submaps: members.filter((item) => item.id !== main.id) }
    })
  }, [worlds])
  const tableRows = useMemo<PlayMapTableRow[]>(() => groups.map(({ id, main, submaps }) => ({
    key: id,
    kind: 'group',
    map: main,
    mapCount: 1 + submaps.length,
    resourceBytes: [main, ...submaps].reduce((sum, item) => sum + (statuses[item.id]?.bytes || 0), 0),
    ...(submaps.length
      ? { children: submaps.map((map) => ({ key: map.id, kind: 'submap' as const, map })) }
      : {}),
  })), [groups, statuses])
  const patchWorld = async (world: PlayMap, values: Record<string, unknown>) => {
    await api(`/api/play-admin/library/worlds/${encodeURIComponent(world.id)}`, { method: 'PATCH', body: JSON.stringify(values) })
    await load()
  }
  const saveWorld = async () => {
    if (!editing) return
    try {
      const values = await form.validateFields()
      await patchWorld(editing, { publicId: String(values.publicId).toLowerCase() })
      setEditing(undefined)
      message.success('地图访问 ID 已保存')
    } catch (error) {
      if (error instanceof Error) message.error(error.message)
    }
  }
  const removeWorld = (world: PlayMap) => Modal.confirm({
    title: world.mapRole === 'main' ? '删除地图组' : '删除副地图',
    content: world.mapRole === 'main' ? '将永久删除这个主地图及其副地图，且无法恢复。' : `将永久删除“${world.name}”，且无法恢复。`,
    okText: '永久删除', cancelText: '取消', okButtonProps: { danger: true },
    onOk: async () => {
      await api(`/api/play-admin/library/worlds/${encodeURIComponent(world.id)}`, { method: 'DELETE', body: '{}' })
      message.success('地图已删除')
      await load()
    },
  })
  const inspectBundle = async (file: File) => {
    setLoading(true)
    try {
      const result = await api<{ review: PlayBundleReview }>('/api/play-admin/library/import?mode=preview', {
        method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file,
      })
      setReview(result.review)
      setReviewFile(file)
      setReviewWorldId(result.review.worlds[0]?.id || '')
      setReviewCategory('script')
      setPreview(undefined)
    } catch (error) {
      message.error((error as Error).message)
    } finally { setLoading(false) }
  }
  const cancelReview = async () => {
    if (review) await api(`/api/play-admin/library/import?reviewId=${encodeURIComponent(review.id)}`, { method: 'DELETE', body: '{}' }).catch(() => undefined)
    if (preview?.resource.kind !== 'script' && preview?.content) URL.revokeObjectURL(preview.content)
    setPreview(undefined); setReview(undefined); setReviewFile(undefined); setReviewWorldId('')
  }
  const confirmImport = async () => {
    if (!review) return
    setLoading(true)
    try {
      await api(`/api/play-admin/library/import?mode=confirm&reviewId=${encodeURIComponent(review.id)}`, { method: 'POST', body: '{}' })
      message.success(`已导入 ${review.mapCount} 张地图`)
      await cancelReview(); await load()
    } catch (error) { message.error((error as Error).message) } finally { setLoading(false) }
  }
  const previewResource = async (resource: PlayBundleReview['resources'][number]) => {
    if (!review || !resource.previewable) return
    try {
      const response = await fetch(`/api/play-admin/library/import?mode=resource&reviewId=${encodeURIComponent(review.id)}&resourceId=${encodeURIComponent(resource.id)}`, { credentials: 'same-origin' })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || '资源预览加载失败')
      if (resource.kind === 'script') setPreview({ resource, content: await response.text() })
      else setPreview({ resource, content: URL.createObjectURL(await response.blob()) })
    } catch (error) { message.error((error as Error).message) }
  }
  return <>
    <Row justify="space-between" align="middle" className="player-admin-page-toolbar">
      <Col><h1 className="player-admin-page-title">游玩地图</h1></Col>
      <Col><Space><Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>{canManage ? <Button type="primary" icon={<UploadOutlined />} loading={loading} onClick={() => uploadRef.current?.click()}>导入游玩包</Button> : null}</Space></Col>
    </Row>
    <input ref={uploadRef} hidden type="file" accept=".boxplay,.tar.gz,.tgz,application/gzip" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) void inspectBundle(file) }} />
    {groups.length ? <Card className="player-admin-panel player-admin-map-directory" title="已导入地图" extra={<span className="player-admin-muted">{groups.length} 个地图组 · {worlds.length} 张地图</span>}>
      <AntTable
        className="player-admin-map-table"
        tableLayout="fixed"
        size="middle"
        pagination={false}
        rowKey="key"
        dataSource={tableRows}
        expandable={{
          expandRowByClick: false,
          rowExpandable: (row) => row.kind === 'group' && Boolean(row.children?.length),
        }}
        columns={[
          { title: '地图', width: '29%', render: (_, row: PlayMapTableRow) => <div className="player-admin-map-name"><span className="player-admin-map-title" title={row.map.name}>{row.map.name}</span>{row.map.version ? <span className="player-admin-map-version">v{row.map.version.replace(/^v/i, '')}</span> : null}</div> },
          { title: '访问 ID', width: '29%', render: (_, row: PlayMapTableRow) => <code title={row.map.publicId}>{row.map.publicId}</code> },
          { title: '地图与资源', width: '16%', render: (_, row: PlayMapTableRow) => row.kind === 'group' ? <span className="player-admin-map-summary">{row.mapCount} 张地图 · {formatBytes(row.resourceBytes)}</span> : '—' },
          { title: '导入时间', width: '16%', render: (_, row: PlayMapTableRow) => dateTime(statuses[row.map.id]?.importedAt) },
          { title: '状态与操作', width: '10%', render: (_, row: PlayMapTableRow) => row.kind === 'submap' ? (canManage ? <Button type="link" icon={<EditOutlined />} onClick={() => { setEditing(row.map); form.setFieldsValue({ publicId: row.map.publicId }) }}>设置</Button> : '—') : <Space size={8}>{canManage ? <Switch checked={row.map.playEnabled !== false} checkedChildren="开放" unCheckedChildren="关闭" onChange={(playEnabled) => void patchWorld(row.map, { playEnabled }).then(() => message.success(playEnabled ? '地图组已开放' : '地图组已关闭')).catch((error) => message.error(error.message))} /> : <Tag color={row.map.playEnabled !== false ? 'success' : 'default'}>{row.map.playEnabled !== false ? '已开放' : '已关闭'}</Tag>} {canManage ? <Dropdown menu={{ items: [{ key: 'settings', label: '设置访问 ID', icon: <EditOutlined />, onClick: () => { setEditing(row.map); form.setFieldsValue({ publicId: row.map.publicId }) } }, { type: 'divider' }, { key: 'delete', label: '删除地图组', danger: true, icon: <DeleteOutlined />, onClick: () => removeWorld(row.map) }] }}><Button type="text">更多</Button></Dropdown> : null}</Space> },
        ]}
      />
    </Card> : <Card className="player-admin-panel"><Empty description="暂无游玩地图">{canManage ? <Button type="primary" onClick={() => uploadRef.current?.click()}>导入游玩包</Button> : null}</Empty></Card>}
    <Modal title="地图设置" open={Boolean(editing)} onCancel={() => setEditing(undefined)} onOk={() => void saveWorld()} okText="保存">
      <Form form={form} layout="vertical"><Form.Item name="publicId" label="访问 ID" rules={[{ required: true, pattern: /^[a-z0-9][a-z0-9-]{0,62}$/, message: '使用小写字母、数字或连字符，最长 63 位' }]}><Input addonBefore="/p/" maxLength={63} onChange={(event) => form.setFieldValue('publicId', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} /></Form.Item></Form>
    </Modal>
    <Modal title="检查游玩包" open={Boolean(review)} width={1040} wrapClassName="play-bundle-review-modal" onCancel={() => void cancelReview()} footer={<Space><Button onClick={() => void cancelReview()}>取消</Button><Button type="primary" loading={loading} onClick={() => void confirmImport()}>确认导入</Button></Space>}>
      {review ? <>
        <div className="play-bundle-review-summary">
          <div className="play-bundle-review-file"><span>导入文件</span><strong title={reviewFile?.name}>{reviewFile?.name || '游玩包'}</strong></div>
          <div><span>地图数量</span><strong>{review.mapCount} 张</strong></div>
          <div><span>资源内容</span><strong>{formatBytes(review.totalBytes)} · {review.blobCount} 个</strong></div>
        </div>
        {review.warnings.length ? <div className="play-bundle-review-warnings"><strong>检查提示</strong>{review.warnings.map((warning, index) => <div key={index}>{warning}</div>)}</div> : null}
        <div className="play-bundle-review-workspace">
          <section className="play-bundle-review-map-list">
            <div className="play-bundle-review-section-title">地图</div>
            <div className="play-bundle-review-scroll">{review.worlds.map((world) => <button key={world.id} type="button" className={`play-bundle-review-item ${reviewWorldId === world.id ? 'is-selected' : ''}`} onClick={() => { setReviewWorldId(world.id); setPreview(undefined) }}><strong>{world.name}</strong><span>{world.mapRole === 'main' ? '主地图' : '副地图'}{world.version ? ` · ${world.version}` : ''}</span></button>)}</div>
          </section>
          <section className="play-bundle-review-resource-list">
            <Tabs activeKey={reviewCategory} onChange={(key) => { setReviewCategory(key); setPreview(undefined) }} items={[
              { key: 'script', label: <Space size={4}><CodeOutlined />脚本</Space> },
              { key: 'image', label: <Space size={4}><FileImageOutlined />图片</Space> },
              { key: 'audio', label: <Space size={4}><SoundOutlined />音频</Space> },
            ]} />
            <div className="play-bundle-review-scroll">{review.resources.filter((resource) => resource.worldId === reviewWorldId && resource.kind === reviewCategory).map((resource) => <button key={resource.id} type="button" disabled={!resource.previewable} className={`play-bundle-review-item ${preview?.resource.id === resource.id ? 'is-selected' : ''}`} onClick={() => void previewResource(resource)}><strong title={resource.name}>{resource.name}</strong><span>{formatBytes(resource.bytes)}{resource.scriptTarget ? ` · ${resource.scriptTarget}` : ''}{resource.previewable ? '' : ' · 无法预览'}</span></button>)}{!review.resources.some((resource) => resource.worldId === reviewWorldId && resource.kind === reviewCategory) ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有此类资源" /> : null}</div>
          </section>
          <section className="play-bundle-review-preview">{preview ? <>
            <div className="play-bundle-review-preview-head"><strong title={preview.resource.name}>{preview.resource.name}</strong><span>{preview.resource.mimeType} · {formatBytes(preview.resource.bytes)}</span></div>
            {preview.resource.kind === 'script' ? preview.content ? <pre className="play-bundle-review-code">{preview.content}</pre> : <Empty description="该脚本为空" /> : preview.resource.kind === 'image' ? <div className="play-bundle-review-image"><img src={preview.content} alt={preview.resource.name} /></div> : preview.resource.kind === 'audio' ? <div className="play-bundle-review-audio"><audio controls src={preview.content} /></div> : <a href={preview.content} target="_blank" rel="noreferrer">打开资源预览</a>}
          </> : <Empty description="选择资源以预览"><span className="player-admin-muted">预览不会执行脚本或启动地图</span></Empty>}</section>
        </div>
      </> : null}
    </Modal>
  </>
}

function ContainerProfilesPage({ canManage }: { canManage: boolean }) {
  const [catalog, setCatalog] = useState<ContainerCatalog>()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<ContainerProfile>()
  const [form] = Form.useForm<ContainerProfile>()
  const configurationScope = Form.useWatch('configurationScope', form) || 'group'
  const load = useCallback(async () => {
    setLoading(true)
    try { setCatalog(await api<ContainerCatalog>('/api/play-admin/containers?mode=play')) }
    catch (error) { message.error((error as Error).message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const openProfile = (item?: ContainerProfile) => {
    const defaults = catalog?.defaults || { playerLimit: 70, roomLimit: 64, idleTimeoutMs: 900000 }
    const next = item || { permanentMapId: '', mode: 'play' as const, ...defaults, cpuMilli: null, memoryMb: null, configurationScope: 'group' as const, configurationRootId: '' }
    setProfile(next)
    form.setFieldsValue(next)
  }
  const saveProfile = async () => {
    try {
      const values = await form.validateFields()
      await api('/api/play-admin/containers', { method: 'POST', body: JSON.stringify(values) })
      message.success('地图容器配置已保存；新启动的运行时会使用该配置')
      setProfile(undefined)
      await load()
    } catch (error) { if (error instanceof Error) message.error(error.message) }
  }
  const removeProfile = (item: ContainerProfile) => Modal.confirm({
    title: '删除容器配置', content: '后续启动将使用全局默认容量和共享 Node 运行时。', okText: '删除', cancelText: '取消', okButtonProps: { danger: true },
    onOk: async () => { await api(`/api/play-admin/containers/${encodeURIComponent(item.permanentMapId)}`, { method: 'DELETE', body: JSON.stringify({ configurationScope: item.configurationScope }) }); message.success('容器配置已删除'); await load() },
  })
  return <>
    <Row justify="space-between" align="middle" className="player-admin-page-toolbar">
      <Col><h1 className="player-admin-page-title">地图容器配置</h1></Col>
      <Col><Space><Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>{canManage ? <Button type="primary" onClick={() => openProfile()}>新增配置</Button> : null}</Space></Col>
    </Row>
    <Card className="player-admin-panel player-admin-container-profiles">
      <AntTable<ContainerProfile>
        loading={loading} rowKey={(item) => `${item.configurationScope}:${item.permanentMapId}`} pagination={false} dataSource={catalog?.profiles || []}
        columns={[
          { title: '地图', dataIndex: 'permanentMapId', render: (value) => { const map = (catalog?.allMaps || []).find((item) => item.permanentMapId === value); return <div><div>{map?.name || '已删除地图'}</div><code className="player-admin-muted">{value}</code></div> } },
          { title: '配置范围', dataIndex: 'configurationScope', render: (value) => <Tag color={value === 'group' ? 'blue' : 'default'}>{value === 'group' ? '地图组' : '单个地图'}</Tag> },
          { title: '人数上限', dataIndex: 'playerLimit', render: (value) => `${value} 人` },
          { title: '房间上限', dataIndex: 'roomLimit', render: (value) => `${value} 个` },
          { title: '空闲回收', dataIndex: 'idleTimeoutMs', render: (value) => `${value} ms` },
          { title: '资源组', render: (_, item) => { const group = (catalog?.resourceGroups || []).find((candidate) => candidate.id === item.resourceGroupId); return group ? <Tag color="blue">{group.name}</Tag> : '—' } },
          { title: '运行方式', render: (_, item) => item.resourceGroupId || item.cpuMilli || item.memoryMb ? <Tag color="blue">独立 Docker 容器</Tag> : <Tag>共享 Node</Tag> },
          { title: '操作', render: (_, item) => canManage ? <Space size={4}><Button type="link" onClick={() => openProfile(item)}>编辑</Button><Button type="link" danger onClick={() => removeProfile(item)}>删除</Button></Space> : '—' },
        ]}
      />
    </Card>
    <Modal title={profile?.permanentMapId ? '地图容量配置' : '新增地图容量配置'} open={Boolean(profile)} onCancel={() => setProfile(undefined)} onOk={() => void saveProfile()} okText="保存">
      <Form form={form} layout="vertical">
        <Row gutter={16}><Col span={8}><Form.Item name="configurationScope" label="配置范围"><Select disabled={Boolean(profile?.permanentMapId)} options={[{ value: 'group', label: '地图组' }, { value: 'map', label: '单个地图' }]} onChange={() => form.setFieldValue('permanentMapId', undefined)} /></Form.Item></Col><Col span={16}><Form.Item name="permanentMapId" label="地图 ID" rules={[{ required: true, message: configurationScope === 'group' ? '请选择地图组' : '请选择地图' }]}><Select disabled={Boolean(profile?.permanentMapId)} placeholder={configurationScope === 'group' ? '选择地图组' : '选择地图'} options={(configurationScope === 'group' ? (catalog?.availableMaps || []) : (catalog?.allMaps || [])).map((item) => ({ value: item.permanentMapId, label: `${item.name} · ${item.permanentMapId}${configurationScope === 'group' && (item.memberCount || 1) > 1 ? ` · ${item.memberCount} 张地图` : ''}` }))} /></Form.Item></Col></Row>
        <Row gutter={16}><Col span={12}><Form.Item name="playerLimit" label="人数上限" rules={[{ required: true }]}><Input type="number" min={1} /></Form.Item></Col><Col span={12}><Form.Item name="roomLimit" label="房间上限" rules={[{ required: true }]}><Input type="number" min={1} /></Form.Item></Col></Row>
        <Form.Item name="idleTimeoutMs" label="无用户时存活时间（ms）" rules={[{ required: true }]}><Input type="number" min={1000} /></Form.Item>
        <Form.Item name="resourceGroupId" label="资源组"><Select allowClear placeholder="选择资源组；留空使用共享 Node" options={(catalog?.resourceGroups || []).map((item) => ({ value: item.id, label: `${item.name} · ${item.cpuMilli} m · ${item.memoryMb} MB` }))} /></Form.Item>
      </Form>
    </Modal>
  </>
}

export default function PlayerAdminPage() {
  const [actor, setActor] = useState<Actor>()
  const [booting, setBooting] = useState(true)
  const [view, setView] = useState<View>(viewFromLocation)
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [players, setPlayers] = useState<Player[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(30)
  const [search, setSearch] = useState('')
  const [identity, setIdentity] = useState('all')
  const status = 'all'
  const [selected, setSelected] = useState<Player>()
  const [details, setDetails] = useState<Detail>()
  const [detailTab, setDetailTab] = useState('profile')
  const [detailLoading, setDetailLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityPage, setActivityPage] = useState(1)
  const [activityPageSize, setActivityPageSize] = useState(30)
  const [activityKind, setActivityKind] = useState('all')
  const [activitySearch, setActivitySearch] = useState('')
  const [identityBans, setIdentityBans] = useState<IdentityBan[]>([])
  const [identityBanTotal, setIdentityBanTotal] = useState(0)
  const [identityBanLoading, setIdentityBanLoading] = useState(false)
  const [identityBanSearch, setIdentityBanSearch] = useState('')
  const [identityBanKind, setIdentityBanKind] = useState<'all' | 'ip' | 'device'>('all')
  const [identityBanPage, setIdentityBanPage] = useState(1)
  const [identityBanPageSize, setIdentityBanPageSize] = useState(30)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [ownerLoading, setOwnerLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin>()
  const [editingGroup, setEditingGroup] = useState<Group>()
  const [creatorDialog, setCreatorDialog] = useState<{
    player: Player
    detail?: Detail
    mode: 'creator-access' | 'creator-tokens'
  }>()
  const [issuedCliToken, setIssuedCliToken] = useState<{ token: string }>()
  const [creatorPickerOpen, setCreatorPickerOpen] = useState(false)
  const [creatorCandidates, setCreatorCandidates] = useState<Player[]>([])
  const [creatorPickerForm] = Form.useForm()
  const [banDialog, setBanDialog] = useState<{ player: Player; detail?: Detail }>()
  const [exportingPlayers, setExportingPlayers] = useState(false)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [adminForm] = Form.useForm()
  const [groupForm] = Form.useForm()
  const [banForm] = Form.useForm()
  const [selfPasswordForm] = Form.useForm()
  const [selfPasswordOpen, setSelfPasswordOpen] = useState(false)
  const [selfPasswordSaving, setSelfPasswordSaving] = useState(false)
  const isOwner = actor?.role === 'owner'
  const can = (permission: string) => isOwner || Boolean(actor?.permissions.includes(permission))
  const allowedViews = useMemo(() => allowedPlayerAdminViews(actor), [actor])
  const fallbackView = useMemo(() => playerAdminFallbackView(actor), [actor])
  const navigate = useCallback((next: View) => {
    const destination = allowedViews.includes(next) ? next : fallbackView
    setView(destination)
    const url = new URL(window.location.href)
    url.searchParams.set('view', destination)
    window.history.pushState({ view: destination }, '', `${url.pathname}${url.search}${url.hash}`)
  }, [allowedViews, fallbackView])
  const loadOverview = useCallback(async () => {
    const result = await api<{ totals: Record<string, number> }>(routes.playerOverview)
    setTotals(result.totals || {})
  }, [])
  const loadPlayers = useCallback(async () => {
    const effectiveIdentity = view === 'account-bans' ? 'banned' : identity
    const effectiveStatus = view === 'online-sessions' ? 'online' : status
    const query = new URLSearchParams({
      search,
      page: String(page),
      pageSize: String(pageSize),
      identity: effectiveIdentity,
      online: effectiveStatus,
      sort: 'lastSeen',
    })
    const result = await api<{ players: Player[]; total: number }>(
      `${routes.players}?${query}`,
    )
    setPlayers(result.players || [])
    setTotal(result.total || 0)
  }, [identity, page, pageSize, search, status, view])
  const exportPlayers = async () => {
    if (exportingPlayers || !can('players.export')) return
    setExportingPlayers(true)
    try {
      const query = new URLSearchParams({
        search,
        identity,
        online: status,
        sort: 'lastSeen',
      })
      const response = await fetch(`${routes.playerExport}?${query}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || '导出玩家数据失败')
      }
      const file = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = file
      anchor.download = `players-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(file)
      const exported = response.headers.get('X-BOX-Exported-Rows') || '0'
      const totalRows = response.headers.get('X-BOX-Total-Rows') || exported
      message.success(`已导出 ${exported} / ${totalRows} 条玩家记录`)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setExportingPlayers(false)
    }
  }
  const loadActivity = useCallback(async () => {
    setActivityLoading(true)
    try {
      const r = await api<{ events: Activity[]; total: number }>(
        `${routes.activity}?${new URLSearchParams({ page: String(activityPage), pageSize: String(activityPageSize), kind: activityKind, search: activitySearch })}`,
      )
      setActivity(r.events || [])
      setActivityTotal(r.total || 0)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setActivityLoading(false)
    }
  }, [activityKind, activityPage, activityPageSize, activitySearch])
  const loadIdentityBans = useCallback(async () => {
    setIdentityBanLoading(true)
    try {
      const query = new URLSearchParams({
        search: identityBanSearch,
        kind: identityBanKind,
        page: String(identityBanPage),
        pageSize: String(identityBanPageSize),
      })
      const r = await api<{ bans: IdentityBan[]; total: number }>(
        `${routes.identityBans}?${query}`,
      )
      setIdentityBans(r.bans || [])
      setIdentityBanTotal(r.total || 0)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setIdentityBanLoading(false)
    }
  }, [identityBanKind, identityBanPage, identityBanPageSize, identityBanSearch])
  const loadOwner = useCallback(async () => {
    setOwnerLoading(true)
    try {
      const [a, g] = await Promise.all([
        api<{ admins: Admin[] }>(routes.admins),
        api<{ groups: Group[] }>(routes.permissionGroups),
      ])
      setAdmins(a.admins || [])
      setGroups(g.groups || [])
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setOwnerLoading(false)
    }
  }, [])
  const load = useCallback(async () => {
    if (!actor || !canOpenPlayerAdminView(actor, view)) return
    if (
      view === 'players' ||
      view === 'online-sessions' ||
      view === 'account-bans' ||
      view === 'creator-access' ||
      view === 'creator-tokens'
    )
      return loadPlayers()
    if (view === 'identity-bans') return loadIdentityBans()
    if (view === 'security') return loadActivity()
    if (view === 'admins' || view === 'permission-groups') return loadOwner()
    return loadOverview()
  }, [actor, view, loadPlayers, loadIdentityBans, loadActivity, loadOwner, loadOverview])
  useEffect(() => {
    void (async () => {
      setBooting(true)
      try {
        const r = await api<{ actor: Actor }>(routes.verify)
        setActor(r.actor)
        await loadOverview()
      } catch {
        setActor(undefined)
      } finally {
        setBooting(false)
      }
    })()
  }, [loadOverview])
  useEffect(() => {
    if (actor) void load()
  }, [actor, load])
  useEffect(() => {
    if (actor && !canOpenPlayerAdminView(actor, view)) navigate(fallbackView)
  }, [actor, fallbackView, navigate, view])
  useEffect(() => {
    const restore = () => setView(viewFromLocation())
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])
  const openDetails = async (player: Player, tab = 'profile') => {
    try {
      setSelected(player)
      setDetails(undefined)
      setDetailLoading(true)
      setDetailTab(tab)
      const r = await api<Detail>(routes.player(player.subjectId))
      setSelected(r.player)
      setDetails(r)
      editForm.setFieldsValue({
        displayName: r.player.displayName,
        boxId: r.player.boxId,
        userKey: r.player.userKey,
        adminNote: r.player.adminNote,
        tags: r.player.tags?.join(', '),
      })
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setDetailLoading(false)
    }
  }
  const openCreatorDialog = async (player: Player, mode: 'creator-access' | 'creator-tokens') => {
    try {
      setCreatorDialog({ player, mode })
      const detail = await api<Detail>(routes.player(player.subjectId))
      setCreatorDialog({ player: detail.player, detail, mode })
    } catch (error) {
      setCreatorDialog(undefined)
      message.error((error as Error).message)
    }
  }
  const openCreatorPicker = async () => {
    try {
      const result = await api<{ players: Player[] }>(`${routes.players}?page=1&pageSize=100&identity=all&online=all&sort=displayName`)
      setCreatorCandidates(result.players || [])
      creatorPickerForm.resetFields()
      setCreatorPickerOpen(true)
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const selectCreatorCandidate = async () => {
    try {
      const values = await creatorPickerForm.validateFields()
      const player = creatorCandidates.find((candidate) => candidate.subjectId === values.subjectId)
      if (!player) return
      setCreatorPickerOpen(false)
      await openCreatorDialog(player, 'creator-access')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ''
      if (errorMessage) message.error(errorMessage)
    }
  }
  const openBanDialog = async (player: Player) => {
    try {
      banForm.resetFields()
      banForm.setFieldsValue({ targets: ['account'], duration: 'permanent', reason: '' })
      setBanDialog({ player })
      const detail = await api<Detail>(routes.player(player.subjectId))
      setBanDialog({ player: detail.player, detail })
    } catch (error) {
      setBanDialog(undefined)
      message.error((error as Error).message)
    }
  }
  const savePlayer = async () => {
    if (!selected) return
    try {
      const v = await editForm.validateFields()
      const result = await api<{ player: Player }>(
        `/api/play-admin/players/${selected.subjectId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...v,
            tags: v.tags
              ? v.tags
                  .split(',')
                  .map((x: string) => x.trim())
                  .filter(Boolean)
              : [],
          }),
        },
      )
      if (result.player) {
        setSelected(result.player)
        setDetails((current) => (current ? { ...current, player: result.player } : current))
      }
      message.success('玩家资料已保存')
      await loadPlayers()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const updateCreator = async (changes: {
    creatorAccess: boolean
    creatorPermissions: string[]
  }) => {
    if (!selected) return
    try {
      await api(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      })
      message.success(changes.creatorAccess ? '创作权限已更新' : '已关闭创作端访问权限')
      await openDetails(selected)
      await loadPlayers()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const updateCreatorDialog = async (changes: {
    creatorAccess: boolean
    creatorPermissions: string[]
  }) => {
    if (!creatorDialog?.detail) return
    try {
      const result = await api<{ player: Player }>(
        `/api/play-admin/players/${creatorDialog.player.subjectId}`,
        { method: 'PATCH', body: JSON.stringify(changes) },
      )
      if (result.player)
        setCreatorDialog((current) =>
          current?.detail
            ? {
                ...current,
                player: result.player,
                detail: { ...current.detail, player: result.player },
              }
            : current,
        )
      message.success(changes.creatorAccess ? '创作权限已更新' : '已关闭创作端访问权限')
      await loadPlayers()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const toggleBan = async (player: Player) => {
    try {
      const next = player.status === 'banned' ? 'active' : 'banned'
      await api(`/api/play-admin/players/${player.subjectId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: next,
          ...(next === 'banned' ? { banReason: '由管理后台执行' } : {}),
        }),
      })
      message.success(next === 'banned' ? '账号已封禁' : '账号已解除封禁')
      await loadPlayers()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const submitBanDialog = async () => {
    if (!banDialog?.detail) return
    try {
      const values = await banForm.validateFields()
      const targets = values.targets as string[]
      const bannedUntil =
        values.duration === 'temporary' ? new Date(values.bannedUntil).toISOString() : null
      if (
        values.duration === 'temporary' &&
        (!bannedUntil || new Date(bannedUntil).getTime() <= Date.now())
      ) {
        throw new Error('封禁到期时间必须晚于当前时间')
      }
      const subjectId = banDialog.player.subjectId
      if (targets.includes('account')) {
        await api(`/api/play-admin/players/${subjectId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'banned', banReason: values.reason, bannedUntil }),
        })
      }
      for (const target of targets) {
        if (target.startsWith('ip:') || target.startsWith('device:')) {
          await api(`/api/play-admin/players/${subjectId}`, {
            method: 'POST',
            body: JSON.stringify({
              action: target.startsWith('ip:') ? 'ban-ip' : 'ban-device',
              value: target.slice(target.indexOf(':') + 1),
              reason: values.reason,
              bannedUntil,
            }),
          })
        }
      }
      setBanDialog(undefined)
      message.success('封禁已生效')
      await loadPlayers()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const command = async (commandValue: Record<string, unknown>, success: string) => {
    if (!selected) return
    try {
      await api(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'POST',
        body: JSON.stringify(commandValue),
      })
      message.success(success)
      await openDetails(selected)
      await loadPlayers()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const creatorCommand = async (commandValue: Record<string, unknown>, success: string) => {
    if (!creatorDialog) return
    try {
      const result = await api<any>(`/api/play-admin/players/${creatorDialog.player.subjectId}`, {
        method: 'POST',
        body: JSON.stringify(commandValue),
      })
      let issuedToken: string | undefined
      if (commandValue.action === 'create-cli-token') {
        const token = typeof result?.token === 'string' ? result.token : ''
        if (!token) throw new Error('CLI Token 签发成功，但未收到可展示的 Token')
        issuedToken = token
      }
      message.success(success)
      if (issuedToken) setIssuedCliToken({ token: issuedToken })
      await openCreatorDialog(creatorDialog.player, creatorDialog.mode)
      await loadPlayers()
      return result
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const confirmCommand = (
    title: string,
    commandValue: Record<string, unknown> | null,
    success: string,
    action?: () => void,
  ) =>
    Modal.confirm({
      title,
      content: '此操作会立即影响该玩家正在使用的服务。',
      okText: '确认执行',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => (action ? action() : command(commandValue || {}, success)),
    })
  const confirmCreatorCommand = (
    title: string,
    commandValue: Record<string, unknown>,
    success: string,
  ) =>
    Modal.confirm({
      title,
      content: '此操作会立即使该 CLI Token 失效，使用它的 CLI 将无法继续访问创作端。',
      okText: '确认撤销',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => creatorCommand(commandValue, success),
    })
  const saveBan = async () => {
    if (!selected) return
    try {
      await api(`/api/play-admin/players/${selected.subjectId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: selected.status,
          banReason: selected.banReason || '',
          bannedUntil: selected.status === 'banned' ? selected.bannedUntil || null : null,
        }),
      })
      message.success('封禁状态已保存')
      await openDetails(selected)
      await loadPlayers()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const deletePlayer = async (target = selected) => {
    if (!target) return
    try {
      await api(`/api/play-admin/players/${target.subjectId}`, { method: 'DELETE' })
      message.success('玩家身份已删除')
      setSelected(undefined)
      setDetails(undefined)
      await loadPlayers()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const batchPlayers = async (
    action: 'revoke-sessions' | 'ban' | 'unban' | 'add-tag' | 'remove-tag',
    subjectIds: string[],
    tag?: string,
  ) => {
    try {
      await api('/api/play-admin/players/batch', {
        method: 'POST',
        body: JSON.stringify({
          action,
          subjectIds,
          ...(action === 'ban' ? { reason: '由管理后台批量执行' } : {}),
          ...(['add-tag', 'remove-tag'].includes(action) ? { tag } : {}),
        }),
      })
      message.success(
        action === 'revoke-sessions'
          ? '已发送下线指令'
          : action === 'ban'
            ? '已批量封禁'
            : action === 'unban'
              ? '已批量解封'
              : action === 'add-tag'
                ? '已添加标签'
                : '已移除标签',
      )
      setSelectedIds([])
      await loadPlayers()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const revokeIdentityBan = async (ban: IdentityBan) => {
    try {
      await api('/api/play-admin/identity-bans', {
        method: 'POST',
        body: JSON.stringify({ banId: ban.id }),
      })
      message.success(`${ban.kind === 'ip' ? 'IP' : '设备'}封禁已解除`)
      await loadIdentityBans()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const createPlayer = async () => {
    try {
      await api('/api/play-admin/players', {
        method: 'POST',
        body: JSON.stringify(await createForm.validateFields()),
      })
      message.success('玩家账号已创建')
      setCreateOpen(false)
      createForm.resetFields()
      await loadPlayers()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const createAdmin = async () => {
    let values: Record<string, any>
    try {
      values = await adminForm.validateFields()
    } catch {
      // Ant Design 已在对应字段展示校验错误，避免再弹出没有文本的全局错误提示。
      return
    }
    try {
      const payload = editingAdmin
        ? {
            displayName: values.displayName,
            permissionGroupId: values.permissionGroupId,
            ...(values.password ? { password: values.password } : {}),
          }
        : {
            username: values.username,
            displayName: values.displayName,
            password: values.password,
            permissionGroupId: values.permissionGroupId,
          }
      await api(
        editingAdmin ? `/api/play-admin/admins/${editingAdmin.id}` : '/api/play-admin/admins',
        {
          method: editingAdmin ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
      )
      message.success(editingAdmin ? '管理账号已更新' : '管理账号已创建')
      setAdminOpen(false)
      setEditingAdmin(undefined)
      adminForm.resetFields()
      await loadOwner()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const createGroup = async () => {
    try {
      const values = await groupForm.validateFields()
      await api(
        editingGroup
          ? `/api/play-admin/permission-groups/${editingGroup.id}`
          : '/api/play-admin/permission-groups',
        {
          method: editingGroup ? 'PATCH' : 'POST',
          // 分类节点只用于 TreeSelect 的全选交互；权限组持久化时仅保存实际能力。
          body: JSON.stringify({
            ...values,
            permissions: capabilityLeaves(values.permissions),
          }),
        },
      )
      message.success(editingGroup ? '权限组已更新' : '权限组已创建')
      setGroupOpen(false)
      setEditingGroup(undefined)
      groupForm.resetFields()
      await loadOwner()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const openAdminEditor = (admin?: Admin) => {
    setEditingAdmin(admin)
    adminForm.setFieldsValue(
      admin
        ? {
            ...admin,
            password: '',
            permissions: [],
            permissionGroupId: admin.permissionGroupId || undefined,
          }
        : { permissions: [], permissionGroupId: undefined },
    )
    setAdminOpen(true)
  }
  const openGroupEditor = (group?: Group) => {
    setEditingGroup(group)
    groupForm.setFieldsValue(
      group ? { name: group.name, permissions: group.permissions } : { name: '', permissions: [] },
    )
    setGroupOpen(true)
  }
  const removeAdmin = async (admin: Admin) => {
    try {
      await api(`/api/play-admin/admins/${admin.id}`, { method: 'DELETE' })
      message.success('管理账号已删除')
      await loadOwner()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const removeGroup = async (group: Group) => {
    try {
      await api(`/api/play-admin/permission-groups/${group.id}`, { method: 'DELETE' })
      message.success('权限组已删除')
      await loadOwner()
    } catch (error) {
      message.error((error as Error).message)
    }
  }
  const logout = async () => {
    try {
      await api('/api/play-admin/logout', { method: 'POST', body: '{}' })
    } finally {
      setActor(undefined)
    }
  }
  const changeOwnPassword = async () => {
    try {
      const values = await selfPasswordForm.validateFields()
      setSelfPasswordSaving(true)
      await api('/api/play-admin/self-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      })
      selfPasswordForm.resetFields()
      setSelfPasswordOpen(false)
      setActor(undefined)
      message.success('密码已修改，请使用新密码重新登录')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ''
      if (errorMessage) message.error(errorMessage)
    } finally {
      setSelfPasswordSaving(false)
    }
  }
  const columns: ColumnsType<Player> = useMemo(
    () => [
      {
        title: '玩家',
        render: (_, r) => (
          <div className="player-admin-player">
            <Avatar>{(r.displayName || r.username).slice(0, 1)}</Avatar>
            <span>
              <div className="player-admin-player-name">{r.displayName || r.username}</div>
              <div className="player-admin-player-meta">@{r.username}</div>
            </span>
          </div>
        ),
      },
      {
        title: '账号标识',
        render: (_, r) => (
          <>
            <div>#{r.userId}</div>
            <div className="player-admin-muted">
              {r.boxId ? `神岛 ID：${r.boxId}` : '未绑定神岛 ID'}
            </div>
          </>
        ),
      },
      {
        title: '最近在线',
        render: (_, r) => (
          <>
            {dateTime(r.lastSeenAt)}
            <div className="player-admin-muted">
              登录 {r.loginCount || 0} 次 · 会话 {r.activeSessionCount || 0}
            </div>
          </>
        ),
      },
      {
        title: '状态',
        render: (_, r) => (
          <Tag color={r.status === 'banned' ? 'error' : 'success'}>
            {r.status === 'banned' ? '已封禁' : '正常'}
          </Tag>
        ),
      },
      {
        title: '操作',
        width: 100,
        render: (_, r) => (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'ban',
                  label: r.status === 'banned' ? '解除封禁' : '封禁账号',
                  danger: r.status !== 'banned',
                  onClick: () => void (r.status === 'banned' ? toggleBan(r) : openBanDialog(r)),
                },
                ...(can('players.delete')
                  ? [
                      {
                        key: 'delete',
                        label: '删除身份',
                        danger: true,
                        onClick: () =>
                          Modal.confirm({
                            title: `删除身份 · ${r.displayName || r.username}`,
                            content:
                              '将永久删除该玩家的资料、角色、处罚记录和全部会话，且无法恢复。',
                            okText: '永久删除',
                            cancelText: '取消',
                            okButtonProps: { danger: true },
                            onOk: () => deletePlayer(r),
                          }),
                      },
                    ]
                  : []),
              ],
            }}
          >
            <Button type="link" size="small">
              更多
            </Button>
          </Dropdown>
        ),
      },
    ],
    [can, players],
  )
  if (booting)
    return (
      <main className="player-admin-login">
        <Card loading style={{ width: 420 }} />
      </main>
    )
  if (!actor)
    return (
      <Login
        onSuccess={(next) => {
          setActor(next)
        }}
      />
    )
  detailController = {
    selected,
    details,
    detailTab,
    setDetailTab,
    can,
    isOwner,
    command,
    confirmCommand,
    toggleBan,
    deletePlayer,
    updateCreator,
  }
  directoryController = { selectedIds, setSelectedIds, openDetails, batchPlayers }
  creatorPageController = {
    view,
    players,
    total,
    page,
    pageSize,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    loadPlayers,
    openCreatorDialog,
    openCreatorPicker,
    can,
  }
  creatorDialogController = {
    state: creatorDialog,
    close: () => setCreatorDialog(undefined),
    issuedCliToken,
    dismissIssuedCliToken: () => setIssuedCliToken(undefined),
    isOwner,
    can,
    updateCreator: updateCreatorDialog,
    command: creatorCommand,
    confirmCommand: confirmCreatorCommand,
  }
  banDialogController = {
    state: banDialog,
    form: banForm,
    close: () => setBanDialog(undefined),
    submit: submitBanDialog,
  }
  const playerItems = [
    ...(canOpenPlayerAdminView(actor, 'players') ? [{ key: 'players', label: '玩家账号' }] : []),
    ...(canOpenPlayerAdminView(actor, 'online-sessions')
      ? [{ key: 'online-sessions', label: '在线会话' }]
      : []),
  ]
  const securityItems = [
    ...(canOpenPlayerAdminView(actor, 'account-bans')
      ? [{ key: 'account-bans', label: '账号封禁' }]
      : []),
    ...(canOpenPlayerAdminView(actor, 'identity-bans')
      ? [{ key: 'identity-bans', label: 'IP / 设备封禁' }]
      : []),
    ...(canOpenPlayerAdminView(actor, 'security') ? [{ key: 'security', label: '安全记录' }] : []),
  ]
  const items = [
    ...(playerItems.length
      ? [
          {
            key: 'player-center',
            label: '玩家管理',
            children: playerItems,
          },
        ]
      : []),
    ...(securityItems.length
      ? [
          {
            key: 'security-center',
            label: '安全管理',
            children: securityItems,
          },
        ]
      : []),
    ...(canOpenPlayerAdminView(actor, 'creator-access') || canOpenPlayerAdminView(actor, 'creator-tokens')
      ? [
          {
            key: 'creator-center',
            label: '创作管理',
            children: [
              ...(canOpenPlayerAdminView(actor, 'creator-access')
                ? [{ key: 'creator-access', label: '创作权限' }]
                : []),
              ...(canOpenPlayerAdminView(actor, 'creator-tokens')
                ? [{ key: 'creator-tokens', label: 'CLI 令牌' }]
                : []),
            ],
          },
        ]
      : []),
    ...(canOpenPlayerAdminView(actor, 'play-maps')
      ? [
          {
            key: 'play-center',
            label: '游玩管理',
            children: [{ key: 'play-maps', label: '游玩地图' }],
          },
        ]
      : []),
    ...(canOpenPlayerAdminView(actor, 'container-play') || canOpenPlayerAdminView(actor, 'container-creator') || canOpenPlayerAdminView(actor, 'container-profiles') || canOpenPlayerAdminView(actor, 'container-resource-groups')
      ? [
          {
            key: 'container-center',
            label: '容器管理',
            children: [
              ...(canOpenPlayerAdminView(actor, 'container-play') ? [{ key: 'container-play', label: '游玩端' }] : []),
              ...(canOpenPlayerAdminView(actor, 'container-creator') ? [{ key: 'container-creator', label: '创作端' }] : []),
              ...(canOpenPlayerAdminView(actor, 'container-profiles') ? [{ key: 'container-profiles', label: '容器配置' }] : []),
              ...(canOpenPlayerAdminView(actor, 'container-resource-groups') ? [{ key: 'container-resource-groups', label: '资源组' }] : []),
            ],
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            key: 'owner-center',
            label: '服主管理',
            children: [
              { key: 'admins', label: '管理账号' },
              { key: 'permission-groups', label: '权限组' },
            ],
          },
        ]
      : []),
  ]
  const title = (text: string, action?: React.ReactNode) => (
    <Row justify="space-between" align="middle" className="player-admin-page-toolbar">
      <Col>
        <h1 className="player-admin-page-title">{text}</h1>
      </Col>
      <Col>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            刷新
          </Button>
          {action}
        </Space>
      </Col>
    </Row>
  )
  let body: React.ReactNode
  if (view === 'play-maps')
    body = <PlayMapsPage canManage={can('play-maps.manage')} />
  else if (view === 'container-play')
    body = <ContainerManagementPage mode="play" canManage={can('containers.manage')} />
  else if (view === 'container-creator')
    body = <ContainerManagementPage mode="creator" canManage={can('containers.manage')} />
  else if (view === 'container-profiles')
    body = <ContainerProfilesPage canManage={can('containers.manage')} />
  else if (view === 'container-resource-groups')
    body = <ContainerResourceGroupsPage canManage={can('containers.manage')} />
  else if (view === 'overview')
    body = (
      <>
        {title('管理概览')}
        <Row gutter={16}>
          <Col span={6}>
            <Card className="player-admin-stat">
              <Statistic title="账号总数" value={totals.users || 0} />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="player-admin-stat">
              <Statistic title="24 小时活跃" value={totals.activeLast24Hours || 0} />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="player-admin-stat">
              <Statistic title="有效会话" value={totals.activeSessions || 0} />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="player-admin-stat">
              <Statistic title="已封禁账号" value={totals.banned || 0} />
            </Card>
          </Col>
        </Row>
        <Card className="player-admin-panel player-admin-overview-card" title="快捷操作">
          <Space>
            <Button type="primary" onClick={() => navigate('players')}>
              管理玩家账号
            </Button>
            {canOpenPlayerAdminView(actor, 'security') ? (
              <Button onClick={() => navigate('security')}>查看安全记录</Button>
            ) : null}
            {isOwner && <Button onClick={() => navigate('admins')}>管理后台账号</Button>}
          </Space>
        </Card>
      </>
    )
  else if (view === 'players')
    body = (
      <>
        {title(
          '玩家账号',
          <Space>
            {can('players.export') ? (
              <Button
                icon={<DownloadOutlined />}
                loading={exportingPlayers}
                onClick={exportPlayers}
              >
                导出 CSV
              </Button>
            ) : null}
            {can('players.create') ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                新增玩家
              </Button>
            ) : null}
          </Space>,
        )}
        <Card
          className="player-admin-panel"
          title="玩家目录"
          extra={
            <Space>
              <Input
                prefix={<SearchOutlined />}
                allowClear
                placeholder="搜索昵称、用户名或身份 ID"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                style={{ width: 260 }}
              />
              <Select
                value={identity}
                onChange={(v) => {
                  setIdentity(v)
                  setPage(1)
                }}
                style={{ width: 110 }}
                options={[
                  { value: 'all', label: '全部账号' },
                  { value: 'user', label: '普通账号' },
                  { value: 'box', label: '神岛账号' },
                  { value: 'banned', label: '已封禁' },
                ]}
              />
            </Space>
          }
        >
          <Table
            className="player-admin-table"
            columns={columns}
            dataSource={players}
            rowKey="subjectId"
            pagination={false}
          />
          <div className="player-admin-table-pagination">
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              showSizeChanger
              pageSizeOptions={['20', '30', '50', '100']}
              onChange={setPage}
              onShowSizeChange={(_, size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </div>
        </Card>
      </>
    )
  else if (view === 'online-sessions')
    body = (
      <>
        {title('在线会话')}
        <Card
          className="player-admin-panel"
          title={`当前在线玩家（${total}）`}
          extra={
            <Input
              prefix={<SearchOutlined />}
              allowClear
              placeholder="搜索昵称、用户名或身份 ID"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              style={{ width: 260 }}
            />
          }
        >
          <Table
            className="player-admin-table"
            columns={columns}
            dataSource={players}
            rowKey="subjectId"
            pagination={false}
            locale={{ emptyText: <Empty description="当前没有在线玩家" /> }}
          />
          <div className="player-admin-table-pagination">
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              showSizeChanger
              pageSizeOptions={['20', '30', '50', '100']}
              onChange={setPage}
              onShowSizeChange={(_, size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </div>
        </Card>
      </>
    )
  else if (view === 'account-bans')
    body = (
      <>
        {title('账号封禁')}
        <Card
          className="player-admin-panel"
          title={`已封禁账号（${total}）`}
          extra={
            <Input
              prefix={<SearchOutlined />}
              allowClear
              placeholder="搜索昵称、用户名或身份 ID"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              style={{ width: 260 }}
            />
          }
        >
          <Table
            className="player-admin-table"
            columns={columns}
            dataSource={players}
            rowKey="subjectId"
            pagination={false}
          />
          <div className="player-admin-table-pagination">
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              showSizeChanger
              pageSizeOptions={['20', '30', '50', '100']}
              onChange={setPage}
              onShowSizeChange={(_, size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </div>
        </Card>
      </>
    )
  else if (view === 'identity-bans')
    body = (
      <>
        {title('IP / 设备封禁')}
        <Card
          className="player-admin-panel"
          title={`有效来源封禁（${identityBanTotal}）`}
          extra={
            <Space>
              <Input
                prefix={<SearchOutlined />}
                allowClear
                placeholder="搜索 IP、设备标识、原因或玩家"
                value={identityBanSearch}
                onChange={(e) => {
                  setIdentityBanSearch(e.target.value)
                  setIdentityBanPage(1)
                }}
                style={{ width: 280 }}
              />
              <Select
                value={identityBanKind}
                onChange={(value) => {
                  setIdentityBanKind(value)
                  setIdentityBanPage(1)
                }}
                style={{ width: 120 }}
                options={[
                  { value: 'all', label: '全部类型' },
                  { value: 'ip', label: 'IP 封禁' },
                  { value: 'device', label: '设备封禁' },
                ]}
              />
            </Space>
          }
        >
          <Table
            loading={identityBanLoading}
            dataSource={identityBans}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: '类型',
                dataIndex: 'kind',
                render: (v) => (
                  <Tag color={v === 'ip' ? 'gold' : 'purple'}>
                    {v === 'ip' ? 'IP 封禁' : '设备封禁'}
                  </Tag>
                ),
              },
              { title: '对象', dataIndex: 'displayValue' },
              { title: '原因', dataIndex: 'reason', render: (v) => v || '—' },
              {
                title: '来源玩家',
                render: (_, r: IdentityBan) => (
                  <>
                    {r.sourceDisplayName}
                    <div className="player-admin-muted">
                      {r.sourceUsername ? `@${r.sourceUsername}` : '—'}
                    </div>
                  </>
                ),
              },
              { title: '封禁时间', dataIndex: 'bannedAt', render: dateTime },
              {
                title: '到期',
                dataIndex: 'bannedUntil',
                render: (v) => (v ? dateTime(v) : '永久'),
              },
              {
                title: '操作',
                render: (_, r: IdentityBan) => (
                  can('identity-bans.manage') ? (
                    <Button
                      danger
                      type="link"
                      onClick={() =>
                        Modal.confirm({
                          title: `确定解除这项${r.kind === 'ip' ? ' IP' : '设备'}封禁？`,
                          okText: '解除封禁',
                          okButtonProps: { danger: true },
                          onOk: () => revokeIdentityBan(r),
                        })
                      }
                    >
                      解除
                    </Button>
                  ) : (
                    '只读'
                  )
                ),
              },
            ]}
          />
          <div className="player-admin-table-pagination">
            <Pagination
              current={identityBanPage}
              total={identityBanTotal}
              pageSize={identityBanPageSize}
              showSizeChanger
              pageSizeOptions={['20', '30', '50', '100']}
              onChange={setIdentityBanPage}
              onShowSizeChange={(_, size) => {
                setIdentityBanPageSize(size)
                setIdentityBanPage(1)
              }}
            />
          </div>
        </Card>
      </>
    )
  else if (view === 'security')
    body = (
      <>
        {title('安全记录')}
        <Card className="player-admin-panel" title={`操作与登录记录（${activityTotal}）`}>
          <div className="player-admin-filterbar">
            <Input
              prefix={<SearchOutlined />}
              allowClear
              placeholder="搜索操作、账号、玩家、IP 或身份 ID"
              value={activitySearch}
              onChange={(event) => {
                setActivitySearch(event.target.value)
                setActivityPage(1)
              }}
            />
            <Select
              value={activityKind}
              style={{ width: 140 }}
              onChange={(value) => {
                setActivityKind(value)
                setActivityPage(1)
              }}
              options={[
                { value: 'all', label: '全部记录' },
                { value: 'admin', label: '管理操作' },
                { value: 'login', label: '登录记录' },
              ]}
            />
          </div>
          <Table
            loading={activityLoading}
            dataSource={activity}
            rowKey="id"
            pagination={false}
            columns={[
              { title: '时间', dataIndex: 'createdAt', render: dateTime },
              {
                title: '类型',
                dataIndex: 'kind',
                render: (v) => (
                  <Tag color={v === 'admin' ? 'blue' : 'default'}>
                    {v === 'admin' ? '管理操作' : '登录'}
                  </Tag>
                ),
              },
              { title: '操作', dataIndex: 'action' },
              { title: '操作人', render: (_, r: Activity) => r.actorDisplayName || r.actor },
              {
                title: '对象',
                render: (_, r: Activity) => {
                  const name = r.displayName || r.username || '—'
                  return r.subjectId ? (
                    <>
                      <div>{name}</div>
                      <div className="player-admin-muted">{r.subjectId}</div>
                    </>
                  ) : name
                },
              },
              { title: 'IP 地址', dataIndex: 'ip', render: (v) => v || '—' },
              {
                title: '详情',
                render: (_, r: Activity) =>
                  r.details && Object.keys(r.details).length ? (
                    <Tooltip
                      title={
                        <pre className="player-admin-audit-details">
                          {JSON.stringify(r.details, null, 2)}
                        </pre>
                      }
                    >
                      <Button type="link">查看</Button>
                    </Tooltip>
                  ) : (
                    '—'
                  ),
              },
            ]}
          />
          <div className="player-admin-table-pagination">
            <Pagination
              current={activityPage}
              total={activityTotal}
              pageSize={activityPageSize}
              showSizeChanger
              pageSizeOptions={['20', '30', '50', '100']}
              onChange={setActivityPage}
              onShowSizeChange={(_, size) => {
                setActivityPageSize(size)
                setActivityPage(1)
              }}
            />
          </div>
        </Card>
      </>
    )
  else if (view === 'admins')
    body = (
      <>
        {title(
          '管理账号',
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdminEditor()}>
            新增管理账号
          </Button>,
        )}
        <Card className="player-admin-panel">
          <Table
            loading={ownerLoading}
            dataSource={admins}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ['20', '30', '50', '100'],
              showTotal: (count) => `共 ${count} 个管理账号`,
            }}
            columns={[
              {
                title: '账号',
                render: (_, r: Admin) => (
                  <>
                    <div className="player-admin-player-name">{r.displayName}</div>
                    <div className="player-admin-muted">@{r.username}</div>
                  </>
                ),
              },
              {
                title: '权限组',
                dataIndex: 'permissionGroupName',
                render: (v) => v || '未分配权限组',
              },
              {
                title: '状态',
                dataIndex: 'status',
                render: (v) => (
                  <Tag color={v === 'active' ? 'success' : 'default'}>
                    {v === 'active' ? '启用' : '停用'}
                  </Tag>
                ),
              },
              { title: '最近登录', dataIndex: 'lastLoginAt', render: dateTime },
              {
                title: '操作',
                render: (_, r: Admin) => (
                  <Space>
                    <Button type="link" onClick={() => openAdminEditor(r)}>
                      编辑
                    </Button>
                    <Button
                      type="link"
                      onClick={() =>
                        Modal.confirm({
                          title:
                            r.status === 'active'
                              ? `停用 ${r.displayName}？`
                              : `启用 ${r.displayName}？`,
                          content:
                            r.status === 'active'
                              ? '停用后该账号的全部后台会话会立即失效。'
                              : undefined,
                          okText: r.status === 'active' ? '停用' : '启用',
                          okButtonProps: r.status === 'active' ? { danger: true } : undefined,
                          onOk: async () => {
                            await api(`/api/play-admin/admins/${r.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({
                                displayName: r.displayName,
                                status: r.status === 'active' ? 'disabled' : 'active',
                              }),
                            })
                            await loadOwner()
                          },
                        })
                      }
                    >
                      {r.status === 'active' ? '停用' : '启用'}
                    </Button>
                    <Button
                      danger
                      type="link"
                      onClick={() =>
                        Modal.confirm({
                          title: `删除 ${r.displayName}？`,
                          content: '删除后无法恢复。',
                          okText: '删除',
                          okButtonProps: { danger: true },
                          onOk: () => removeAdmin(r),
                        })
                      }
                    >
                      删除
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </>
    )
  else
    body = (
      <>
        {title(
          '权限组',
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openGroupEditor()}>
            新增权限组
          </Button>,
        )}
        <Card className="player-admin-panel">
          <Table
            loading={ownerLoading}
            dataSource={groups}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ['20', '30', '50', '100'],
              showTotal: (count) => `共 ${count} 个权限组`,
            }}
            columns={[
              { title: '名称', dataIndex: 'name' },
              {
                title: '包含权限',
                dataIndex: 'permissions',
                render: (v: string[]) => (
                  <Space size={[0, 4]} wrap>
                    {v.map((x) => (
                      <Tag key={x}>
                        {PLAYER_ADMIN_CAPABILITY_META[
                          x as keyof typeof PLAYER_ADMIN_CAPABILITY_META
                        ]?.label || x}
                      </Tag>
                    ))}
                  </Space>
                ),
              },
              { title: '已分配账号', dataIndex: 'adminCount', render: (v) => `${v || 0} 个` },
              { title: '创建时间', dataIndex: 'createdAt', render: dateTime },
              {
                title: '操作',
                render: (_, r: Group) => (
                  <Space>
                    <Button type="link" onClick={() => openGroupEditor(r)}>
                      编辑
                    </Button>
                    {r.adminCount ? (
                      <Tooltip title={`已有 ${r.adminCount} 个管理账号使用，无法删除`}>
                        <Button danger type="link" disabled>
                          删除
                        </Button>
                      </Tooltip>
                    ) : (
                      <Button
                        danger
                        type="link"
                        onClick={() =>
                          Modal.confirm({
                            title: `删除权限组“${r.name}”？`,
                            content: '删除后无法恢复。',
                            okText: '删除',
                            okButtonProps: { danger: true },
                            onOk: () => removeGroup(r),
                          })
                        }
                      >
                        删除
                      </Button>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </>
    )
  return (
    <Layout className="player-admin-shell">
      <Layout.Sider width={224} className="player-admin-sider">
        <div className="player-admin-brand">
          <span className="player-admin-brand-mark">B</span>BOX3 后台管理
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[view]}
          onClick={({ key }) => navigate(key as View)}
          items={items}
        />
      </Layout.Sider>
      <Layout>
        <header className="player-admin-header">
          <Space>
            <span className="player-admin-actor-name">{actor.username || actor.displayName}</span>
            {actor.credential === 'account' ? (
              <Tooltip title="修改密码">
                <Button
                  type="text"
                  icon={<KeyOutlined />}
                  onClick={() => {
                    selfPasswordForm.resetFields()
                    setSelfPasswordOpen(true)
                  }}
                />
              </Tooltip>
            ) : null}
            <Tooltip title="退出登录">
              <Button type="text" icon={<LogoutOutlined />} onClick={() => void logout()} />
            </Tooltip>
          </Space>
        </header>
        <Layout.Content className="player-admin-content">{body}</Layout.Content>
      </Layout>
      <Modal
        title="修改密码"
        open={selfPasswordOpen}
        confirmLoading={selfPasswordSaving}
        okText="确认修改"
        cancelText="取消"
        onCancel={() => {
          setSelfPasswordOpen(false)
          selfPasswordForm.resetFields()
        }}
        onOk={() => void changeOwnPassword()}
      >
        <Form form={selfPasswordForm} layout="vertical">
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 12, message: '密码至少 12 位' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue('newPassword') === value
                    ? Promise.resolve()
                    : Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        width={620}
        title={selected ? `管理 · ${selected.displayName || selected.username}` : '玩家详情'}
        open={Boolean(selected)}
        onClose={() => {
          setSelected(undefined)
          setDetails(undefined)
        }}
      >
        {details && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="身份 ID" span={2}>
                {details.player.subjectId}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dateTime(details.player.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="最近在线">
                {dateTime(details.player.lastSeenAt)}
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="基础资料">
              <Form form={editForm} layout="vertical">
                <Form.Item label="显示昵称" name="displayName" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item
                  label="用户 Key"
                  name="userKey"
                  rules={[{ max: 128, message: '用户 Key 不能超过 128 个字符' }]}
                >
                  <Input placeholder="留空表示不设置" />
                </Form.Item>
                <Form.Item label="神岛 ID" name="boxId">
                  <Input />
                </Form.Item>
                <Form.Item label="标签" name="tags">
                  <Input />
                </Form.Item>
                <Form.Item label="服主备注" name="adminNote">
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Button type="primary" onClick={() => void savePlayer()}>
                  保存资料
                </Button>
              </Form>
            </Card>
          </>
        )}
      </Drawer>
      <Modal
        title="新增玩家"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void createPlayer()}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="displayName" label="显示昵称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 10 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="新增创作权限"
        open={creatorPickerOpen}
        okText="下一步"
        cancelText="取消"
        onCancel={() => setCreatorPickerOpen(false)}
        onOk={() => void selectCreatorCandidate()}
      >
        <Form form={creatorPickerForm} layout="vertical">
          <Form.Item name="subjectId" label="玩家" rules={[{ required: true, message: '请选择玩家' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="搜索并选择玩家"
              options={creatorCandidates.map((player) => ({
                value: player.subjectId,
                label: `${player.displayName || player.username} (@${player.username})`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={editingAdmin ? '编辑管理账号' : '新增管理账号'}
        open={adminOpen}
        onCancel={() => {
          setAdminOpen(false)
          setEditingAdmin(undefined)
          adminForm.resetFields()
        }}
        onOk={() => void createAdmin()}
      >
        <Form form={adminForm} layout="vertical" initialValues={{ permissions: [] }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input disabled={Boolean(editingAdmin)} />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingAdmin ? '新密码（留空不修改）' : '初始密码'}
            rules={[{ required: !editingAdmin, min: 12, message: '密码至少 12 位' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="permissionGroupId"
            label="权限组"
            rules={[{ required: true, message: '请选择权限组' }]}
          >
            <Select
              placeholder="选择权限组"
              options={groups.map((group) => ({
                value: group.id,
                label: `${group.name} · ${group.permissions.length} 项权限`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={editingGroup ? '编辑权限组' : '新增权限组'}
        open={groupOpen}
        onCancel={() => {
          setGroupOpen(false)
          setEditingGroup(undefined)
          groupForm.resetFields()
        }}
        onOk={() => void createGroup()}
      >
        <Form form={groupForm} layout="vertical">
          {editingGroup ? (
            <div className="player-admin-muted" style={{ marginBottom: 16 }}>
              保存后将影响 {editingGroup.adminCount} 个管理账号的实际权限。
            </div>
          ) : null}
          <Form.Item name="name" label="权限组名称" rules={[{ required: true }]}>
            <Input maxLength={32} />
          </Form.Item>
          <Form.Item name="permissions" label="权限" rules={[{ required: true }]}>
            <TreeSelect
              treeData={permissionTree}
              treeCheckable
              treeDefaultExpandedKeys={['category:players', 'category:players:player-accounts']}
              showCheckedStrategy={TreeSelect.SHOW_CHILD}
              onChange={(values, _labels, extra) => {
                const requested = capabilityLeaves(Array.isArray(values) ? values : [])
                const expanded = expandPermissionSelection(requested)
                const previous = capabilityLeaves(groupForm.getFieldValue('permissions') || [])
                const retained = previous.filter(
                  (capability) => !requested.includes(capability) && expanded.includes(capability),
                )
                const attemptedView = typeof extra?.triggerValue === 'string'
                  && extra.checked === false
                  && isViewRequiredBySelection(extra.triggerValue, previous)
                if (retained.length || attemptedView) {
                  notification.warning({
                    message: '无法取消查看权限',
                    description: '编辑权限需要对应的查看权限。请先取消相关编辑权限。',
                    placement: 'topRight',
                  })
                }
                groupForm.setFieldValue('permissions', expanded)
              }}
              placeholder="选择此权限组包含的能力"
              className="player-admin-permission-select"
            />
          </Form.Item>
        </Form>
      </Modal>
      <CreatorDialog />
      <BanDialog />
    </Layout>
  )
}
