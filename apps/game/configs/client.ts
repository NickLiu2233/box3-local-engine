import { pick } from 'ramda';
import type { ServerConfig } from './server';

export interface MapInfoConfig {
  // content id
  contentId: number;
  // share stuff
  name: string;
  description: string;
  image: string; // 作品封面
  customizeType: 'DIGITALBLOCKLAND' | 'Fantour' | '';
  backgroundImage: string; // loading页面的背景图
  combType: number; // 地图类型（0-普通地图，1-扩展主图，2-扩展副图）
}

export interface ClientModeConfig {
  mode: 'edit' | 'play';
  // container name
  name: string;
  /**
   * 平台VOXA的地址，用于跳转
   */
  WEBSITE_VOXA_URL: string;
}

export type FeatureFlags = {
  gameUI: boolean;
};

const PROPERTIES_FROM_SERVER = [
  'APP_ENV',
  'APP_EDITION',
  'APP_REGION',
  'LOG_LEVEL',
  'WEBSITE_PLAY_ROUTE',
  'MAAS_BACKEND_SERVER_URL',
  'JAVA_BACKEND_SERVER_URL',
  'BACKEND_SERVER_URL',
  'BOX_API_URL',
  'CREATERA_BACKEND_SERVER_URL',
  'CDN_PATH',
  'OSS_CDN_URL',
  'WEBSITE_URL',
  'HOME_URL',
  'ARENA_URL',
  'VOXA_URL',
  'ENGINE_APIS_URL',
  'isbnPreview',
  'mockJavaBackend',
  'mockJavaUrl',
  'THIRD_PARTY_URL',
  'PLATFORM_URL',
  'headless',
  'cacheIPFS',
  'SENSORS_TRACKER_URL',
  'isLocalGameServer',
  'remoteGameServerURL',
  'PAID_ACCESS',
  'FEATURE_FLAGS',
  'MAX_HALF_CHUNKS',
  'MAX_Y_HALF_CHUNKS',
  'SCRIPT_WHITELIST',
] as const;

export type ServerConfigForClient = Pick<
  ServerConfig,
  (typeof PROPERTIES_FROM_SERVER)[number]
>;

/**
 * 抽取 ServerConfig 转为 ClientConfig
 */
export const extractServerConfigForClient = pick(PROPERTIES_FROM_SERVER);

/**
 * 最终传给前端的Config，在SSR时组装
 */
export type ClientRuntimeConfig = ServerConfigForClient & {
  mapInfo: MapInfoConfig;
} & ClientModeConfig;
