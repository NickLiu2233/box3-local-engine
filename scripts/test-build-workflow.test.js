'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const yaml = require(
    require.resolve('js-yaml', { paths: [path.join(__dirname, '../tools/repo-tooling')] }),
);

const root = path.resolve(__dirname, '..');
const workflow = yaml.load(
    fs.readFileSync(path.join(root, '.github/workflows/test-build.yml'), 'utf8'),
);
const steps = workflow.jobs.images.steps;
const build = steps.find((step) => step.name === 'Build test image archive').run;
const upload = steps.find((step) => step.name === 'Upload test build to Aliyun OSS').run;

test('test and production workflow triggers and upload namespaces remain separate', () => {
    const release = yaml.load(
        fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8'),
    );
    const verify = yaml.load(
        fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'),
    );
    assert.deepEqual(workflow.on.push.branches, ['staging']);
    assert.deepEqual(verify.on.push.branches, [
        'main',
        'dev',
        'staging',
        'release',
        'dev/**',
        'release/**',
        'player-dev/**',
        'player-release/**',
    ]);
    assert.equal(workflow.on.workflow_dispatch, undefined);
    assert.equal(workflow.on.push.tags, undefined);
    assert.equal(workflow.on.pull_request, undefined);
    assert.equal(workflow.jobs.images.if, "needs.merge-gate.outputs.merged == 'true'");
    assert.equal(workflow.jobs.images.needs, 'merge-gate');
    assert.ok(
        workflow.jobs['merge-gate'].steps.some(
            (step) => step.run === 'node scripts/github-build-gate.js merge staging',
        ),
    );
    assert.deepEqual(verify.on.pull_request.types, [
        'opened',
        'synchronize',
        'reopened',
        'ready_for_review',
    ]);
    assert.deepEqual(workflow.permissions, { contents: 'read' });
    assert.equal(
        workflow.env.OSS_TEST_PREFIX,
        'local-engine-testing/${{ github.sha }}/${{ github.run_id }}-${{ github.run_attempt }}',
    );
    assert.deepEqual(release.on.push, { branches: ['release'] });
    assert.equal(release.env.OSS_SERVER_RELEASE_PREFIX, 'local-engine');
    assert.match(upload, /ossutil cp test-build\/ "\$destination" --recursive --update/);
    assert.doesNotMatch(
        JSON.stringify(workflow),
        /latest\.(?:txt|json)|action-gh-release|OSS_SERVER_RELEASE_PREFIX/,
    );
});

for (const architecture of ['amd64', 'arm64']) {
    test(`test ${architecture} archive and mocked upload retain an isolated path and identity`, () => {
        const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'box-test-build-'));
        try {
            const bin = path.join(fixture, 'bin');
            fs.mkdirSync(bin);
            fs.writeFileSync(path.join(fixture, 'package.json'), '{"version":"0.3.0"}');
            for (const tool of ['docker', 'ossutil']) {
                fs.writeFileSync(
                    path.join(bin, tool),
                    `#!${process.execPath}\nconst fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.COMMAND_LOG, JSON.stringify({ tool: '${tool}', args }) + '\\n');
if (args[0] === 'compose' && args[2] === process.env.FAIL_SERVICE) process.exit(1);
if (args[0] === 'image' && args[1] === 'save' && process.env.FAIL_SAVE) process.exit(1);
if (args[0] === 'image' && args[1] === 'save') process.stdout.write(JSON.stringify(args.slice(2)));
`,
                    { mode: 0o755 },
                );
            }
            const commit = 'a'.repeat(40);
            const imageTag = `test-${commit}-linux-${architecture}`;
            const prefix = `local-engine-testing/${commit}/123-1`;
            const env = {
                ...process.env,
                PATH: `${bin}${path.delimiter}${process.env.PATH}`,
                COMMAND_LOG: path.join(fixture, 'commands.jsonl'),
                BOX_IMAGE_TAG: imageTag,
                BOX_BUILD_COMMIT: commit,
                BOX_PLAY_PLATFORM: `linux/${architecture}`,
                GITHUB_REF: 'refs/heads/dev/nested/test',
                OSS_TEST_PREFIX: prefix,
                OSS_BUCKET: 'fixture-bucket',
                OSS_ENDPOINT: 'oss.example.test',
                OSS_ACCESS_KEY_ID: 'fixture-id',
                OSS_ACCESS_KEY_SECRET: 'fixture-secret',
                ARCHITECTURE: architecture,
                GITHUB_STEP_SUMMARY: path.join(fixture, 'summary.md'),
            };
            const result = spawnSync('bash', ['-c', build], {
                cwd: fixture,
                env,
                encoding: 'utf8',
            });
            assert.equal(result.status, 0, result.stderr);
            const archive = path.join(
                fixture,
                `test-build/box-local-engine-images-${imageTag}.tar.gz`,
            );
            const saved = JSON.parse(zlib.gunzipSync(fs.readFileSync(archive)));
            assert.equal(saved.length, 6);
            assert.ok(saved.every((image) => image.endsWith(`:${imageTag}`)));
            const digest = crypto
                .createHash('sha256')
                .update(fs.readFileSync(archive))
                .digest('hex');
            assert.ok(
                fs
                    .readFileSync(path.join(fixture, 'test-build/SHA256SUMS'), 'utf8')
                    .startsWith(digest),
            );
            const info = JSON.parse(
                fs.readFileSync(path.join(fixture, 'test-build/BUILD-INFO.json'), 'utf8'),
            );
            assert.equal(info.channel, 'testing');
            assert.equal(info.commit, commit);
            assert.equal(info.imageTag, imageTag);
            assert.equal(info.platform, `linux/${architecture}`);
            // Skip only tool installation; execute the actual configured upload command against a fake OSS CLI.
            const command = upload.replace(
                'curl -fsSL https://gosspublic.alicdn.com/ossutil/install.sh | sudo bash\n',
                '',
            );
            const uploaded = spawnSync('bash', ['-c', command], {
                cwd: fixture,
                env,
                encoding: 'utf8',
            });
            assert.equal(uploaded.status, 0, uploaded.stderr);
            const calls = fs
                .readFileSync(env.COMMAND_LOG, 'utf8')
                .trim()
                .split('\n')
                .map(JSON.parse);
            assert.equal(
                calls.filter((call) => call.tool === 'docker' && call.args[0] === 'compose').length,
                6,
            );
            const copy = calls.find((call) => call.tool === 'ossutil' && call.args[0] === 'cp');
            assert.deepEqual(copy.args, [
                'cp',
                'test-build/',
                `oss://fixture-bucket/${prefix}/${architecture}/`,
                '--recursive',
                '--update',
            ]);
            const failed = spawnSync('bash', ['-c', build], {
                cwd: fixture,
                env: { ...env, FAIL_SERVICE: 'player-service' },
                encoding: 'utf8',
            });
            assert.notEqual(failed.status, 0, 'a failed service build must stop the workflow step');
            const failedSave = spawnSync('bash', ['-c', build], {
                cwd: fixture,
                env: { ...env, FAIL_SAVE: '1' },
                encoding: 'utf8',
            });
            assert.notEqual(
                failedSave.status,
                0,
                'image export failure must not be hidden by gzip',
            );
        } finally {
            fs.rmSync(fixture, { recursive: true, force: true });
        }
    });
}
