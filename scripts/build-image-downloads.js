'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const services = [
    'creator',
    'voxa',
    'play',
    'player-service',
    'player-auth-portal',
    'server-manager',
];

function validDownloadBase(value) {
    return (
        value === undefined ||
        value === null ||
        value === 'https://assets.box3.fun/local-engine' ||
        /^https:\/\/assets\.box3\.fun\/local-engine-staging\/v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-(?:[0-9A-Za-z.-]*[.-])?staging\/[a-f0-9]{40}$/.test(
            value,
        )
    );
}

function validateCatalog(catalog, architecture) {
    if (
        !['amd64', 'arm64'].includes(architecture) ||
        catalog.formatVersion !== 2 ||
        catalog.platform !== `linux/${architecture}` ||
        !/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(catalog.imageTag || '') ||
        !Array.isArray(catalog.images) ||
        catalog.images.length !== services.length
    ) {
        throw new Error('Invalid per-service image catalog');
    }
    for (const service of services) {
        const images = catalog.images.filter(
            (image) => image.image === `box-local-engine-${service}`,
        );
        if (images.length !== 1) {
            throw new Error(`Missing or duplicate image: ${service}`);
        }
        const image = images[0];
        const digest = /^sha256:([a-f0-9]{64})$/.exec(image.imageId || '')?.[1];
        if (
            !digest ||
            !Array.isArray(image.imageIds) ||
            image.imageIds.length < 1 ||
            image.imageIds.length > 2 ||
            !image.imageIds.includes(image.imageId) ||
            image.imageIds.some((id) => !/^sha256:[a-f0-9]{64}$/.test(id)) ||
            image.formatVersion !== 1 ||
            image.platform !== catalog.platform ||
            !/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(image.imageTag || '') ||
            image.archive !==
                `box-local-engine-image-${service}-${architecture}-${image.sha256}.tar.gz` ||
            !/^[a-f0-9]{64}$/.test(image.sha256 || '') ||
            !Number.isSafeInteger(image.size) ||
            image.size <= 0 ||
            !validDownloadBase(image.downloadBaseUrl)
        ) {
            throw new Error(`Invalid image download: ${service}`);
        }
    }
    return catalog;
}

function localImageTag(catalog) {
    const tags = new Set(catalog.images.map((image) => image.imageTag));
    if (tags.size !== 1) {
        throw new Error('本地测试镜像必须使用同一版本标签');
    }
    const tag = [...tags][0];
    if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(tag)) {
        throw new Error('本地镜像标签无效');
    }
    return tag;
}

function splitArchive(archive, architecture, destination) {
    const { packagingContext } = require('./packaging-context');
    const { channel, version } = packagingContext(process.env, require('../package.json').version);
    const result = spawnSync(
        process.platform === 'win32' ? 'python' : 'python3',
        [
            path.join(__dirname, 'split-image-archive.py'),
            archive,
            architecture,
            destination,
            version,
        ],
        { stdio: 'inherit' },
    );
    if (result.error || result.status !== 0) {
        throw new Error(result.error?.message || 'Unable to split source image archive');
    }
    const catalog = validateCatalog(JSON.parse(fs.readFileSync(destination, 'utf8')), architecture);
    if (
        channel === 'dev' &&
        catalog.images.every((image) => image.imageTag === `v${version}-linux-${architecture}`)
    ) {
        catalog.channel = 'dev';
        catalog.version = version;
        fs.writeFileSync(destination, `${JSON.stringify(catalog, null, 2)}\n`);
    }
    return catalog;
}

function validateDevCatalog(catalog, version, architecture) {
    validateCatalog(catalog, architecture);
    const tag = `v${version}-linux-${architecture}`;
    if (
        catalog.channel === 'staging' ||
        catalog.imageTag !== tag ||
        !catalog.images.every((image) => image.imageTag === tag && !image.downloadBaseUrl)
    ) {
        throw new Error('开发包需要同版本的 dev 镜像归档，不能使用正式或 staging 镜像');
    }
    return catalog;
}

if (require.main === module) {
    try {
        const [archive, architecture, destination] = process.argv.slice(2);
        if (!archive || !['amd64', 'arm64'].includes(architecture) || !destination) {
            throw new Error(
                'Usage: node scripts/build-image-downloads.js <source.tar.gz> <amd64|arm64> <catalog.json>',
            );
        }
        splitArchive(archive, architecture, destination);
        console.log(`Per-service image catalog: ${destination}`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = {
    splitArchive,
    validateCatalog,
    validateDevCatalog,
    localImageTag,
    validDownloadBase,
};
