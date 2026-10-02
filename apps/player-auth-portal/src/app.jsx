// 协调页面状态：先查会话再展示；改密成功后必须重新登录。
import React, { useEffect, useMemo, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { api, errorMessage } from './api/client'
import { navigation } from './api/navigation'
import { Brand } from './components/brand'
import { ThemeButton } from './components/theme-button'
import { Notice, PasswordField, PendingLabel } from './components/forms'
import { PasswordChange } from './components/password-change'
import { Authentication } from './pages/authentication'
import { AccountView } from './pages/account'

export function Portal() {
  const [state, setState] = useState({ kind: 'loading' })
  const title = state.kind === 'password' ? '修改密码' : state.kind === 'account' ? '账号已登录' : '登录玩家账号'
  const subtitle = useMemo(() => {
    if (state.kind === 'password') return '验证原密码后，设置新的登录密码。'
    if (state.kind === 'account') return '管理当前账号，或继续访问。'
    if (state.kind === 'auth' && state.registrationEnabled === false)
      return '使用服主创建的账号继续访问。'
    return '登录后继续访问游戏或创作端。'
  }, [state])

  useEffect(() => {
    // 异步查询结束时页面可能已经卸载，不让旧请求覆盖新的登录状态。
    let active = true
    const search = new URLSearchParams(navigation)
    api(`/api/auth/session?${search}`)
      .then((data) => {
        if (!active) return
        setState(
          data.player
            ? {
                kind: 'account',
                player: data.player,
                returnUrl: data.returnUrl || '',
                registrationEnabled: data.registrationEnabled !== false,
              }
            : {
                kind: 'auth',
                registrationEnabled: data.registrationEnabled !== false,
                message: '',
              },
        )
      })
      .catch((error) => {
        if (!active) return
        setState({
          kind: 'auth',
          registrationEnabled: error.registrationEnabled !== false,
          message: errorMessage(error),
        })
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="portal-layout">
      <header className="portal-header">
        <Brand />
        <ThemeButton />
      </header>
      <main className="page-shell">
        <section className="auth-card" aria-labelledby="page-title">
          <header className="auth-header">
            <span className="eyebrow">PLAYER ACCOUNT</span>
            <h1 id="page-title">{title}</h1>
            <p>{subtitle}</p>
          </header>
          {state.kind === 'loading' ? (
            <div className="state-view" role="status" aria-live="polite">
              <LoaderCircle className="spinner" size={18} aria-hidden="true" />
              <span>正在检查登录状态</span>
            </div>
          ) : state.kind === 'password' ? (
            // 改密成功后清除页面身份，不能继续使用刚被撤销的会话。
            <PasswordChange
              api={api} PasswordField={PasswordField} Notice={Notice} PendingLabel={PendingLabel}
              onCancel={() => setState({ ...state, kind: 'account' })}
              onRelogin={(message, tone = 'error') => setState({ kind: 'auth', registrationEnabled: state.registrationEnabled, message, tone })}
            />
          ) : state.kind === 'account' ? (
            <AccountView
              player={state.player}
              returnUrl={state.returnUrl}
              onChangePassword={() => setState({ ...state, kind: 'password' })}
              onLogout={() =>
                setState({
                  kind: 'auth',
                  registrationEnabled: state.registrationEnabled,
                  message: '',
                })
              }
            />
          ) : (
            <Authentication
              registrationEnabled={state.registrationEnabled}
              initialMessage={state.message}
              initialTone={state.tone}
              onAuthenticated={(player, returnUrl, registrationEnabled) =>
                setState({
                  kind: 'account',
                  player,
                  returnUrl,
                  registrationEnabled,
                })
              }
            />
          )}
        </section>
      </main>
    </div>
  )
}
