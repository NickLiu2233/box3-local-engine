'use strict'

const fs = require('node:fs')
const { verifyLicenseFiles } = require('./index')
const { createTrustedClock } = require('./trusted-time')

const feature = process.env.BOX_LICENSE_FEATURE
if (!feature) {
  console.error('BOX3 Engine 无法启动：未配置许可证功能标识')
  process.exit(78)
}

const verification = {
  licensePath: process.env.BOX_LICENSE_PATH || '/run/secrets/box3-license.boxlic',
  publicKeyPath: process.env.BOX_LICENSE_PUBLIC_KEY_PATH || '/app/license/license-public-key.pem',
  deviceIdPath: process.env.BOX_LICENSE_DEVICE_PATH || '/run/secrets/box3-device-id',
  feature,
}
const timePublicKeyPath =
  process.env.BOX_LICENSE_TIME_PUBLIC_KEY_PATH || '/app/license/license-time-public-key.pem'
const timeMode = process.env.BOX_LICENSE_TIME_MODE || 'signed'
const LICENSE_RECHECK_INTERVAL_MS = 60 * 60 * 1000

let clock
try {
  clock = createTrustedClock({
    publicKey: fs.readFileSync(
      process.env.BOX_LICENSE_TIME_URL ? timePublicKeyPath : verification.publicKeyPath,
      'utf8',
    ),
      statePath:
        process.env.BOX_LICENSE_TIME_STATE_PATH || `/tmp/box3-license-time-${feature}.json`,
      timeUrl: process.env.BOX_LICENSE_TIME_URL || '',
      timeMode,
      maxAgeMs: Number(process.env.BOX_LICENSE_TIME_MAX_AGE_MS) || undefined,
  })
  verifyLicenseFiles({ ...verification, now: clock.currentTime() })
} catch (error) {
  console.error(`BOX3 Engine 无法启动：${error.message}`)
  process.exit(78)
}

let checking = false
const timer = setInterval(async () => {
  if (checking) return
  checking = true
  try {
    await clock.refresh()
    clock.requireFreshNetworkTime()
    verifyLicenseFiles({ ...verification, now: clock.currentTime() })
  } catch (error) {
    console.error(`BOX3 Engine 许可证已失效：${error.message}`)
    process.exit(78)
  } finally {
    checking = false
  }
}, LICENSE_RECHECK_INTERVAL_MS)
timer.unref()
