'use strict'

// 生产入口与兼容导出；此文件不放安全实现细节。
const { configFromEnvironment } = require('./server/config')
const { createAuthPortalServer } = require('./server/create-server')
const { trustedReturnURL } = require('./server/security/navigation')

if (require.main === module) {
  try {
    const config = configFromEnvironment()
    const server = createAuthPortalServer(config)
    server.listen(config.port, config.host, () => {
      console.log(`BOX player login portal: http://${config.host}:${config.port}`)
    })
  } catch (error) {
    console.error(`Cannot start player login portal: ${error.message}`)
    process.exitCode = 1
  }
}

module.exports = {
  configFromEnvironment,
  createAuthPortalServer,
  trustedReturnURL,
}
