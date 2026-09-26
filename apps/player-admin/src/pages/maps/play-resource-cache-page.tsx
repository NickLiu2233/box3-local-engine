import {
  CloudDownloadOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { Card, Divider, Spin, Switch, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'

import { playerAdminApi as api } from '../../player-admin-api'

type ResourceCacheSettings = {
  enabled: boolean
  updatedAt?: string
}

/** Server-wide opt-in for browser-side immutable map resource caching. */
export function PlayResourceCachePage({ canManage }: { canManage: boolean }) {
  const [settings, setSettings] = useState<ResourceCacheSettings>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = (await api.getApiPlayAdminLibrarySection({
        params: { path: { section: 'resource-cache' } },
      })) as { resourceCache?: ResourceCacheSettings }
      setSettings(response.resourceCache || { enabled: false })
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
        params: { path: { section: 'resource-cache' } },
        body: { enabled },
      })) as { resourceCache?: ResourceCacheSettings }
      setSettings(response.resourceCache || { enabled })
      message.success(enabled ? '已开启本地资源加速' : '已关闭本地资源加速')
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading && !settings) return <Spin size="large" />
  const enabled = settings?.enabled === true
  const storageGuide = (
    <Card className="player-admin-panel player-admin-resource-cache-storage-card">
      <div className="player-admin-resource-cache-storage-layout">
        <div className="player-admin-resource-cache-storage-lead">
          <span className="player-admin-resource-cache-storage-icon" aria-hidden="true">
            <DatabaseOutlined />
          </span>
          <div>
            <div className="player-admin-resource-cache-storage-title">本地存储方式</div>
            <div className="player-admin-resource-cache-storage-subtitle">浏览器 Cache Storage</div>
          </div>
        </div>
        <p className="player-admin-resource-cache-storage-note">
          资源会按地图发布版本保存到玩家当前浏览器的受管缓存中，不会生成可直接浏览的地图文件。开发者可在游玩页面打开开发者工具，依次进入
          <code>Application</code> → <code>Cache Storage</code>，查看以{' '}
          <code>box-play-static:</code>{' '}
          开头的缓存；清除该站点数据后，资源会在下次进入地图时重新下载。
        </p>
      </div>
    </Card>
  )
  return (
    <>
      <div className="player-admin-page-toolbar">
        <div>
          <h1 className="player-admin-page-title">本地资源加速</h1>
        </div>
      </div>
      {storageGuide}
      <Card className="player-admin-panel player-admin-resource-cache player-admin-resource-cache-main">
        <div className="player-admin-resource-cache-details">
          <div className="player-admin-resource-cache-detail">
            <span className="player-admin-resource-cache-detail-label">
              <CloudDownloadOutlined />
              缓存内容
            </span>
            <strong>地形、模型、贴图、图片、音频及其他已发布静态资源</strong>
          </div>
          <div className="player-admin-resource-cache-detail">
            <span className="player-admin-resource-cache-detail-label">
              <SafetyCertificateOutlined />
              不缓存内容
            </span>
            <strong>客户端脚本、服务端脚本、登录信息与实时房间数据</strong>
          </div>
        </div>

        <Divider />
        <div className="player-admin-resource-cache-control">
          <div>
            <div className="player-admin-resource-cache-control-title">允许本地资源加速</div>
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
