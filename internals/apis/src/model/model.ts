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
  SourceType,
  ResBoolean,
  ResListModelSnapshotResp,
  ResModelResp,
  ResDefaultModelResp,
  UpdateModelProps,
  AddModelSharePoolParam,
  FrontEndDataFormatBoolean,
  DeleteModelShareParam,
  ModelSkinProjectParam,
  FrontEndDataFormatArray,
  CopyEvent,
} from '../data-contracts';
import { HttpClient } from '../http-client';
import { ContentType, RequestParams } from '../interface';
import {
  FrontEndDataFormatModelVO,
  SaveModelParamV1,
  SaveProjectSharedModelParam,
  SaveSharedSkinParam,
} from '../createra/data-contracts';

export class Model<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags 模型模块
   * @name CopyModelUsingPost
   * @summary 复制模型
   * @request POST:/model/copy
   * @secure
   */
  copyModelUsingPost = (
    query?: {
      /**
       * 新复制模型的名字
       */
      modelName: string;
      /**
       * 新复制模型的类型
       */
      modelType: number;
      /**
       * 复制源模型ID
       */
      originModelId: number;
      /**
       * 复制源模型类型
       * 选填，默认为0-snapshot
       */
      sourceType?: SourceType;
    },
    params: RequestParams = {},
  ) =>
    this.request<ResModelResp, void>({
      path: `/model/copy`,
      method: 'POST',
      query: query,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 皮肤模块
   * @name saveSkinUsingPost
   * @summary 保存共享皮肤
   * @request POST:/model/skin/save
   * @secure
   */
  saveSharedSkinUsingPost = (
    param: SaveSharedSkinParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatModelVO, void>({
      path: `/model/skin/save`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 模型模块
   * @name saveModelUsingPostV1
   * @summary 保存模型/保存皮肤
   * @request POST:/model/save-v1
   * @secure
   */
  saveModelUsingPostV1 = (
    param: SaveModelParamV1,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatModelVO, void>({
      path: `/model/save-v1`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 模型模块
   * @name GetSnapshotsUsingGet
   * @summary 获取模型快照列表
   * @request GET:/model/snapshots/{modelId}
   * @secure
   */
  getSnapshotsUsingGet = (
    modelId: number,
    query: { autoSave: boolean },
    params: RequestParams = {},
  ) =>
    this.request<ResListModelSnapshotResp, void>({
      path: `/model/snapshots/${modelId}`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 模型模块
   * @name updateModelUsingPost
   * @summary 更新模型数据
   * @request POST:/model/update
   * @secure
   */
  updateModelUsingPost = (
    data: UpdateModelProps,
    params: RequestParams = {},
  ) => {
    const formData = new FormData();
    const { modelId, animated, modelFile, modelFileHash, modelName } = data;

    formData.append('modelId', JSON.stringify(modelId));

    if (modelFileHash) {
      formData.append('modelFileHash', modelFileHash);
    }
    if (modelFile) {
      formData.append('modelFile', modelFile);
    }
    if (modelName) {
      formData.append('modelName', modelName);
    }
    if (animated !== undefined) {
      formData.append('animated', JSON.stringify(animated));
    }

    return this.request<ResModelResp, void>({
      path: `/model/update`,
      method: 'POST',
      body: formData,
      type: ContentType.FormData,
      ...params,
    });
  };
  /**
   * No description
   *
   * @tags 模型模块
   * @name getModelDetailUsingGet
   * @summary 获取模型v2
   * @request GET:/model/detail/{modelId}
   * @secure
   */
  getModelDetailUsingGet = (modelId: number, params: RequestParams = {}) =>
    this.request<ResModelResp, void>({
      path: `/model/detail/${modelId}`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags 模型模块
   * @name DeleteModelUsingDelete
   * @summary 删除模型
   * @request DELETE:/model/{modelId}
   * @secure
   */
  deleteModelUsingDelete = (modelIds: number[], params: RequestParams = {}) =>
    this.request<ResBoolean, void>({
      path: `/model/delete`,
      method: 'DELETE',
      body: modelIds,
      ...params,
    });

  /**
   * No description
   *
   * @tags 模型、模板
   * @name AddModelSharePoolUsingPost
   * @summary 新增共享模型
   * @request POST:/model/v2/share-pool
   * @secure
   */
  addModelSharePoolUsingPost = (
    param: AddModelSharePoolParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/model/v2/share-pool`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 模型、模板
   * @name DeleteModelSharePoolUsingDelete
   * @summary 删除共享模型
   * @request DELETE:/model/v2/share-pool
   * @secure
   */
  deleteModelSharePoolUsingDelete = (
    param: DeleteModelShareParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/model/v2/share-pool`,
      method: 'DELETE',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 模型-皮肤
   * @name batchAddSkinUsingPost
   * @summary 批量添加到项目皮肤库
   * @request POST:/model/skin/project/batch-add
   * @secure
   */
  batchAddSkinUsingPost = (
    param: ModelSkinProjectParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/model/skin/project/batch-add`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 模型-皮肤
   * @name setDefaultSkinUsingPut
   * @summary 设置地图默认皮肤
   * @request PUT:/model/skin/default
   * @secure
   */
  setDefaultSkinUsingPut = (
    query: {
      mapId: number;
      skinId?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/model/skin/default`,
      method: 'PUT',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 模型-皮肤
   * @name getDefaultSkinUsingGet
   * @summary 查询默认皮肤
   * @request GET:/model/skin/default
   * @secure
   */
  getDefaultSkinUsingGet = (
    query: {
      mapId: number;
      mode: 'edit' | 'play';
    },
    params: RequestParams = {},
  ) =>
    this.request<ResDefaultModelResp, void>({
      path: `/model/skin/default`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 模型-皮肤
   * @name getEngineDefaultSkinUsingGet
   * @summary 查询默认皮肤。game server使用，不用登录鉴权
   * @request GET:/engine/model/skin/default
   * @secure
   */
  getEngineDefaultSkinUsingGet = (
    query: {
      mapId: number;
      mode: 'edit' | 'play';
    },
    params: RequestParams = {},
  ) =>
    this.request<ResDefaultModelResp, void>({
      path: `/engine/model/skin/default`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 模型-皮肤
   * @name
   * @summary 查询将指定皮肤设置为默认皮肤的地图。game server使用
   * @request GET:/model/skin/project/default-map/{skinId}
   * @secure
   */
  getSkinMapIdList = (skinId: number, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatArray, void>({
      path: `/model/skin/project/default-map/${skinId}`,
      method: 'GET',
      ...params,
    });

  /**
   * No description
   *
   * @tags 扩展地图-模型共享
   * @name saveProjectSharedModelUsingPost
   * @summary 保存/修改项目共享模型
   * @request POST:/model/project-shared/save
   * @secure
   */
  saveProjectSharedModelUsingPost = (
    param: SaveProjectSharedModelParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatModelVO, void>({
      path: `/model/project-shared/save`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 扩展地图-模型共享
   * @name deleteProjectSharedModelUsingDelete
   * @summary 删除项目共享模型
   * @request DELETE:/model/project-shared
   * @secure
   */
  deleteProjectSharedModelUsingDelete = (
    query: {
      /** 地图ID */
      mapId: number;
      /** 模型ID */
      modelId: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/model/project-shared`,
      method: 'DELETE',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 扩展地图-模型共享
   * @name renameProjectSharedModelUsingPut
   * @summary 重命名项目共享模型
   * @request PUT:/model/project-shared/rename
   * @secure
   */
  renameProjectSharedModelUsingPut = (
    query: {
      /** 地图ID */
      mapId: number;
      /** 皮肤ID */
      modelId: number;
      /** 皮肤名称 */
      modelName: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<ResBoolean, void>({
      path: `/model/project-shared/rename`,
      method: 'PUT',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 扩展地图-模型共享
   * @name copyProjectSharedModelUsingPost
   * @summary 复制模型
   * @request POST:/model/project-shared/copy
   * @secure
   */
  copyProjectSharedModelUsingPost = (
    param?: {
      /**
       * 地图ID
       */
      mapId: number;
      /**
       * 复制源模型ID
       */
      originModelId: number;
      /**
       * 复制源模型类型
       * 选填，默认为0-snapshot, 1-复制release
       */
      sourceType?: SourceType;
      /**
       * 复制事件
       * 选填，0-主动复制(默认), 1-被动复制（需hash查重）
       */
      event?: CopyEvent;
    },
    params: RequestParams = {},
  ) =>
    this.request<ResModelResp, void>({
      path: `/model/project-shared/copy`,
      method: 'POST',
      body: param,
      ...params,
    });
}
