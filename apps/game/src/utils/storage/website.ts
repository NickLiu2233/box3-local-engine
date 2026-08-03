import { getStorageTemplate } from './local-storage';

export const WebsiteStorage = getStorageTemplate('GAME_WEB', {
  displayQuality: 1,
  lang: '',
  searchHistory: [] as string[],
  newCreator: true,
  openModelPreviewTimes: 0,
  accountBindTipTimeStamp: 0,
  // is codemao account weak.
  codemaoWeak: false,
  codemaoWeakTipTimeStamp: 0,
  clearedStorageCache: false,
  Authorization: '',
});
