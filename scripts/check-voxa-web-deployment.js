'use strict';

// Check the public editor URL, including its reverse-proxy prefix. A healthy
// API alone does not catch missing standalone assets or root-relative bundles.
const assert = require('node:assert/strict');

async function main() {
    const target = process.argv[2];
    assert(target, 'Usage: node scripts/check-voxa-web-deployment.js <public-editor-url>');
    const page = new URL(target);
    const response = await fetch(page, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, `Editor page: HTTP ${response.status}`);
    const html = await response.text();
    const resources = [...new Set(
        [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
            .map((match) => match[1])
            .filter((value) => /\.(?:js|css)(?:\?|$)/.test(value))
            .map((value) => new URL(value, response.url).href),
    )];
    assert(resources.length > 0, 'Editor HTML contains no JS/CSS assets');
    const prefix = page.pathname.replace(/\/$/, '');
    const failures = [];
    await Promise.all(resources.map(async (value) => {
        const asset = new URL(value);
        try {
            assert.equal(asset.origin, page.origin, `Unexpected asset origin: ${value}`);
            assert(asset.pathname.startsWith(`${prefix}/_next/`), `Missing editor prefix: ${asset.pathname}`);
            const result = await fetch(asset, { signal: AbortSignal.timeout(15000) });
            assert.equal(result.status, 200, `${asset.pathname}: HTTP ${result.status}`);
            const expected = asset.pathname.endsWith('.css') ? /text\/css/ : /javascript/;
            assert.match(result.headers.get('content-type') || '', expected, `${asset.pathname}: wrong content type`);
            await result.arrayBuffer();
        } catch (error) {
            failures.push(error.message);
        }
    }));
    assert.equal(failures.length, 0, failures.join('\n'));
    console.log(`PASS: ${page.origin}${page.pathname}: ${resources.length} editor assets have the correct prefix and return JS/CSS`);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
