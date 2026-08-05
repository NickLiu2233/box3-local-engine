import fs from 'fs';
import os from 'os';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import type { NextApiRequest, NextApiResponse } from 'next';

import { importPlayBundle } from '../../../server/play-admin';
import { allowPlayAdmin } from '../../../server/play-admin-security';

export const config = { api: { bodyParser: false } };
const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  if (!allowPlayAdmin(req, res)) return;

  const temporaryPath = path.join(os.tmpdir(), `box-play-upload-${process.pid}-${Date.now()}.boxplay`);
  let receivedBytes = 0;
  try {
    await pipeline(
      req,
      new Transform({
        transform(chunk, _encoding, callback) {
          receivedBytes += chunk.length;
          callback(receivedBytes > MAX_ARCHIVE_BYTES ? new Error('游玩包不能超过 1GB') : undefined, chunk);
        },
      }),
      fs.createWriteStream(temporaryPath, { flags: 'wx' }),
    );
    const world = await importPlayBundle(temporaryPath);
    return res.status(201).json({ world });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}
