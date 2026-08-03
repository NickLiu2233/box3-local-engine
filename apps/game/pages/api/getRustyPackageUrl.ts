import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// 最低支持rusty的版本号，低于此版本的rusty会提示用户更新
const MIN_APP_VERSION = '1.0.6';

const downloadUrlFilePath = path.join(process.cwd(), 'public/downloadUrl.txt');

type Reponse = {
  needForceUpdate: boolean; // rusty是否需要更新
  downloadUrl: string; // rusty 包的下载链接
};
/**
 * 获取 rusty 包的下载链接
 * @param req.query.version rusty 版本号
 */
export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { version } = req.query;
  console.log('received version:', version);

  if (typeof version !== 'string') {
    return res.status(400).json({
      msg: 'Invalid parameter format',
    });
  }

  const compareResult = compareVersions(version, MIN_APP_VERSION);

  const result: Reponse = {
    needForceUpdate: false,
    downloadUrl: '',
  };

  if (compareResult < 0) {
    result.needForceUpdate = true;
    return res.status(200).json(result);
  }

  const url = await fs.promises.readFile(downloadUrlFilePath, 'utf8');
  result.downloadUrl = url;
  console.log('reponse url:', url);
  return res.status(200).json(result);
};

function compareVersions(v1: string, v2: string): number {
  if (v1 === v2) return 0;

  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}
