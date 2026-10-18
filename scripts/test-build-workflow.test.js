'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yaml = require(
    require.resolve('js-yaml', { paths: [path.join(__dirname, '../tools/repo-tooling')] }),
);
const { mergeImageCatalog } = require('./merge-image-catalog');

const root = path.resolve(__dirname, '..');
const workflowSource = fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8');
const workflow = yaml.load(workflowSource);
const imageSteps = workflow.jobs.images.steps;

test('release images are cached and published per service', () => {
    assert.equal(workflow.on.push.branches.includes('release/v*'), true);
    assert.equal(workflow.on.push.branches.includes('staging'), true);
    assert.match(workflowSource, /REBUILD_SERVICES:/);
    assert.match(workflowSource, /REUSE_FROM_VERSION:/);
    assert.match(workflowSource, /Prepare per-service image cache/);
    assert.match(workflowSource, /Build and upload per-service image downloads/);
    assert.match(workflowSource, /docker compose build "\$service"/);
    assert.match(workflowSource, /docker image save "box-local-engine-\$service:\$BOX_IMAGE_TAG"/);
    assert.match(workflowSource, /split-image-archive\.py image-updates\/source\.tar\.gz/);
    assert.match(
        workflowSource,
        /ossutil stat "oss:\/\/\$OSS_BUCKET\/\$source_prefix\/\$existing_archive"/,
    );
    assert.match(workflowSource, /merge-image-catalog\.js/);
    assert.match(workflowSource, /rm -f image-updates\/base-catalog\.json/);
    assert.doesNotMatch(workflowSource, /echo '-' > image-updates\/base-catalog\.json/);
    assert.doesNotMatch(
        workflowSource,
        /box-local-engine-images-\$\{\{ env\.BOX_RELEASE_TAG \}\}-linux-\$\{\{ matrix\.architecture \}\}\.tar\.gz/,
    );
    assert.equal(
        imageSteps.some((step) => step.name === 'Upload images to Aliyun OSS'),
        false,
    );
});

test('mixed service catalogs keep old entries and replace only rebuilt services', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'box-image-catalog-'));
    try {
        const digest = 'a'.repeat(64);
        const services = [
            'creator',
            'voxa',
            'play',
            'player-service',
            'player-auth-portal',
            'server-manager',
        ];
        const base = {
            formatVersion: 2,
            platform: 'linux/arm64',
            imageTag: 'v2026.1.4-linux-arm64',
            images: services.map((service) => ({
                formatVersion: 1,
                image: `box-local-engine-${service}`,
                imageId: `sha256:${digest}`,
                imageIds: [`sha256:${digest}`],
                imageTag: 'v2026.1.4-linux-arm64',
                platform: 'linux/arm64',
                sha256: digest,
                size: 10,
                archive: `box-local-engine-image-${service}-arm64-${digest}.tar.gz`,
            })),
        };
        const newDigest = 'b'.repeat(64);
        fs.writeFileSync(
            path.join(directory, 'voxa.json'),
            JSON.stringify({
                images: [
                    {
                        ...base.images.find((image) => image.image === 'box-local-engine-voxa'),
                        imageTag: 'v2026.1.5-linux-arm64',
                        imageId: `sha256:${newDigest}`,
                        imageIds: [`sha256:${newDigest}`],
                        sha256: newDigest,
                        archive: `box-local-engine-image-voxa-arm64-${newDigest}.tar.gz`,
                    },
                ],
            }),
        );
        const result = mergeImageCatalog({
            architecture: 'arm64',
            version: '2026.1.5',
            baseCatalog: base,
            serviceDirectory: directory,
        });
        assert.equal(result.imageTag, 'v2026.1.5-linux-arm64');
        assert.equal(
            result.images.find((image) => image.image === 'box-local-engine-voxa').imageTag,
            'v2026.1.5-linux-arm64',
        );
        assert.equal(
            result.images.find((image) => image.image === 'box-local-engine-play').imageTag,
            'v2026.1.4-linux-arm64',
        );
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
