import type { NextApiRequest, NextApiResponse } from 'next';

import { allowAuthenticatedCreatorApi } from '../../../server/creator-api-security';
import {
  creatorModelServiceError,
  requestCreatorModelService,
  sendCreatorModelServiceError,
} from '../../../server/creator-model-service';

type ModelRow = {
  modelPreviewHash?: string;
  modelPreviewUrl?: string;
  [key: string]: unknown;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!await allowAuthenticatedCreatorApi(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  try {
    const response = await requestCreatorModelService('/api/local/models');
    if (!response.ok) throw await creatorModelServiceError(response, '无法读取模型列表');
    const data = await response.json() as { rows?: ModelRow[]; count?: number };
    const rows = (data.rows || []).map((model) => ({
      ...model,
      modelPreviewUrl: model.modelPreviewHash
        ? `/api/creator-models/blobs/${encodeURIComponent(model.modelPreviewHash)}`
        : '',
    }));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      rows,
      count: rows.length,
      service: { state: 'ready' },
    });
  } catch (error) {
    return sendCreatorModelServiceError(res, error);
  }
}
