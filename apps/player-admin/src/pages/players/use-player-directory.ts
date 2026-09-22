import { Form, message } from 'antd'
import { useCallback, useState } from 'react'

import { playerAdminApi as api, playerAdminRoutes as routes } from '../../player-admin-api'
import type { Detail, Player, View } from '../../player-admin-types'
import type { PlayerBatchAction } from './player-table'

/** Owns player search, profile lifecycle, bulk actions, and account bans. */
export function usePlayerDirectory(view: View, canExport: boolean) {
  const [players, setPlayers] = useState<Player[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(30)
  const [search, setSearch] = useState('')
  const [identity, setIdentity] = useState('all')
  const [selected, setSelected] = useState<Player>()
  const [details, setDetails] = useState<Detail>()
  const [detailTab, setDetailTab] = useState('profile')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [banDialog, setBanDialog] = useState<{ player: Player; detail?: Detail }>()
  const [exporting, setExporting] = useState(false)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [banForm] = Form.useForm()

  const load = useCallback(async () => {
    const query = new URLSearchParams({
      search,
      page: String(page),
      pageSize: String(pageSize),
      identity: view === 'account-bans' ? 'banned' : identity,
      online: view === 'online-sessions' ? 'online' : 'all',
      sort: 'lastSeen',
    })
    const result = await api<{ players: Player[]; total: number }>(`${routes.players}?${query}`)
    setPlayers(result.players || [])
    setTotal(result.total || 0)
  }, [identity, page, pageSize, search, view])

  const exportPlayers = async () => {
    if (exporting || !canExport) return
    setExporting(true)
    try {
      const query = new URLSearchParams({ search, identity, online: 'all', sort: 'lastSeen' })
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
      setExporting(false)
    }
  }

  const openDetails = async (player: Player, tab = 'profile') => {
    try {
      setSelected(player)
      setDetails(undefined)
      setDetailTab(tab)
      const result = await api<Detail>(routes.player(player.subjectId))
      setSelected(result.player)
      setDetails(result)
      editForm.setFieldsValue({
        displayName: result.player.displayName,
        boxId: result.player.boxId,
        userKey: result.player.userKey,
        adminNote: result.player.adminNote,
        tags: result.player.tags?.join(', '),
      })
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  const closeDetails = () => {
    setSelected(undefined)
    setDetails(undefined)
  }

  const savePlayer = async () => {
    if (!selected) return
    try {
      const values = await editForm.validateFields()
      const result = await api<{ player: Player }>(routes.player(selected.subjectId), {
        method: 'PATCH',
        body: JSON.stringify({
          ...values,
          tags: values.tags
            ? values.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
            : [],
        }),
      })
      if (result.player) {
        setSelected(result.player)
        setDetails((current) => current ? { ...current, player: result.player } : current)
      }
      message.success('玩家资料已保存')
      await load()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  const command = async (commandValue: Record<string, unknown>, success: string) => {
    if (!selected) return
    try {
      await api(routes.player(selected.subjectId), {
        method: 'POST',
        body: JSON.stringify(commandValue),
      })
      message.success(success)
      await openDetails(selected)
      await load()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  const toggleBan = async (player: Player) => {
    try {
      const status = player.status === 'banned' ? 'active' : 'banned'
      await api(routes.player(player.subjectId), {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(status === 'banned' ? { banReason: '由管理后台执行' } : {}) }),
      })
      message.success(status === 'banned' ? '账号已封禁' : '账号已解除封禁')
      await load()
    } catch (error) {
      message.error((error as Error).message)
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

  const submitBanDialog = async () => {
    if (!banDialog?.detail) return
    try {
      const values = await banForm.validateFields()
      const targets = values.targets as string[]
      const bannedUntil = values.duration === 'temporary'
        ? new Date(values.bannedUntil).toISOString()
        : null
      if (values.duration === 'temporary' && new Date(bannedUntil || '').getTime() <= Date.now()) {
        throw new Error('封禁到期时间必须晚于当前时间')
      }
      const playerRoute = routes.player(banDialog.player.subjectId)
      if (targets.includes('account')) {
        await api(playerRoute, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'banned', banReason: values.reason, bannedUntil }),
        })
      }
      for (const target of targets) {
        if (!target.startsWith('ip:') && !target.startsWith('device:')) continue
        await api(playerRoute, {
          method: 'POST',
          body: JSON.stringify({
            action: target.startsWith('ip:') ? 'ban-ip' : 'ban-device',
            value: target.slice(target.indexOf(':') + 1),
            reason: values.reason,
            bannedUntil,
          }),
        })
      }
      setBanDialog(undefined)
      message.success('封禁已生效')
      await load()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  const deletePlayer = async (player = selected) => {
    if (!player) return
    try {
      await api(routes.player(player.subjectId), { method: 'DELETE' })
      message.success('玩家身份已删除')
      closeDetails()
      await load()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  const batchPlayers = async (action: PlayerBatchAction, subjectIds: string[], tag?: string) => {
    try {
      await api(routes.playerBatch, {
        method: 'POST',
        body: JSON.stringify({
          action,
          subjectIds,
          ...(action === 'ban' ? { reason: '由管理后台批量执行' } : {}),
          ...(['add-tag', 'remove-tag'].includes(action) ? { tag } : {}),
        }),
      })
      const notices: Record<PlayerBatchAction, string> = {
        'revoke-sessions': '已发送下线指令',
        ban: '已批量封禁',
        unban: '已批量解封',
        'add-tag': '已添加标签',
        'remove-tag': '已移除标签',
      }
      message.success(notices[action])
      setSelectedIds([])
      await load()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  const createPlayer = async () => {
    try {
      await api(routes.players, { method: 'POST', body: JSON.stringify(await createForm.validateFields()) })
      message.success('玩家账号已创建')
      setCreateOpen(false)
      createForm.resetFields()
      await load()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  return {
    players,
    total,
    page,
    pageSize,
    search,
    identity,
    selectedIds,
    exporting,
    selected,
    details,
    detailTab,
    load,
    exportPlayers,
    openDetails,
    closeDetails,
    savePlayer,
    command,
    toggleBan,
    openBanDialog,
    deletePlayer,
    batchPlayers,
    setPage,
    setPageSize,
    setSearch,
    setIdentity,
    setSelectedIds,
    setDetailTab,
    createDialog: {
      form: createForm,
      open: createOpen,
      show: () => setCreateOpen(true),
      close: () => setCreateOpen(false),
      submit: createPlayer,
    },
    editForm,
    banDialog: {
      state: banDialog,
      form: banForm,
      close: () => setBanDialog(undefined),
      submit: submitBanDialog,
    },
  }
}
