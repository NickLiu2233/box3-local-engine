import { validateRelease } from '../utils/releases.js'

export const RELEASE_MANIFEST_URL = 'https://assets.box3.fun/local-engine/latest.json'

export async function fetchLatestRelease() {
  const controller = new AbortController()
  const deadline = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(RELEASE_MANIFEST_URL, { signal: controller.signal, cache: 'no-store', credentials: 'omit' })
    if (!response.ok) throw new Error(`更新服务暂不可用（${response.status}）`)
    const text = await response.text()
    if (text.length > 128_000) throw new Error('更新清单过大')
    return validateRelease(JSON.parse(text))
  } finally {
    clearTimeout(deadline)
  }
}
