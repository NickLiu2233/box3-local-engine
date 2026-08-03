'use strict'

const fs = require('fs')
const path = require('path')

const {
  FileSystemContentServer,
} = require('@box-local/content-server/file-system-store-node')

const packageRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(packageRoot, '../..')
const blobRoot = path.join(packageRoot, 'data/blobs')
const manifestPath = path.join(
  repoRoot,
  'services/game-server/src/player/default-avatar.json'
)

const avatarApiUrl =
  process.env.BOX_AVATAR_SYNC_API_URL ||
  'https://staging-code-api-pc.dao3.fun/avatar/suit'
const avatarCdnUrl =
  process.env.BOX_AVATAR_SYNC_CDN_URL || 'https://assets.box3.fun'

const bodyParts = {
  1: 'head',
  2: 'hips',
  3: 'leftFoot',
  4: 'leftHand',
  5: 'leftLowerArm',
  6: 'leftLowerLeg',
  7: 'leftShoulder',
  8: 'leftUpperArm',
  9: 'leftUpperLeg',
  10: 'neck',
  11: 'rightFoot',
  12: 'rightHand',
  13: 'rightLowerArm',
  14: 'rightLowerLeg',
  15: 'rightShoulder',
  16: 'rightUpperArm',
  17: 'rightUpperLeg',
  18: 'torso',
}

async function fetchBytes(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unable to download ${url}: HTTP ${response.status}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

async function main() {
  const response = await fetch(avatarApiUrl)
  if (!response.ok) {
    throw new Error(
      `Unable to fetch default avatar metadata: HTTP ${response.status}`
    )
  }

  const payload = await response.json()
  const suit = payload.data?.find((item) => item.type === 0)
  if (!suit || suit.componentList?.length !== 18) {
    throw new Error('Default avatar suit must contain exactly 18 body parts')
  }

  const contentServer = new FileSystemContentServer(blobRoot)
  await contentServer.init()

  const parts = {}
  for (const component of suit.componentList) {
    const part = bodyParts[component.component]
    if (!part) {
      throw new Error(`Unknown avatar body part ${component.component}`)
    }

    const sourceUrl = `${avatarCdnUrl}/avatar/m/${component.hash}`
    const bytes = await fetchBytes(sourceUrl)
    const localHash = await contentServer.store(bytes)
    parts[part] = localHash
    console.log(`${part}: ${component.hash} -> ${localHash}`)
  }

  const orderedParts = Object.fromEntries(
    Object.values(bodyParts).map((part) => [part, parts[part]])
  )
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ name: suit.suitName, parts: orderedParts }, null, 2)}\n`
  )

  console.log(`Default avatar saved to ${manifestPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
