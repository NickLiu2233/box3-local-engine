import type { Logger } from 'pino';

import { ModelMigrationState } from '@box-local/apis';
import { apis } from './apis';
import { AssetType } from '@box-local/schema/project/project-rda';
import { BuildSystemAPI } from '@box-local/build-system/type';
import { storeProject } from '@box-local/build-system/project/project-serialize';
import { PrebakeCache } from '@box-local/build-system/project/prebake-schema';
import { getExtraProject, Mode } from './project/project-extra';

export async function migrateVoxelModels(
  out: PrebakeCache,
  bs: BuildSystemAPI,
  mapId: number,
  mode: Mode,
  logger: Logger,
) {
  // 没有地图ID时(本地调试)，不做迁移
  if (!mapId) {
    return;
  }
  const meshes = Object.keys(out.coldProject.assets).filter(
    (path) => out.coldProject.assets[path].type === AssetType.VOXEL_MODEL,
  );
  if (!meshes.length) {
    logger.info(
      `project ${out.projectHash} does not need to migrate models because it has no voxel model`,
    );
    return;
  }

  let state = ModelMigrationState.Init;
  let retryCount = 10;
  while (state !== ModelMigrationState.Success) {
    try {
      state = await apis.models.mapModelMigrationUsingPost({ mapId });
      if (state === ModelMigrationState.Fails) {
        throw new Error(`project ${out.projectHash} migrate voxel models fail`);
      }
    } catch (e) {
      if (!retryCount) {
        throw new Error(e);
      }

      retryCount--;
      logger.error(`migrate voxel models fail, retrying...`);
    }
  }

  // 重新生成extraProjectInfo
  out.extraProjectInfo = await getExtraProject(mapId, mode, logger);

  // 删除assets和deleteAssets中的模型数据
  meshes.forEach((path) => {
    delete out.coldProject.assets[path];
  });
  out.coldProject.deleteAssets = out.coldProject.deleteAssets.filter(
    (i) => i.value.type !== AssetType.VOXEL_MODEL,
  );

  // 重新生成projectHash
  out.projectHash = (await storeProject(bs, out.coldProject)).projectHash;
}
