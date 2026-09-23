import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, Modal, Row, Space, Table, Tag, Tooltip } from 'antd'

import { PLAYER_ADMIN_CAPABILITY_META } from '../../../../game/shared/player-admin-policy'
import { dateTime } from '../../player-admin-format'
import type { Group } from '../../player-admin-types'

type Props = {
  groups: Group[]
  loading: boolean
  refresh: () => Promise<void>
  edit: (group?: Group) => void
  remove: (group: Group) => Promise<void>
}

/** Permission-group presentation, assignment impact, and deletion safeguards. */
export function PermissionGroupsPage({ groups, loading, refresh, edit, remove }: Props) {
  return (
    <>
      <Row justify="space-between" align="middle" className="player-admin-page-toolbar">
        <Col>
          <h1 className="player-admin-page-title">权限组</h1>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => edit()}>
              新增权限组
            </Button>
          </Space>
        </Col>
      </Row>
      <Card className="player-admin-panel">
        <Table<Group>
          loading={loading}
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
              render: (permissions: string[]) => (
                <Space size={[0, 4]} wrap>
                  {permissions.map((permission) => (
                    <Tag key={permission}>
                      {PLAYER_ADMIN_CAPABILITY_META[
                        permission as keyof typeof PLAYER_ADMIN_CAPABILITY_META
                      ]?.label || permission}
                    </Tag>
                  ))}
                </Space>
              ),
            },
            { title: '已分配账号', dataIndex: 'adminCount', render: (count) => `${count || 0} 个` },
            { title: '创建时间', dataIndex: 'createdAt', render: dateTime },
            {
              title: '操作',
              render: (_, group) => (
                <Space>
                  <Button type="link" onClick={() => edit(group)}>
                    编辑
                  </Button>
                  {group.adminCount ? (
                    <Tooltip title={`已有 ${group.adminCount} 个管理账号使用，无法删除`}>
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
                          title: `删除权限组“${group.name}”？`,
                          content: '删除后无法恢复。',
                          okText: '删除',
                          okButtonProps: { danger: true },
                          onOk: () => remove(group),
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
}
