import fs from 'node:fs';
import path from 'node:path';

const projectsDirectory = path.resolve(__dirname, '../pages/projects');
const pageSource = fs.readFileSync(path.join(projectsDirectory, 'index.tsx'), 'utf8');
const styleSource = fs.readFileSync(
  path.join(projectsDirectory, 'projects.module.css'),
  'utf8',
);

describe('creator project editor dialog', () => {
  test('uses a roomy, viewport-safe details dialog', () => {
    expect(pageSource).toContain("dialog === 'details' ? styles.detailsDialog : ''");
    expect(styleSource).toMatch(
      /\.detailsDialog\s*\{[^}]*width:\s*min\(100%,\s*560px\);[^}]*max-height:\s*calc\(100(?:dvh|vh)\s*-\s*48px\);[^}]*overflow-y:\s*auto;/s,
    );
  });

  test('groups labels, controls and help text into stable field rows', () => {
    expect(pageSource).toContain('className={styles.dialogFields}');
    expect(pageSource.match(/className=\{styles\.fieldGroup\}/g)?.length || 0).toBeGreaterThanOrEqual(5);
    expect(styleSource).toMatch(/\.dialogFields\s*\{[^}]*display:\s*grid;[^}]*gap:\s*16px;/s);
    expect(styleSource).toMatch(/\.fieldGroup\s*\{[^}]*display:\s*grid;[^}]*gap:\s*7px;/s);
  });

  test('replaces the browser-native cover picker with the creator UI control', () => {
    expect(pageSource).toContain('className={styles.coverFileInput}');
    expect(pageSource).toContain('className={styles.coverPicker}');
    expect(pageSource).toContain('更换封面');
    expect(styleSource).toMatch(/\.coverFileInput\s*\{[^}]*position:\s*absolute;[^}]*opacity:\s*0;/s);
  });
});
