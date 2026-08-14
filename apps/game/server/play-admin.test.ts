import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, test } from '@jest/globals';

import { importPlayBundle } from './play-admin';

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
});
