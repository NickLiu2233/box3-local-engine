'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require(
    require.resolve('js-yaml', { paths: [path.join(__dirname, '../tools/repo-tooling')] }),
);
const {
    stagingContext,
    prepareCatalog,
    validateStagingCatalog,
} = require('./staging-build-context');
const { validateDesktopCatalog } = require('./build-desktop-offline-installer');

const root = path.resolve(__dirname, '..');
const workflow = yaml.load(
    fs.readFileSync(path.join(root, '.github/workflows/test-build.yml'), 'utf8'),
);
const steps = workflow.jobs.images.steps;
const build = steps.find((step) => step.name === 'Build test image archive').run;
const probe = steps.find((step) => step.id === 'image-cache').run;
const upload = steps.find((step) => step.name === 'Split and upload test images').run;

test('staging allows repeated versions and manual runs while production remains isolated', () => {
    const release = yaml.load(
        fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8'),
    );
    assert.deepEqual(workflow.on.push.branches, ['staging']);
    assert.equal(workflow.on.workflow_dispatch.inputs.rebuild_images.default, false);
    assert.equal(workflow.on.pull_request, undefined);
    assert.equal(workflow.jobs.prepare.if, "github.ref == 'refs/heads/staging'");
    assert.deepEqual(Object.keys(workflow.jobs), ['prepare', 'images', 'desktop']);
    assert.equal(workflow.jobs.images.needs, 'prepare');
    assert.deepEqual(workflow.jobs.desktop.needs, ['images', 'prepare']);
    assert.equal(workflow.jobs.desktop.env.BOX_BUILD_CHANNEL, 'testing');
    assert.equal(workflow.jobs.images.env.OSS_BUILD_PREFIX, '${{ needs.prepare.outputs.prefix }}');
    assert.deepEqual(workflow.jobs.desktop.strategy.matrix, release.jobs.desktop.strategy.matrix);
    assert.ok(workflow.jobs.desktop.steps.some((step) => step.run?.includes('package-desktop')));
    assert.ok(
        workflow.jobs.desktop.steps.some((step) =>
            step.run?.includes('launchers/${{ github.sha }}'),
        ),
    );
    for (const name of [
        'Free temporary runner disk space',
        'Build test image archive',
        'Split and upload test images',
    ]) {
        assert.equal(
            steps.find((step) => step.name === name).if,
            "steps.image-cache.outputs.cache-hit != 'true'",
        );
    }
    assert.doesNotMatch(
        JSON.stringify(workflow),
        /action-gh-release|latest\.(?:txt|json)|github-build-gate\.js release/,
    );
    assert.deepEqual(release.on.push, { branches: ['release'] });
    assert.equal(release.jobs['validate-release'].if, "needs.merge-gate.outputs.merged == 'true'");
});

