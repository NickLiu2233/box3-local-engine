import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Collapse,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  message,
} from 'antd'
import { playerAdminApi as api } from '../../player-admin-api'

type Catalog = Awaited<ReturnType<typeof api.getApiPlayAdminScriptModeration>>
type KeyValues = {
  mapId: string
  name?: string
  permissions: Array<'players.view' | 'players.ban' | 'identity-bans.manage'>
  scope: 'map' | 'server'
  minutes: number
  days: number
}
const permissionOptions = [
  { label: '查询玩家状态', value: 'players.view' },
  { label: '封禁玩家账号', value: 'players.ban' },
  { label: '封禁当前 IP', value: 'identity-bans.manage' },
]
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })

/** Owner-only workflow: choose a map and permissions; versions are read from trusted public runtimes. */
export function ScriptModerationPage() {
  const [catalog, setCatalog] = useState<Catalog>({ keys: [], bindings: [], bans: [], maps: [] })
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<KeyValues>()
  const load = async () => setCatalog(await api.getApiPlayAdminScriptModeration())
  const run = async (operation?: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await operation?.()
      await load()
    } catch (error) {
      if (error instanceof Error) message.error(error.message)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    void run()
  }, [])
  const create = async () => {
    const values = await form.validateFields()
    const map = catalog.maps.find((m) => m.mapId === values.mapId)
    if (!map) {
      message.warning('请刷新地图列表')
      return
    }
    const save = () =>
      run(async () => {
        await api.postApiPlayAdminScriptModeration({
          body: {
            action: 'create',
            values: {
              mapId: map.mapId,
              expectedFingerprint: map.scriptFingerprint,
              name: values.name?.trim() || undefined,
              permissions: values.permissions,
              scope: values.scope || 'map',
              maximumBanSeconds: (values.minutes ?? 60) * 60,
              expiresAt: new Date(Date.now() + (values.days ?? 7) * 86400000).toISOString(),
            },
          },
        })
        setOpen(false)
        form.resetFields()
      })
    if(values.scope !== 'server'){await save();return}
    Modal.confirm({
      title: `授权「${map.name}」当前${map.mode === 'play' ? '游玩' : '创作'}版本？`,
      content:
        values.scope === 'server'
          ? '此 Key 可以处罚全服玩家，请确认已审核该版本脚本。'
          : '允许该版本脚本使用所选权限；脚本更新后需重新确认。',
      okText: '创建 Key',
      onOk: save,
    })
  }
  const update = (key: Catalog['keys'][number]) => {
    const binding = catalog.bindings.find((b) => b.keyId === key.id)
    const map = catalog.maps.find((m) => m.mapId === binding?.mapId)
    if (!map) {
      message.info('请先启动地图，再刷新读取版本')
      return
    }
    Modal.confirm({
      title: `更新「${map.name}」授权？`,
      content:
        (key.scope === 'server' ? '此 Key 可影响全服玩家，请先审核新脚本。' : '') +
        '读取最新版本并续期 7 天，已有 Key 权限与处罚范围保持不变。',
      okText: '更新授权',
      onOk: () =>
        run(() =>
          api.postApiPlayAdminScriptModeration({
            body: {
              action: 'update',
              values: { keyId: key.id, mapId: map.mapId, expectedFingerprint: map.scriptFingerprint },
            },
          }),
        ),
    })
  }
  return (
    <>
      <div className="player-admin-page-toolbar">
        <Space>
          <h1 className="player-admin-page-title">地图管理 Key</h1>
          <Button loading={busy} onClick={() => void run()}>
            刷新
          </Button>
          <Button type="primary" onClick={() => setOpen(true)}>
            创建 Key
          </Button>
        </Space>
      </div>
      <p>Key 独立于管理员账号，脚本不需要填写密钥。后台自动读取地图版本，更新脚本后点击“更新授权”即可。</p>
      <Card className="player-admin-panel">
        <Tabs defaultActiveKey="keys">
          <Tabs.TabPane key="keys" tab="Key 与授权">
            <Table
              rowKey="id"
              loading={busy}
              dataSource={catalog.keys}
              pagination={{ pageSize: 10 }}
              columns={[
                { title: 'Key 名称', dataIndex: 'name' },
                {
                  title: '地图',
                  render: (_, key) => {
                    const binding = catalog.bindings.find((b) => b.keyId === key.id)
                    const map = catalog.maps.find((m) => m.mapId === binding?.mapId)
                    return map?.name || binding?.mapId || '未绑定'
                  },
                },
                {
                  title: '权限',
                  render: (_, key) => (
                    <Space wrap>
                      {key.adminId ? (
                        <Tag>旧版账号授权</Tag>
                      ) : (
                        (key.permissions || []).map((p) => (
                          <Tag key={p}>{permissionOptions.find((o) => o.value === p)?.label || p}</Tag>
                        ))
                      )}
                    </Space>
                  ),
                },
                {
                  title: '范围',
                  render: (_, key) => (
                    <Tag color={key.scope === 'server' ? 'orange' : undefined}>
                      {key.scope === 'server' ? '全服' : '本图'}
                    </Tag>
                  ),
                },
                {
                  title: '版本状态',
                  render: (_, key) => {
                    if (key.revokedAt) return '已撤销'
                    if (new Date(key.expiresAt).getTime() <= Date.now()) return '已过期'
                    const binding = catalog.bindings.find((b) => b.keyId === key.id)
                    const map = catalog.maps.find((m) => m.mapId === binding?.mapId)
                    return !binding
                      ? '未绑定'
                      : !map
                        ? '暂未读取'
                        : map.scriptFingerprint === binding.scriptFingerprint
                          ? '已授权当前版本'
                          : '脚本已更新'
                  },
                },
                { title: '有效期至', render: (_, key) => date(key.expiresAt) },
                {
                  title: '操作',
                  render: (_, key) =>
                    !key.revokedAt && (
                      <Space>
                        {!key.adminId && (
                          <Button type="link" disabled={busy} onClick={() => update(key)}>
                            更新授权 / 续期
                          </Button>
                        )}
                        <Button
                          type="link"
                          danger
                          disabled={busy}
                          onClick={() =>
                            Modal.confirm({
                              title: `撤销「${key.name}」？`,
                              content: '停止后续调用，不会自动解除已有处罚。',
                              onOk: () =>
                                run(() =>
                                  api.postApiPlayAdminScriptModeration({ body: { action: 'revoke', keyId: key.id } }),
                                ),
                            })
                          }
                        >
                          撤销
                        </Button>
                      </Space>
                    ),
                },
              ]}
            />
          </Tabs.TabPane>
          <Tabs.TabPane key="bans" tab="地图封禁">
            <p>全服账号与 IP 封禁仍在原有封禁管理页面维护。</p>
            <Table
              rowKey="id"
              loading={busy}
              dataSource={catalog.bans}
              pagination={{ pageSize: 10 }}
              columns={[
                {
                  title: '地图',
                  render: (_, row) => catalog.maps.find((m) => m.mapId === row.mapId)?.name || row.mapId,
                },
                { title: '玩家身份', dataIndex: 'subjectId', ellipsis: true },
                { title: '类型', render: (_, row) => (row.kind === 'ip' ? 'IP' : '账号') },
                { title: '原因', dataIndex: 'reason' },
                { title: '截止时间', render: (_, row) => date(row.expiresAt) },
                {
                  title: '操作',
                  render: (_, row) => (
                    <Button
                      type="link"
                      danger
                      disabled={busy}
                      onClick={() =>
                        Modal.confirm({
                          title: '解除此地图封禁？',
                          onOk: () =>
                            run(() =>
                              api.postApiPlayAdminScriptModeration({
                                body: { action: 'revoke-map-ban', banId: row.id },
                              }),
                            ),
                        })
                      }
                    >
                      解除
                    </Button>
                  ),
                },
              ]}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>
      <Modal
        title="创建地图管理 Key"
        visible={open}
        onCancel={() => setOpen(false)}
        onOk={() => void create().catch(() => {})}
        confirmLoading={busy}
        okText="创建 Key"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ permissions: ['players.view', 'players.ban'], scope: 'map', minutes: 60, days: 7 }}
        >
          <Form.Item name="mapId" label="地图" rules={[{ required: true, message: '请选择地图' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={catalog.maps.map((m) => ({
                value: m.mapId,
                label: `${m.name} · ${m.mode === 'play' ? '游玩版本' : '创作版本'}`,
              }))}
            />
          </Form.Item>
          {!catalog.maps.length && <p>暂未读取到地图版本。请先启动地图，再点击刷新。</p>}
          <Form.Item
            name="permissions"
            label="允许的操作"
            rules={[{ required: true, type: 'array', min: 1, message: '至少选择一项权限' }]}
          >
            <Checkbox.Group options={permissionOptions} />
          </Form.Item>
          <Collapse ghost>
            <Collapse.Panel key="advanced" header="高级设置" forceRender>
              <Form.Item name="name" label="Key 名称（默认使用地图名称）">
                <Input maxLength={64} />
              </Form.Item>
              <Form.Item name="scope" label="处罚范围">
                <Select
                  options={[
                    { value: 'map', label: '仅本地图' },
                    { value: 'server', label: '允许全服处罚' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="minutes" label="单次封禁上限（分钟）">
                <InputNumber min={1} max={10080} precision={0} />
              </Form.Item>
              <Form.Item name="days" label="Key 有效期（天）">
                <InputNumber min={1} max={30} precision={0} />
              </Form.Item>
            </Collapse.Panel>
          </Collapse>
        </Form>
      </Modal>
    </>
  )
}
