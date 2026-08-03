/**
 * 神策项目id
 */
export type SensorsProjectId = 'createra' | 'box3';

/**
 * 神策埋点 - 公共属性
 * @deprecated 有一些没必要上报的属性，后续用 SensorPublicProps 代替
 */
export type SensorsRegisterOptions = {
  /**
   * 是否登录
   */
  is_login: () => boolean;
  /**
   * 项目ID
   */
  project_ID: SensorsProjectId;
  /**
   * 平台
   */
  platform: string;
  /**
   * 地图名称
   */
  map_name: string;
  /**
   * 地图ID(海外)
   */
  map_ID?: number;
  /**
   * 地图ID(国内)
   */
  map_id?: number;
};

/**
 * 新定义的引擎侧神策事件的公共属性
 */
export type SensorPublicProps = {
  /**
   * 平台
   */
  platform: string;
  /**
   * 地图名称
   */
  map_name: string;
  /**
   * 地图ID
   */
  map_id: number;
};

export enum SensorEvent {
  PAGE_END = 'PageEnd',

  // play进入loading页
  MAP_CONNECT = 'MapConnect',
  // play进入游戏内
  MAP_ENTER = 'MapEnter',

  // edit点击进入游戏事件
  ARENA_CREATE_CLICK = 'ArenaCreateClick',
  // edit进入游戏内
  ARENA_ENTER = 'ArenaEnter',
  // edit项目保存埋点
  MAP_SAVE = 'MapSave',
}
