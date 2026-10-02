'use strict'

import React from 'react'
import { createRoot } from 'react-dom/client'
import { Tabs } from 'radix-ui'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LogOut,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PasswordChange } from './components/password-change.jsx'

const themeKey = 'box-player-admin-theme'
const themeOrder = ['system', 'light', 'dark']
const themeLabels = {
  system: '跟随系统',
  light: '亮色',
  dark: '暗色',
}

const navigationQuery = new URLSearchParams(location.search)
const navigation = {
  source: navigationQuery.get('source') || '',
  returnUrl: navigationQuery.get('returnUrl') || '',
}

function errorMessage(error) {
  if (error instanceof Error && error.banReason) {
    const deadline = error.bannedUntil
      ? new Date(error.bannedUntil).toLocaleString('zh-CN')
      : '永久'
    return `该玩家已被封禁\n封禁原因：${error.banReason}\n封禁期限：${deadline}`
  }
  return error instanceof Error ? error.message : '请求失败，请稍后重试'
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || `请求失败（HTTP ${response.status}）`)
    error.status = response.status
    error.registrationEnabled = data.registrationEnabled
    error.banReason = data.banReason
    error.bannedUntil = data.bannedUntil
    throw error
  }
  return data
}

function ThemeButton() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'system')
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  const description = `主题：${themeLabels[theme]}（点击切换）`

  function cycleTheme() {
    const next = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length]
    document.documentElement.dataset.theme = next
    setTheme(next)
    try {
      localStorage.setItem(themeKey, next)
    } catch {
      // Theme persistence is optional.
    }
  }

  return (
    <button
      className="icon-button"
      type="button"
      title={description}
      aria-label={description}
      onClick={cycleTheme}
    >
      <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
    </button>
  )
}

function Brand() {
  return (
    <div className="portal-brand">
      <span className="brand-mark" aria-hidden="true">
        BOX
      </span>
      <span>
        <strong>玩家登录</strong>
        <small>PLAYER SERVICE</small>
      </span>
    </div>
  )
}

function PendingLabel({ pending, icon: Icon, children }) {
  return (
    <>
      {pending ? (
        <LoaderCircle className="button-spinner" size={16} aria-hidden="true" />
      ) : Icon ? (
        <Icon size={16} aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </>
  )
}

function PasswordField({ label, name, autoComplete, minimum = 8, inputRef }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-shell">
        <input
          ref={inputRef}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minimum}
          maxLength={128}
          required
        />
        <button
          className="input-action"
          type="button"
          aria-label={visible ? '隐藏密码' : '显示密码'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </span>
    </label>
  )
}

function Notice({ children, tone = 'error' }) {
  if (!children) return null
  return (
    <div className={`message${tone === 'success' ? ' message-success' : ''}`} role={tone === 'success' ? 'status' : 'alert'}>
      {children}
    </div>
  )
}

function LoginForm({ busy, onSubmit }) {
  const usernameRef = useRef(null)
  useEffect(() => usernameRef.current?.focus(), [])

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label className="field">
        <span>用户名</span>
        <input ref={usernameRef} name="username" autoComplete="username" maxLength="32" required />
      </label>
      <PasswordField label="密码" name="password" autoComplete="current-password" />
      <button className="primary-button" type="submit" disabled={busy}>
        <PendingLabel pending={busy} icon={ArrowRight}>
          {busy ? '正在登录' : '登录'}
        </PendingLabel>
      </button>
    </form>
  )
}

function RegisterForm({ busy, onSubmit }) {
  const usernameRef = useRef(null)
  useEffect(() => usernameRef.current?.focus(), [])

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="field-grid">
        <label className="field">
          <span>用户名</span>
          <input
            ref={usernameRef}
            name="username"
            autoComplete="username"
            maxLength="32"
            required
          />
        </label>
        <label className="field">
          <span>昵称</span>
          <input name="displayName" autoComplete="nickname" maxLength="40" required />
        </label>
      </div>
      <PasswordField label="密码" name="password" autoComplete="new-password" minimum={10} />
      <PasswordField
        label="确认密码"
        name="confirmPassword"
        autoComplete="new-password"
        minimum={10}
      />
      <small className="field-hint">密码至少 10 位，请勿与其他网站共用。</small>
      <button className="primary-button" type="submit" disabled={busy}>
        <PendingLabel pending={busy} icon={ArrowRight}>
          {busy ? '正在创建' : '创建账号'}
        </PendingLabel>
      </button>
    </form>
  )
}

function Authentication({ registrationEnabled, initialMessage, initialTone, onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(initialMessage || '')
  const [tone, setTone] = useState(initialTone || 'error')

  async function submit(event, operation) {
    event.preventDefault()
    if (busy) return
    setTone('error')
    const values = Object.fromEntries(new FormData(event.currentTarget))
    if (operation === 'register' && values.password !== values.confirmPassword) {
      setMessage('两次输入的密码不一致')
      return
    }
    delete values.confirmPassword
    setMessage('')
    setBusy(true)
    try {
      const data = await api(`/api/auth/${operation}`, {
        method: 'POST',
        body: JSON.stringify({ ...values, ...navigation }),
      })
      onAuthenticated(data.player, data.returnUrl, registrationEnabled)
      if (data.returnUrl) location.assign(data.returnUrl)
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setMessage('')
    setTone('error')
  }

  if (!registrationEnabled) {
    return (
      <div className="auth-content">
        <Notice tone={tone}>{message}</Notice>
        <LoginForm busy={busy} onSubmit={(event) => submit(event, 'login')} />
      </div>
    )
  }

  return (
    <Tabs.Root
      className="auth-tabs"
      value={mode}
      onValueChange={changeMode}
      orientation="horizontal"
    >
      <Tabs.List className="tab-list" aria-label="账号操作">
        <Tabs.Trigger className="tab-trigger" value="login">
          登录
        </Tabs.Trigger>
        <Tabs.Trigger className="tab-trigger" value="register">
          注册
        </Tabs.Trigger>
      </Tabs.List>
      <Notice tone={tone}>{message}</Notice>
      <Tabs.Content className="tab-content" value="login">
        <LoginForm busy={busy} onSubmit={(event) => submit(event, 'login')} />
      </Tabs.Content>
      <Tabs.Content className="tab-content" value="register">
        <RegisterForm busy={busy} onSubmit={(event) => submit(event, 'register')} />
      </Tabs.Content>
    </Tabs.Root>
  )
}

function AccountView({ player, returnUrl, onLogout, onChangePassword }) {
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

function Portal() {
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

createRoot(document.querySelector('#root')).render(<Portal />)
