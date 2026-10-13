'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const { markdownFiles, assertLocalLinks } = require('./lib/documentation-links.cjs');

test('README version is optional but an explicitly displayed version must be current', () => {
    const root = path.resolve(__dirname, '..');
    const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
    const readme = fs
        .readFileSync(path.join(root, 'README.md'), 'utf8')
        .replace(/当前源码版本：`[^`]+`/g, '');
    for (const [displayed, success] of [
        [null, true],
        [version, true],
        ['0.0.0', false],
    ]) {
        const source = readme + (displayed === null ? '' : `\n当前源码版本：\`${displayed}\``);
        const script = `const fs = require('node:fs');
const original = fs.readFileSync;
fs.readFileSync = (file, ...args) => file === ${JSON.stringify(path.join(root, 'README.md'))} ? ${JSON.stringify(source)} : original(file, ...args);
require(${JSON.stringify(path.join(root, 'scripts/check-documentation.js'))});`;
        const result = spawnSync(process.execPath, ['-e', script], {
            cwd: root,
            encoding: 'utf8',
            timeout: 10_000,
        });
        assert.ifError(result.error);
        if (success) {
            assert.equal(result.status, 0, result.stderr);
        } else {
            assert.notEqual(result.status, 0);
            assert.match(result.stderr, /README source version is outdated/);
        }
    }
});

async function withDocument(source, action) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-document-links-'));
    try {
        const document = path.join(root, 'README.md');
        fs.writeFileSync(document, source);
        fs.writeFileSync(path.join(root, 'guide (current).md'), '# Guide\n');
        await action(document, root);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

test('Markdown reference links and escaped path names resolve without parsing code examples', async () => {
    await withDocument(
        '[guide][current]\n\n[current]: <guide (current).md>\n\n```md\n[example](missing.md)\n```\n',
        (document, root) => assertLocalLinks([document], root),
    );
});

test('missing reference-link destinations fail documentation validation', async () => {
    await withDocument('[guide][current]\n\n[current]: missing.md\n', (document, root) =>
        assert.rejects(assertLocalLinks([document], root), /links to missing missing.md/),
    );
});

test('external URLs, local fragments and encoded file names do not look like missing files', async () => {
    await withDocument(
        '[web](https://example.test/a_(b))\n[section](#section)\n[file](guide%20%28current%29.md#guide)\n',
        (document, root) => assertLocalLinks([document], root),
    );
});

test('documentation inventory excludes build products and private runtime data', async () => {
    await withDocument('# Guide\n', (document, root) => {
        for (const directory of [
            'node_modules',
            'dist-electron',
            'release-electron',
            'data',
            'projects',
        ]) {
            fs.mkdirSync(path.join(root, directory));
            fs.writeFileSync(path.join(root, directory, 'private.md'), '[missing](missing.md)');
        }
        assert.deepEqual(
            markdownFiles(root).sort(),
            [document, path.join(root, 'guide (current).md')].sort(),
        );
    });
});
