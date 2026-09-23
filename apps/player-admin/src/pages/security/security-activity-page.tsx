import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, Pagination, Row, Select, Table, Tag, Tooltip } from 'antd'

import { dateTime } from '../../player-admin-format'
import type { Activity } from '../../player-admin-types'

type Props = {
  events: Activity[]
  total: number
  loading: boolean
  page: number
  pageSize: number
  kind: string
  search: string
  refresh: () => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setKind: (kind: string) => void
  setSearch: (search: string) => void
}

export function SecurityActivityPage(props: Props) {
  const resetSearch = (value: string) => {
    props.setSearch(value)
    props.setPage(1)
  }
  const resetKind = (value: string) => {
    props.setKind(value)
    props.setPage(1)
  }
  return (
    <>
      <Row justify="space-between" align="middle" className="player-admin-page-toolbar">
        <Col>
          <h1 className="player-admin-page-title">安全记录</h1>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={props.refresh}>
            刷新
          </Button>
        </Col>
      </Row>
      <Card className="player-admin-panel" title={`操作与登录记录（${props.total}）`}>
        <div className="player-admin-filterbar">
          <Input
            prefix={<SearchOutlined />}
            allowClear
            placeholder="搜索操作、账号、玩家、IP 或身份 ID"
            value={props.search}
            onChange={(event) => resetSearch(event.target.value)}
          />
          <Select
            value={props.kind}
            style={{ width: 140 }}
            onChange={resetKind}
            options={[
              { value: 'all', label: '全部记录' },
              { value: 'admin', label: '管理操作' },
              { value: 'login', label: '登录记录' },
            ]}
          />
        </div>
        <Table<Activity>
          loading={props.loading}
          dataSource={props.events}
          rowKey="id"
          pagination={false}
          columns={[
            { title: '时间', dataIndex: 'createdAt', render: dateTime },
            {
              title: '类型',
              dataIndex: 'kind',
              render: (value) => (
                <Tag color={value === 'admin' ? 'blue' : 'default'}>
                  {value === 'admin' ? '管理操作' : '登录'}
                </Tag>
              ),
            },
            { title: '操作', dataIndex: 'action' },
            { title: '操作人', render: (_, row) => row.actorDisplayName || row.actor },
            {
              title: '对象',
              render: (_, row) => {
                const name = row.displayName || row.username || '—'
                return row.subjectId ? (
                  <>
                    <div>{name}</div>
                    <div className="player-admin-muted">{row.subjectId}</div>
                  </>
                ) : (
                  name
                )
              },
            },
            { title: 'IP 地址', dataIndex: 'ip', render: (value) => value || '—' },
            {
              title: '详情',
              render: (_, row) =>
                row.details && Object.keys(row.details).length ? (
                  <Tooltip
                    title={
                      <pre className="player-admin-audit-details">
                        {JSON.stringify(row.details, null, 2)}
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
            current={props.page}
            total={props.total}
            pageSize={props.pageSize}
            showSizeChanger
            pageSizeOptions={['20', '30', '50', '100']}
            onChange={props.setPage}
            onShowSizeChange={(_, size) => {
              props.setPageSize(size)
              props.setPage(1)
            }}
          />
        </div>
      </Card>
    </>
  )
}
