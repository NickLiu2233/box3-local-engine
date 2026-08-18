import fs from 'fs';
import path from 'path';

const gameRoot = path.resolve(__dirname, '..');

function source(relativePath: string) {
  return fs.readFileSync(path.join(gameRoot, relativePath), 'utf8');
}

function functionBody(contents: string, start: string, end: string) {
  const startIndex = contents.indexOf(start);
  const endIndex = contents.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return contents.slice(startIndex, endIndex);
}

describe('local VOXA library query contract', () => {
  test('the editor local-model tab reads server-wide private models', () => {
    const contents = source(
      'src/views/edit/components/stage-area/edit-model-panel/project-model-source.ts',
    );
    const body = functionBody(
      contents,
      'async function loadLocalModels',
      'const localProjectModelSource',
    );

    expect(body).toContain('modelType: ModelType.Private');
    expect(body).not.toContain('modelType: ModelType.Project');
  });

  test('the local-skin import dialog reads every local skin type', () => {
    const contents = source(
      'src/views/edit/components/player-manager/project-skin/skin-lib/index.tsx',
    );
    const initialLoad = functionBody(
      contents,
      '// 个人皮肤列表',
      'useEffect(() => {\n    if (!searchName)',
    );

    expect(initialLoad).toContain('fetchSkinData({})');
    expect(initialLoad).not.toContain(
      'fetchSkinData({ modelType: ModelType.ExtensionLib })',
    );
    expect(contents.match(/\? undefined\n\s*: libTab/g)).toHaveLength(2);
  });
});
