import fs from 'fs';
import path from 'path';

export function getLocalProjectStateHash(statePath = process.env.BOX_PROJECT_STATE_PATH) {
  if (!statePath) return '';
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return typeof state.permissionHash === 'string' ? state.permissionHash : '';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw error;
  }
}

/** Persists the editable project root separately from content-addressed blobs. */
export function persistLocalProjectState(
  permissionHash: string,
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  if (!statePath || !permissionHash) return;
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.${process.pid}.tmp`;
  fs.writeFileSync(
    temporaryPath,
    `${JSON.stringify(
      {
        formatVersion: 1,
        permissionHash,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  fs.renameSync(temporaryPath, statePath);
}
