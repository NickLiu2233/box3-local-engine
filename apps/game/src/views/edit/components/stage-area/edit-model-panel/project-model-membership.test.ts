import { describe, expect, it } from '@jest/globals';

import {
  dedupeProjectModelsByContent,
  isProjectModelReferenced,
} from './project-model-membership';

describe('project model membership', () => {
  it('does not include an unplaced model', () => {
    expect(
      isProjectModelReferenced('mesh/未放置.vb', new Set()),
    ).toBe(false);
  });

  it('includes a project asset only after the map references it', () => {
    const path = 'mesh/地图模型.vb';
    expect(isProjectModelReferenced(path, new Set([path]))).toBe(true);
  });

  it('includes a local model after it is placed in the map', () => {
    const path = 'mesh/本地模型__local_7.vb';
    expect(isProjectModelReferenced(path, new Set([path]))).toBe(true);
  });

  it('does not include a local model that belongs only to the local library', () => {
    expect(
      isProjectModelReferenced('mesh/本地模型__local_7.vb', new Set()),
    ).toBe(false);
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
