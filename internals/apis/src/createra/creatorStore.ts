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
  FrontEndDataFormatBoolean,
  FrontEndDataFormatCreatorStoreConfigResp,
  UpdateCreatorStoreConfigParam,
} from './data-contracts';
import { ContentType, RequestParams } from '../interface';

import { HttpClient } from '../http-client';

export class CreatorStore<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags 商品模块
   * @name CheckStoreAccessUsingGet
   * @summary 查询地图是否有商城权限
   * @request GET:/creator-store/access
   * @secure
   */
  checkStoreAccessUsingGet = (
    query: { mapId: number },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/creator-store/access`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 商品模块
   * @name GetCreatorStoreConfigUsingGet1
   * @summary 通过ContainerName获取Creator Store配置
   * @request GET:/creator-store/config
   * @secure
   */
  getCreatorStoreConfigUsingGet1 = (
    query: { containerName: string; mode: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatCreatorStoreConfigResp, void>({
      path: `/creator-store/config`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 商品模块
   * @name UpdateCreatorStoreConfigUsingPost
   * @summary 更新Creator Store配置
   * @request POST:/creator-store/config
   * @secure
   */
  updateCreatorStoreConfigUsingPost = (
    param: UpdateCreatorStoreConfigParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/creator-store/config`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 商品模块
   * @name GetCreatorStoreConfigUsingGet
   * @summary 通过mapId获取Creator Store配置
   * @request GET:/creator-store/config/{mapId}
   * @secure
   */
  getCreatorStoreConfigUsingGet = (mapId: number, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatCreatorStoreConfigResp, void>({
      path: `/creator-store/config/${mapId}`,
      method: 'GET',
      ...params,
    });
}
