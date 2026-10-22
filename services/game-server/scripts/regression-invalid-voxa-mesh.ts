import assert from 'node:assert/strict';

import type { BuildSystem } from '@box/build-system/build-system';
import { migrateVoxel } from '@box/build-system/tasks/migrate-voxel';
import { modelBytesToSchema } from '@box/voxa-project';

async function main() {
  const metadataHash = 'QmInvalidVoxaMetadata';
  const dataHash = 'QmInvalidVoxaData';
  const metadata = {
    version: 1,
    bounds: [143, 131, 143] as [number, number, number],
    dataHash,
  };
  const invalidData = Buffer.from(
    JSON.stringify({
      bounds: [143, 131, 143],
      voxels: 136028,
      parts: 76,
      palette: 41,
      generator: 'cyberpunk_city.py',
    }),
  );
  const stored = new Map<string, Uint8Array>();
  const warnings: unknown[] = [];

  const buildSystem = {
    logger: {
      info() {},
      warn(...args: unknown[]) {
        warnings.push(args);
      },
    },
    retrieveContent: async (hash: string) => {
      assert.equal(hash, metadataHash);
      return new Uint8Array(Buffer.from(JSON.stringify(metadata)));
    },
    retrieveContentFromS3: async (hash: string) => {
      if (hash === metadataHash) {
        return new Uint8Array(Buffer.from(JSON.stringify(metadata)));
      }
      if (hash === dataHash) return new Uint8Array(invalidData);
      return stored.get(hash);
    },
    storeContentToS3: async (bytes: Uint8Array) => {
      const hash = `stored-${stored.size + 1}`;
      stored.set(hash, bytes);
      return hash;
    },
  } as unknown as BuildSystem;

  const replacementHash = await migrateVoxel(buildSystem, metadataHash);
  const replacementMetadataBytes =
    await buildSystem.retrieveContentFromS3(replacementHash);
  const replacementMetadata = JSON.parse(
    Buffer.from(replacementMetadataBytes!).toString(),
  );
  const replacementBytes = await buildSystem.retrieveContentFromS3(
    replacementMetadata.dataHash,
  );
  const replacementModel = modelBytesToSchema(replacementBytes!);

  assert.equal(replacementMetadata.version, 7);
  assert.deepEqual(replacementMetadata.bounds, metadata.bounds);
  assert.equal(replacementModel?.version, 7);
  assert.deepEqual(replacementModel?.schema.nodes, []);
  assert.equal(warnings.length, 1);
  console.log('invalid VOXA mesh falls back to an empty model');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
