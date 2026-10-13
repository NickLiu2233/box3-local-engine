'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** Vendor the routing package for an independently installable template; preserve other locked dependencies. */
function prepareStandalone(root, routingRoot) {
    const destination = path.join(root, 'vendor/deployment-routing');
    if (path.resolve(routingRoot) !== path.resolve(destination)) {
        fs.mkdirSync(destination, { recursive: true });
        for (const file of ['package.json', 'src', 'README.md', 'LICENSE']) {
            fs.cpSync(path.join(routingRoot, file), path.join(destination, file), {
                recursive: true,
            });
        }
    }
    const manifestFile = path.join(root, 'package.json');
    const lockFile = path.join(root, 'package-lock.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    manifest.dependencies['@box/deployment-routing'] = 'file:vendor/deployment-routing';
    lock.name = manifest.name;
    lock.version = manifest.version;
    lock.packages[''].version = manifest.version;
    lock.packages[''].dependencies = manifest.dependencies;
    const routing = JSON.parse(fs.readFileSync(path.join(destination, 'package.json'), 'utf8'));
    lock.packages['node_modules/@box/deployment-routing'] = {
        resolved: 'vendor/deployment-routing',
        link: true,
    };
    lock.packages['vendor/deployment-routing'] = {
        name: routing.name,
        version: routing.version,
        license: routing.license,
    };
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2) + '\n');
}

module.exports = { prepareStandalone };
if (require.main === module) {
    prepareStandalone(process.argv[2], process.argv[3]);
}
