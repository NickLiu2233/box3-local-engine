'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateCatalog } = require('./build-image-downloads');

function stagingContext(version, architecture) {
    if (
        !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(
            version,
        ) ||
        (architecture !== undefined && !['amd64', 'arm64'].includes(architecture))
    ) {
        throw new Error('Invalid staging version or architecture');
    }
    const prefix = `local-engine-testing/v${version}`;
    return {
        version,
        tag: `test-v${version}`,
        prefix,
        downloadBaseUrl: `https://assets.box3.fun/${prefix}`,
        ...(architecture ? { imageTag: `test-v${version}-linux-${architecture}` } : {}),
    };
}

function prepareCatalog(catalog, version, architecture) {
    const context = stagingContext(version, architecture);
    validateCatalog(catalog, architecture);
    if (!catalog.images.every((image) => image.imageTag === context.imageTag)) {
        throw new Error('Staging catalog contains images from another version or channel');
    }
    return {
        ...catalog,
        channel: 'testing',
        version,
        imageTag: context.imageTag,
        images: catalog.images.map((image) => ({
            ...image,
            downloadBaseUrl: context.downloadBaseUrl,
        })),
    };
}

function validateStagingCatalog(catalog, version, architecture) {
    const expected = stagingContext(version, architecture);
    validateCatalog(catalog, architecture);
    if (
        catalog.channel !== 'testing' ||
        catalog.version !== version ||
        catalog.imageTag !== expected.imageTag ||
        !catalog.images.every(
            (image) =>
                image.imageTag === expected.imageTag &&
                image.downloadBaseUrl === expected.downloadBaseUrl,
        )
    ) {
        throw new Error(
            'Cached staging catalog does not match this version, architecture and test download source',
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
            throw new Error('Test builds require the staging branch');
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
