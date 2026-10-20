import {
  CREATOR_CLI_CAPABILITIES,
  LEGACY_CREATOR_CLI_CAPABILITIES,
  normalizeCreatorCliCapabilities,
} from '../shared/creator-cli-policy';

test('new VOXA CLI tokens expose only create, edit, and delete', () => {
  expect(
    CREATOR_CLI_CAPABILITIES.filter((capability) =>
      capability.startsWith('voxa.'),
    ),
  ).toEqual([
    'voxa.project.create',
    'voxa.project.edit',
    'voxa.project.delete',
  ]);
  expect(
    CREATOR_CLI_CAPABILITIES.some((capability) =>
      (LEGACY_CREATOR_CLI_CAPABILITIES as readonly string[]).includes(capability),
    ),
  ).toBe(false);
});

test('legacy VOXA token scopes remain recognized without being selectable', () => {
  expect(normalizeCreatorCliCapabilities([
    'voxa.project.read',
    'voxa.project.export',
    'voxa.scene.capture',
    'voxa.project.create',
    'voxa.project.edit',
    'voxa.project.delete',
    'voxa.project.create',
  ])).toEqual([
    'voxa.project.read',
    'voxa.project.export',
    'voxa.scene.capture',
    'voxa.project.create',
    'voxa.project.edit',
    'voxa.project.delete',
  ]);
});
