import { UpdateCreatorStoreConfigParam } from './data-contracts';
import { RequestParams } from '../interface';
import { HttpClient } from '../http-client';
export declare class CreatorStore<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
    /**
     * No description
     *
     * @tags 商品模块
     * @name CheckStoreAccessUsingGet
     * @summary 查询地图是否有商城权限
     * @request GET:/creator-store/access
     * @secure
     */
    checkStoreAccessUsingGet: (query: {
        mapId: number;
    }, params?: RequestParams) => Promise<boolean>;
    /**
     * No description
     *
     * @tags 商品模块
     * @name GetCreatorStoreConfigUsingGet1
     * @summary 通过ContainerName获取Creator Store配置
     * @request GET:/creator-store/config
     * @secure
     */
    getCreatorStoreConfigUsingGet1: (query: {
        containerName: string;
        mode: string;
    }, params?: RequestParams) => Promise<import("./data-contracts").CreatorStoreConfigResp>;
    /**
     * No description
     *
     * @tags 商品模块
     * @name UpdateCreatorStoreConfigUsingPost
     * @summary 更新Creator Store配置
     * @request POST:/creator-store/config
     * @secure
     */
    updateCreatorStoreConfigUsingPost: (param: UpdateCreatorStoreConfigParam, params?: RequestParams) => Promise<boolean>;
    /**
     * No description
     *
     * @tags 商品模块
     * @name GetCreatorStoreConfigUsingGet
     * @summary 通过mapId获取Creator Store配置
     * @request GET:/creator-store/config/{mapId}
     * @secure
     */
    getCreatorStoreConfigUsingGet: (mapId: number, params?: RequestParams) => Promise<import("./data-contracts").CreatorStoreConfigResp>;
}
//# sourceMappingURL=creatorStore.d.ts.map