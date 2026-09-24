'use strict'
;(() => {
  const themeKey = 'box-player-admin-theme'
  let theme = 'system'
  try {
    const saved = localStorage.getItem(themeKey)
    if (saved === 'light' || saved === 'dark' || saved === 'system') theme = saved
  } catch {
    // Storage can be unavailable in hardened browser contexts. System theme is
    // a complete fallback and does not prevent authentication.
  }
  document.documentElement.dataset.theme = theme
})()
