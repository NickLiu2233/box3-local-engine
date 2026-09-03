'use strict'
/* eslint-env browser */

const state = { token: sessionStorage.getItem('box-license-admin-token') || '' }
const login = document.querySelector('#login')
const consolePanel = document.querySelector('#console')
const logoutButton = document.querySelector('#logout')
const issueForm = document.querySelector('#issue-form')
const message = document.querySelector('#message')
const result = document.querySelector('#result')
const licenseId = document.querySelector('#license-id')
const licenseExpiration = document.querySelector('#license-expiration')
const licenseToken = document.querySelector('#license-token')

function showMessage(value, error = false) {
  message.textContent = value
  message.className = error ? 'error' : ''
}

function renderAuthentication(authenticated) {
  login.hidden = authenticated
  consolePanel.hidden = !authenticated
  logoutButton.hidden = !authenticated
}

function defaultExpiration() {
  const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

async function request(path, options = {}) {
  const response = await fetch(`/v1/admin${path}`, {
    ...options,
    headers: { 'Authorization': `Bearer ${state.token}`, 'Content-Type': 'application/json' },
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.message || '请求失败')
  return body
}

async function authenticate(token) {
  state.token = token
  await request('/session')
  sessionStorage.setItem('box-license-admin-token', token)
  renderAuthentication(true)
}

function logout() {
  state.token = ''
  sessionStorage.removeItem('box-license-admin-token')
  renderAuthentication(false)
  result.hidden = true
  showMessage('')
}

document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const token = String(new FormData(event.currentTarget).get('token') || '').trim()
  try {
    await authenticate(token)
  } catch (error) {
    logout()
    showMessage(error.message, true)
  }
})

issueForm.elements.expiresAt.value = defaultExpiration()
issueForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  result.hidden = true
  showMessage('正在生成许可证…')
  const data = new FormData(event.currentTarget)
  try {
    const body = await request('/licenses/issue', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: String(data.get('deviceId') || '').trim(),
        expiresAt: new Date(String(data.get('expiresAt'))).toISOString(),
      }),
    })
    licenseId.textContent = body.licenseId
    licenseExpiration.textContent = new Date(body.expiresAt).toLocaleString()
    licenseToken.value = body.token
    result.hidden = false
    showMessage('许可证已生成，请核对设备 ID 和到期时间后交给服主。')
  } catch (error) {
    showMessage(error.message, true)
  }
})

document.querySelector('#copy-license').addEventListener('click', async () => {
  await navigator.clipboard.writeText(licenseToken.value)
  showMessage('许可证已复制。')
})

document.querySelector('#download-license').addEventListener('click', () => {
  const blob = new Blob([`${licenseToken.value.trim()}\n`], { type: 'text/plain;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${licenseId.textContent || 'box3-license'}.boxlic`
  link.click()
  URL.revokeObjectURL(link.href)
})

logoutButton.addEventListener('click', logout)

if (state.token) {
  authenticate(state.token).catch(() => logout())
}
