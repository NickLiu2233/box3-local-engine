import fs from 'fs';
import path from 'path';

export type PlayWorld = {
  id: string;
  mapUuid: string;
  publicId: string;
  name: string;
  author: string;
  description: string;
  cover: string;
  version: string;
  mapGroupId: string;
  mapRole: 'main' | 'submap';
  mainProjectId: string;
};

const idPattern = /^[a-z0-9][a-z0-9-]{0,62}$/;

export function getPlayWorlds(): PlayWorld[] {
  const root = process.env.BOX_PLAY_LIBRARY_PATH;
  if (!root) return [];
  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && idPattern.test(entry.name))
      .flatMap((entry) => {
        try {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(root, entry.name, 'manifest.json'), 'utf8'),
          );
          const state = JSON.parse(
            fs.readFileSync(
              path.join(root, entry.name, 'data/project-state.json'),
              'utf8',
            ),
          );
          if (
            manifest.id !== entry.name ||
            !manifest.permissionHash ||
            state.permissionHash !== manifest.permissionHash ||
            !fs.statSync(path.join(root, entry.name, 'data/blobs')).isDirectory()
          ) {
            return [];
          }
          return [{
            id: entry.name,
            mapUuid: String(manifest.mapUuid || entry.name),
            publicId: idPattern.test(String(manifest.publicId || ''))
              ? String(manifest.publicId)
              : entry.name,
            name: manifest.projectName || entry.name,
            author: manifest.author || '',
            description: manifest.description || '',
            cover: manifest.cover || '',
            version: manifest.version || '',
            mapGroupId: manifest.mapGroupId,
            mapRole: manifest.mapRole,
            mainProjectId: manifest.mainProjectId,
          }];
        } catch {
          return [];
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function findPlayWorld(reference: string) {
  return getPlayWorlds().find(
    (world) => world.id === reference || world.publicId === reference,
  );
}
