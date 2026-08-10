import fs from 'fs';
import path from 'path';
import type { RetrievedGroupProjectMetaData } from '@box-local/build-system/group-project/index';

type LocalProjectState = {
  formatVersion?: number;
  permissionHash?: string;
  extraProjectHash?: string;
  extraProjectMode?: string;
  cloudMapId?: number;
  skinPreviews?: Record<string, string>;
  skinProjects?: Record<string, string>;
  modelPreviews?: Record<string, string>;
  modelProjects?: Record<string, string>;
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

export function getLocalProjectSkinPreviews(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const value = readLocalProjectState(statePath).skinPreviews;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([name, hash]) =>
        Boolean(name) && typeof hash === 'string' && Boolean(hash),
    ),
  );
}

export function getLocalProjectSkinProjects(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const value = readLocalProjectState(statePath).skinProjects;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([name, hash]) =>
        Boolean(name) && typeof hash === 'string' && Boolean(hash),
    ),
  );
}

function getLocalProjectModelMetadata(
  key: 'modelPreviews' | 'modelProjects',
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const value = readLocalProjectState(statePath)[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([name, hash]) => Boolean(name) && typeof hash === 'string' && Boolean(hash),
    ),
  );
}

export function getLocalProjectModelPreviews(statePath = process.env.BOX_PROJECT_STATE_PATH) {
  return getLocalProjectModelMetadata('modelPreviews', statePath);
}

export function getLocalProjectModelProjects(statePath = process.env.BOX_PROJECT_STATE_PATH) {
  return getLocalProjectModelMetadata('modelProjects', statePath);
}

export function updateLocalProjectModelMetadata(
  update: (metadata: {
    modelPreviews: Record<string, string>;
    modelProjects: Record<string, string>;
  }) => void,
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  if (!statePath) return;
  const state = readLocalProjectState(statePath);
  const metadata = {
    modelPreviews: getLocalProjectModelPreviews(statePath),
    modelProjects: getLocalProjectModelProjects(statePath),
  };
  update(metadata);
  state.modelPreviews = metadata.modelPreviews;
  state.modelProjects = metadata.modelProjects;
  state.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temporaryPath, statePath);
}

export function updateLocalProjectSkinMetadata(
  update: (metadata: {
    skinPreviews: Record<string, string>;
    skinProjects: Record<string, string>;
  }) => void,
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  if (!statePath) return;
  const state = readLocalProjectState(statePath);
  const metadata = {
    skinPreviews: getLocalProjectSkinPreviews(statePath),
    skinProjects: getLocalProjectSkinProjects(statePath),
  };
  update(metadata);
  state.skinPreviews = metadata.skinPreviews;
  state.skinProjects = metadata.skinProjects;
  state.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temporaryPath, statePath);
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
        ...(previous.skinPreviews
          ? { skinPreviews: previous.skinPreviews }
          : {}),
        ...(previous.skinProjects
          ? { skinProjects: previous.skinProjects }
          : {}),
        ...(previous.modelPreviews
          ? { modelPreviews: previous.modelPreviews }
          : {}),
        ...(previous.modelProjects
          ? { modelProjects: previous.modelProjects }
          : {}),
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
