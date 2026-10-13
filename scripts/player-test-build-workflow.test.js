'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require(
    require.resolve('js-yaml', { paths: [path.join(__dirname, '../tools/repo-tooling')] }),
);

test('staging builds player installers while release keeps its stricter merged-PR rule', () => {
    const root = path.resolve(__dirname, '..');
    const workflow = yaml.load(
        fs.readFileSync(
            path.join(root, '.github/workflows/player-launcher-test-build.yml'),
            'utf8',
        ),
    );
    const release = yaml.load(
        fs.readFileSync(path.join(root, '.github/workflows/player-launcher-release.yml'), 'utf8'),
    );
    assert.deepEqual(workflow.on.push.branches, ['staging']);
    assert.equal(workflow.on.push.tags, undefined);
    assert.equal(workflow.on.pull_request, undefined);
    assert.ok(Object.hasOwn(workflow.on, 'workflow_dispatch'));
    assert.deepEqual(workflow.permissions, { contents: 'read' });
    assert.equal(workflow.env.PLAYER_BUILD_CHANNEL, 'testing');
    assert.deepEqual(Object.keys(workflow.jobs), ['validate', 'installers']);
    assert.equal(workflow.jobs.validate.if, "github.ref == 'refs/heads/staging'");
    assert.deepEqual(
        workflow.jobs.installers.strategy.matrix,
        release.jobs.installers.strategy.matrix,
    );
    const steps = workflow.jobs.installers.steps;
    for (const command of [
        'run check',
        'run test:desktop',
        'run test:menu',
        'run test:cache',
        'release.mts build',
        'release.mts upload',
    ]) {
        assert.ok(
            steps.some((step) => step.run?.includes(command)),
            command,
        );
    }
    assert.ok(steps.every((step) => !step.if?.includes('cache-hit')));
    assert.doesNotMatch(
        JSON.stringify(workflow),
        /action-gh-release|release.mts download|latest\.(?:txt|json)/,
    );
    assert.deepEqual(release.on.push, { branches: ['release'] });
    assert.equal(release.jobs.validate.if, "needs.merge-gate.outputs.merged == 'true'");
    const publish = release.jobs.publish.steps.find(
        (step) => step.uses === 'softprops/action-gh-release@v2',
    );
    assert.equal(publish.with.tag_name, '${{ needs.validate.outputs.tag }}');
    assert.equal(publish.with.target_commitish, '${{ github.sha }}');
});
