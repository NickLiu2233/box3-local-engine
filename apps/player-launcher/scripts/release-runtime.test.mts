import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

test('player test validate runs without a Git tag and main is rejected', async () => {
    const env = {
        ...process.env,
        NODE_OPTIONS: '',
        GITHUB_OUTPUT: '',
        PLAYER_BUILD_CHANNEL: 'testing',
        PLAYER_RELEASE_COMMIT: '',
        GITHUB_REF: 'refs/heads/staging',
        GITHUB_SHA: 'a'.repeat(40),
        GITHUB_RUN_ID: '123',
        GITHUB_RUN_ATTEMPT: '1',
        OSS_BUCKET: 'fixture-bucket',
        OSS_ENDPOINT: 'oss.example.test',
        OSS_ACCESS_KEY_ID: 'fixture-id',
        OSS_ACCESS_KEY_SECRET: 'fixture-secret',
    };
    const args = [
        '--experimental-strip-types',
        fileURLToPath(new URL('./release.mts', import.meta.url)),
        'validate',
    ];
    const run = promisify(execFile);
    const { stdout } = await run(process.execPath, args, { timeout: 10_000, env });
    assert.match(stdout, /Player test build validated: .*dev\.123\.1/);
    assert.ok(stdout.includes(`box-player-launcher-testing/${env.GITHUB_SHA}/123-1`));
    await assert.rejects(
        run(process.execPath, args, {
            timeout: 10_000,
            env: { ...env, GITHUB_REF: 'refs/heads/main' },
        }),
        /Player test builds require/,
    );
    await assert.rejects(
        run(process.execPath, [...args.slice(0, -1), 'download'], { timeout: 10_000, env }),
        /do not collect a GitHub Release/,
    );
});

test('release validate runs in Node strip-only mode without a transpiler', async () => {
    const packageInfo = JSON.parse(
        await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    );
    const tag = `player-v${packageInfo.version}`;
    const { stdout } = await promisify(execFile)(
        process.execPath,
        [
            '--experimental-strip-types',
            fileURLToPath(new URL('./release.mts', import.meta.url)),
            'validate',
        ],
        {
            timeout: 10_000,
            env: {
                ...process.env,
                NODE_OPTIONS: '',
                GITHUB_OUTPUT: '',
                PLAYER_RELEASE_TAG: tag,
                PLAYER_BUILD_CHANNEL: 'production',
                PLAYER_RELEASE_COMMIT: 'a'.repeat(40),
                OSS_BUCKET: 'fixture-bucket',
                OSS_ENDPOINT: 'oss-cn-hangzhou.aliyuncs.com',
                OSS_ACCESS_KEY_ID: 'fixture-id',
                OSS_ACCESS_KEY_SECRET: 'fixture-secret',
            },
        },
    );
    assert.ok(stdout.includes(`Independent player release validated: ${tag}`));
});
