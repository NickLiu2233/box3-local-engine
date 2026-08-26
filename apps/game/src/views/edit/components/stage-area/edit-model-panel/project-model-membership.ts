import { ModelType } from '@box-local/apis';

const LOCAL_LIBRARY_MESH_PATH = /__local_\d+\.vb$/;

export function modelTypeForNewModel(scope: 'local' | 'project') {
  return scope === 'local' ? ModelType.Private : ModelType.Project;
}

/**
 * The local VOXA library is loaded into the runtime so models can be previewed
 * before placement. It is not project membership. A local model enters the
 * Project tab only after a map in the group references its canonical mesh
 * path; the `__local_<id>` preview aliases are never user-facing assets.
 */
export function projectModelsForPanel<T>(
  models: T[],
  placedMeshPaths?: ReadonlySet<string>,
) {
  return models.filter((model) => {
    const meshPath = (model as { meshPath?: unknown }).meshPath;
    return (
      typeof meshPath === 'string' &&
      meshPath.startsWith('mesh/') &&
      !LOCAL_LIBRARY_MESH_PATH.test(meshPath) &&
      (!placedMeshPaths || placedMeshPaths.has(meshPath))
    );
  });
}

/**
 * Local VOXA ids are part of the resource key, not part of the user-facing
 * model name. Boxes displays the asset name while keeping its unique id in
 * backend metadata; the local adapter follows the same boundary.
 */
export function getProjectModelDisplayName(name: string) {
  return name.replace(/__local_\d+$/, '');
}

/** Storage paths do not define ownership: legacy project entries can still
 * carry a __local id. The panel scope is the authoritative ownership seam. */
export function shouldUseProjectModelAdapter(model: {
  libraryScope?: 'local' | 'project';
}) {
  return model.libraryScope === 'project';
}

/**
 * Editing can temporarily expose the same model under more than one mesh path.
 * Project presents model content, so identical hashes are shown once.
 */
export function dedupeProjectModelsByContent<
  T extends { modelFileHash?: string },
>(models: T[]) {
  const seenHashes = new Set<string>();
  return models.filter((model) => {
    const hash = model.modelFileHash?.trim();
    if (!hash) return true;
    if (seenHashes.has(hash)) return false;
    seenHashes.add(hash);
    return true;
  });
}
