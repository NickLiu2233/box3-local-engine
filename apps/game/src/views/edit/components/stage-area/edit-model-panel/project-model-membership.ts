/**
 * Project lists every model stored in the current project's resource library.
 * Entity references only affect map content; they never determine whether a
 * saved model is available in the Project model panel.
 */
export function projectModelsForPanel<T extends { meshPath?: string }>(
  models: T[],
) {
  return models.filter((model) => Boolean(model.meshPath?.startsWith('mesh/')));
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
