import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import { finishMigrationDownload, takeMigrationArchive } from '../../lib/migration-jobs';

export const config = { api: { responseLimit: false } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || '');
  const result = takeMigrationArchive(id);
  if (!result) return res.status(404).json({ message: '工程包不存在或迁移尚未完成' });
  res.status(200);
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="project.boxproject"; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
  const stream = fs.createReadStream(result.archivePath);
  stream.on('error', (error) => res.destroy(error));
  stream.on('close', () => finishMigrationDownload(id));
  return stream.pipe(res);
}
