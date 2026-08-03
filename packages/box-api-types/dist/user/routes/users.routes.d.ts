import { IUserPrivateProfile, IUserPublicProfile } from '../interfaces/user-profile.interface';
/**
 * 用户 API 路由定义
 * 定义所有用户相关的 REST API 端点和参数类型
 */
export declare namespace UsersRoutes {
    /**
     * 获取当前用户个人资料端点
     *
     * 替代了旧的 online() RPC API，返回用户的完整信息
     * 仅限已认证用户访问，获取自己的个人资料
     *
     * @endpoint GET /v1/users/me/profile
     * @auth 需要有效的 JWT Bearer Token
     * @response 200 - 成功返回用户资料
     * @response 401 - 未授权 (用户未登录或令牌无效)
     * @response 404 - 用户不存在
     * @response 500 - 服务器错误
     */
    interface GetMyProfileEndpoint {
        method: 'GET';
        path: '/v1/users/me/profile';
        request: {
            withCredentials: true;
        };
        response: {
            body: IUserPrivateProfile;
        };
    }
    /**
     * 批量获取用户信息的请求 DTO
     */
    interface IBatchGetUserProfilesRequest {
        /** 用户 ID 列表 */
        ids: number[];
        /** 分页：每页数量 (可选，默认 100，最大 500) */
        pageSize?: number;
        /** 分页：当前页码 (可选，默认 1) */
        page?: number;
    }
    /**
     * 批量获取用户的响应
     */
    interface IBatchGetUserProfilesResponse {
        users: IUserPublicProfile[];
        pagination: {
            total: number;
            page: number;
            pageSize: number;
            totalPages: number;
        };
    }
    /**
     * 批量获取用户信息端点
     * 根据用户 ID 列表获取用户的公开信息
     *
     * @endpoint GET /v1/users/batch
     * @auth 可选（不认证返回公开信息）
     * @description
     *   - 用于获取多个用户的信息
     *   - 自动去重并排序 ID 列表
     *   - 不存在的 ID 自动忽略
     *   - 返回结果按传入 ID 顺序排列
     */
    interface BatchGetUserProfilesEndpoint {
        method: 'POST';
        path: '/v1/users/profiles/batchGet';
        request: {
            body: IBatchGetUserProfilesRequest;
            withCredentials?: true;
        };
        response: {
            body: IBatchGetUserProfilesResponse;
        };
    }
    /**
     * 所有用户路由的联合类型
     * 用于类型检查和 API 客户端生成
     */
    type Endpoints = GetMyProfileEndpoint | BatchGetUserProfilesEndpoint;
}
//# sourceMappingURL=users.routes.d.ts.map