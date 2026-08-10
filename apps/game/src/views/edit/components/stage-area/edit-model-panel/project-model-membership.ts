/**
 * Project is a view of the models referenced by the current map. The model's
 * storage origin (local VOXA or an imported project package) does not affect
 * membership.
 */
export function isProjectModelReferenced(
  meshPath: string | undefined,
  referencedMeshPaths: ReadonlySet<string>,
) {
  return Boolean(meshPath && referencedMeshPaths.has(meshPath));
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
