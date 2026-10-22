import { Readable } from 'node:stream'
import type { NextApiRequest, NextApiResponse } from 'next'
import { VOXA_PLAY_MAX_BYTES } from '@box/voxa-project'
import { playerAdminRoute } from './player-admin-route'
import { allowPlayLibraryAdmin } from './play-admin-security'
import { deletePlayModel, importPlayModel, listPlayModels, updatePlayModel } from './play-models'

export async function readModelRequest(req: AsyncIterable<Buffer | string>, limit: number) {
  let total = 0
  const chunks: Buffer[] = []
  for await (const input of req) {
    const chunk = Buffer.isBuffer(input) ? input : Buffer.from(input)
    total += chunk.length
    if (total > limit) throw new Error(`上传文件不能超过 ${Math.ceil(limit / 1024 / 1024)}MB`)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export function playModelAdminRequirement(req: Pick<NextApiRequest, 'method'>) {
  return req.method === 'GET' ? ('play-models.view' as const) : ('play-models.manage' as const)
}

const delegated = playerAdminRoute(
  {
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    requirement: playModelAdminRequirement,
    errorContext: 'Model preview administration proxy failed',
  },
  async ({ req, res }) => {
    const parts = Array.isArray(req.query.id) ? req.query.id : req.query.id ? [req.query.id] : []
    if (parts.length > 1 || (parts[0] && !/^[a-f0-9-]{36}$/.test(parts[0])))
      return res.status(404).end()
    const base = (
      process.env.BOX_PLAY_INTERNAL_URL ||
      process.env.BOX_PLAY_PUBLIC_URL ||
      ''
    ).replace(/\/$/, '')
    const token = process.env.BOX_PLAY_ADMIN_TOKEN || ''
    if (!/^https?:\/\//.test(base) || token.length < 16)
      throw new Error('游玩端内部地址或服主密钥未配置')
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    if (typeof req.headers['content-type'] === 'string')
      headers['Content-Type'] = req.headers['content-type']
    const response = await fetch(
      `${base}/api/play-admin/models${parts[0] ? `/${encodeURIComponent(parts[0])}` : ''}`,
      {
        method: req.method,
        headers,
        ...(['POST', 'PATCH'].includes(req.method || '')
          ? { body: req as unknown as BodyInit, duplex: 'half' }
          : {}),
        signal: AbortSignal.timeout(120000),
      } as RequestInit,
    )
    res.statusCode = response.status
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
    if (!response.body) return res.end()
    return Readable.fromWeb(response.body as never).pipe(res)
  },
)

export default async function playModelAdminRoute(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (process.env.BOX_DEPLOYMENT_MODE === 'player-service') return delegated(req, res)
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return res.status(405).end()
  }
  if (!allowPlayLibraryAdmin(req, res)) return
  const parts = Array.isArray(req.query.id) ? req.query.id : req.query.id ? [req.query.id] : []
  if (parts.length > 1) return res.status(404).end()
  const id = parts[0]
  try {
    if (req.method === 'GET' && !id) return res.status(200).json({ models: listPlayModels() })
    if (req.method === 'POST' && !id)
      return res
        .status(201)
        .json({ model: importPlayModel(await readModelRequest(req, VOXA_PLAY_MAX_BYTES)) })
    if (req.method === 'PATCH' && id)
      return res.status(200).json({
        model: updatePlayModel(
          id,
          JSON.parse((await readModelRequest(req, 16384)).toString('utf8')),
        ),
      })
    if (req.method === 'DELETE' && id) {
      deletePlayModel(id)
      return res.status(204).end()
    }
    return res.status(405).end()
  } catch (error) {
    return res
      .status(400)
      .json({ message: error instanceof Error ? error.message : '模型预览操作失败' })
  }
}
