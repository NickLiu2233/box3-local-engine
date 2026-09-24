import { UsersRoutes } from '@box/box-api-types';
import { FetchRequestOptions, HttpClient } from '../core/http-client';
/**
 * 用户 API 客户端
 * 提供了与用户相关的所有 API 操作
 *
 * 使用示例:
 * ```typescript
 * const client = new UsersApiClient(httpClient);
 * const profile = await client.getMyProfile();
 * ```
 */
export declare class UsersApiClient {
    private readonly httpClient;
    constructor(httpClient: HttpClient);
    /**
     * 获取当前用户个人资料
     *
     * @description
     * 获取认证用户的个人资料，包含用户的基本信息、权限等
     * 此接口对应 UsersRoutes.GetMyProfileEndpoint
     *
     * @param options - 额外的请求选项（可选）
     * @returns 返回用户资料 DTO
     * @throws {ApiError} 当请求失败时抛出错误
     *
     * @example
     * ```typescript
     * try {
     *   const profile = await usersApiClient.getMyProfile();
     *   console.log(profile.displayName);
     * } catch (error) {
     *   console.error('Failed to fetch profile:', error.message);
     * }
     * ```
     */
    getMyProfile(options?: FetchRequestOptions): Promise<UsersRoutes.GetMyProfileEndpoint['response']['body']>;
    /**
     * 批量获取用户公开资料
     *
     * @description
     * 根据用户 ID 列表批量获取用户的公开资料（不需要认证）
     * 包含用户昵称、头像等基本信息
     * 此接口对应 UsersRoutes.BatchGetUserProfilesEndpoint
     *
     * @param request - 请求参数对象
     * @param request.ids - 用户 ID 列表
     * @param request.page - 页码，默认为 1
     * @param request.pageSize - 每页数量，默认为 100，最大为 500
     * @param options - 额外的请求选项（可选）
     * @returns 返回完整的 API 响应，包含用户资料列表、分页信息
     * @throws {ApiError} 当请求失败时抛出错误
     *
     * @example
     * ```typescript
     * try {
     *   const response = await usersApiClient.batchGetUserProfiles(
     *     { ids: [123, 456, 789], page: 1, pageSize: 50 }
     *   );
     *   console.log(response.users); // 用户资料列表
     *   console.log(response.pagination); // 分页信息
     * } catch (error) {
     *   console.error('Failed to fetch user profiles:', error.message);
     * }
     * ```
     */
    batchGetUserProfiles(request: UsersRoutes.IBatchGetUserProfilesRequest, options?: FetchRequestOptions): Promise<UsersRoutes.IBatchGetUserProfilesResponse>;
}
//# sourceMappingURL=users.api.d.ts.map