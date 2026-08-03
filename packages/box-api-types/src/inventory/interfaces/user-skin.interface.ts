/**
 * 用户皮肤信息接口
 *
 * 表示用户拥有的单个皮肤的详细信息
 */
export interface IUserSkin {
  /**
   * 皮肤资源的 ID
   */
  avatarSkinId: string;

  /**
   * 皮肤类型
   */
  type: number;

  /**
   * 用户拥有该皮肤的数量
   */
  num: number;

  /**
   * 皮肤获得方式
   * 0 - 购买
   * 1 - 赠送
   * 2 - 活动获得
   * 等其他方式
   */
  receiveType: number;

  /**
   * 皮肤记录创建时间
   */
  createdAt: Date;

  /**
   * 皮肤记录最后更新时间
   */
  updatedAt: Date;
}
