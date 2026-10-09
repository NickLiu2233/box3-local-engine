'use strict'

const fs = require('node:fs')
const path = require('node:path')

function frontendFiles(root, extension) {
  const directory = path.join(root, 'apps/deployment-manager/src')
  return fs
    .readdirSync(directory, { recursive: true })
    .filter((file) => file.endsWith(extension))
    .sort()
    .map((file) => path.join(directory, file))
}

function frontendSource(root, extension = '.js') {
  return frontendFiles(root, extension)
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n')
}

module.exports = { frontendFiles, frontendSource }
