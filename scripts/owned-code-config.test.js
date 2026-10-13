'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { patterns, options, manifests } = require('./lib/owned-code-config.cjs');
const configuration = require('../.prettierrc.cjs');
const { orderPackageManifest } = require('./lib/package-manifest-order.cjs');
const root = path.join(__dirname, '..');
const prettier = require(
    require.resolve('prettier', { paths: [path.join(root, 'tools/repo-tooling')] }),
);

test('editor and formatter share the complete owned style scope', () => {
    const editor = fs.readFileSync(path.join(root, '.editorconfig'), 'utf8');
    assert.deepEqual(configuration.overrides[0].files, patterns);
    assert.deepEqual(configuration.overrides[0].options, options);
    assert.equal(options.tabWidth, 4);
    assert.equal(options.semi, true);
    for (const pattern of patterns) {
        assert.ok(
            editor.includes(`[${pattern}]\nindent_size = 4`),
            `EditorConfig misses ${pattern}`,
        );
    }
});

test('every owned package manifest already has the canonical key order', () => {
    for (const file of manifests) {
        const manifest = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
        assert.deepEqual(Object.keys(manifest), Object.keys(orderPackageManifest(manifest)), file);
    }
});

test('portal tests and application documentation receive the owned formatting options', async () => {
    for (const file of [
        'apps/player-auth-portal/test/config.test.ts',
        'apps/player-auth-portal/docs/API.md',
        'apps/player-launcher/docs/release.md',
        'docs/README.md',
        '.eslintrc.cjs',
    ]) {
        const resolved = await prettier.resolveConfig(path.join(root, file));
        assert.equal(resolved.tabWidth, 4, file);
        assert.equal(resolved.semi, true, file);
        assert.equal(resolved.singleQuote, true, file);
    }
});
