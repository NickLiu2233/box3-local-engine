"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersApiClient = void 0;
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
class UsersApiClient {
    constructor(httpClient) {
        Object.defineProperty(this, "httpClient", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: httpClient
        });
    }
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
    getMyProfile(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.httpClient.get('/v1/users/me/profile', options);
        });
    }
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
    batchGetUserProfiles(request, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // 注意：由于 IBatchGetUserProfilesRequest 接口缺少索引签名，
            // 需要通过 unknown 进行类型断言以兼容 HttpClient.post 的参数类型
            return this.httpClient.post('/v1/users/profiles/batchGet', request, options);
        });
    }
}
exports.UsersApiClient = UsersApiClient;
//# sourceMappingURL=users.api.js.map