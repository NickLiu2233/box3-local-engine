'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { verifyLicense } = require('../../packages/license')

const FEATURES = ['creator', 'play', 'voxa', 'player-service', 'player-auth-portal']

function writePrivateFile(filesystem, target, content) {
  filesystem.mkdirSync(path.dirname(target), { recursive: true })
  const temporary = `${target}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`
  filesystem.writeFileSync(temporary, content, { mode: 0o600 })
  filesystem.renameSync(temporary, target)
  filesystem.chmodSync?.(target, 0o600)
}

function createLicenseManager(options = {}) {
  const root = path.resolve(options.root || process.env.BOX_SERVER_MANAGER_ROOT || '/workspace')
  const filesystem = options.filesystem || fs
  const licenseDirectory = path.join(root, 'license')
  const licensePath = path.join(licenseDirectory, 'box3-license.boxlic')
  const legacyLicensePath = path.join(licenseDirectory, 'box3-license.lic')
  const devicePath = path.join(licenseDirectory, 'device-id')
  const installSecretPath = path.join(licenseDirectory, 'install-secret')
  const hardwareIdPath = path.resolve(
    options.hardwareIdPath || process.env.BOX_LICENSE_HARDWARE_ID_FILE || '/run/host-machine-id',
  )
  const publicKeyPath = path.resolve(
    options.publicKeyPath ||
      process.env.BOX_LICENSE_PUBLIC_KEY_PATH ||
      path.join(__dirname, '../../distribution/license-public-key.pem'),
  )

  function installSecret() {
    try {
      const current = filesystem.readFileSync(installSecretPath, 'utf8').trim()
      if (/^[a-f0-9]{64}$/.test(current)) return current
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }

    let value = ''
    try {
      const legacy = filesystem.readFileSync(devicePath, 'utf8').trim()
      if (/^dev_[a-f0-9]{64}$/.test(legacy)) value = legacy.slice(4)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    if (!value) value = crypto.randomBytes(32).toString('hex')
    writePrivateFile(filesystem, installSecretPath, `${value}\n`)
    return value
  }

  function hardwareIdentity() {
    const value = String(
      options.hardwareId || filesystem.readFileSync(hardwareIdPath, 'utf8'),
    ).trim()
    if (!/^[A-Za-z0-9._:-]{8,256}$/.test(value)) {
      throw new Error('无法读取有效的 Linux 设备标识')
    }
    return value.toLowerCase()
  }

  function deviceId() {
    const value = `dev_${crypto
      .createHash('sha256')
      .update('box3-engine-device-v2\0')
      .update(hardwareIdentity())
      .update('\0')
      .update(installSecret())
      .digest('hex')}`
    try {
      if (filesystem.readFileSync(devicePath, 'utf8').trim() === value) return value
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    writePrivateFile(filesystem, devicePath, `${value}\n`)
    return value
  }

  function status() {
    const device = deviceId()
    let token
    try {
      token = [licensePath, legacyLicensePath]
        .map((candidate) => {
          try {
            return filesystem.statSync(candidate).isFile()
              ? filesystem.readFileSync(candidate, 'utf8')
              : ''
          } catch (error) {
            if (error?.code === 'ENOENT') return ''
            throw error
          }
        })
        .find(Boolean)
      if (!token) throw new Error('license-not-installed')
    } catch {
      return {
        installed: false,
        valid: false,
        deviceId: device,
        licenseId: '',
        holderId: '',
        expiresAt: '',
        message: '尚未安装个人学习许可证',
      }
    }
    try {
      const payload = verifyLicense(token, {
        publicKey: filesystem.readFileSync(publicKeyPath, 'utf8'),
        deviceId: device,
      })
      if (FEATURES.some((feature) => !payload.features.includes(feature))) {
        throw new Error('许可证未包含完整的个人学习功能')
      }
      return {
        installed: true,
        valid: true,
        deviceId: device,
        licenseId: payload.licenseId,
        holderId: payload.holderId,
        expiresAt: payload.expiresAt,
        message: '许可证有效',
      }
    } catch (error) {
      return {
        installed: true,
        valid: false,
        deviceId: device,
        licenseId: '',
        holderId: '',
        expiresAt: '',
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }

  function install(token) {
    token = String(token || '').trim()
    if (!token || token.length > 16 * 1024) throw new Error('许可证内容无效')
    const device = deviceId()
    const payload = verifyLicense(token, {
      publicKey: filesystem.readFileSync(publicKeyPath, 'utf8'),
      deviceId: device,
    })
    if (FEATURES.some((feature) => !payload.features.includes(feature))) {
      throw new Error('许可证未包含完整的个人学习功能')
    }
    writePrivateFile(filesystem, licensePath, `${token}\n`)
    return status()
  }

  function requireLicense() {
    const current = status()
    if (!current.valid) throw new Error(`${current.message}；请先在许可证管理中安装或续期`)
  }

  return { install, requireLicense, status }
}

module.exports = { createLicenseManager }
