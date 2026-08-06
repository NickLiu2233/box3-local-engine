import fs from 'fs';
import path from 'path';

type LocalProjectState = {
  formatVersion?: number;
  permissionHash?: string;
  extraProjectHash?: string;
  updatedAt?: string;
};

function readLocalProjectState(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
): LocalProjectState {
  if (!statePath) return {};
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

export function getLocalProjectStateHash(statePath = process.env.BOX_PROJECT_STATE_PATH) {
  const state = readLocalProjectState(statePath);
  return typeof state.permissionHash === 'string' ? state.permissionHash : '';
}

export function getLocalExtraProjectStateHash(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const state = readLocalProjectState(statePath);
  return typeof state.extraProjectHash === 'string'
    ? state.extraProjectHash
    : '';
}

/** Persists the editable project root separately from content-addressed blobs. */
export function persistLocalProjectState(
  permissionHash: string,
  extraProjectHash?: string,
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  if (!statePath || !permissionHash) return;
  const previous = readLocalProjectState(statePath);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.${process.pid}.tmp`;
  fs.writeFileSync(
    temporaryPath,
    `${JSON.stringify(
      {
        formatVersion: 1,
        permissionHash,
        extraProjectHash:
          extraProjectHash === undefined
            ? previous.extraProjectHash || ''
            : extraProjectHash,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  fs.renameSync(temporaryPath, statePath);
}
