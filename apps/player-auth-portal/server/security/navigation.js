'use strict'

// 回跳白名单来自配置，不能用 startsWith 或用户传来的域名代替。
function trustedReturnURL(source, requested, config) {
  const base = source === 'creator' ? config.creatorURL : source === 'play' ? config.playURL : null
  if (!base) return null
  if (!requested) return base.toString()
  try {
    const candidate = new URL(requested, base)
    return candidate.origin === base.origin ? candidate.toString() : base.toString()
  } catch {
    return base.toString()
  }
}

module.exports = { trustedReturnURL }
