// 基础控件负责焦点、提示和密码可见性，不持久化密码。
import React, { useState } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'

export function PendingLabel({ pending, icon: Icon, children }) {
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

export function PasswordField({ label, name, autoComplete, minimum = 8, inputRef }) {
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

export function Notice({ children, tone = 'error' }) {
  if (!children) return null
  return (
    <div className={`message${tone === 'success' ? ' message-success' : ''}`} role={tone === 'success' ? 'status' : 'alert'}>
      {children}
    </div>
  )
}
