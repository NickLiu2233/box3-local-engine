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
  deletedProjectModelPaths?: string[];
  projectModelPathsByMap?: Record<string, string[]>;
  groupProjectMetaData?: RetrievedGroupProjectMetaData;
  updatedAt?: string;
};

type LocalGroupProjectState = LocalProjectState & {
  formatVersion: number;
  mapGroupId?: string;
  revision?: number;
  createdAt?: string;
};

function writeStateAtomically(statePath: string, state: object) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temporaryPath, statePath);
}

function copyProjectBlobsToGroup() {
  const groupBlobRoot = process.env.BOX_GROUP_CONTENT_PATH;
  const statePath = process.env.BOX_PROJECT_STATE_PATH;
  if (!groupBlobRoot || !statePath) return;
  const projectBlobRoot = path.join(path.dirname(statePath), 'blobs');
  if (!fs.existsSync(projectBlobRoot)) return;
  fs.mkdirSync(groupBlobRoot, { recursive: true });
  for (const entry of fs.readdirSync(projectBlobRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const destination = path.join(groupBlobRoot, entry.name);
    if (!fs.existsSync(destination)) {
      fs.copyFileSync(path.join(projectBlobRoot, entry.name), destination);
      fs.chmodSync(destination, 0o644);
    }
  }
}

function withGroupStateLock<T>(statePath: string, operation: () => T): T {
  const lockPath = `${statePath}.lock`;
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const deadline = Date.now() + 5_000;
  let descriptor: number | undefined;
  while (descriptor === undefined) {
    try {
      descriptor = fs.openSync(lockPath, 'wx');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) {
        throw new Error('timed out waiting for map group state lock');
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
  try {
    return operation();
  } finally {
    fs.closeSync(descriptor);
    fs.rmSync(lockPath, { force: true });
  }
}

function updateLocalGroupProjectState(
  update: (state: LocalGroupProjectState) => void | boolean,
) {
  const statePath = process.env.BOX_GROUP_PROJECT_STATE_PATH;
  if (!statePath) return;
  withGroupStateLock(statePath, () => {
    const previous = readLocalProjectState(statePath) as LocalGroupProjectState;
    const now = new Date().toISOString();
    const next: LocalGroupProjectState = {
      ...previous,
      formatVersion: 1,
      revision: (previous.revision || 0) + 1,
      createdAt: previous.createdAt || now,
      updatedAt: now,
    };
    if (update(next) === false) return;
    copyProjectBlobsToGroup();
    writeStateAtomically(statePath, next);
  });
}

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

function readLocalProjectStateWithGroup(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
): LocalProjectState {
  const groupStatePath = process.env.BOX_GROUP_PROJECT_STATE_PATH;
  const groupState = groupStatePath && groupStatePath !== statePath
    ? readLocalProjectState(groupStatePath)
    : {};
  return {
    ...readLocalProjectState(statePath),
    // Shared resource roots are authoritative at the map-group level. Member
    // files can contain an older materialized snapshot and must not mask a
    // newer group revision written by another map runtime.
    ...groupState,
  };
}

export function getLocalProjectStateHash(statePath = process.env.BOX_PROJECT_STATE_PATH) {
  const state = readLocalProjectState(statePath);
  return typeof state.permissionHash === 'string' ? state.permissionHash : '';
}

export function getLocalExtraProjectStateHash(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const state = readLocalProjectStateWithGroup(statePath);
  return typeof state.extraProjectHash === 'string'
    ? state.extraProjectHash
    : '';
}

export function getLocalExtraProjectMode(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const state = readLocalProjectStateWithGroup(statePath);
  return typeof state.extraProjectMode === 'string'
    ? state.extraProjectMode
    : '';
}

export function getLocalGroupProjectMetaData(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const state = readLocalProjectStateWithGroup(statePath);
  const value = state.groupProjectMetaData;
  if (!value || typeof value.version !== 'string' || !value.hashes) {
    return undefined;
  }
  return value;
}

export function getLocalProjectSkinPreviews(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const value = readLocalProjectStateWithGroup(statePath).skinPreviews;
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
  const value = readLocalProjectStateWithGroup(statePath).skinProjects;
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
  const value = readLocalProjectStateWithGroup(statePath)[key];
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

export function getLocalProjectModelPaths(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const memberships = readLocalProjectStateWithGroup(statePath)
    .projectModelPathsByMap;
  if (!memberships || typeof memberships !== 'object' || Array.isArray(memberships)) {
    return [];
  }
  return Array.from(
    new Set(
      Object.values(memberships).flatMap((paths) =>
        Array.isArray(paths)
          ? paths.filter((value): value is string =>
              typeof value === 'string' && value.startsWith('mesh/'),
            )
          : [],
      ),
    ),
  ).sort();
}

export function getDeletedLocalProjectModelPaths(
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  const paths = readLocalProjectStateWithGroup(statePath)
    .deletedProjectModelPaths;
  if (!Array.isArray(paths)) return [];
  return Array.from(
    new Set(
      paths.filter(
        (value): value is string =>
          typeof value === 'string' && value.startsWith('mesh/'),
      ),
    ),
  ).sort();
}

export function setDeletedLocalProjectModelPath(
  meshPath: string,
  deleted: boolean,
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  if (!statePath || !meshPath.startsWith('mesh/')) return;
  const state = readLocalProjectState(statePath);
  const paths = new Set(
    Array.isArray(state.deletedProjectModelPaths)
      ? state.deletedProjectModelPaths.filter(
          (value): value is string => typeof value === 'string',
        )
      : [],
  );
  if (deleted) paths.add(meshPath);
  else paths.delete(meshPath);
  state.deletedProjectModelPaths = Array.from(paths).sort();
  state.updatedAt = new Date().toISOString();
  writeStateAtomically(statePath, state);
  updateLocalGroupProjectState((group) => {
    const groupPaths = new Set(
      Array.isArray(group.deletedProjectModelPaths)
        ? group.deletedProjectModelPaths
        : [],
    );
    if (deleted) groupPaths.add(meshPath);
    else groupPaths.delete(meshPath);
    group.deletedProjectModelPaths = Array.from(groupPaths).sort();
  });
}

export function syncLocalProjectModelPaths(
  paths: Iterable<string>,
  mapId = process.env.CONTAINER_NAME || '',
) {
  if (!mapId || !process.env.BOX_GROUP_PROJECT_STATE_PATH) return;
  const normalized = Array.from(
    new Set(
      Array.from(paths).filter(
        (value) => typeof value === 'string' && value.startsWith('mesh/'),
      ),
    ),
  ).sort();
  updateLocalGroupProjectState((group) => {
    const previous = Array.isArray(group.projectModelPathsByMap?.[mapId])
      ? group.projectModelPathsByMap![mapId]
          .filter((value): value is string => typeof value === 'string')
          .sort()
      : [];
    if (
      previous.length === normalized.length &&
      previous.every((value, index) => value === normalized[index])
    ) {
      return false;
    }
    group.projectModelPathsByMap = {
      ...(group.projectModelPathsByMap || {}),
      [mapId]: normalized,
    };
    return true;
  });
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
        ...(previous.deletedProjectModelPaths
          ? { deletedProjectModelPaths: previous.deletedProjectModelPaths }
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
  if (extraProjectHash !== undefined) {
    const current = readLocalProjectState(statePath);
    updateLocalGroupProjectState((group) => {
      group.extraProjectHash = current.extraProjectHash;
      group.extraProjectMode = current.extraProjectMode;
      group.skinPreviews = current.skinPreviews;
      group.skinProjects = current.skinProjects;
      group.modelPreviews = current.modelPreviews;
      group.modelProjects = current.modelProjects;
    });
  }
}

export function persistLocalGroupProjectMetaData(
  groupProjectMetaData: RetrievedGroupProjectMetaData,
  statePath = process.env.BOX_PROJECT_STATE_PATH,
) {
  if (!statePath || !groupProjectMetaData) return;
  const state = readLocalProjectState(statePath);
  state.groupProjectMetaData = groupProjectMetaData;
  state.updatedAt = new Date().toISOString();
  writeStateAtomically(statePath, state);
  updateLocalGroupProjectState((group) => {
    group.groupProjectMetaData = groupProjectMetaData;
  });
}
