import { IGetUserSkinsResponse } from '../interfaces/get-user-skins-response.interface';

/**
 * 库存 API 路由定义
 * 定义所有库存相关的 REST API 端点和参数类型
 */
export namespace InventoryRoutes {
  /**
   * 获取用户所有皮肤的请求 DTO
   */
  export interface IGetUserSkinsRequest {
    /** 用户 ID */
    userId: string;
  }

  /**
   * 获取指定用户的所有皮肤端点
   *
   * 从数据库查询用户拥有的所有皮肤信息，包括皮肤 ID、类型、获得方式等详细信息
   * 仅管理员可访问
   *
   * @endpoint GET /v1/admin/inventory/users/{userId}/skins
   * @auth 需要有效的 JWT Bearer Token 并具备管理员权限
   * @param userId - 用户 ID（路径参数）
   * @response 200 - 成功返回用户皮肤列表
   * @response 400 - 用户 ID 参数格式错误
   * @response 401 - 未授权 (用户未登录或令牌无效)
   * @response 403 - 禁止访问 (无管理员权限)
   * @response 404 - 用户不存在
   * @response 500 - 服务器错误
   *
   * @example
   * // 请求示例
   * GET /v1/admin/inventory/users/12345/skins
   * Authorization: Bearer <token>
   *
   * // 响应示例 (200)
   * {
   *   "userId": 12345,
   *   "totalCount": 3,
   *   "skins": [
   *     {
   *       "id": 1,
   *       "userId": 12345,
   *       "avatarSkinId": 100,
   *       "type": 1,
   *       "num": 1,
   *       "receiveType": 0,
   *       "createdAt": "2025-10-29T12:00:00Z",
   *       "updatedAt": "2025-10-29T12:00:00Z"
   *     }
   *   ]
   * }
   */
  export interface GetUserSkinsEndpoint {
    method: 'GET';
    path: '/users/:userId/skins';
    request: {
      params: IGetUserSkinsRequest;
      withCredentials: true;
      needAdmin: true;
    };
    response: {
      body: IGetUserSkinsResponse;
    };
  }

  /**
   * 所有库存路由的联合类型
   * 用于类型检查和 API 客户端生成
   */
  export type Endpoints = GetUserSkinsEndpoint;
}
