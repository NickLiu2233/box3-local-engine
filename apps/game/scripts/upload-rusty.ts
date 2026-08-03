import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { ObjectStoreService } from '@box-local/content-server/object-store-service';
import { getServerConfig } from '../configs/server';
import { OssStoreType, RUSTY_OSS_CDN_PATH } from '@box-local/content-server';
import pino from 'pino';

function compressFolder(sourceDir, outputPath) {
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(
        `compress success, total size: ${(
          archive.pointer() /
          (1024 * 1024)
        ).toFixed(2)} mb`,
      );
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

const sourceDir = path.join(__dirname, '../dist');
const outputPath = path.join(__dirname, '../dist.zip');
const downloadUrlFilePath = path.join(__dirname, '../public/downloadUrl.txt');

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
  },
});

async function main() {
  await compressFolder(sourceDir, outputPath);
  const spec = await getServerConfig();
  const ossContentServer = new ObjectStoreService({
    logger,
    uri: spec.CREATERA_BACKEND_SERVER_URL,
    maxConcurrency: spec.MAX_CONTENT_SERVER_CONNECTIONS,
    cdnPath: spec.OSS_CDN_URL,
  });
  await ossContentServer.init();
  const buffer = await fs.promises.readFile(outputPath);
  const hash = await ossContentServer.store(buffer, {
    ossStoreType: OssStoreType.Rusty,
    contentType: 'application/zip',
  });
  console.log('hash', hash);

  const downloadUrl = `${spec.OSS_CDN_URL}${RUSTY_OSS_CDN_PATH}${hash}`;
  console.log('rusty package downloadUrl', downloadUrl);
  await fs.promises.writeFile(downloadUrlFilePath, downloadUrl, 'utf8');

  console.log('upload rusty package success');
}

main();
