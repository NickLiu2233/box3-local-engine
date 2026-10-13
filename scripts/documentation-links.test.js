'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { markdownFiles, assertLocalLinks } = require('./lib/documentation-links.cjs');

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
