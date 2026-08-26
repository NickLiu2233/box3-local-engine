import { describe, expect, it } from '@jest/globals';

import {
  dedupeProjectModelsByContent,
  getProjectModelDisplayName,
  projectModelsForPanel,
  shouldUseProjectModelAdapter,
} from './project-model-membership';

describe('project model membership', () => {
  it('hides the local storage id from the user-facing model name', () => {
    expect(getProjectModelDisplayName('村上春树出现__local_17')).toBe(
      '村上春树出现',
    );
    expect(getProjectModelDisplayName('ordinary-model')).toBe('ordinary-model');
  });

  it('keeps project ownership independent from a legacy local storage path', () => {
    expect(shouldUseProjectModelAdapter({ libraryScope: 'project' })).toBe(true);
    expect(shouldUseProjectModelAdapter({ libraryScope: 'local' })).toBe(false);
  });
  it('keeps a saved project model visible before it is placed in a map', () => {
    expect(
      projectModelsForPanel(
        [{ id: 1, meshPath: 'mesh/未放置.vb' }],
      ),
    ).toEqual([{ id: 1, meshPath: 'mesh/未放置.vb' }]);
  });

  it('does not treat a missing project asset path as a project model', () => {
    expect(projectModelsForPanel([{ id: 1 }])).toEqual([]);
  });

  it('shows identical edited model content only once', () => {
    const hash = 'QmEditedModel';
    const result = dedupeProjectModelsByContent([
      { id: 1, modelFileHash: hash, meshPath: 'mesh/模型.vb' },
      { id: 2, modelFileHash: hash, meshPath: 'mesh/模型副本.vb' },
    ]);
    expect(result).toEqual([
      { id: 1, modelFileHash: hash, meshPath: 'mesh/模型.vb' },
    ]);
  });

  it('does not collapse different model content', () => {
    expect(
      dedupeProjectModelsByContent([
        { id: 1, modelFileHash: 'QmFirst' },
        { id: 2, modelFileHash: 'QmSecond' },
      ]),
    ).toHaveLength(2);
  });
});
