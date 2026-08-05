import fs from 'fs';
import os from 'os';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import type { NextApiRequest, NextApiResponse } from 'next';

import { getLocalProjectManager } from '../../../server/local-project-manager';
import { allowCreatorApi } from '../../../server/creator-api-security';

export const config = { api: { bodyParser: false } };

const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowCreatorApi(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const temporaryPath = path.join(os.tmpdir(), `box-project-import-${process.pid}-${Date.now()}.box-project`);
  let receivedBytes = 0;
  try {
    await pipeline(
      req,
      new Transform({
        transform(chunk, _encoding, callback) {
          receivedBytes += chunk.length;
          callback(receivedBytes > MAX_ARCHIVE_BYTES ? new Error('工程包不能超过 1GB') : undefined, chunk);
        },
      }),
      fs.createWriteStream(temporaryPath, { flags: 'wx' }),
    );
    const project = getLocalProjectManager().importProject(temporaryPath);
    return res.status(201).json({ project });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}
