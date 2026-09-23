import { Button, Input, Modal, Space, Table } from 'antd'
import type { TableProps } from 'antd/es/table'

import type { Player } from '../../player-admin-types'

export type PlayerBatchAction = 'revoke-sessions' | 'ban' | 'unban' | 'add-tag' | 'remove-tag'

type Props = TableProps<Player> & {
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
  openDetails: (player: Player) => Promise<void>
  batchPlayers: (action: PlayerBatchAction, subjectIds: string[], tag?: string) => Promise<void>
}

function requestTag(title: string, placeholder: string, onOk: (tag: string) => void) {
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

/** Player selection and bulk actions stay together so every directory view behaves identically. */
export function PlayerTable({
  selectedIds,
  setSelectedIds,
  openDetails,
  batchPlayers,
  ...props
}: Props) {
  const ids = selectedIds
  return (
    <>
      <Table<Player>
        {...props}
        rowSelection={{
          selectedRowKeys: ids,
          onChange: (keys) => setSelectedIds(keys as string[]),
        }}
        onRow={(row) => ({
          onClick: (event) => {
            if (
              !(event.target as HTMLElement).closest(
                'button,a,input,.ant-dropdown-trigger,.ant-dropdown-menu,.ant-dropdown-menu-item',
              )
            )
              void openDetails(row)
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
                  onOk: () => batchPlayers('revoke-sessions', ids),
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
                  onOk: () => batchPlayers('ban', ids),
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
                  onOk: () => batchPlayers('unban', ids),
                })
              }
            >
              解除封禁
            </Button>
            <Button
              onClick={() =>
                requestTag('批量添加标签', '输入 1–32 个字符的标签', (tag) =>
                  batchPlayers('add-tag', ids, tag),
                )
              }
            >
              添加标签
            </Button>
            <Button
              onClick={() =>
                requestTag('批量移除标签', '输入要移除的标签', (tag) =>
                  batchPlayers('remove-tag', ids, tag),
                )
              }
            >
              移除标签
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
