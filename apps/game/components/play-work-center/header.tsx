import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { IntlProvider } from 'react-intl'
import zhMessages from '../../i18n/zh.json'
import { apiClient } from '../../src/apis/client'
import { PlayerAccount, type PlayerAccountIdentity } from '../player-account/player-account'
import styles from './header.module.css'

function PlayAccountMenu() {
  const [identity, setIdentity] = useState<PlayerAccountIdentity>()
  useEffect(() => {
    const abort = new AbortController()
    void apiClient
      .getApiPlayLibrary({ signal: abort.signal })
      .then((data) => {
        const player = data.player
        if (!abort.signal.aborted && player)
          setIdentity({
            displayName: player.displayName || player.username,
            username: player.username,
            userId:
              ('userId' in player && typeof player.userId === 'string'
                ? player.userId
                : player.subjectId) || '',
            boxId: 'boxId' in player && typeof player.boxId === 'string' ? player.boxId : '',
            avatarSkinId: player.avatarSkinId || 'explorer',
          })
      })
      .catch(() => undefined)
    return () => abort.abort()
  }, [])
  if (!identity)
    return (
      <Link className={styles.login} href="/login-required?source=play">
        登录 / 注册
      </Link>
    )
  return (
    <IntlProvider locale="zh-CN" messages={zhMessages}>
      <PlayerAccount
        identity={identity}
        onSave={async (changes) => {
          const data = await apiClient.patchApiPlayProfile({ body: changes })
          setIdentity((current) =>
            current
              ? {
                  ...current,
                  ...changes,
                  displayName:
                    typeof data.player?.displayName === 'string'
                      ? data.player.displayName
                      : changes.displayName,
                  avatarSkinId:
                    typeof data.player?.avatarSkinId === 'string'
                      ? data.player.avatarSkinId
                      : changes.avatarSkinId,
                }
              : current,
          )
        }}
        onLogout={async () => {
          await apiClient.postApiPlayLogout()
          setIdentity(undefined)
        }}
      />
    </IntlProvider>
  )
}

/** Shared brand and account entry across the Play work center. */
export function PlaySiteHeader({
  account,
  navigation,
}: {
  account?: ReactNode
  navigation?: ReactNode
}) {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="BOX3 Engine 游玩作品中心">
        <img className={styles.mark} src="/logo512.png" alt="" aria-hidden="true" />
        <span>BOX3 Engine</span>
      </Link>
      {navigation}
      <div className={styles.account} aria-label="账户入口">
        {account ?? <PlayAccountMenu />}
      </div>
    </header>
  )
}

export function PlayWorkNavigation({
  current,
  counts,
}: {
  current: 'maps' | 'models'
  counts: { maps: number; models: number }
}) {
  if (counts.maps <= 0 || counts.models <= 0) return null
  return (
    <nav className={styles.navigation} aria-label="游玩作品类型">
      {counts.maps > 0 ? (
        <Link href="/" aria-current={current === 'maps' ? 'page' : undefined}>
          游玩地图
        </Link>
      ) : null}
      {counts.models > 0 ? (
        <Link href="/models" aria-current={current === 'models' ? 'page' : undefined}>
          模型预览
        </Link>
      ) : null}
    </nav>
  )
}
