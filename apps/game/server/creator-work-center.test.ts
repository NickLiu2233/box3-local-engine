import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function source(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Creator work center model integration', () => {
  test('offers maps and models in one work center', () => {
    const page = source('pages/projects/index.tsx');
    const library = source('components/creator-model-library.tsx');
    expect(page).toContain('作品中心');
    expect(page).toContain('地图列表');
    expect(page).toContain('模型列表');
    expect(page).toContain('地图作品');
    expect(page).toContain('styles.sectionHeader');
    expect(page).toContain('玩家管理');
    expect(page).not.toContain('href="/system"');
    expect(page).toContain('<CreatorModelLibrary voxaUrl={voxaUrl} />');
    expect(page).toContain('className={styles.cardLink}');
    expect(page).toContain('aria-label={`编辑地图 ${project.name}`}');
    expect(page).not.toContain('<Pencil size={14} /> 编辑</button>');
    expect(library).toContain('模型作品');
    expect(library).toContain('styles.sectionHeader');
    expect(library).toContain('className={styles.cardLink}');
    expect(library).not.toContain('<Pencil size={13} />编辑</button>');
  });

  test('shows a recovery message when VOXA is unavailable', () => {
    const library = source('components/creator-model-library.tsx');
    expect(library).toContain('模型服务未运行');
    expect(library).toContain('pnpm voxa');
    expect(library).toContain('重新检测');
  });

  test('protects the creator model APIs with authenticated creator access', () => {
    for (const endpoint of [
      'pages/api/creator-models/index.ts',
      'pages/api/creator-models/[id].ts',
      'pages/api/creator-models/import.ts',
      'pages/api/creator-models/[id]/export.ts',
      'pages/api/creator-models/blobs/[hash].ts',
    ]) {
      expect(source(endpoint)).toContain('allowAuthenticatedCreatorApi');
    }
  });

  test('keeps the VOXA container health check independent from the removed library route', () => {
    const dockerfile = source('../local-engine/Dockerfile');
    const voxaStage = dockerfile.slice(dockerfile.indexOf('FROM runtime-base AS voxa'));
    expect(voxaStage).toContain("fetch('http://127.0.0.1:3001/api/health-check')");
    expect(voxaStage).not.toContain("fetch('http://127.0.0.1:3001/library')");
  });

  test('does not expose a separate VOXA library route', () => {
    expect(fs.existsSync(path.join(root, '../voxa/pages/library.tsx'))).toBe(false);
  });

  test('keeps local VOXA save-only without a platform publish action', () => {
    const navBar = source('../voxa/src/views/nav-bar/index.tsx');
    expect(navBar).toContain('<SaveButton />');
    expect(navBar).not.toContain('PublishButton');
    expect(
      fs.existsSync(path.join(root, '../voxa/src/views/nav-bar/publish-button.tsx')),
    ).toBe(false);
  });
});
