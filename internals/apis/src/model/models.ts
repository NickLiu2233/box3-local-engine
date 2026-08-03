/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import {
  ResListModelResp,
  ResPageModelResp,
  ResBoolean,
  GetModelsParam,
  ResModelMigration,
} from '../data-contracts';
import { HttpClient } from '../http-client';
import { RequestParams } from '../interface';
import { FrontEndDataFormatPageResponseModelVO } from '../createra/data-contracts';

export class Models<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags 模型模块
   * @name GetModelsUsingGet
   * @summary 获取模型列表
   * @request GET:/models
   * @secure
   * @deprecated 请使用getModelsUsingGetV2
   */
  getModelsUsingGet = (
    query?: { modelType?: number },
    params: RequestParams = {},
  ) =>
    this.request<ResListModelResp, void>({
      path: `/models`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 模型模块
   * @name GetModelsUsingGet
   * @summary 获取模型列表，可分页
   * @request GET:/models/v2
   * @secure
   */
  getModelsUsingGetV2 = (query: GetModelsParam, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatPageResponseModelVO, void>({
      path: `/models/v2`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 模型模块
   * @name SearchModelUsingGet
   * @summary 搜索模型
   * @request GET:/models/search
   * @secure
   * @deprecated 请使用getModelsUsingGetV2
   */
  searchModelUsingGet = (
    query?: { modelName?: string; modelType?: number },
    params: RequestParams = {},
  ) =>
    this.request<ResListModelResp, void>({
      path: `/models/search`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 分页获取用户模型数据
   * @name listModelsUsingGET
   * @summary 分页获取用户模型数据
   * @request GET:/models-page
   * @secure
   */
  listModelsUsingGET = (
    query?: {
      /**
       * 查询数量
       */
      limit?: number;
      /**
       * 偏移量
       */
      offset?: number;
      /**
       * 排序方式
       * 1：编辑时间
       * 2：创建时间
       */
      orderBy?: number;
      /**
       * 是否降序（只在orderBy合理的情况下有效)
       */
      orderDesc?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.request<ResPageModelResp, void>({
      path: `/models-page`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 皮肤模块
   * @name deleteSharedSkinUsingDelete
   * @summary 删除共享皮肤
   * @request DELETE:/model/skin/{mapId}/{skinId}
   * @secure
   */
  deleteSharedSkinUsingDelete = (
    param: {
      /** 地图ID */
      mapId: number;
      /** 皮肤ID */
      skinId: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<ResBoolean, void>({
      path: `/model/skin/${param.mapId}/${param.skinId}`,
      method: 'DELETE',
      ...params,
    });
  /**
   * No description
   *
   * @tags 皮肤模块
   * @name renameSharedSkinUsingPut
   * @summary 重命名共享皮肤
   * @request PUT:/model/skin/rename
   * @secure
   */
  renameSharedSkinUsingPut = (
    param: {
      /** 地图ID */
      mapId: number;
      /** 皮肤ID */
      skinId: number;
      /** 皮肤名称 */
      skinName: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<ResBoolean, void>({
      path: `/model/skin/rename`,
      method: 'PUT',
      query: param,
      ...params,
    });

  /**
   * No description
   *
   * @tags 模型模块
   * @name getEngineModelsUsingGet
   * @summary 获取模型列表，可分页，game server使用，不用登录鉴权
   * @request GET:/engine/models
   * @secure
   */
  getEngineModelsUsingGet = (
    query: GetModelsParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatPageResponseModelVO, void>({
      path: `/engine/models`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 模型模块
   * @name mapModelMigrationUsingPost
   * @summary 项目模型迁移。server使用
   * @request POST:/engine/model/project-shared/migration
   * @secure
   */
  mapModelMigrationUsingPost = (
    query: { mapId: number },
    params: RequestParams = {},
  ) =>
    this.request<ResModelMigration, void>({
      path: `/engine/model/project-shared/migration`,
      method: 'POST',
      query: query,
      ...params,
    });
}
