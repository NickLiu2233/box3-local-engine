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
    { id: 'group-main', name: '主地图', mapRole: 'main' },
    { id: 'group-dungeon', name: '副地图', mapRole: 'submap' },
  ] as const;

  for (const member of members) {
    const worldRoot = path.join(input, 'worlds', member.id);
    const permissionHash = `permission-${member.id}`;
    fs.mkdirSync(path.join(worldRoot, 'data', 'blobs'), { recursive: true });
    fs.writeFileSync(path.join(worldRoot, 'manifest.json'), JSON.stringify({
      formatVersion: 1,
      id: member.id,
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
    mainProjectId: 'group-main',
    members: members.map((member) => ({
      id: member.id,
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

  test('stores a unique public map ID without changing the internal world ID', async () => {
    const { root, archivePath } = createGroupBundle();
    process.env.BOX_PLAY_LIBRARY_PATH = path.join(root, 'library');
    await importPlayBundle(archivePath);

    const updated = updatePlayWorld('group-main', { publicId: 'my-town' });

    expect(updated?.id).toBe('group-main');
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
