import type { Logger } from 'pino';
import type { Mode } from '../project/project-extra';
import { apis } from '../apis';
import { ROOT_ID } from '@box-local/schema/project/murda-tree';
import type { PrebakeCache } from '@box-local/build-system/project/prebake-schema';

/**
 * 兼容旧数据，曾经有一段时间默认屏幕交给后端管理了
 * 从project 0.3.27版本后交还给project自己管理默认屏幕ID
 * 但是已经在后端的数据没有做统一迁移，需要做一个检查并赋值
 */
export async function checkAndUpdateDefaultScreenId(
  out: PrebakeCache,
  spec: {
    mapId: string;
    mode: Mode;
    logger: Logger;
  },
) {
  const { mapId, mode, logger } = spec;
  if (!out.coldProject.uiTree) {
    return;
  }

  // uiTree里存在屏幕ID，不需要矫正
  if (out.coldProject.uiTree[out.coldProject.defaultScreenId]) {
    return;
  }

  // 获取defaultScreenId,没有则为GroupProject的uiTree的第一个屏幕作为默认屏幕
  const defaultScreenId = await apis.groupProject.getDefaultScreenIdUsingGet({
    mapId,
    mode,
  });

  if (defaultScreenId) {
    out.coldProject.defaultScreenId = defaultScreenId;
    out.hotProject.defaultScreenId = defaultScreenId;
  } else {
    const firstScreenId = out.coldProject.uiTree[ROOT_ID]?.childrenIds[0];

    if (firstScreenId) {
      out.coldProject.defaultScreenId = firstScreenId;
      out.hotProject.defaultScreenId = firstScreenId;
    }
  }

  logger.info(
    `SHARE_STATE: defaultScreenId is ${defaultScreenId}, current defaultScreenId is ${out.coldProject.defaultScreenId}`,
  );
}
