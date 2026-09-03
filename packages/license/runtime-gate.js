'use strict'

const { spawn } = require('node:child_process')
const fs = require('node:fs')
const { verifyLicenseFiles } = require('./index')
const { createTrustedClock } = require('./trusted-time')

const separator = process.argv.indexOf('--')
const feature = process.argv[2]
const command = separator >= 0 ? process.argv[separator + 1] : ''
const args = separator >= 0 ? process.argv.slice(separator + 2) : []

if (!feature || !command) {
  console.error('许可证启动门禁参数无效')
  process.exit(64)
}

const verification = {
  licensePath: '/run/secrets/box3-license.boxlic',
  publicKeyPath: '/app/license/license-public-key.pem',
  deviceIdPath: '/run/secrets/box3-device-id',
  feature,
}
const timePublicKeyPath =
  process.env.BOX_LICENSE_TIME_PUBLIC_KEY_PATH || '/app/license/license-time-public-key.pem'
const timeMode = process.env.BOX_LICENSE_TIME_MODE || 'signed'

async function main() {
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
    await clock.refresh()
    clock.requireFreshNetworkTime()
    const payload = verifyLicenseFiles({ ...verification, now: clock.currentTime() })
    console.log(`BOX3 Engine license accepted: ${payload.licenseId}`)
  } catch (error) {
    console.error(`BOX3 Engine 无法启动：${error.message}`)
    process.exit(78)
  }

  const child = spawn(command, args, { stdio: 'inherit' })
  let licenseFailure = null
  let checking = false
  const licenseTimer = setInterval(async () => {
    if (checking) return
    checking = true
    try {
      await clock.refresh()
      clock.requireFreshNetworkTime()
      verifyLicenseFiles({ ...verification, now: clock.currentTime() })
    } catch (error) {
      if (licenseFailure) return
      licenseFailure = error
      console.error(`BOX3 Engine 许可证已失效：${error.message}`)
      child.kill('SIGTERM')
      const forceTimer = setTimeout(() => child.kill('SIGKILL'), 10_000)
      forceTimer.unref()
    } finally {
      checking = false
    }
  }, 60_000)
  licenseTimer.unref()

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => child.kill(signal))
  }
  child.on('error', (error) => {
    console.error(`无法启动引擎进程：${error.message}`)
    process.exitCode = 1
  })
  child.on('exit', (code, signal) => {
    clearInterval(licenseTimer)
    if (licenseFailure) process.exit(78)
    if (signal) process.kill(process.pid, signal)
    else process.exit(code ?? 1)
  })
}

main()
