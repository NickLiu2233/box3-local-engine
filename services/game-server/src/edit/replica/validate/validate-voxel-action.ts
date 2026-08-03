import { PermissionSet } from '@box-local/schema/permissions/permission-rda';
import { VoxelWrite } from '@box-local/schema/voxel/voxel-protocol';

export function checkVoxelWriteSequence(
  permissions: PermissionSet,
  writes: VoxelWrite[],
) {
  if (!permissions.editVoxels) {
    return false;
  }
  // TODO
  return true;
}
