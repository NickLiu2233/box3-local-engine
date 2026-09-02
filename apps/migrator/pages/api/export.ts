import fs from 'fs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { generateModelProjectArchive, generateProjectArchive } from '../../lib/export-project'

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }
  let archivePath = ''
  try {
    const body = req.body || {}
    const result =
      body.source === 'model-id' || body.source === 'model-hash'
        ? await generateModelProjectArchive({
            modelHash: body.modelHash ? String(body.modelHash) : undefined,
            modelId: body.modelId ? Number(body.modelId) : undefined,
            projectName: typeof body.projectName === 'string' ? body.projectName : undefined,
            modelType: body.modelType ? Number(body.modelType) : undefined,
            modelMapId: body.modelMapId ? Number(body.modelMapId) : undefined,
          })
        : await generateProjectArchive(body)
    archivePath = result.archivePath
    res.status(200)
    res.setHeader(
      'Content-Type',
      result.filename.endsWith('.voxaproject')
        ? 'application/vnd.box.voxaproject+zip'
        : 'application/gzip',
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="project${result.filename.endsWith('.voxaproject') ? '.voxaproject' : '.boxproject'}"; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
    )
    res.setHeader('X-Box-Migrator-Blob-Count', String(result.blobCount))
    res.setHeader('X-Box-Migrator-Total-Bytes', String(result.totalBytes))
    const stream = fs.createReadStream(archivePath)
    stream.on('error', (error) => res.destroy(error))
    stream.on('close', () => fs.rmSync(archivePath, { force: true }))
    return stream.pipe(res)
  } catch (error) {
    if (archivePath) fs.rmSync(archivePath, { force: true })
    return res.status(400).json({ message: (error as Error).message || '迁移失败' })
  }
}
