import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, Modal, Row, Space, Table, Tag } from 'antd'

import { playerAdminApi as api } from '../../player-admin-api'
import { dateTime } from '../../player-admin-format'
import type { Admin } from '../../player-admin-types'

type Props = {
  admins: Admin[]
  loading: boolean
  refresh: () => Promise<void>
  edit: (admin?: Admin) => void
  remove: (admin: Admin) => Promise<void>
}

export function AdminAccountsPage({ admins, loading, refresh, edit, remove }: Props) {
  const toggle = (admin: Admin) =>
    Modal.confirm({
      title:
        admin.status === 'active' ? `停用 ${admin.displayName}？` : `启用 ${admin.displayName}？`,
      content: admin.status === 'active' ? '停用后该账号的全部后台会话会立即失效。' : undefined,
      okText: admin.status === 'active' ? '停用' : '启用',
      okButtonProps: admin.status === 'active' ? { danger: true } : undefined,
      onOk: async () => {
        await api.patchApiPlayAdminAdminsId({
          params: { path: { id: admin.id } },
          body: {
            displayName: admin.displayName,
            status: admin.status === 'active' ? 'disabled' : 'active',
          },
        })
        await refresh()
      },
    })
  return (
    <>
      <Row justify="space-between" align="middle" className="player-admin-page-toolbar">
        <Col>
          <h1 className="player-admin-page-title">管理账号</h1>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => edit()}>
              新增管理账号
            </Button>
          </Space>
        </Col>
      </Row>
      <Card className="player-admin-panel">
        <Table<Admin>
          loading={loading}
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
              render: (_, row) => (
                <>
                  <div className="player-admin-player-name">{row.displayName}</div>
                  <div className="player-admin-muted">@{row.username}</div>
                </>
              ),
            },
            {
              title: '权限组',
              dataIndex: 'permissionGroupName',
              render: (value) => value || '未分配权限组',
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (value) => (
                <Tag color={value === 'active' ? 'success' : 'default'}>
                  {value === 'active' ? '启用' : '停用'}
                </Tag>
              ),
            },
            { title: '最近登录', dataIndex: 'lastLoginAt', render: dateTime },
            {
              title: '操作',
              render: (_, row) => (
                <Space>
                  <Button type="link" onClick={() => edit(row)}>
                    编辑
                  </Button>
                  <Button type="link" onClick={() => toggle(row)}>
                    {row.status === 'active' ? '停用' : '启用'}
                  </Button>
                  <Button
                    danger
                    type="link"
                    onClick={() =>
                      Modal.confirm({
                        title: `删除 ${row.displayName}？`,
                        content: '删除后无法恢复。',
                        okText: '删除',
                        okButtonProps: { danger: true },
                        onOk: () => remove(row),
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
}
