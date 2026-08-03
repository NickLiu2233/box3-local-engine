'use strict'

const target = process.env.BOX_LOCAL_WEB_URL || 'http://127.0.0.1:3000'

async function main() {
  const response = await fetch(`${target}/api/createSession`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: target,
      referer: `${target}/e/local`,
    },
    body: JSON.stringify({
      mode: 'edit',
      contentId: 0,
      fingerPrint: 'local-edit-session-check',
      serverId: '',
    }),
  })

  if (!response.ok) {
    throw new Error(`createSession failed with HTTP ${response.status}`)
  }

  const body = await response.json()
  const socketServerUrl = body?.config?.socketServerUrl
  if (socketServerUrl !== 'ws://127.0.0.1:9967') {
    throw new Error(
      `edit session must use ws://127.0.0.1:9967, received ${socketServerUrl}`,
    )
  }
  if (body?.config?.admin !== true) {
    throw new Error('edit session must use a local administrator identity')
  }

  console.log('Edit session routing check passed')
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
