export interface VersionInfo {
  /**
   * 每张地图会取 id 最大的版本作为当前版本
   */
  id: number;
  /**
   * 版本内容的创建时间，回滚产生的版本创建时间与原始版本相同
   */
  createdAt: string;
  isValid: boolean;
  /**
   * 用户对版本的描述
   */
  notice?: string;
}

export interface QueryVersionResponse {
  mapId: number;
  currentVersion: VersionInfo;
  recoverableVersions: VersionInfo[];
}
