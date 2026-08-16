const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '../lib/migration-jobs.ts');

function loadMigrationJobs(generateProjectArchive) {
  delete globalThis.__boxMigratorJobs;
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  const localRequire = (request) => {
    if (request === './export-project') return { generateProjectArchive };
    return require(request);
  };
  const compile = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    output,
  );
  compile(
    loaded.exports,
    localRequire,
    loaded,
    sourcePath,
    path.dirname(sourcePath),
  );
  return loaded.exports;
}

async function main() {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const jobs = loadMigrationJobs(() => new Promise(() => undefined));
    const created = jobs.startMigration({ hash: 'QmTest' });
    assert.equal(jobs.getMigration(created.id)?.status, 'running');

    now += 15 * 60 * 1000 + 1;
    assert.equal(
      jobs.getMigration(created.id)?.status,
      'running',
      'a running migration must not expire while its cloud requests are stalled',
    );
  } finally {
    Date.now = originalNow;
    delete globalThis.__boxMigratorJobs;
  }
}

main()
  .then(() => console.log('running migration retention regression passed'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
