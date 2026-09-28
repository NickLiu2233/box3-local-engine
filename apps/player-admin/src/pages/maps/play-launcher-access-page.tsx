import { CloudDownloadOutlined } from '@ant-design/icons'
import { Card, Divider, Spin, Switch, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'

import { playerAdminApi as api } from '../../player-admin-api'

type PlayerLauncherAccessSettings = {
  enabled: boolean
  updatedAt?: string
}

/** Independent, server-wide opt-in for the native Player Launcher. */
export function PlayLauncherAccessPage({ canManage }: { canManage: boolean }) {
  const [settings, setSettings] = useState<PlayerLauncherAccessSettings>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = (await api.getApiPlayAdminLibrarySection({
        params: { path: { section: 'player-launcher-access' } },
      })) as { playerLauncherAccess?: PlayerLauncherAccessSettings }
      setSettings(response.playerLauncherAccess || { enabled: false })
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const update = async (enabled: boolean) => {
    setSaving(true)
    try {
      const response = (await api.patchApiPlayAdminLibrarySection({
        params: { path: { section: 'player-launcher-access' } },
        body: { enabled },
      })) as { playerLauncherAccess?: PlayerLauncherAccessSettings }
      setSettings(response.playerLauncherAccess || { enabled })
      message.success(enabled ? '已开放玩家启动器资源访问' : '已关闭玩家启动器资源访问')
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading && !settings) return <Spin size="large" />
  const enabled = settings?.enabled === true
  return (
    <>
      <div className="player-admin-page-toolbar">
        <div><h1 className="player-admin-page-title">玩家启动器访问</h1></div>
      </div>
      <Card className="player-admin-panel player-admin-resource-cache-main">
        <div className="player-admin-resource-cache-detail">
          <span className="player-admin-resource-cache-detail-label">
            <CloudDownloadOutlined />
            在线导入
          </span>
          <strong>允许已登录且可游玩地图的玩家，从 BOX3 Player 发现地图并准备本地资源</strong>
        </div>
        <Divider />
        <div className="player-admin-resource-cache-control">
          <div>
            <div className="player-admin-resource-cache-control-title">开放玩家启动器资源访问</div>
            <div className="player-admin-resource-cache-storage-note">
              与浏览器“本地资源加速”独立；默认关闭，关闭后启动器不能发现地图或下载资源。
            </div>
          </div>
          <div className="player-admin-resource-cache-control-actions">
            <Switch
              checked={enabled}
              loading={saving}
              disabled={!canManage}
              checkedChildren="开启"
              unCheckedChildren="关闭"
              onChange={(next) => void update(next)}
            />
          </div>
        </div>
      </Card>
    </>
  )
}
