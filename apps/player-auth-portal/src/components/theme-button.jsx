// 主题偏好可保存本地；账号凭据不允许。
import React, { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
const themeKey = 'box-player-admin-theme'
const themeOrder = ['system', 'light', 'dark']
const themeLabels = {
  system: '跟随系统',
  light: '亮色',
  dark: '暗色',
}


export function ThemeButton() {
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
