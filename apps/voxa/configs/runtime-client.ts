export type AppEnv = 'development' | 'staging' | 'production';
export type AppEdition = 'box3' | 'createra';
export type AppRegion = 'cn' | 'oversea';

/**
 * 传给前端的 Runtime 配置，从ENV中读取，
 * 最终传给前端使用的Config会基于此配置扩展（但可能不完全相同
 * 前端配置优先考虑放这里
 */
export interface ClientRuntimeConfig {
  appEnv: AppEnv;
  appEdition: AppEdition;
  appRegion: AppRegion;

  cdnPath: string;
  backendServerUrl: string;

  /**
   * 页面展示的title
   */
  appTitle: string;
  /**
   * 官网地址
   */
  websiteUrl?: string;
  /**
   * 登录跳转页
   */
  loginUrl?: string;

  /**
   * 是否需要检查权限。
   * 目前如果appEdition是createra，则不需要检查权限
   */
  toCheckPermissions: boolean;

  /**
   * 神策埋点服务地址
   */
  sensorsTrackUrl: string;
  /**
   * 神策埋点项目id
   * 仅当appEdition为createra时存在。根据appRegion判断是createra还是box3
   */
  sensorsProjectId: SensorsProjectId;
  featureFlags: string[];
}

/**
 * 神策项目id
 */
export type SensorsProjectId = 'createra' | 'box3';
