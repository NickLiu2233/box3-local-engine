import type { ExtraProjectInfo } from '@box-local/schema/project/hot-schema';
import { isContentHash } from './content-hash';

/**
 * Lists library models that are about to be sent through the runtime mesh
 * builder. This boundary must never pass partial legacy entries through to
 * `migrateVoxel`.
 */
export function runtimeMeshAssets(meshAssets: ExtraProjectInfo['meshAssets']) {
  return Object.entries(meshAssets).filter(([, asset]) => isContentHash(asset.hash));
}
