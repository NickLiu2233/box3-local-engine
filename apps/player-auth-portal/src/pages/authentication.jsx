// 注册开关来自会话接口；后端也会拒绝被关闭的注册。
import React, { useRef, useState } from 'react'
import { Tabs } from 'radix-ui'
import { api, errorMessage } from '../api/client'
import { navigation } from '../api/navigation'
import { Notice } from '../components/forms'
import { LoginForm, RegisterForm } from './auth-forms'

export function Authentication({ registrationEnabled, initialMessage, initialTone, onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(initialMessage || '')
  const [tone, setTone] = useState(initialTone || 'error')
  // ref 同步阻止同一事件循环中的重复提交，不能只依赖下一次 React 渲染的 busy。
  const pending = useRef(false)

  async function submit(event, operation) {
    event.preventDefault()
    if (pending.current) return
    setTone('error')
    const values = Object.fromEntries(new FormData(event.currentTarget))
    if (operation === 'register' && values.password !== values.confirmPassword) {
      setMessage('两次输入的密码不一致')
      return
    }
    delete values.confirmPassword
    pending.current = true
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
      pending.current = false
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
