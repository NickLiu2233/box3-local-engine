import type { NextApiRequest, NextApiResponse } from 'next'
import { migrateProject, projectSchemaToBytes } from '@box/voxa-project'
import { getBlob, getModel, saveModel, storeBlob } from '../../../../server/local-voxa-store'
import { setLocalCors } from '../../../../server/local-cors'
import { requireVoxaModelAccess } from '../../../../server/model-management-access'
import {
  applyOperations,
  check,
  createProject,
  describeProject,
  type Kind,
} from '../../../../server/authoring/project'
import { compileProject } from '../../../../server/authoring/compile'
import { renderProject } from '../../../../server/authoring/render'

export const config = { api: { bodyParser: { sizeLimit: '16mb' }, responseLimit: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!setLocalCors(req, res)) return res.status(403).end()
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  if (
    !(await requireVoxaModelAccess(
      req,
      res,
      req.method === 'GET'
        ? 'projects.read'
        : req.body?.id === undefined
          ? 'projects.create'
          : 'projects.edit',
    ))
  )
    return
  try {
    const input = req.method === 'GET' ? req.query : req.body
    check(input && typeof input === 'object', '需要请求对象')
    const id = input.id === undefined ? undefined : Number(input.id)
    check(id === undefined || (Number.isSafeInteger(id) && id > 0), '模型 ID 需要正整数')
    const model = id ? getModel(id) : undefined
    if (id && !model)
      return res.status(404).json({ code: 'VOXA_MODEL_NOT_FOUND', message: '模型不存在' })
    const kind: Kind = model
      ? model.creativeMode === 2
        ? 'skin'
        : 'model'
      : (input.kind ?? 'model')
    check(kind === 'model' || kind === 'skin', 'kind 需要 model 或 skin')
    check(
      !model || input.kind === undefined || input.kind === kind,
      '不能通过改标签转换模型和皮肤，请新建对应类型作品',
    )
    const stored = model?.projectFileHash ? getBlob(model.projectFileHash) : undefined
    const original = model ? stored && migrateProject(stored.data) : createProject(kind)
    check(original, '工程资源不存在或无法读取')
    if (req.method === 'GET') {
      check(model, '缺少模型 ID')
      if (input.render === '1') {
        const size =
          input.size === undefined ? undefined : Number(input.size)
        const view = typeof input.view === 'string' ? input.view : undefined
        check(size === undefined || (Number.isInteger(size) && size >= 128 && size <= 1200), '预览尺寸需要 128–1200 的整数像素')
        const png = await renderProject(original, {
          motion: typeof input.motion === 'string' ? input.motion : undefined,
          time: input.time === undefined ? 0 : Number(input.time),
        }, {
          ...(size === undefined ? {} : {
            width: size,
            height: Math.round(size * 5 / 6),
          }),
          view,
        })
        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Cache-Control', 'no-store')
        return res.status(200).send(png)
      }
      return res.status(200).json({ ...model, kind, project: describeProject(original) })
    }
    check(
      input.name === undefined ||
        (typeof input.name === 'string' && input.name.trim() && input.name.length <= 100),
      '名称需要 1–100 个字符',
    )
    check(
      input.description === undefined ||
        (typeof input.description === 'string' && input.description.length <= 500),
      '描述最长 500 个字符',
    )
    check(
      input.expectedProjectFileHash === undefined ||
        input.expectedProjectFileHash === model?.projectFileHash,
      'VOXA_PROJECT_CONFLICT',
    )
    const project = applyOperations(original, input.operations ?? [])
    if (input.validateOnly === true) {
      const compiled = await compileProject(project, kind, async () => 'dry-run')
      await renderProject(project)
      return res.status(200).json({
        modelId: model?.modelId,
        modelName: model?.modelName,
        kind,
        validationOnly: true,
        project: describeProject(project),
        compiled,
      })
    }
    const compiled = await compileProject(project, kind, storeBlob)
    const projectFileHash = await storeBlob(
      Buffer.from(projectSchemaToBytes(project)),
      'application/octet-stream',
    )
    const previewHash = await storeBlob(await renderProject(project), 'image/png')
    const saved = await saveModel(
      {
        modelId: id,
        modelName: input.name ?? model?.modelName ?? (kind === 'skin' ? '新皮肤' : '新模型'),
        modelDescription: input.description ?? model?.modelDescription,
        creativeMode: kind === 'skin' ? 2 : 1,
        modelType: model?.modelType ?? 0,
        animated: project.animations.length > 0,
        modelFileHash: compiled.modelFileHash,
        modelProjectFileHash: projectFileHash,
        modelPreviewFileHash: previewHash,
      },
      model ? { requireExisting: true, expectedProjectFileHash: model.projectFileHash } : undefined,
    )
    return res
      .status(model ? 200 : 201)
      .json({ ...saved, kind, project: describeProject(project), compiled })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return res
      .status(message === 'VOXA_PROJECT_CONFLICT' ? 409 : 400)
      .json({
        code: message === 'VOXA_PROJECT_CONFLICT' ? message : 'VOXA_AUTHORING_FAILED',
        message,
      })
  }
}
