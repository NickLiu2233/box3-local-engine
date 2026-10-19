import { allocEmptyVoxels } from '@box/utils/helper';
import { VoxelManager } from '../../voxa/src/models/voxel-app/voxel-manager';

function fixture() {
  const source = allocEmptyVoxels(4, 4, 4);
  let applied = source;
  const manager = new VoxelManager({
    models: {} as any,
    controller: {} as any,
    applyVoxels: ([next]) => {
      // The editor releases the previous destination when adopting a view.
      // Clear it here to expose writes that reuse that released buffer.
      source.data.fill(0);
      applied = next;
    },
  });
  manager.addModel('part', source);
  return { source, manager, applied: () => applied };
}

test('automation fill survives replacing the editor destination buffer', () => {
  const { manager, applied } = fixture();
  manager.fillRegion('part', [0, 0, 0], [1, 1, 1], 3);
  expect(applied().getVoxel(0, 0, 0)).toBe(3);
  expect(applied().getVoxel(1, 1, 1)).toBe(3);
  expect(applied().getVoxel(2, 2, 2)).toBe(0);
});

test('automation mirror survives replacing the editor destination buffer', () => {
  const { source, manager, applied } = fixture();
  source.setVoxel(0, 1, 2, 5);
  manager.mirror('part', 0);
  expect(applied().getVoxel(3, 1, 2)).toBe(5);
  expect(applied().getVoxel(0, 1, 2)).toBe(0);
});
