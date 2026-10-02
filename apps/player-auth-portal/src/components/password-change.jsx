import React, { useEffect, useRef, useState } from 'react'

export function PasswordChange({ api, PasswordField, Notice, PendingLabel, onCancel, onRelogin }) {
  // 密码只在提交的局部变量/输入节点中短暂存在，不保存到 localStorage 或全局状态。
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const pending = useRef(false)
  const currentPasswordRef = useRef(null)
  useEffect(() => currentPasswordRef.current?.focus(), [])

  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    if (values.newPassword !== values.confirmPassword) {
      setMessage('两次输入的新密码不一致')
      form.elements.confirmPassword.focus()
      return
    }
    if (values.newPassword === values.currentPassword) {
      setMessage('新密码不能与原密码相同')
      form.elements.newPassword.focus()
      return
    }
    pending.current = true
    setBusy(true)
    setMessage('')
    try {
      await api('/api/auth/password', {
        method: 'POST',
        // 不发送确认密码、用户 ID 或导航参数，底层通过当前会话确定修改者。
        body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      })
      form.reset()
      onRelogin('密码已修改，请使用新密码重新登录。', 'success')
    } catch (error) {
      if (error.status === 401) {
        form.reset()
        onRelogin('登录状态已过期，请重新登录。')
      } else {
        setMessage(error.message || '修改失败，请稍后重试')
      }
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return (
    <div className="auth-content">
      <Notice>{message}</Notice>
      <form className="auth-form" onSubmit={submit}>
        <fieldset className="password-fields" disabled={busy} aria-busy={busy}>
          <PasswordField label="原密码" name="currentPassword" autoComplete="current-password" minimum={1} inputRef={currentPasswordRef} />
          <PasswordField label="新密码" name="newPassword" autoComplete="new-password" minimum={10} />
          <PasswordField label="确认新密码" name="confirmPassword" autoComplete="new-password" minimum={10} />
        </fieldset>
        <small className="field-hint">密码至少 10 位，修改后需重新登录。</small>
        <button className="primary-button" type="submit" disabled={busy}>
          <PendingLabel pending={busy}>{busy ? '正在修改' : '修改密码'}</PendingLabel>
        </button>
        <button className="secondary-button" type="button" disabled={busy} onClick={onCancel}>返回账号</button>
      </form>
    </div>
  )
}
