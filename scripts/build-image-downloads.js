'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const services = [
  'creator',
  'voxa',
  'play',
  'player-service',
  'player-auth-portal',
  'server-manager',
]

function validateCatalog(catalog, architecture) {
  if (
    !['amd64', 'arm64'].includes(architecture) ||
    catalog.formatVersion !== 2 ||
    catalog.platform !== `linux/${architecture}` ||
    !catalog.imageTag ||
    !Array.isArray(catalog.images) ||
    catalog.images.length !== services.length
  ) {
    throw new Error('Invalid per-service image catalog')
  }
  for (const service of services) {
    const images = catalog.images.filter((image) => image.image === `box-local-engine-${service}`)
    if (images.length !== 1) throw new Error(`Missing or duplicate image: ${service}`)
    const image = images[0]
    const digest = /^sha256:([a-f0-9]{64})$/.exec(image.imageId || '')?.[1]
    if (
      !digest ||
      !Array.isArray(image.imageIds) ||
      image.imageIds.length < 1 ||
      image.imageIds.length > 2 ||
      !image.imageIds.includes(image.imageId) ||
      image.imageIds.some((id) => !/^sha256:[a-f0-9]{64}$/.test(id)) ||
      image.formatVersion !== 1 ||
      image.platform !== catalog.platform ||
      !image.imageTag ||
      image.archive !==
        `box-local-engine-image-${service}-${architecture}-${image.sha256}.tar.gz` ||
      !/^[a-f0-9]{64}$/.test(image.sha256 || '') ||
      !Number.isSafeInteger(image.size) ||
      image.size <= 0
    ) {
      throw new Error(`Invalid image download: ${service}`)
    }
  }
  return catalog
}

function splitArchive(archive, architecture, destination) {
  const version = require('../package.json').version
  const result = spawnSync(
    process.platform === 'win32' ? 'python' : 'python3',
    [path.join(__dirname, 'split-image-archive.py'), archive, architecture, destination, version],
    { stdio: 'inherit' },
  )
  if (result.error || result.status !== 0)
    throw new Error(result.error?.message || 'Unable to split source image archive')
  return validateCatalog(JSON.parse(fs.readFileSync(destination, 'utf8')), architecture)
}

if (require.main === module) {
  try {
    const [archive, architecture, destination] = process.argv.slice(2)
    if (!archive || !['amd64', 'arm64'].includes(architecture) || !destination)
      throw new Error(
        'Usage: node scripts/build-image-downloads.js <source.tar.gz> <amd64|arm64> <catalog.json>',
      )
    splitArchive(archive, architecture, destination)
    console.log(`Per-service image catalog: ${destination}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

module.exports = { splitArchive, validateCatalog }
