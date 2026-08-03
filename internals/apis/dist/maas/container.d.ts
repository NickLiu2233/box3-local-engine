import { CreateGameEditParam } from '../data-contracts';
import { HttpClient } from '../http-client';
import { RequestParams } from '../interface';
export declare class Container<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
    /**
     * No description
     *
     * @tags 容器模块
     * @name CreateGameEditUsingPost
     * @summary 容器-创建游戏地图
     * @request POST:/container/create-game-edit
     */
    createGameEditUsingPost: (param: CreateGameEditParam, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOString>;
    /**
     * No description
     *
     * @tags 容器模块
     * @name GetEditorExperienceStatusUsingGet
     * @summary 容器-查询是否开启编辑器体验功能
     * @request GET:/container/editor-experience-status
     */
    getEditorExperienceStatusUsingGet: (params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
}
//# sourceMappingURL=container.d.ts.map