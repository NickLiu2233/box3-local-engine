'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateCatalog } = require('./build-image-downloads');
const { engineReleaseContext } = require('./release-context');

function stagingContext(version, architecture, commit = process.env.GITHUB_SHA) {
    if (architecture !== undefined && !['amd64', 'arm64'].includes(architecture)) {
        throw new Error('Invalid staging architecture');
    }
    const context = engineReleaseContext(
        {
            BOX_BUILD_CHANNEL: 'staging',
            GITHUB_REF: 'refs/heads/staging',
            GITHUB_SHA: commit,
        },
        version,
    );
    return {
        ...context,
        ...(architecture ? { imageTag: `${context.tag}-linux-${architecture}` } : {}),
    };
}

function isReusableProductionImage(image, architecture) {
    return new RegExp(`^v\\d+\\.\\d+\\.\\d+-linux-${architecture}$`).test(image.imageTag || '');
}

function prepareCatalog(catalog, version, architecture) {
    const context = stagingContext(version, architecture);
    validateCatalog(catalog, architecture);
    if (
        !catalog.images.every((image) => {
            const current =
                image.imageTag === context.imageTag &&
                image.sourceRevision === process.env.GITHUB_SHA;
            return current || isReusableProductionImage(image, architecture);
        })
    ) {
        throw new Error('Staging catalog contains images from another version or channel');
    }
    return {
        ...catalog,
        channel: 'staging',
        version: context.version,
        imageTag: context.imageTag,
        images: catalog.images.map((image) => ({
            ...image,
            downloadBaseUrl: context.downloadBaseUrl,
        })),
    };
}

function validateStagingCatalog(catalog, version, architecture) {
    const currentRevision = catalog.images
        ?.map((image) => image.sourceRevision)
        .find((revision) => /^[a-f0-9]{40}$/.test(revision || ''));
    const expected = stagingContext(
        version,
        architecture,
        currentRevision || process.env.GITHUB_SHA,
    );
    validateCatalog(catalog, architecture);
    if (
        catalog.channel !== 'staging' ||
        catalog.version !== expected.version ||
        catalog.imageTag !== expected.imageTag ||
        !catalog.images.every(
            (image) =>
                (image.imageTag === expected.imageTag ||
                    isReusableProductionImage(image, architecture)) &&
                image.downloadBaseUrl === expected.downloadBaseUrl,
        )
    ) {
        throw new Error(
            'Cached staging catalog does not match this version, architecture and staging download source',
        );
    }
    return catalog;
}

function main() {
    const [command, file, architecture] = process.argv.slice(2);
    const version = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
    ).version;
    if (command === 'context') {
        if (process.env.GITHUB_REF && process.env.GITHUB_REF !== 'refs/heads/staging') {
            throw new Error('Staging builds require the staging branch');
        }
        const context = stagingContext(version);
        if (process.env.GITHUB_OUTPUT) {
            fs.appendFileSync(
                process.env.GITHUB_OUTPUT,
                Object.entries(context)
                    .map(([key, value]) => `${key}=${value}\n`)
                    .join(''),
            );
        }
        console.log(JSON.stringify(context));
        return;
    }
    const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (command === 'validate') {
        validateStagingCatalog(catalog, version, architecture);
    } else if (command === 'prepare') {
        const prepared = prepareCatalog(catalog, version, architecture);
        fs.writeFileSync(`${file}.part`, `${JSON.stringify(prepared, null, 2)}\n`);
        fs.renameSync(`${file}.part`, file);
    } else {
        throw new Error(
            'Usage: staging-build-context.js context | prepare|validate <catalog> <architecture>',
        );
    }
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
module.exports = { stagingContext, prepareCatalog, validateStagingCatalog };
