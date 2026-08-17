import type { NextApiRequest, NextApiResponse } from 'next';
import JSZip from 'jszip';
import { migrateProject, projectSchemaToBytes } from '@box-local/voxa-project';

import { saveModel, storeBlob } from '../../../../server/local-voxa-store';
import { setLocalCors } from '../../../../server/local-cors';

const BUNDLE_FORMAT = 'box-voxa-project';
const BUNDLE_VERSION = 1;

export const config = { api: { bodyParser: false, responseLimit: false } };

async function readBody(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  const maximumBytes = Number(process.env.VOXA_MAX_BLOB_BYTES || 268435456);
  let total = 0;
  for await (const chunk of req) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += value.length;
    if (total > maximumBytes) throw new Error('VOXA_BLOB_TOO_LARGE');
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function safeProjectName(value: unknown) {
  return String(value || '').trim().slice(0, 100) || '未命名模型';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!setLocalCors(req, res)) return res.status(403).end('仅允许本机访问');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = await readBody(req);
    if (!body.length) return res.status(400).json({ message: '模型工程文件为空' });
    const zip = await JSZip.loadAsync(body);
    const manifestEntry = zip.file('manifest.json');
    const projectEntry = zip.file('project.bin');
    if (!manifestEntry || !projectEntry) {
      return res.status(400).json({ message: '无法识别这个 VOXA 工程文件' });
    }
    const manifest = JSON.parse(await manifestEntry.async('string')) as {
      format?: string;
      formatVersion?: number;
      projectName?: string;
      editType?: number;
    };
    if (
      manifest.format !== BUNDLE_FORMAT ||
      manifest.formatVersion !== BUNDLE_VERSION ||
      (manifest.editType !== 0 && manifest.editType !== 1)
    ) {
      return res.status(400).json({ message: '不支持的 VOXA 工程版本' });
    }
    const projectBytes = await projectEntry.async('uint8array');
    const project = migrateProject(projectBytes);
    if (!project) return res.status(400).json({ message: 'VOXA 工程数据损坏' });
    const normalizedBytes = Buffer.from(projectSchemaToBytes(project));
    const projectFileHash = await storeBlob(normalizedBytes, 'application/octet-stream');
    const created = await saveModel({
      modelName: safeProjectName(manifest.projectName),
      modelDescription: '',
      modelType: 0,
      creativeMode: manifest.editType === 1 ? 2 : 1,
      modelProjectFileHash: projectFileHash,
    });
    return res.status(201).json(created);
  } catch (error) {
    if ((error as Error).message === 'VOXA_BLOB_TOO_LARGE') {
      return res.status(413).json({ message: '模型工程文件超过大小限制' });
    }
    return res.status(400).json({ message: '无法识别这个 VOXA 工程文件' });
  }
}
