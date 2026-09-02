import fs from 'node:fs';
import path from 'node:path';

const projectsDirectory = path.resolve(__dirname, '../pages/projects');
const pageSource = fs.readFileSync(path.join(projectsDirectory, 'index.tsx'), 'utf8');
const styleSource = fs.readFileSync(path.join(projectsDirectory, 'projects.module.css'), 'utf8');
const projectApiSource = fs.readFileSync(
  path.resolve(__dirname, '../pages/api/local-projects/[id].ts'),
  'utf8',
);
const projectManagerSource = fs.readFileSync(
  path.resolve(__dirname, '../../local-engine/src/project-manager.js'),
  'utf8',
);
const playHomeSource = fs.readFileSync(path.resolve(__dirname, '../pages/index.tsx'), 'utf8');

describe('creator project editor dialog', () => {
  test('keeps modal backdrops above the fixed creator footer', () => {
    const backdropZIndex = Number(
      styleSource.match(/\.dialogBackdrop\s*\{[^}]*z-index:\s*(\d+);/s)?.[1],
    );
    const footerZIndex = Number(
      styleSource.match(/\.creatorFooter\s*\{[^}]*z-index:\s*(\d+);/s)?.[1],
    );
    const progressBackdropZIndex = Number(
      styleSource.match(/\.exportBackdrop\s*\{[^}]*z-index:\s*(\d+);/s)?.[1],
    );
    expect(backdropZIndex).toBeGreaterThan(footerZIndex);
    expect(progressBackdropZIndex).toBeGreaterThan(footerZIndex);
  });

  test('uses a roomy, viewport-safe details dialog', () => {
    expect(pageSource).toContain("dialog === 'details' ? styles.detailsDialog : ''");
    expect(styleSource).toMatch(
      /\.detailsDialog\s*\{[^}]*width:\s*min\(100%,\s*560px\);[^}]*max-height:\s*calc\(100(?:dvh|vh)\s*-\s*48px\);[^}]*overflow-y:\s*auto;/s,
    );
  });

  test('groups labels, controls and help text into stable field rows', () => {
    expect(pageSource).toContain('className={styles.dialogFields}');
    expect(
      pageSource.match(/className=\{styles\.fieldGroup\}/g)?.length || 0,
    ).toBeGreaterThanOrEqual(5);
    expect(styleSource).toMatch(/\.dialogFields\s*\{[^}]*display:\s*grid;[^}]*gap:\s*16px;/s);
    expect(styleSource).toMatch(/\.fieldGroup\s*\{[^}]*display:\s*grid;[^}]*gap:\s*7px;/s);
  });

  test('provides separate square artwork and widescreen loading cover pickers', () => {
    expect(pageSource).toContain('className={styles.coverFileInput}');
    expect(pageSource).toContain('className={styles.coverPicker}');
    expect(pageSource).toContain('作品封面');
    expect(pageSource).toContain('封面图');
    expect(pageSource).toContain("readProjectImage(file, '作品封面', 1)");
    expect(pageSource).toContain("readProjectImage(file, '封面图', 16 / 9)");
    expect(styleSource).toMatch(/\.coverPreviewSquare\s*\{[^}]*aspect-ratio:\s*1;/s);
    expect(styleSource).toMatch(/\.coverPreviewWide\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9;/s);
    expect(styleSource).toMatch(
      /\.coverFileInput\s*\{[^}]*position:\s*absolute;[^}]*opacity:\s*0;/s,
    );
  });

  test('accepts two project images up to 3 MB without exceeding the project API body limit', () => {
    expect(pageSource).toContain('const projectImageMaxBytes = 3 * 1024 * 1024;');
    expect(pageSource).toContain('不能超过 3MB');
    expect(pageSource.match(/最大 3MB/g)).toHaveLength(2);
    expect(projectApiSource).toMatch(/bodyParser:\s*\{\s*sizeLimit:\s*'10mb'\s*\}/);
    expect(projectManagerSource).toContain('const projectImageMaxBytes = 3 * 1024 * 1024');
    expect(projectManagerSource).toContain('projectImageMaxDataUrlBytes');
  });

  test('does not export an older release when the requested publish version already exists', () => {
    expect(pageSource).not.toContain("includes('Release already exists')");
    expect(pageSource).toContain("throw new Error(data.message || '生成游戏包版本失败')");
    expect(pageSource).toContain('function nextReleaseVersion(version?: string)');
    expect(pageSource).toContain('setReleaseVersion(nextReleaseVersion(mainProject.latestRelease));');
  });

  test('uses compact square artwork cards on the Play home page', () => {
    expect(playHomeSource).toContain('src={main.cover || DEFAULT_MAP_COVER}');
    expect(playHomeSource).toMatch(
      /\.playWorkCenter \.playerGrid \.cover\s*\{[^}]*aspect-ratio:\s*1;/s,
    );
    expect(playHomeSource).toMatch(
      /\.playerGrid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill, minmax\(208px, 224px\)\);[^}]*justify-content:\s*start;/s,
    );
  });

  test('uses the same square artwork cover ratio in the Creator gallery', () => {
    expect(styleSource).toMatch(
      /\/\* Project discovery[\s\S]*?\.cover,\s*\.coverSunset,[\s\S]*?aspect-ratio:\s*1;/,
    );
  });
});
