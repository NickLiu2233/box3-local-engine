// 只操作当前会话，不提供用户 ID/角色选择或头像功能。
import React, { useState } from 'react'
import { ArrowRight, Check, LogOut } from 'lucide-react'
import { api, errorMessage } from '../api/client'
import { Notice, PendingLabel } from '../components/forms'

export function AccountView({ player, returnUrl, onLogout, onChangePassword }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const displayName = player.displayName || player.username || '玩家'

  async function logout() {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      await api('/api/auth/logout', { method: 'POST', body: '{}' })
      onLogout()
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="account-view">
      <span className="success-mark" aria-hidden="true">
        <Check size={19} strokeWidth={2.2} />
      </span>
      <div className="account-copy">
        <strong>{displayName}</strong>
        {player.username ? <span>@{player.username}</span> : null}
      </div>
      <Notice>{message}</Notice>
      <div className="account-actions">
        {returnUrl ? (
          <a className="primary-button" href={returnUrl}>
            <span>继续访问</span>
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        ) : null}
        <button className="secondary-button" type="button" disabled={busy} onClick={onChangePassword}>修改密码</button>
        <button className="secondary-button" type="button" disabled={busy} onClick={logout}>
          <PendingLabel pending={busy} icon={LogOut}>
            {busy ? '正在退出' : '退出登录'}
          </PendingLabel>
        </button>
      </div>
    </div>
  )
}
