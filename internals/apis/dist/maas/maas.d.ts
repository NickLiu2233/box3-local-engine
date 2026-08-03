import { HttpClient } from '../http-client';
import { RequestParams } from '../interface';
export declare class Maas<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
    /**
     * No description
     *
     * @tags 用于签发第三方登录token
     * @name setCookieWithToken
     * @summary 利用签发给第三方登录的token来设置cookie
     * @request GET:/user/auth2Cookie
     */
    setCookieWithToken: (query: {
        token: string;
    }) => Promise<import("../data-contracts").PageResponseSimpleUserInfoVO>;
    /**
     * No description
     *
     * @tags 用于自动审核发布作品
     * @name autoReviewPublish
     * @summary 自动审核发布作品
     * @request POST:/map/auto-review
     */
    autoReviewPublish: (query: {
        contentId: string;
    }) => Promise<import("../data-contracts").PageResponseSimpleUserInfoVO>;
    /**
     * No description
     *
     * @tags 复制地图
     * @name copyMap
     * @summary 复制地图
     * @request POST:/map/copy
     */
    mapCopyUsingPost: (query: {
        contentId: string;
        name: string;
    }) => Promise<boolean>;
    /**
     * No description
     *
     * @tags 查询地图
     * @name getMapByPage
     * @summary 查询地图
     * @request GET:/map/page
     */
    mapPageUsingGet: (query: {
        limit: number;
        offset: number;
    }, params?: RequestParams) => Promise<void>;
    /**
     * No description
     *
     * @tags 删除地图
     * @name deleteMap
     * @summary 删除地图
     * @request DELETE:/map/contentId
     */
    mapDeleteUsingDelete: (query: {
        contentId: string;
    }, params?: RequestParams) => Promise<boolean>;
}
//# sourceMappingURL=maas.d.ts.map