import type { AppEnv } from '../configs/builder';

import { getCreateraInstance } from './request';
import { AppEdition } from '@box/schema/types/appEdition';
import { convertUserInfo } from 'src/utils/user';

type MapInfoDetailType = {
  content_id: number;
  name: string;
  describe: string;
  image: string;
  media?: string[];
  combType: number;
};

export async function getMapInfo(params: {
  cookie?: string;
  mode: 'edit' | 'play';
  containerName: string;
  appEnv: AppEnv;
  appEdition: AppEdition;
}): Promise<MapInfoDetailType> {
  const { mode, containerName } = params;

  const createraInstance = await getCreateraInstance();
  const mapInfoDetail = await createraInstance.getGameInfo({
    containerName,
    mode,
  });
  return {
    content_id: mapInfoDetail.mapId,
    name: mapInfoDetail.title,
    describe: mapInfoDetail.description,
    image: mapInfoDetail.cover,
    media: mapInfoDetail.mediaResourcesHash,
    combType: mapInfoDetail.combType,
  };
}

export async function getUserInfo(cookie: string, token?: string) {
  const contentInstance = await getCreateraInstance();
  try {
    const data = await contentInstance.getUserByTokenUsingGet({
      headers: { cookie: cookie || '', Authorization: token || '' },
    });
    if (data) {
      return convertUserInfo(data);
    }
  } catch (error) {
    console.log('get user info error: ', error);
  }
  return null;
}
