'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const versionPattern =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/;

function stagingVersion(version) {
    if (!versionPattern.test(version)) {
        throw new Error('Invalid release version');
    }
    return /(?:-|\.)staging$/.test(version)
        ? version
        : `${version}${version.includes('-') ? '.' : '-'}staging`;
}

function engineReleaseContext(env, packageVersion) {
    const channel =
        env.BOX_BUILD_CHANNEL ||
        (env.GITHUB_REF === 'refs/heads/staging' ? 'staging' : 'production');
    const branch = channel === 'staging' ? 'staging' : 'release';
    if (!['production', 'staging'].includes(channel) || env.GITHUB_REF !== `refs/heads/${branch}`) {
        throw new Error('Release channel does not match the staging/release branch');
    }
    if (!versionPattern.test(packageVersion) || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '')) {
        throw new Error('Release requires a valid version and source commit');
    }
    if (channel === 'production' && /(?:-|\.)(dev|staging)$/.test(packageVersion)) {
        throw new Error('Development and staging versions cannot enter production');
    }
    const version = channel === 'staging' ? stagingVersion(packageVersion) : packageVersion;
    const releasePrefix = channel === 'staging' ? 'local-engine-staging' : 'local-engine';
    const prefix = `${releasePrefix}/v${version}${channel === 'staging' ? `/${env.GITHUB_SHA}` : ''}`;
    return {
        channel,
        version,
        tag: `v${version}`,
        prefix,
        releasePrefix,
        downloadBaseUrl: `https://assets.box3.fun/${channel === 'staging' ? prefix : releasePrefix}`,
    };
}

function prepareBuildChannel(env = process.env, repository = root) {
    const file = path.join(repository, 'package.json');
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    const context = engineReleaseContext(env, manifest.version);
    if (context.version !== manifest.version) {
        manifest.version = context.version;
        fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
        const result = spawnSync(
            process.execPath,
            [path.join(repository, 'scripts/sync-root-version.js')],
            {
                cwd: repository,
                stdio: 'inherit',
            },
        );
        if (result.status !== 0) {
            throw new Error('Unable to prepare the channel build version');
        }
    }
    return context;
}

if (require.main === module) {
    try {
        const version = JSON.parse(
            fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
        ).version;
        const context =
            process.argv[2] === 'prepare'
                ? prepareBuildChannel()
                : engineReleaseContext(process.env, version);
        if (process.env.GITHUB_OUTPUT) {
            fs.appendFileSync(
                process.env.GITHUB_OUTPUT,
                Object.entries(context)
                    .map(([key, value]) => `${key}=${value}\n`)
                    .join(''),
            );
        }
        console.log(JSON.stringify(context));
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = { stagingVersion, engineReleaseContext, prepareBuildChannel };
