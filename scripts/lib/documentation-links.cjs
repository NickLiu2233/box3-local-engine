'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const markdown = require(
    require.resolve('prettier/plugins/markdown', {
        paths: [path.resolve(__dirname, '../../tools/repo-tooling')],
    }),
);

function markdownFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            return [
                'node_modules',
                'build',
                'dist',
                'dist-electron',
                'release-electron',
                'rush-logs',
                'target',
                '.git',
                '.umi',
                '.umi-production',
                'data',
                'projects',
                'play-worlds',
                'backups',
                'runtime-cache',
            ].includes(entry.name)
                ? []
                : markdownFiles(target);
        }
        return entry.isFile() && entry.name.endsWith('.md') ? [target] : [];
    });
}

/** Parse Markdown links rather than treating code examples or URL parentheses as markup. */
async function assertLocalLinks(files, root) {
    for (const file of files) {
        const ast = await markdown.parsers.markdown.parse(fs.readFileSync(file, 'utf8'));
        const definitions = new Map();
        const links = [];
        const references = [];
        const visit = (node) => {
            if (node.type === 'definition') {
                definitions.set(node.identifier.toLowerCase(), node.url);
            } else if (node.type === 'link' || node.type === 'image') {
                links.push(node.url);
            } else if (node.type === 'linkReference' || node.type === 'imageReference') {
                references.push(node.identifier.toLowerCase());
            }
            node.children?.forEach(visit);
        };
        visit(ast);
        for (const reference of references) {
            // Unresolved shortcut references are plain text in Markdown, not links.
            if (definitions.has(reference)) {
                links.push(definitions.get(reference));
            }
        }
        for (const reference of links) {
            if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) {
                continue;
            }
            const target = reference.split(/[?#]/, 1)[0];
            if (!target) {
                continue;
            }
            const destination = path.resolve(path.dirname(file), decodeURIComponent(target));
            assert.ok(
                fs.statSync(destination, { throwIfNoEntry: false }),
                `${path.relative(root, file)} links to missing ${target}`,
            );
        }
    }
}

module.exports = { markdownFiles, assertLocalLinks };
