import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, test } from '@jest/globals';

import { importPlayBundle, updatePlayWorld } from './play-admin';

const { resolveWorld } = require('../../local-engine/src/play-library') as {
  resolveWorld: (root: string, reference: string) => { id: string } | null;
};

const temporaryRoots: string[] = [];

function createGroupBundle() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-play-group-test-'));
  temporaryRoots.push(root);
  const input = path.join(root, 'input');
  const archivePath = path.join(root, 'group.boxplay');
  const members = [
    { id: 'group-main', mapUuid: '11111111-1111-4111-8111-111111111111', name: '主地图', mapRole: 'main' },
    { id: 'group-dungeon', mapUuid: '22222222-2222-4222-8222-222222222222', name: '副地图', mapRole: 'submap' },
  ] as const;

  for (const member of members) {
    const worldRoot = path.join(input, 'worlds', member.id);
    const permissionHash = `permission-${member.id}`;
    fs.mkdirSync(path.join(worldRoot, 'data', 'blobs'), { recursive: true });
    fs.writeFileSync(path.join(worldRoot, 'manifest.json'), JSON.stringify({
      formatVersion: 1,
      id: member.id,
      mapUuid: member.mapUuid,
      mapGroupUuid: members[0].mapUuid,
      projectName: member.name,
      version: 'v1',
      permissionHash,
      mapGroupId: 'group-main',
      mainProjectId: 'group-main',
      mapRole: member.mapRole,
    }));
    fs.writeFileSync(
      path.join(worldRoot, 'data', 'project-state.json'),
      JSON.stringify({ permissionHash }),
    );
  }
  fs.writeFileSync(path.join(input, 'bundle.json'), JSON.stringify({
    formatVersion: 1,
    type: 'map-group-play-bundle',
    mapGroupId: 'group-main',
    mapGroupUuid: members[0].mapUuid,
    mainProjectId: 'group-main',
    members: members.map((member) => ({
      id: member.id,
      mapUuid: member.mapUuid,
      mapRole: member.mapRole,
      mainProjectId: 'group-main',
    })),
  }));
  execFileSync('tar', ['-czf', archivePath, '-C', input, 'bundle.json', 'worlds']);
  return { root, archivePath };
}

afterEach(() => {
  delete process.env.BOX_PLAY_LIBRARY_PATH;
  while (temporaryRoots.length) {
    fs.rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

describe('map group play bundle import', () => {
  test('installs the main map and all submaps in one operation', async () => {
    const { root, archivePath } = createGroupBundle();
    const library = path.join(root, 'library');
    process.env.BOX_PLAY_LIBRARY_PATH = library;

    const result = await importPlayBundle(archivePath);

    expect(result.mainProjectId).toBe('group-main');
    expect(result.mapCount).toBe(2);
    expect(result.world.id).toBe('group-main');
    expect(result.worlds.map((world) => world.id).sort()).toEqual([
      'group-dungeon',
      'group-main',
    ]);
    expect(fs.existsSync(path.join(library, 'group-main', 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(library, 'group-dungeon', 'manifest.json'))).toBe(true);
  });

  test('rejects the whole bundle when any member ID already exists', async () => {
    const { root, archivePath } = createGroupBundle();
    const library = path.join(root, 'library');
    fs.mkdirSync(path.join(library, 'group-dungeon'), { recursive: true });
    process.env.BOX_PLAY_LIBRARY_PATH = library;

    await expect(importPlayBundle(archivePath)).rejects.toThrow('已经存在');
    expect(fs.existsSync(path.join(library, 'group-main'))).toBe(false);
    expect(
      fs.readdirSync(library).some((entry) => entry.includes('-importing-')),
    ).toBe(false);
  });

  test('retries transient staging cleanup failures without hiding the install error', async () => {
    const { root, archivePath } = createGroupBundle();
    const library = path.join(root, 'library');
    process.env.BOX_PLAY_LIBRARY_PATH = library;
    const originalRename = fs.renameSync;
    const originalRemove = fs.rmSync;
    let cleanupAttempts = 0;

    fs.renameSync = ((source: fs.PathLike, destination: fs.PathLike) => {
      if (String(source).includes('.group-main-importing-')) {
        throw new Error('fixture installation failure');
      }
      return originalRename(source, destination);
    }) as typeof fs.renameSync;
    fs.rmSync = ((target: fs.PathLike, options?: fs.RmDirOptions) => {
      if (
        String(target).includes('.group-main-importing-') &&
        cleanupAttempts++ === 0
      ) {
        const error = new Error(`ENOTEMPTY: directory not empty, rmdir '${target}/data'`) as NodeJS.ErrnoException;
        error.code = 'ENOTEMPTY';
        throw error;
      }
      return originalRemove(target, options);
    }) as typeof fs.rmSync;
    try {
      await expect(importPlayBundle(archivePath)).rejects.toThrow('fixture installation failure');
    } finally {
      fs.renameSync = originalRename;
      fs.rmSync = originalRemove;
    }

    expect(cleanupAttempts).toBe(2);
    expect(fs.readdirSync(library).some((entry) => entry.includes('-importing-'))).toBe(false);
  });

  test('stores a unique public map ID without changing the internal world ID', async () => {
    const { root, archivePath } = createGroupBundle();
    process.env.BOX_PLAY_LIBRARY_PATH = path.join(root, 'library');
    await importPlayBundle(archivePath);

    const updated = updatePlayWorld('group-main', { publicId: 'my-town' });

    expect(updated?.id).toBe('group-main');
    expect(updated?.mapUuid).toBe('11111111-1111-4111-8111-111111111111');
    expect(updated?.publicId).toBe('my-town');
    expect(resolveWorld(process.env.BOX_PLAY_LIBRARY_PATH!, 'my-town')?.id).toBe('group-main');
    expect(() => updatePlayWorld('group-dungeon', { publicId: 'my-town' }))
      .toThrow('已经被其他地图使用');
    expect(() => updatePlayWorld('group-dungeon', { publicId: 'group-main' }))
      .toThrow('已经被其他地图使用');
    expect(() => updatePlayWorld('group-dungeon', { publicId: '非法 ID' }))
      .toThrow('只能包含小写字母');
  });
});
