import { message } from 'antd'
import { useCallback, useState } from 'react'

import { playerAdminApi as api, playerAdminRoutes as routes } from '../../player-admin-api'
import type { Activity, IdentityBan } from '../../player-admin-types'

/** Owns paged audit records and active IP/device bans. */
export function useSecurityManagement() {
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

  const loadActivity = useCallback(async () => {
    setActivityLoading(true)
    try {
      const result = await api<{ events: Activity[]; total: number }>(
        `${routes.activity}?${new URLSearchParams({
          page: String(activityPage),
          pageSize: String(activityPageSize),
          kind: activityKind,
          search: activitySearch,
        })}`,
      )
      setActivity(result.events || [])
      setActivityTotal(result.total || 0)
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
      const result = await api<{ bans: IdentityBan[]; total: number }>(`${routes.identityBans}?${query}`)
      setIdentityBans(result.bans || [])
      setIdentityBanTotal(result.total || 0)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setIdentityBanLoading(false)
    }
  }, [identityBanKind, identityBanPage, identityBanPageSize, identityBanSearch])

  const revokeIdentityBan = async (ban: IdentityBan) => {
    try {
      await api(routes.identityBans, { method: 'POST', body: JSON.stringify({ banId: ban.id }) })
      message.success(`${ban.kind === 'ip' ? 'IP' : '设备'}封禁已解除`)
      await loadIdentityBans()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  return {
    activity: {
      events: activity,
      total: activityTotal,
      loading: activityLoading,
      page: activityPage,
      pageSize: activityPageSize,
      kind: activityKind,
      search: activitySearch,
      load: loadActivity,
      setPage: setActivityPage,
      setPageSize: setActivityPageSize,
      setKind: setActivityKind,
      setSearch: setActivitySearch,
    },
    identityBans: {
      bans: identityBans,
      total: identityBanTotal,
      loading: identityBanLoading,
      page: identityBanPage,
      pageSize: identityBanPageSize,
      kind: identityBanKind,
      search: identityBanSearch,
      load: loadIdentityBans,
      revoke: revokeIdentityBan,
      setPage: setIdentityBanPage,
      setPageSize: setIdentityBanPageSize,
      setKind: setIdentityBanKind,
      setSearch: setIdentityBanSearch,
    },
  }
}