function run(command, fixture, env) {
    const result = spawnSync('bash', ['-c', command], {
        cwd: fixture,
        env,
        encoding: 'utf8',
        timeout: 30_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
}

for (const architecture of ['amd64', 'arm64']) {
    test(`staging ${architecture} uploads once, reuses a different commit and can explicitly rebuild`, () => {
        const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'box-staging-cache-'));
        try {
            const bin = path.join(fixture, 'bin');
            fs.mkdirSync(bin);
            fs.mkdirSync(path.join(fixture, 'scripts'));
            for (const file of [
                'staging-build-context.js',
                'build-image-downloads.js',
                'split-image-archive.py',
            ]) {
                fs.copyFileSync(
                    path.join(root, 'scripts', file),
                    path.join(fixture, 'scripts', file),
                );
            }
            fs.writeFileSync(path.join(fixture, 'package.json'), '{"version":"0.3.0"}');
            const context = stagingContext('0.3.0', architecture);
            const env = {
                ...process.env,
                PATH: `${bin}${path.delimiter}${process.env.PATH}`,
                COMMAND_LOG: path.join(fixture, 'commands.jsonl'),
                OSS_STORE: path.join(fixture, 'oss'),
                SAVE_ARCHIVE: path.join(fixture, 'docker.tar'),
                BOX_IMAGE_TAG: context.imageTag,
                BOX_PLAY_PLATFORM: `linux/${architecture}`,
                BOX_BUILD_COMMIT: 'a'.repeat(40),
                GITHUB_REF: 'refs/heads/staging',
                OSS_BUILD_PREFIX: context.prefix,
                OSS_BUCKET: 'fixture-bucket',
                ARCHITECTURE: architecture,
                FORCE_REBUILD: 'false',
                GITHUB_OUTPUT: path.join(fixture, 'outputs'),
            };
            fs.writeFileSync(
                path.join(bin, 'docker'),
                `#!${process.execPath}
const fs=require('node:fs');const args=process.argv.slice(2);
fs.appendFileSync(process.env.COMMAND_LOG, JSON.stringify({tool:'docker',args})+'\\n');
if(args[0]==='image' && args[1]==='save') process.stdout.write(fs.readFileSync(process.env.SAVE_ARCHIVE));
`,
                { mode: 0o755 },
            );
            fs.writeFileSync(
                path.join(bin, 'ossutil'),
                `#!${process.execPath}
const fs=require('node:fs'),path=require('node:path');const args=process.argv.slice(2);
fs.appendFileSync(process.env.COMMAND_LOG,JSON.stringify({tool:'ossutil',args})+'\\n');
const remote=value=>path.join(process.env.OSS_STORE,value.replace(/^oss:\\/\\/fixture-bucket\\//,''));
if(args[0]==='stat'){process.exit(fs.existsSync(remote(args[1]))?0:1);}
if(args[0]==='cp'){
 const source=args[1].startsWith('oss://')?remote(args[1]):args[1];
 const target=args[2].startsWith('oss://')?remote(args[2]):args[2];
 if(!fs.existsSync(source))process.exit(1);
 const destination=args[2].endsWith('/')?path.join(target,path.basename(source)):target;
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);
}
`,
                { mode: 0o755 },
            );
            const makeArchive = () => {
                const result = spawnSync(
                    process.platform === 'win32' ? 'python' : 'python3',
                    [
                        '-c',
                        `import io,json,os,tarfile,sys
with tarfile.open(sys.argv[1],'w') as archive:
 manifest=[]
 for service in ['creator','voxa','play','player-service','player-auth-portal','server-manager']:
  name=service+'.json'
  data=json.dumps({'os':'linux','architecture':os.environ['ARCHITECTURE'],'config':{'Labels':{'org.opencontainers.image.revision':os.environ['BOX_BUILD_COMMIT']}}}).encode()
  item=tarfile.TarInfo(name);item.size=len(data);archive.addfile(item,io.BytesIO(data))
  manifest.append({'Config':name,'RepoTags':['box-local-engine-'+service+':'+os.environ['BOX_IMAGE_TAG']],'Layers':[]})
 data=json.dumps(manifest).encode();item=tarfile.TarInfo('manifest.json');item.size=len(data);archive.addfile(item,io.BytesIO(data))
`,
                        env.SAVE_ARCHIVE,
                    ],
                    { env, encoding: 'utf8' },
                );
                assert.equal(result.status, 0, result.stderr);
            };
            makeArchive();
            run(probe, fixture, env);
            assert.match(fs.readFileSync(env.GITHUB_OUTPUT, 'utf8'), /cache-hit=false/);
            run(build, fixture, env);
            run(upload, fixture, env);
            const catalogPath = path.join(
                fixture,
                `test-build/box-local-engine-images-${context.imageTag}.json`,
            );
            let catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
            validateStagingCatalog(catalog, '0.3.0', architecture);
            validateDesktopCatalog(catalog, '0.3.0', architecture, 'testing');
            assert.ok(
                catalog.images.every((image) => image.downloadBaseUrl === context.downloadBaseUrl),
            );
            assert.ok(
                catalog.images.every((image) => image.sourceRevision === env.BOX_BUILD_COMMIT),
            );
            assert.throws(
                () => validateDesktopCatalog(catalog, '0.3.0', architecture),
                /Testing catalogs/,
            );
            assert.throws(() => validateStagingCatalog(catalog, '0.4.0', architecture));
            assert.throws(() =>
                prepareCatalog(
                    {
                        ...catalog,
                        images: catalog.images.map((image) => ({
                            ...image,
                            imageTag: 'v0.3.0-linux-' + architecture,
                        })),
                    },
                    '0.3.0',
                    architecture,
                ),
            );

            const before = fs
                .readFileSync(env.COMMAND_LOG, 'utf8')
                .trim()
                .split('\n')
                .map(JSON.parse);
            const builds = () =>
                fs
                    .readFileSync(env.COMMAND_LOG, 'utf8')
                    .trim()
                    .split('\n')
                    .map(JSON.parse)
                    .filter((call) => call.tool === 'docker' && call.args[0] === 'compose').length;
            assert.equal(builds(), 6);
            env.BOX_BUILD_COMMIT = 'b'.repeat(40);
            fs.writeFileSync(env.GITHUB_OUTPUT, '');
            run(probe, fixture, env);
            assert.match(fs.readFileSync(env.GITHUB_OUTPUT, 'utf8'), /cache-hit=true/);
            assert.equal(builds(), 6, 'cache hit must not build again');
            const marker = before.findLast(
                (call) => call.tool === 'ossutil' && call.args[0] === 'cp',
            );
            assert.ok(marker.args[1].endsWith('.json'), 'catalog is uploaded last');

            fs.writeFileSync(env.GITHUB_OUTPUT, '');
            env.FORCE_REBUILD = 'true';
            makeArchive();
            run(probe, fixture, env);
            assert.match(fs.readFileSync(env.GITHUB_OUTPUT, 'utf8'), /cache-hit=false/);
            run(build, fixture, env);
            run(upload, fixture, env);
            assert.equal(builds(), 12);
            catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
            assert.ok(
                catalog.images.every((image) => image.sourceRevision === env.BOX_BUILD_COMMIT),
            );
            env.FORCE_REBUILD = 'false';
            fs.unlinkSync(path.join(env.OSS_STORE, context.prefix, catalog.images[0].archive));
            fs.writeFileSync(env.GITHUB_OUTPUT, '');
            run(probe, fixture, env);
            assert.match(
                fs.readFileSync(env.GITHUB_OUTPUT, 'utf8'),
                /cache-hit=false/,
                'incomplete caches must not be accepted',
            );
        } finally {
            fs.rmSync(fixture, { recursive: true, force: true });
        }
    });
}
