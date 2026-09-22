import { ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Table, Tag, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { playerAdminApi as api, playerAdminRoutes as routes } from '../player-admin-api'
import type { ContainerResourceGroup } from '../player-admin-types'

type Props = { canManage: boolean }

const newResourceGroup = (): ContainerResourceGroup => ({
  name: '',
  cpuMilli: 1000,
  memoryMb: 1024,
  description: '',
  networkPolicy: 'unrestricted',
  processLimit: 512,
  bandwidthMbps: null,
})

/** A complete resource-group workflow behind one small screen interface. */
export function ContainerResourceGroupsPage({ canManage }: Props) {
  const [groups, setGroups] = useState<ContainerResourceGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<ContainerResourceGroup>()
  const [form] = Form.useForm<ContainerResourceGroup>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api<{ resourceGroups: ContainerResourceGroup[] }>(
        routes.containerResourceGroups,
      )
      setGroups(result.resourceGroups || [])
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => void load(), [load])

  const openEditor = (group?: ContainerResourceGroup) => {
    const next = group || newResourceGroup()
    setEditing(next)
    form.setFieldsValue(next)
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      await api(
        editing?.id
          ? routes.containerResourceGroup(editing.id)
          : routes.containerResourceGroups,
        { method: editing?.id ? 'PATCH' : 'POST', body: JSON.stringify(values) },
      )
      setEditing(undefined)
      message.success('资源组已保存')
      await load()
    } catch (error) {
      if (error instanceof Error) message.error(error.message)
    }
  }

  const remove = (group: ContainerResourceGroup) =>
    Modal.confirm({
      title: `删除资源组“${group.name}”？`,
      content: '资源组未被地图容器配置使用时才可删除。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await api(routes.containerResourceGroup(group.id || ''), { method: 'DELETE' })
        message.success('资源组已删除')
        await load()
      },
    })

  return (
    <>
      <Row justify="space-between" align="middle" className="player-admin-page-toolbar">
        <Col><h1 className="player-admin-page-title">资源组</h1></Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>
            {canManage ? <Button type="primary" onClick={() => openEditor()}>新建资源组</Button> : null}
          </Space>
        </Col>
      </Row>
      <Card className="player-admin-panel">
        <Table
          loading={loading}
          rowKey="id"
          pagination={false}
          dataSource={groups}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: 'CPU 上限', dataIndex: 'cpuMilli', render: (value) => `${value} m` },
            { title: '内存上限', dataIndex: 'memoryMb', render: (value) => `${value} MB` },
            { title: '网络', dataIndex: 'networkPolicy', render: (value) => value === 'private' ? <Tag color="gold">仅内网</Tag> : <Tag>不限制</Tag> },
            { title: '进程上限', dataIndex: 'processLimit', render: (value) => `${value ?? 512}` },
            { title: '出网带宽', dataIndex: 'bandwidthMbps', render: (value) => value ? `${value} Mbps` : '不限制' },
            { title: '说明', dataIndex: 'description', ellipsis: true, render: (value) => value || '—' },
            {
              title: '操作',
              render: (_, group: ContainerResourceGroup) => canManage ? (
                <Space>
                  <Button type="link" onClick={() => openEditor(group)}>编辑</Button>
                  <Button type="link" danger onClick={() => remove(group)}>删除</Button>
                </Space>
              ) : '—',
            },
          ]}
        />
      </Card>
      <Modal title={editing?.id ? '编辑资源组' : '新建资源组'} open={Boolean(editing)} onCancel={() => setEditing(undefined)} onOk={() => void save()} okText="保存">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="资源组名称" rules={[{ required: true, message: '请输入资源组名称' }, { max: 64 }]}><Input placeholder="例如：小型地图" /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="cpuMilli" label="CPU 上限（m）" rules={[{ required: true }]}><Input type="number" min={1} /></Form.Item></Col>
            <Col span={12}><Form.Item name="memoryMb" label="内存上限（MB）" rules={[{ required: true }]}><Input type="number" min={64} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="networkPolicy" label="网络策略" rules={[{ required: true }]}><Select options={[{ value: 'unrestricted', label: '不限制' }, { value: 'private', label: '仅内网（禁止访问公网）' }]} /></Form.Item></Col>
            <Col span={12}><Form.Item name="processLimit" label="容器进程上限" rules={[{ required: true }]}><Input type="number" min={16} max={4096} /></Form.Item></Col>
          </Row>
          <Form.Item name="bandwidthMbps" label="出网带宽上限（Mbps）" extra="留空表示不限制；仅对独立 Docker 容器生效。"><Input type="number" min={1} max={100000} placeholder="不限制" /></Form.Item>
          <Form.Item name="description" label="资源说明" rules={[{ max: 500 }]}><Input.TextArea rows={3} placeholder="例如：适合小型地图、测试地图" maxLength={500} showCount /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}
