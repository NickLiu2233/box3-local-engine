'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const privatePath = path.join(root, 'apps/license-server/.local/license-private-key.pem')
const publicPath = path.join(root, 'distribution/license-public-key.pem')

if (fs.existsSync(privatePath) || fs.existsSync(publicPath)) {
  throw new Error('许可证密钥已存在；为避免意外失效，不会自动覆盖')
}
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
fs.mkdirSync(path.dirname(privatePath), { recursive: true })
fs.writeFileSync(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 })
fs.writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }))
console.log(`许可证公钥已写入 ${path.relative(root, publicPath)}`)
console.log('私钥已写入忽略目录；请立即离线备份，绝不能提交或分发。')
