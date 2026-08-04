import { getSharedLogger } from './logger';
import { getServerConfig } from '../configs/server';
import { getMapInfo } from './data-fatching';
import type { MapInfoConfig } from '../configs/client';
import { getPlayWorlds } from './play-worlds';

type CustomizeConfig = {
  key: MapInfoConfig['customizeType'];
  reg: RegExp;
  // TODO: 扩展配置
};

const CUSTOMIZE_CONFIGS: CustomizeConfig[] = [
  {
    key: 'DIGITALBLOCKLAND',
    reg: new RegExp(/digitalblockland/, 'i'),
  },
  {
    key: 'Fantour',
    reg: new RegExp(/fantour/, 'i'),
  },
];

// TODO: 移除这个怪异的东西
/**
 * 合作地图的正则匹配
 * 当前合作方：
 * digitalblockland
 * fantour
 */
function getCustomizeType(name?: string) {
  if (!name) {
    return '';
  }

  for (const { key, reg } of CUSTOMIZE_CONFIGS) {
    if (reg.test(name)) {
      return key;
    }
  }

  return '';
}

export async function getMapContentInfo(
  mode: 'play' | 'edit',
  name: string,
  cookie: string,
): Promise<MapInfoConfig> {
  const ServerConfig = await getServerConfig();
  const sharedLogger = await getSharedLogger();
  // FIXME Redirect the legacy map
  sharedLogger.info('Fetching Map Info...');
  const containerName = name;
  if (ServerConfig.isLocalGameServer) {
    const localWorld = process.env.BOX_PLAY_LIBRARY_PATH
      ? getPlayWorlds().find((world) => world.id === containerName)
      : undefined;
    if (process.env.BOX_PLAY_LIBRARY_PATH && !localWorld) {
      throw new Error(`Play world does not exist: ${containerName}`);
    }
    return {
      contentId: 0,
      name: localWorld?.name || containerName || 'Local World',
      description: localWorld?.description || '',
      image: localWorld?.cover || '',
      customizeType: getCustomizeType(containerName),
      backgroundImage: localWorld?.cover || '',
      combType: 0,
    } as const;
  }
  sharedLogger.info(`
    mode: ${mode},
    appEnv: ${ServerConfig.APP_ENV},
    containerName: ${containerName}
  `);

  try {
    const mapInfo = await getMapInfo({
      mode,
      appEnv: ServerConfig.APP_ENV,
      containerName,
      cookie,
      appEdition: ServerConfig.APP_EDITION,
    });
    sharedLogger.info(`Map Info Fetched. ${JSON.stringify(mapInfo)}`);

    return {
      contentId: mapInfo.content_id,
      name: mapInfo.name,
      description: mapInfo.describe,
      image: mapInfo.image,
      customizeType: getCustomizeType(containerName),
      backgroundImage: getCoverFromMedia(mapInfo.media),
      combType: mapInfo.combType,
    } as const;
  } catch (e) {
    // TODO: 错误码定义
    throw new Error(e);
  }
}

const getCoverFromMedia = (media: string[] | undefined) => {
  const notImageReg =
    /(\.gif|\.mp3|\.mp4|\.m2v|\.mkv|\.rmvb|\.wmv|\.avi|\.flv|\.mov|\.m4v)\s*(\?|$)/i;

  if (media) {
    return media.find((item) => !notImageReg.test(item)) || '';
  }
  return '';
};
