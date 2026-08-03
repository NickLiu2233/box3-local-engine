import { BoxApiClient } from '@box-local/box-api-client';
import { clientConfig } from '/src/config/client';

/**
 * Box API 客户端单例实例
 * 用于前端调用 Box API 服务的 REST 接口
 *
 * 使用示例:
 * ```typescript
 * import { boxApiClient } from 'src/client/api/box-api-client';
 *
 * // 批量获取用户资料
 * const response = await boxApiClient.users.batchGetUserProfiles({
 *   ids: [1, 2, 3],
 *   page: 1,
 *   pageSize: 100,
 * });
 * console.log(response.data.users);
 * ```
 */
export const boxApiClient = new BoxApiClient({
  baseUrl: clientConfig.BOX_API_URL,
});
