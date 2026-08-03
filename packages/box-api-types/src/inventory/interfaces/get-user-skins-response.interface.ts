import { IUserSkin } from './user-skin.interface';

/**
 * 获取用户皮肤列表响应接口
 *
 * 包含用户的所有皮肤数据和统计信息
 */
export interface IGetUserSkinsResponse {
  /**
   * 用户 ID
   */
  userId: string;

  /**
   * 用户皮肤列表
   */
  skins: IUserSkin[];
}
