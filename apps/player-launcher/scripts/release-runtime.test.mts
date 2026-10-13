import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

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
