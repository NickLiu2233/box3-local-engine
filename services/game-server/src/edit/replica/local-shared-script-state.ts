export type LocalSharedScriptActionName = 'share' | 'save' | 'unshare';

/**
 * A shared-script save only changes its content hash. It remains shared until
 * the caller explicitly unshares it.
 */
export function isSharedAfterLocalScriptAction(
  action: LocalSharedScriptActionName,
): boolean {
  return action !== 'unshare';
}

/** A stale editor must never recreate a script another map has unshared. */
export function canPersistLocalSharedScript(
  action: LocalSharedScriptActionName,
  existsInAuthoritativeSnapshot: boolean,
): boolean {
  return action !== 'save' || existsInAuthoritativeSnapshot;
}
