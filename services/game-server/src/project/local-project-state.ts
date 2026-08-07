import fs from 'fs';
import path from 'path';
import type { RetrievedGroupProjectMetaData } from '@box-local/build-system/group-project/index';

type LocalProjectState = {
  formatVersion?: number;
  permissionHash?: string;
  extraProjectHash?: string;
  extraProjectMode?: string;
  cloudMapId?: number;
  groupProjectMetaData?: RetrievedGroupProjectMetaData;
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

export function getLocalExtraProjectMode(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const state = readLocalProjectState(statePath);
  return typeof state.extraProjectMode === 'string'
    ? state.extraProjectMode
    : '';
}

export function getLocalGroupProjectMetaData(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const state = readLocalProjectState(statePath);
  const value = state.groupProjectMetaData;
  if (!value || typeof value.version !== 'string' || !value.hashes) {
    return undefined;
  }
  return value;
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
        extraProjectMode: previous.extraProjectMode || '',
        ...(previous.cloudMapId ? { cloudMapId: previous.cloudMapId } : {}),
        ...(previous.groupProjectMetaData
          ? { groupProjectMetaData: previous.groupProjectMetaData }
          : {}),
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  fs.renameSync(temporaryPath, statePath);
}
