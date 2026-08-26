import { ModelType } from '@box-local/apis';

import type { EditClient } from 'src/client/edit/edit-client';
import { clientConfig } from 'src/config/client';
import { convertTimeStrToTimestamp } from 'src/utils/date';

import { fetchModelList, ModelAction, type ModelData } from '.';
import {
  dedupeProjectModelsByContent,
  getProjectModelDisplayName,
  projectModelsForPanel,
} from './project-model-membership';

export type ProjectModelScope = 'local' | 'project';

type ProjectModelSource = {
  load: (
    editor: EditClient,
    scope: ProjectModelScope,
    searchName: string,
  ) => Promise<ModelData[]>;
  subscribe: (
    editor: EditClient,
    scope: ProjectModelScope,
    listener: () => void,
  ) => () => void;
  canCreate: (scope: ProjectModelScope) => boolean;
  supportsAction: (action: ModelAction) => boolean;
  resolveName: (
    editor: EditClient,
    modelId: number,
  ) => Promise<string | undefined>;
  notifyChanged: (editor: EditClient) => void;
};

const LOCAL_MODELS_CHANGED_EVENT = 'local-voxa-models-changed';
const LOCAL_LIBRARY_MODEL_PATH = /__local_\d+\.vb$/;

function sortAndFilter(models: ModelData[], searchName: string) {
  return models
    .sort(
      (first, second) =>
        convertTimeStrToTimestamp(second.updateAt) -
        convertTimeStrToTimestamp(first.updateAt),
    )
    .filter((model) => !searchName || model.name.includes(searchName));
}

function loadProjectAssets(editor: EditClient) {
  return Object.entries(editor.state.replica.extraProjectInfo.meshAssets).map(
    ([key, meshAsset]): ModelData => ({
      id: meshAsset.modelId,
      name: getProjectModelDisplayName(
        editor.assetController.getModelNameFromMeshAssetsKey(key),
      ),
      modelPreviewUrl: editor.assetController.getModelPreviewUrl(
        meshAsset.modelPreviewHash,
      ),
      modelFileHash: meshAsset.hash,
      bounds: [0, 0, 0],
      animated: meshAsset.animated,
      type: ModelType.Project,
      updateAt: meshAsset.updatedAt,
      meshPath: key,
      libraryScope: 'project',
    }),
  );
}

const boxesProjectModelSource: ProjectModelSource = {
  async load(editor, _scope, searchName) {
    return sortAndFilter(loadProjectAssets(editor), searchName);
  },

  subscribe(editor, _scope, listener) {
    editor.replica.onExtraProjectChange.sub(listener);
    return () => editor.replica.onExtraProjectChange.unsub(listener);
  },

  canCreate: () => true,
  supportsAction: () => true,

  async resolveName(editor, modelId) {
    const model = loadProjectAssets(editor).find((item) => item.id === modelId);
    return model?.name;
  },

  notifyChanged(editor) {
    editor.replica.updateExtraProject();
  },
};

async function loadLocalModels(searchName: string) {
  const models =
    (await fetchModelList({
      modelType: ModelType.Private,
      modelName: searchName,
    })) || [];

  return models.map((model): ModelData => {
    const name = getProjectModelDisplayName(model.name);
    return {
      ...model,
      name,
      meshPath: `mesh/${name}__local_${model.id}.vb`,
      libraryScope: 'local',
    };
  });
}

const localProjectModelSource: ProjectModelSource = {
  async load(editor, scope, searchName) {
    const localModels = await loadLocalModels(searchName);
    if (scope === 'local') {
      return sortAndFilter(localModels, searchName);
    }

    // Project is the map group's saved resource library. A model remains in
    // this list after VOXA saves it even before any entity references it.
    const projectModels = projectModelsForPanel(loadProjectAssets(editor));
    const localById = new Map(localModels.map((model) => [model.id, model]));
    const mergedModels = projectModels.map((model) => {
      if (!LOCAL_LIBRARY_MODEL_PATH.test(model.meshPath || '')) return model;
      const local = localById.get(model.id);
      return local
        ? {
            ...model,
            ...local,
            meshPath: model.meshPath,
            libraryScope: 'project' as const,
          }
        : model;
    });
    return sortAndFilter(
      dedupeProjectModelsByContent(mergedModels),
      searchName,
    );
  },

  subscribe(editor, scope, listener) {
    window.addEventListener(LOCAL_MODELS_CHANGED_EVENT, listener);
    if (scope === 'project') {
      editor.replica.onExtraProjectChange.sub(listener);
      editor.replica.onProjectChange.sub(listener);
    }
    return () => {
      window.removeEventListener(LOCAL_MODELS_CHANGED_EVENT, listener);
      if (scope === 'project') {
        editor.replica.onExtraProjectChange.unsub(listener);
        editor.replica.onProjectChange.unsub(listener);
      }
    };
  },

  canCreate: (scope) => scope === 'local',
  supportsAction: (action) => action !== ModelAction.Copy,

  async resolveName(_editor, modelId) {
    const models = await loadLocalModels('');
    return models.find((model) => model.id === modelId)?.name;
  },

  notifyChanged(editor) {
    // Project models are authoritative in extraProjectInfo. Refresh that
    // replica as well as the local VOXA list after create/rename/delete.
    editor.replica.updateExtraProject();
    window.dispatchEvent(new Event(LOCAL_MODELS_CHANGED_EVENT));
  },
};

export const projectModelSource = clientConfig.isLocalGameServer
  ? localProjectModelSource
  : boxesProjectModelSource;
