import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

import { prepareStandalone } from '../scripts/standalone-manifest.cjs';

test('standalone templates vendor routing and keep unrelated lock entries unchanged', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-portal-vendor-'));
    try {
        const project = path.resolve(import.meta.dirname, '..');
        fs.copyFileSync(path.join(project, 'package.json'), path.join(root, 'package.json'));
        fs.copyFileSync(
            path.join(project, 'package-lock.json'),
            path.join(root, 'package-lock.json'),
        );
        const before = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
        const require = createRequire(import.meta.url);
        prepareStandalone(
            root,
            path.dirname(require.resolve('@box/deployment-routing/package.json')),
        );
        const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
        const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
        assert.equal(
            manifest.dependencies['@box/deployment-routing'],
            'file:vendor/deployment-routing',
        );
        assert.equal(lock.packages[''].version, manifest.version);
        assert.equal(lock.packages['node_modules/@box/deployment-routing'].link, true);
        assert.deepEqual(
            lock.packages['node_modules/react'],
            before.packages['node_modules/react'],
        );
        assert.ok(fs.existsSync(path.join(root, 'vendor/deployment-routing/src/browser.cjs')));
        assert.ok(!fs.existsSync(path.join(root, 'vendor/deployment-routing/node_modules')));
        prepareStandalone(root, path.join(root, 'vendor/deployment-routing'));
        assert.equal(
            JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).dependencies[
                '@box/deployment-routing'
            ],
            'file:vendor/deployment-routing',
        );
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
