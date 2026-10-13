'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const { querySelectorCallback } = require('./lib/deployment-manager-source');
const root = path.resolve(__dirname, '..');

for (const width of [2, 4]) {
    test(`selector callback inspection ignores ${width}-space formatting`, () => {
        const space = ' '.repeat(width);
        const source = `document.querySelectorAll('[data-database-mode]').forEach((node) =>\n${space}node.addEventListener('click', () => {\n${space}${space}state.config.databaseMode = node.dataset.databaseMode;\n${space}}),\n);`;
        const handler = querySelectorCallback(source, '[data-database-mode]');
        assert.match(handler, /state\.config\.databaseMode = node\.dataset\.databaseMode/);
        assert.equal(querySelectorCallback(source, '[data-redis-mode]'), undefined);
    });
}

for (const script of [
    'check-desktop-deployment-manager.js',
    'check-headless-rust-manager.js',
    'check-release-workflow.js',
    'check-server-package-workflow.js',
]) {
    test(`${script} agrees with the current owned source format and contracts`, () => {
        assert.doesNotThrow(() =>
            execFileSync(process.execPath, [path.join(__dirname, script)], {
                cwd: root,
                encoding: 'utf8',
                timeout: 30000,
            }),
        );
    });
}
