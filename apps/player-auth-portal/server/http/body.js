'use strict'

// 仅接受小型 JSON 对象；门户不是上传服务或任意内部 API 代理。
const maximumBodyBytes = 32 * 1024

async function readJSONBody(request) {
  const contentType = String(request.headers['content-type'] || '').toLowerCase()
  if (!contentType.startsWith('application/json')) {
    const error = new Error('Content-Type must be application/json')
    error.statusCode = 415
    error.code = 'UNSUPPORTED_MEDIA_TYPE'
    throw error
  }
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maximumBodyBytes) {
      const error = new Error('Request body is too large')
      error.statusCode = 413
      error.code = 'BODY_TOO_LARGE'
      throw error
    }
    chunks.push(chunk)
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch {
    const error = new Error('Request body must be a JSON object')
    error.statusCode = 400
    error.code = 'INVALID_JSON'
    throw error
  }
}

module.exports = { readJSONBody }
