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
  FrontEndDataFormatArrayString,
  FrontEndDataFormatBoolean,
  FrontEndDataFormatMapStringString,
  SaveMapGroupProjectParam,
  UpdateMapDefaultScreenIdParam,
  UpdateMapGroupProjectVersionParam,
  FrontEndDataFormatNull,
} from '../data-contracts';
import { HttpClient } from '../http-client';
import { ContentType, RequestParams } from '../interface';
import { FrontEndDataFormatString } from '../createra/data-contracts';

export class MapGroupProject<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name GetProjcetUsingGet
   * @summary 获取地图组工程数据
   * @request GET:/map-group-project
   * @secure
   */
  getProjectUsingGet = (
    query: { mapId: string; mode: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatMapStringString, void>({
      path: `/engine/map-group-project`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name SaveProjectUsingPost
   * @summary 保存地图组工程数据
   * @request POST:/map-group-project
   * @secure
   */
  saveProjectUsingPost = (
    param: SaveMapGroupProjectParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/map-group-project`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name MigrationUsingGet
   * @summary 地图组工程migration
   * @request GET:/map-group-project/migration
   * @secure
   */
  migrationUsingGet = (query: { mapId: string }, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatNull, void>({
      path: `/engine/map-group-project/migration`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name UpdateVersionUsingPost
   * @summary 保存地图地图组工程版本
   * @request POST:/map-group-project/version
   * @secure
   */
  updateVersionUsingPost = (
    param: UpdateMapGroupProjectVersionParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/map-group-project/version`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name GetDefaultScreenIdUsingGet
   * @summary 获取地图默认屏幕ID
   * @request GET:/engine/default-screen-id
   * @secure
   */
  getDefaultScreenIdUsingGet = (
    query: { mapId: string; mode: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatString, void>({
      path: `/engine/default-screen-id`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name playPictureMigrationUsingGet
   * @summary play端共享图片的migration，返回hash值
   * @request GET:/engine/map-group-project/picture/migration
   * @secure
   */
  playPictureMigrationUsingGet = (
    query: { mapId: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatString, void>({
      path: `/engine/map-group-project/picture/migration`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name nextUidListUsingGet
   * @summary 生成多个全局唯一UID
   * @request GET:/engine/uid/list
   * @secure
   */
  nextUidListUsingGet = (query: { num: number }, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatArrayString, void>({
      path: `/engine/uid/list`,
      method: 'GET',
      query: query,
      ...params,
    });
}
