import type { NextApiRequest, NextApiResponse } from 'next'
import { migrateProject } from '@box/voxa-project'
import { getBlob, getModel } from '../../../../server/local-voxa-store'
import { setLocalCors } from '../../../../server/local-cors'
import { requireVoxaModelAccess } from '../../../../server/model-management-access'
import { renderProjectSheet } from '../../../../server/authoring/render'

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' }, responseLimit: false },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!setLocalCors(req, res)) return res.status(403).end()
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).end()
  if (!(await requireVoxaModelAccess(req, res, 'projects.edit'))) return
  try {
    const input = req.body || {}
    const id = Number(input.id)
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('模型 ID 无效')
    const model = getModel(id)
    if (!model) {
      return res.status(404).json({
        code: 'VOXA_MODEL_NOT_FOUND',
        message: '模型不存在',
      })
    }
    const stored = model.projectFileHash
      ? getBlob(model.projectFileHash)
      : undefined
    if (!stored) throw new Error('工程资源不存在或无法读取')
    const project = migrateProject(stored.data)
    if (!project) throw new Error('工程资源无法读取')
    const times = Array.isArray(input.times)
      ? input.times.map(Number)
      : []
    if (
      !times.length ||
      times.length > 24 ||
      new Set(times).size !== times.length ||
      times.some(
        (time: number) =>
          !Number.isFinite(time) || time < 0 || time > 60,
      )
    ) {
      throw new Error('times 需要 1–24 个不重复的 0–60 秒数值')
    }
    const views = Array.isArray(input.views)
      ? input.views.map(String)
      : ['default']
    if (!views.length || views.length > 6) {
      throw new Error('views 需要 1–6 个视角')
    }
    const size =
      input.size === undefined ? 800 : Number(input.size)
    if (!Number.isInteger(size) || size < 128 || size > 1200) {
      throw new Error('预览尺寸需要 128–1200 的整数像素')
    }
    const result = await renderProjectSheet(
      project,
      times.map((time: number) => ({
        motion:
          typeof input.motion === 'string' ? input.motion : undefined,
        time,
      })),
      {
        width: size,
        height: Math.round((size * 5) / 6),
        views,
      },
    )
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      width: result.width,
      height: result.height,
      times,
      views: result.views,
      frames: result.frames.map((frame) => ({
        view: frame.view,
        index: frame.index,
        contentBase64: frame.buffer.toString('base64'),
      })),
    })
  } catch (error) {
    return res.status(400).json({
      code: 'VOXA_RENDER_SHEET_FAILED',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
