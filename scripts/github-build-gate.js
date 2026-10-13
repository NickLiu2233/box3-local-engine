'use strict';

const fs = require('node:fs');
const path = require('node:path');

function githubContext(env = process.env) {
    if (
        !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY || '') ||
        !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '') ||
        !env.GH_TOKEN
    ) {
        throw new Error('GitHub build gate requires a repository, full commit SHA and token');
    }
    return {
        repository: env.GITHUB_REPOSITORY,
        commit: env.GITHUB_SHA,
        token: env.GH_TOKEN,
        ref: env.GITHUB_REF,
    };
}

async function githubGet(context, endpoint, request = fetch) {
    const response = await request(
        `https://api.github.com/repos/${context.repository}/${endpoint}`,
        {
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${context.token}`,
                'X-GitHub-Api-Version': '2026-03-10',
            },
            redirect: 'error',
            signal: AbortSignal.timeout(20_000),
        },
    );
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(`GitHub build gate request failed (${response.status})`);
    }
    return response.json();
}

/** Only the exact merge result for the target branch can start a packaging job. */
async function mergedBuild(
    context,
    branch,
    get = (endpoint) => githubGet(context, endpoint),
    wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
) {
    if (!['staging', 'release'].includes(branch) || context.ref !== `refs/heads/${branch}`) {
        return false;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
        for (let page = 1; page <= 10; page++) {
            const pulls = await get(`commits/${context.commit}/pulls?per_page=100&page=${page}`);
            if (!Array.isArray(pulls)) {
                throw new Error('GitHub merge lookup did not return a pull request list');
            }
            if (
                pulls.some(
                    (pull) =>
                        pull.merged_at &&
                        pull.merge_commit_sha === context.commit &&
                        pull.base?.ref === branch &&
                        pull.base?.repo?.full_name?.toLowerCase() ===
                            context.repository.toLowerCase(),
                )
            ) {
                return true;
            }
            if (pulls.length < 100) {
                break;
            }
            if (page === 10) {
                throw new Error('GitHub merge lookup exceeded its pagination bound');
            }
        }
        if (attempt < 2) {
            await wait(1000 * (attempt + 1));
        }
    }
    return false;
}

function releaseIdentity(kind, version) {
    if (
        !['engine', 'player'].includes(kind) ||
        !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(
            version,
        )
    ) {
        throw new Error('Invalid release kind or version');
    }
    const tag = `${kind === 'player' ? 'player-v' : 'v'}${version}`;
    return {
        version,
        tag,
        prefix: kind === 'player' ? `box-player-launcher/${tag}` : `local-engine/${tag}`,
    };
}

/** Reruns may reuse their own tag, but never artifacts belonging to another commit. */
async function checkRelease(context, identity, get = (endpoint) => githubGet(context, endpoint)) {
    if (context.ref !== 'refs/heads/release') {
        throw new Error('Production builds require the release branch');
    }
    const reference = await get(`git/ref/tags/${encodeURIComponent(identity.tag)}`);
    if (!reference) {
        return identity;
    }
    let object = reference.object;
    for (let depth = 0; object?.type === 'tag' && depth < 5; depth++) {
        const annotated = await get(`git/tags/${object.sha}`);
        object = annotated?.object;
    }
    if (object?.type !== 'commit' || object.sha !== context.commit) {
        throw new Error(
            `Version ${identity.tag} already belongs to another commit; increment package.json version`,
        );
    }
    return identity;
}

async function createTag(context, identity, request = fetch) {
    const response = await request(`https://api.github.com/repos/${context.repository}/git/refs`, {
        method: 'POST',
        headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${context.token}`,
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2026-03-10',
        },
        body: JSON.stringify({ ref: `refs/tags/${identity.tag}`, sha: context.commit }),
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 422) {
        return false;
    }
    if (!response.ok) {
        throw new Error(`GitHub version reservation failed (${response.status})`);
    }
    return true;
}

/** Reserve before cache reads so a failed build cannot donate artifacts to a different commit. */
async function reserveRelease(
    context,
    identity,
    get = (endpoint) => githubGet(context, endpoint),
    create = () => createTag(context, identity),
) {
    const endpoint = `git/ref/tags/${encodeURIComponent(identity.tag)}`;
    let reference = await get(endpoint);
    await checkRelease(context, identity, (value) => (value === endpoint ? reference : get(value)));
    if (!reference && !(await create())) {
        reference = await get(endpoint);
        if (!reference) {
            throw new Error('GitHub version reservation was not confirmed');
        }
        await checkRelease(context, identity, (value) =>
            value === endpoint ? reference : get(value),
        );
    }
    return identity;
}

async function main() {
    const [command, value] = process.argv.slice(2);
    const context = githubContext();
    let outputs;
    if (command === 'merge') {
        outputs = { merged: String(await mergedBuild(context, value)) };
    } else if (command === 'release') {
        const manifest =
            value === 'player' ? '../apps/player-launcher/package.json' : '../package.json';
        const version = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, manifest), 'utf8'),
        ).version;
        outputs = await reserveRelease(context, releaseIdentity(value, version));
    } else {
        throw new Error(
            'Usage: github-build-gate.js merge <staging|release> | release <engine|player>',
        );
    }
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            Object.entries(outputs)
                .map(([key, result]) => `${key}=${result}\n`)
                .join(''),
        );
    }
    console.log(`Build gate ${command}: ${JSON.stringify(outputs)}`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
module.exports = {
    githubContext,
    githubGet,
    mergedBuild,
    releaseIdentity,
    checkRelease,
    createTag,
    reserveRelease,
};
