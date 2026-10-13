'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { orderPackageManifest } = require('./lib/package-manifest-order.cjs');

test('package manifests follow the agreed field sequence without changing values', () => {
    const manifest = {
        build: { target: 'dmg' },
        scripts: { test: 'node test.js', build: 'vite build' },
        license: 'MIT',
        private: true,
        version: '1.0.0',
        name: 'fixture',
        dependencies: { z: '1', a: '2' },
        custom: 'keep',
    };
    const ordered = orderPackageManifest(manifest);
    assert.deepEqual(Object.keys(ordered), [
        'name',
        'version',
        'private',
        'license',
        'scripts',
        'dependencies',
        'build',
        'custom',
    ]);
    assert.deepEqual(ordered, manifest);
    assert.deepEqual(Object.keys(ordered.scripts), ['test', 'build']);
    assert.equal(ordered.build, manifest.build);
});
