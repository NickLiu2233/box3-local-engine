import type { NextApiRequest, NextApiResponse } from 'next';
import JSZip from 'jszip';

import { getBlob, getModel } from '../../../../../server/local-voxa-store';
import { setLocalCors } from '../../../../../server/local-cors';

function projectFileName(name: string) {
  const safeName = name
    .trim()
    .slice(0, 100)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\.+$/g, '')
    .trim();
  return `${safeName || '未命名模型'}.voxaproject`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!setLocalCors(req, res)) return res.status(403).end('仅允许本机访问');
  if (req.method !== 'GET') return res.status(405).end();

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).end();

  const model = getModel(id);
  if (!model) return res.status(404).json({ message: '模型不存在' });
  if (!model.projectFileHash) {
    return res.status(409).json({ message: '模型还没有可导出的工程数据，请先进入编辑器保存' });
  }
  const project = getBlob(model.projectFileHash);
  if (!project) return res.status(404).json({ message: '模型工程文件不存在' });

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify({
    format: 'box-voxa-project',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    projectName: model.modelName || '未命名模型',
    editType: model.creativeMode === 2 ? 1 : 0,
  }, null, 2));
  zip.file('project.bin', project.data);
  const bundle = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const filename = projectFileName(model.modelName);
  res.setHeader('Content-Type', 'application/vnd.box.voxaproject+zip');
  res.setHeader('Content-Length', String(bundle.length));
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="model.voxaproject"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  return res.status(200).send(bundle);
}
