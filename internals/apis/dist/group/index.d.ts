import { SaveMapGroupProjectParam, UpdateMapGroupProjectVersionParam } from '../data-contracts';
import { HttpClient } from '../http-client';
import { RequestParams } from '../interface';
export declare class MapGroupProject<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
    /**
     * No description
     *
     * @tags 引擎后端相关
     * @name GetProjcetUsingGet
     * @summary 获取地图组工程数据
     * @request GET:/map-group-project
     * @secure
     */
    getProjectUsingGet: (query: {
        mapId: string;
        mode: string;
    }, params?: RequestParams) => Promise<Record<string, string>>;
    /**
     * No description
     *
     * @tags 引擎后端相关
     * @name SaveProjectUsingPost
     * @summary 保存地图组工程数据
     * @request POST:/map-group-project
     * @secure
     */
    saveProjectUsingPost: (param: SaveMapGroupProjectParam, params?: RequestParams) => Promise<boolean>;
    /**
     * No description
     *
     * @tags 引擎后端相关
     * @name MigrationUsingGet
     * @summary 地图组工程migration
     * @request GET:/map-group-project/migration
     * @secure
     */
    migrationUsingGet: (query: {
        mapId: string;
    }, params?: RequestParams) => Promise<null>;
    /**
     * No description
     *
     * @tags 引擎后端相关
     * @name UpdateVersionUsingPost
     * @summary 保存地图地图组工程版本
     * @request POST:/map-group-project/version
     * @secure
     */
    updateVersionUsingPost: (param: UpdateMapGroupProjectVersionParam, params?: RequestParams) => Promise<boolean>;
    /**
     * No description
     *
     * @tags 引擎后端相关
     * @name GetDefaultScreenIdUsingGet
     * @summary 获取地图默认屏幕ID
     * @request GET:/engine/default-screen-id
     * @secure
     */
    getDefaultScreenIdUsingGet: (query: {
        mapId: string;
        mode: string;
    }, params?: RequestParams) => Promise<string>;
    /**
     * No description
     *
     * @tags 引擎后端相关
     * @name playPictureMigrationUsingGet
     * @summary play端共享图片的migration，返回hash值
     * @request GET:/engine/map-group-project/picture/migration
     * @secure
     */
    playPictureMigrationUsingGet: (query: {
        mapId: string;
    }, params?: RequestParams) => Promise<string>;
    /**
     * No description
     *
     * @tags 引擎后端相关
     * @name nextUidListUsingGet
     * @summary 生成多个全局唯一UID
     * @request GET:/engine/uid/list
     * @secure
     */
    nextUidListUsingGet: (query: {
        num: number;
    }, params?: RequestParams) => Promise<string[]>;
}
//# sourceMappingURL=index.d.ts.map