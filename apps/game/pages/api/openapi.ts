import fs from 'node:fs';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';

const apiDocsEnabled = () =>
  process.env.NODE_ENV !== 'production' ||
  process.env.APP_ENV === 'development' ||
  process.env.NEXT_PUBLIC_APP_ENV === 'development';

function findOpenApiDocument() {
  const candidates = [
    path.join(process.cwd(), 'openapi/openapi.json'),
    path.resolve(process.cwd(), '../../internals/apis/openapi/openapi.json'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!apiDocsEnabled()) return res.status(404).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  const document = findOpenApiDocument();
  if (!document)
    return res.status(503).json({ message: 'OpenAPI 文档尚未生成，请执行 npm run api:generate' });
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  fs.createReadStream(document).pipe(res);
}
