import fs from 'fs';
import path from 'path';

export type PlayWorld = {
  id: string;
  name: string;
  author: string;
  description: string;
  cover: string;
  version: string;
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
            name: manifest.projectName || entry.name,
            author: manifest.author || '',
            description: manifest.description || '',
            cover: manifest.cover || '',
            version: manifest.version || '',
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
