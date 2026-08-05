import type { Logger } from 'pino';
import axios from 'axios';

import {
  ExtraProjectInfo,
  ExtraProjectInfoSchema,
  getMeshPath,
} from '@box-local/schema/project/hot-schema';
import { apis } from '../apis';
import { CreativeMode, ModelType } from '@box-local/apis';
import { mapRemoteScriptToLocal } from '../utils/map-scripts';
import { getConfigSync } from '../../config/server';

export type Mode = 'edit' | 'play';
// 后端限制，一次最多拉取100个数据
const LIMIT = 100;

function getLocalMeshPath(modelName: string, modelId: number) {
  return getMeshPath(`${modelName}__local_${modelId}`);
}

export async function getLocalExtraProject(
  voxaURL: string,
  mapId: number,
  logger: Logger,
) {
  const extra = ExtraProjectInfoSchema.clone(ExtraProjectInfoSchema.identity);
  try {
    const response = await axios.get(
      `${voxaURL.replace(/\/$/, '')}/api/local/models`,
      {
        params: {
          modelType: ModelType.Project,
          mapId,
        },
        timeout: 10_000,
      },
    );
    const rows = Array.isArray(response.data?.rows) ? response.data.rows : [];
    for (const row of rows) {
      const modelId = Number(row.modelId || 0);
      const path = getLocalMeshPath(String(row.modelName || ''), modelId);
      if (!modelId || extra.meshAssets[path]) continue;
      extra.meshAssets[path] = {
        modelId,
        hash: String(row.modelFileHash || ''),
        modelPreviewHash: String(row.modelPreviewHash || ''),
        animated: Boolean(row.animated),
        updatedAt: String(row.updatedAt || ''),
      };
    }
    logger.info(
      `fetch local VOXA mesh assets: ${Object.keys(extra.meshAssets).length}`,
    );
  } catch (error) {
    logger.error(`get local VOXA mesh assets error: ${String(error)}`);
  }
  return extra;
}

async function fetchAndSetSkinAssets(
  out: ExtraProjectInfo,
  offset: number,
  mapId: number,
  mode: Mode,
) {
  const res = await apis.models.getEngineModelsUsingGet({
    modelType: ModelType.ExtensionLib,
    offset,
    limit: LIMIT,
    mapId,
    creativeMode: CreativeMode.Skin,
    containerMode: mode,
  });
  res.rows.forEach((row) => {
    out.skinAssets[row.modelName] = {
      hash: row.modelFileHash,
    };
  });
  return res.rows.length;
}

async function fetchAndSetMeshAssets(
  out: ExtraProjectInfo,
  offset: number,
  mapId: number,
  mode: Mode,
) {
  const res = await apis.models.getEngineModelsUsingGet({
    modelType: ModelType.Project,
    offset,
    limit: LIMIT,
    mapId,
    creativeMode: CreativeMode.Model,
    containerMode: mode,
  });
  res.rows.forEach((row) => {
    out.meshAssets[getMeshPath(row.modelName)] = {
      modelId: row.modelId,
      hash: row.modelFileHash,
      modelPreviewHash: row.modelPreviewHash,
      animated: row.animated,
      updatedAt: row.updatedAt,
    };
  });
  return res.rows.length;
}

export async function getExtraProject(
  mapId: number,
  mode: Mode,
  logger: Logger,
) {
  if (getConfigSync()?.method === 'local') {
    const voxaURL =
      process.env.VOXA_INTERNAL_URL ||
      process.env.VOXA_URL ||
      'http://127.0.0.1:3001';
    return getLocalExtraProject(voxaURL, mapId, logger);
  }

  const extra = ExtraProjectInfoSchema.clone(ExtraProjectInfoSchema.identity);

  try {
    const res = await apis.model.getEngineDefaultSkinUsingGet({
      mapId,
      mode,
    });
    if (res) {
      extra.defaultSkinName = res.modelName;
      logger.info(`default skin name: ${res.modelName}`);
    }
  } catch (e) {
    logger.error(`get default skin error: ${JSON.stringify(e)}`);
  }

  let offset = 0;
  let currLength = 0;
  try {
    const length = await fetchAndSetSkinAssets(extra, offset, mapId, mode);
    offset += length;
    currLength = length;
    while (currLength) {
      const length = await fetchAndSetSkinAssets(extra, offset, mapId, mode);
      offset += length;
      currLength = length;
    }
    logger.info(
      `fetch skin assets: has ${
        Object.keys(extra.skinAssets).length
      } skin assets`,
    );
  } catch (e) {
    logger.error(`get skin assets error: ${JSON.stringify(e)}`);
  }

  offset = 0;
  currLength = 0;
  try {
    const length = await fetchAndSetMeshAssets(extra, offset, mapId, mode);
    offset += length;
    currLength = length;
    while (currLength) {
      const length = await fetchAndSetMeshAssets(extra, offset, mapId, mode);
      offset += length;
      currLength = length;
    }
    logger.info(
      `fetch mesh assets: has ${
        Object.keys(extra.meshAssets).length
      } mesh assets`,
    );
  } catch (e) {
    logger.error(`get mesh assets error: ${JSON.stringify(e)}`);
  }

  // scripts
  try {
    const res = await apis.createra.listUsingGet({
      mapId,
      mode,
    });
    if (res) {
      mapRemoteScriptToLocal(extra.scriptAssets, res);
      logger.info(
        `fetch script assets: has ${
          Object.keys(res.clientScripts).length
        } client assets and ${
          Object.keys(res.serverScripts).length
        } server assets`,
      );
    }
  } catch (e) {
    logger.error(`get share scripts error: ${JSON.stringify(e)}`);
  }
  return extra;
}
