'use strict';

// Run on an exported fixture after CLI fill/save. This catches commands that
// return success but never bake the edited part into the exported mesh.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const JSZip = require('../apps/voxa/node_modules/jszip');

async function main() {
    assert(
        process.argv[2],
        'Usage: node scripts/check-voxa-project-geometry.js <filled-fixture.voxaproject>',
    );
    const zip = await JSZip.loadAsync(fs.readFileSync(process.argv[2]));
    const metadata = JSON.parse(await zip.file('model-meta.bin').async('string'));
    assert(
        metadata.bounds.some((value) => value > 0),
        `CLI voxel edits exported empty bounds: ${JSON.stringify(metadata.bounds)}`,
    );
    console.log(
        `PASS: exported CLI fixture contains geometry, bounds=${JSON.stringify(metadata.bounds)}`,
    );
}
main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
