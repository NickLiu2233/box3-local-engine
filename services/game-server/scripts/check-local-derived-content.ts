import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { FileSystemContentServer } from '@box-local/content-server/file-system-store-node';
import { LocalDerivedContentServer } from '../src/content/local-derived-content';
import { LocalBuildCache } from '../src/utils/local-build-cache';

async function main() {
  const launcherSource = fs.readFileSync(
    path.resolve(__dirname, '../../../apps/local-engine/src/launcher.js'),
    'utf8',
  );
  assert.match(
    launcherSource,
    /STORAGE_PATH: world\.dataRoot/,
    'play-library runtimes must read the installed world in place',
  );
  assert.match(
    launcherSource,
    /BOX_DERIVED_STORAGE_PATH: derivedRuntimePath/,
    'play-library runtimes must receive a persistent derived cache',
  );
  assert.doesNotMatch(
    launcherSource,
    /fs\.cpSync\(world\.dataRoot/,
    'a cold play runtime must not copy the complete installed world',
  );
  assert.match(
    launcherSource,
    /BOX_CREATOR_EDIT_PREWARM_RUNTIMES/,
    'creator edit runtime prewarm must be configurable',
  );
  assert.match(
    launcherSource,
    /BOX_CREATOR_PLAY_PREWARM_RUNTIMES/,
    'creator preview runtime prewarm must be configurable',
  );
  assert.match(
    launcherSource,
    /BOX_PLAY_PREWARM_RUNTIMES/,
    'play runtime prewarm must be configurable',
  );

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-derived-content-'));
  const sourceRoot = path.join(root, 'world', 'blobs');
  const derivedRoot = path.join(root, 'cache', 'blobs');
  try {
    const source = new FileSystemContentServer(sourceRoot);
    await source.init();
    const sourceHash = await source.store(Buffer.from('published-world'));

    const first = new LocalDerivedContentServer({
      source: new FileSystemContentServer(sourceRoot),
      derived: new FileSystemContentServer(derivedRoot),
    });
    await first.init();
    assert.equal(
      Buffer.from((await first.retrieve(sourceHash))!).toString(),
      'published-world',
      'published blobs must remain readable through the derived layer',
    );

    const derivedHash = await first.store(Buffer.from('prebake-result'));
    assert.equal(
      fs.existsSync(path.join(sourceRoot, derivedHash)),
      false,
      'runtime-derived blobs must not mutate the published world',
    );
    assert.equal(
      fs.existsSync(path.join(derivedRoot, derivedHash)),
      true,
      'runtime-derived blobs must persist in the writable cache',
    );

    const restarted = new LocalDerivedContentServer({
      source: new FileSystemContentServer(sourceRoot),
      derived: new FileSystemContentServer(derivedRoot),
    });
    await restarted.init();
    assert.equal(
      Buffer.from((await restarted.retrieve(derivedHash))!).toString(),
      'prebake-result',
      'a restarted runtime must reuse the previous prebake blob',
    );

    let builds = 0;
    const cachePath = path.join(root, 'cache', 'build-cache.json');
    const firstCache = new LocalBuildCache(cachePath);
    assert.equal(
      await firstCache.store('prebakeMap', ['same-release'], async () => {
        builds += 1;
        return derivedHash;
      }),
      derivedHash,
    );
    const restartedCache = new LocalBuildCache(cachePath);
    assert.equal(
      await restartedCache.store('prebakeMap', ['same-release'], async () => {
        builds += 1;
        return 'unexpected-rebuild';
      }),
      derivedHash,
    );
    assert.equal(builds, 1, 'a restarted runtime must not repeat the same prebake');

    const sourceCachePath = path.join(root, 'world', 'build-cache.json');
    const sourceCache = new LocalBuildCache(sourceCachePath);
    await sourceCache.store('prebakeMap', ['editor-result'], async () => sourceHash);
    const playCache = new LocalBuildCache(
      path.join(root, 'cache', 'play-build-cache.json'),
      sourceCachePath,
    );
    assert.equal(
      await playCache.retrieve('prebakeMap', ['editor-result']),
      sourceHash,
      'creator play preview must reuse the editor prebake cache',
    );
    process.stdout.write('Local derived content checks passed.\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
