import { releaseInfo } from './release-contract.mts';

/** Test identities and upload scopes never reuse a production tag directory. */
export function playerBuildContext(env:NodeJS.ProcessEnv, packageVersion:string) {
    const channel = env.PLAYER_BUILD_CHANNEL || 'production';
    const commit = env.PLAYER_RELEASE_COMMIT || env.GITHUB_SHA || '';
    if (channel === 'production') {
        const info = releaseInfo(
            env.PLAYER_RELEASE_TAG ||
                (env.GITHUB_REF === 'refs/heads/release'
                    ? `player-v${packageVersion}`
                    : env.GITHUB_REF_NAME || ''),
            commit,
            packageVersion,
        );
        return { channel, info, prefix: `box-player-launcher/${info.tag}` };
    }
    if (channel !== 'testing') {
        throw new Error('Unknown player build channel');
    }
    if (env.GITHUB_REF !== 'refs/heads/staging') {
        throw new Error('Player test builds require the staging branch');
    }
    const runId = env.GITHUB_RUN_ID || '';
    const attempt = env.GITHUB_RUN_ATTEMPT || '';
    if (!/^[1-9]\d*$/.test(runId) || !/^[1-9]\d*$/.test(attempt)) {
        throw new Error('Player test builds require a numeric run ID and attempt');
    }
    const base = releaseInfo(`player-v${packageVersion}`, commit, packageVersion);
    const version = `${packageVersion}${packageVersion.includes('-') ? '.' : '-'}dev.${runId}.${attempt}`;
    const info = { ...base, tag: `player-test-v${version}`, version, prerelease: true };
    return { channel, info, prefix: `box-player-launcher-testing/${commit}/${runId}-${attempt}` };
}
