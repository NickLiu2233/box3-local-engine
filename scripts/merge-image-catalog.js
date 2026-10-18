'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateCatalog, services } = require('./build-image-downloads');

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function mergeImageCatalog({ architecture, version, baseCatalog, serviceDirectory }) {
    if (!['amd64', 'arm64'].includes(architecture)) {
        throw new Error('Unsupported image architecture');
    }
    const baseImages = new Map((baseCatalog?.images || []).map((image) => [image.image, image]));
    const builtImages = new Map();
    for (const service of services) {
        const file = path.join(serviceDirectory, `${service}.json`);
        if (!fs.existsSync(file)) {
            continue;
        }
        const catalog = readJson(file);
        for (const image of catalog.images || []) {
            if (image.image !== `box-local-engine-${service}`) {
                throw new Error(`Service catalog contains an unexpected image: ${service}`);
            }
            builtImages.set(image.image, image);
        }
    }
    const images = services.map((service) => {
        const name = `box-local-engine-${service}`;
        const image = builtImages.get(name) || baseImages.get(name);
        if (!image) {
            throw new Error(`Missing image catalog entry: ${service}`);
        }
        return image;
    });
    return validateCatalog(
        {
            formatVersion: 2,
            platform: `linux/${architecture}`,
            imageTag: `v${version}-linux-${architecture}`,
            images,
        },
        architecture,
    );
}

if (require.main === module) {
    try {
        const [architecture, version, basePath, serviceDirectory, destination] =
            process.argv.slice(2);
        const baseCatalog =
            basePath && basePath !== '-' && fs.existsSync(basePath) ? readJson(basePath) : null;
        const result = mergeImageCatalog({
            architecture,
            version,
            baseCatalog,
            serviceDirectory,
        });
        fs.writeFileSync(destination, `${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = { mergeImageCatalog };
