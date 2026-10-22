const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  projectV10, projectV11, migrateProject, projectSchemaToBytes,
  nextVoxaPlayVersion, compareVoxaPlayVersions,
} = require('../build/index.js');

test('old projects migrate without publishing settings', () => {
  const old = projectV10.ProjectDataV10Schema.alloc();
  const restored = migrateProject(projectSchemaToBytes(old));
  assert.equal(restored.version, 11);
  assert.equal(restored.previewExport, undefined);
});

test('project bytes retain author, multiline intro, versions, identity and static animation', () => {
  const project = projectV11.ProjectDataV11Schema.alloc();
  project.previewExport = {
    projectId: '7a6cd28a-c922-4418-bacd-c36b62d13fff',
    author: '模型作者', description: '第一行\n第二行',
    version: 'v1.0.10', lastExportedVersion: 'v1.0.9', defaultAnimationId: undefined,
  };
  const restored = migrateProject(projectSchemaToBytes(project));
  assert.deepEqual({ ...restored.previewExport }, project.previewExport);
  restored.previewExport.defaultAnimationId = 'motion-1';
  const copy = migrateProject(projectSchemaToBytes(restored));
  assert.equal(copy.previewExport.defaultAnimationId, 'motion-1');
  assert.equal(project.previewExport.defaultAnimationId, undefined);
});

test('patch versions increment numerically and reject invalid versions', () => {
  assert.equal(nextVoxaPlayVersion('v1.0.9'), 'v1.0.10');
  assert.equal(nextVoxaPlayVersion('1.2.99'), '1.2.100');
  assert.equal(compareVoxaPlayVersions('v1.0.10', '1.0.9'), 1);
  assert.equal(compareVoxaPlayVersions('v1.0.0', '1.0.0'), 0);
  assert.equal(compareVoxaPlayVersions('v0.9.9', '1.0.0'), -1);
  assert.throws(() => nextVoxaPlayVersion('发布版'));
});
