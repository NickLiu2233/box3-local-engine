import { useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag, message } from 'antd'
import { playerAdminApi as api } from '../../player-admin-api'
import type { Admin } from '../../player-admin-types'

type Catalog = Awaited<ReturnType<typeof api.getApiPlayAdminScriptModeration>>
type KeyValues = { adminId: string; name: string; scope: 'map' | 'server'; maximumBanSeconds: number; days: number }
type BindingValues = { mapId: string; keyId: string; scriptFingerprint: string }

/** Owner-only screen: neither the key selector nor the binding is exported with maps. */
export function ScriptModerationDialog({ admins }: { admins: Admin[] }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [catalog, setCatalog] = useState<Catalog>({ keys: [], bindings: [], bans: [] })
  const [keyForm] = Form.useForm<KeyValues>()
  const [bindingForm] = Form.useForm<BindingValues>()
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
  const create = async () => {
    const values = await keyForm.validateFields()
    const save = () =>
      run(async () => {
        const { days, ...rest } = values
        await api.postApiPlayAdminScriptModeration({
          body: {
            action: 'create',
            values: { ...rest, expiresAt: new Date(Date.now() + days * 86400000).toISOString() },
          },
        })
        keyForm.resetFields()
      })
    if (values.scope === 'server')
      Modal.confirm({
        title: '允许脚本进行全服处罚？',
        content: '该授权可影响其他地图中的玩家。建议为自动化建立独立权限组。',
        okText: '确认授权',
        onOk: save,
      })
    else await save()
  }
  const bind = () =>
    run(async () => {
      const values = await bindingForm.validateFields()
      await api.postApiPlayAdminScriptModeration({ body: { action: 'bind', values } })
      bindingForm.resetFields()
    })
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true)
          void run()
        }}
      >
        地图脚本授权
      </Button>
      <Modal
        title="地图脚本授权"
        visible={open}
        width={850}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
      >
        <p>授权继承管理账号的权限组。脚本不需要密钥；停用账号、撤销授权或修改脚本后，调用会被拒绝。</p>
        <Tabs defaultActiveKey="keys">
          <Tabs.TabPane key="keys" tab="授权 Key">
            <Form form={keyForm} layout="vertical" initialValues={{ scope: 'map', maximumBanSeconds: 3600, days: 7 }}>
              <Form.Item name="adminId" label="管理账号" rules={[{ required: true }]}>
                <Select
                  options={admins
                    .filter((a) => a.status === 'active' && a.permissionGroupId)
                    .map((a) => ({ value: a.id, label: `${a.displayName} · ${a.permissionGroupName}` }))}
                />
              </Form.Item>
              <Form.Item name="name" label="授权名称" rules={[{ required: true }]}>
                <Input maxLength={64} />
              </Form.Item>
              <Space align="start">
                <Form.Item name="scope" label="处罚范围">
                  <Select
                    style={{ width: 160 }}
                    options={[
                      { value: 'map', label: '仅绑定地图' },
                      { value: 'server', label: '允许全服处罚' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="maximumBanSeconds" label="最长封禁时间（秒）" rules={[{ required: true }]}>
                <InputNumber min={60} max={604800} precision={0} />
                </Form.Item>
                <Form.Item name="days" label="授权有效期（天）" rules={[{ required: true }]}>
                  <InputNumber min={1} max={30} precision={0} />
                </Form.Item>
              </Space>
              <Button
                type="primary"
                loading={busy}
                onClick={() =>
                  void create().catch((error) => {
                    if (error instanceof Error) message.error(error.message)
                  })
                }
              >
                创建授权
              </Button>
            </Form>
            <Table
              rowKey="id"
              size="small"
              dataSource={catalog.keys}
              style={{ marginTop: 24 }}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: '授权', dataIndex: 'name' },
                { title: '账号', dataIndex: 'adminName' },
                { title: '范围', render: (_, row) => <Tag>{row.scope === 'server' ? '全服' : '本图'}</Tag> },
                {
                  title: '有效期',
                  render: (_, row) => (row.revokedAt ? '已撤销' : new Date(row.expiresAt).toLocaleString()),
                },
                {
                  title: '操作',
                  render: (_, row) =>
                    !row.revokedAt && (
                      <Button
                        danger
                        type="link"
                        disabled={busy}
                        onClick={() =>
                          Modal.confirm({
                            title: `撤销 ${row.name}？`,
                            onOk: () =>
                              run(() =>
                                api.postApiPlayAdminScriptModeration({ body: { action: 'revoke', keyId: row.id } }),
                              ),
                          })
                        }
                      >
                        撤销
                      </Button>
                    ),
                },
              ]}
            />
          </Tabs.TabPane>
          <Tabs.TabPane key="bindings" tab="绑定地图">
            <p>
              在地图服务端控制台读取 world.moderation.mapId 和
              world.moderation.scriptFingerprint，填入下方。修改服务端脚本后需重新绑定。
            </p>
            <Form form={bindingForm} layout="vertical">
              <Form.Item
                name="mapId"
                label="永久地图 ID"
                rules={[{ required: true }, { pattern: /^[a-z0-9][a-z0-9-]{0,62}$/, message: '地图 ID 无效' }]}
              >
                <Input maxLength={63} />
              </Form.Item>
              <Form.Item
                name="scriptFingerprint"
                label="服务端脚本指纹"
                rules={[{ required: true }, { pattern: /^[a-f0-9]{64}$/, message: '须填写完整的脚本指纹' }]}
              >
                <Input maxLength={64} />
              </Form.Item>
              <Form.Item name="keyId" label="授权 Key" rules={[{ required: true }]}>
                <Select
                  options={catalog.keys
                    .filter((k) => !k.revokedAt && new Date(k.expiresAt).getTime() > Date.now())
                    .map((k) => ({ value: k.id, label: `${k.name} · ${k.adminName}` }))}
                />
              </Form.Item>
              <Button type="primary" loading={busy} onClick={() => void bind()}>
                保存绑定
              </Button>
            </Form>
            <Table
              rowKey="mapId"
              size="small"
              dataSource={catalog.bindings}
              style={{ marginTop: 24 }}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: '地图', dataIndex: 'mapId' },
                { title: '授权', render: (_, row) => catalog.keys.find((k) => k.id === row.keyId)?.name || row.keyId },
                {
                  title: '操作',
                  render: (_, row) => (
                    <Button
                      danger
                      type="link"
                      disabled={busy}
                      onClick={() =>
                        Modal.confirm({
                          title: '解除此地图的授权？',
                          onOk: () =>
                            run(() =>
                              api.postApiPlayAdminScriptModeration({ body: { action: 'unbind', mapId: row.mapId } }),
                            ),
                        })
                      }
                    >
                      解除绑定
                    </Button>
                  ),
                },
              ]}
            />
          </Tabs.TabPane>
          <Tabs.TabPane key="bans" tab="地图封禁">
            <p>这里仅显示地图内的处罚。全服账号与 IP 封禁仍在原有封禁管理中维护。</p>
            <Table
              rowKey="id"
              size="small"
              dataSource={catalog.bans}
              pagination={{ pageSize: 10 }}
              columns={[
                { title: '地图', dataIndex: 'mapId' },
                { title: '玩家身份', dataIndex: 'subjectId', ellipsis: true },
                { title: '类型', render: (_, row) => (row.kind === 'ip' ? 'IP' : '账号') },
                { title: '原因', dataIndex: 'reason' },
                { title: '截止时间', render: (_, row) => new Date(row.expiresAt).toLocaleString() },
                {
                  title: '操作',
                  render: (_, row) => (
                    <Button
                      danger
                      type="link"
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
      </Modal>
    </>
  )
}
