'use strict'

const target = process.env.BOX_LOCAL_WEB_URL || 'http://127.0.0.1:3002'

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
      containerName: 'authentication-check',
      fingerPrint: 'local-edit-session-check',
      serverId: '',
    }),
  })

  const body = await response.json()
  if (response.status !== 401 || body?.code !== 'AUTH_REQUIRED') {
    throw new Error(
      `unauthenticated edit session must return 401 AUTH_REQUIRED, received ${response.status} ${body?.code || ''}`,
    )
  }
  console.log('Edit session authentication guard check passed')
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
