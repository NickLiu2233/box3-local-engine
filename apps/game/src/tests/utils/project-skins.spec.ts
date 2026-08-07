import { expect, test } from '@jest/globals';
import { getProjectSkins } from '../../views/edit/components/player-manager/project-skins';

test('returns only imported project skins and marks the project default', () => {
  expect(
    getProjectSkins(
      {
        船员皮肤: { hash: 'skin-a' },
        守卫皮肤: { hash: 'skin-b' },
        'New-model__local_9': { hash: 'local-skin' },
      },
      '船员皮肤',
    ),
  ).toEqual([
    {
      id: expect.any(Number),
      name: '船员皮肤',
      modelFileHash: 'skin-a',
      isDefault: true,
    },
    {
      id: expect.any(Number),
      name: '守卫皮肤',
      modelFileHash: 'skin-b',
      isDefault: false,
    },
  ]);
});
