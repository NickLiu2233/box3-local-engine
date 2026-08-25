import assert from 'assert';

const {
  CodeEditorServerController,
} = require('../src/edit/code-editor/code-editor-server-controller');

function createController(files: Record<string, Record<string, unknown>>) {
  const controller = Object.create(CodeEditorServerController.prototype);
  controller._state = {
    replica: { extraProjectInfo: { scriptAssets: {} } },
    logger: { log: () => undefined },
  };
  controller._editorState = { fileDict: files };
  controller.fileDictReplica = {
    action: () => ({
      remove: (fileId: string) => ({ type: 'remove', fileId }),
      set: (fileId: string, file: Record<string, unknown>) => ({
        type: 'set',
        fileId,
        file,
      }),
      update: () => ({}),
    }),
    dispatch: (action: {
      type: 'remove' | 'set';
      fileId: string;
      file?: Record<string, unknown>;
    }) => {
      if (action.type === 'remove') delete files[action.fileId];
      if (action.type === 'set' && action.file) files[action.fileId] = action.file;
    },
  };
  return controller;
}

async function main() {
  const files: Record<string, Record<string, unknown>> = {
    migrated: {
      fileId: 'migrated',
      name: 'game.js',
      text: 'module.exports = {}',
      order: 1,
      isClient: false,
      isShare: false,
      lockedMapTitle: '',
      isUploading: false,
      size: 19,
    },
    shared: {
      fileId: 'shared',
      name: 'obsolete-shared.js',
      text: '',
      order: 2,
      isClient: false,
      isShare: true,
      lockedMapTitle: '',
      isUploading: false,
      size: 0,
    },
  };
  const controller = createController(files);

  await controller.resyncFiles({}, {});

  assert.ok(
    files.migrated,
    'a local migrated script must remain in the editor file tree when the shared-resource snapshot refreshes',
  );
  assert.equal(
    files.shared,
    undefined,
    'a removed shared script must still be removed during the same refresh',
  );
  console.log('migrated script editor regression passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
