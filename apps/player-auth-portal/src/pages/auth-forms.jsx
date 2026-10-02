// 提交时读取 FormData，不在中文组合输入时格式化或重建节点。
import React, { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { PasswordField, PendingLabel } from '../components/forms'

export function LoginForm({ busy, onSubmit }) {
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

export function RegisterForm({ busy, onSubmit }) {
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
          <input name="displayName" autoComplete="nickname" maxLength="32" required />
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
