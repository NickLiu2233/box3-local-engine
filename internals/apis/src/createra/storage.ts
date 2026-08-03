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
  FrontEndDataFormatPageResponseResultValue,
  FrontEndDataFormatResultValue,
  FrontEndDataFormatInt,
  IncrParam,
  LockParam,
  PrepareParam,
  RemoveParam,
  SetParam,
} from './data-contracts';
import { HttpClient } from '../http-client';

import { ContentType, RequestParams } from '../interface';

export class Storage<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description 查询数据，不存在则返回null；如果操作时key已被lock且ticket不正确，则抛出33000009异常
   *
   * @tags DataStores
   * @name GetUsingGet
   * @summary 查询数据
   * @request GET:/storage/data-stores
   * @secure
   */
  getUsingGet = (
    query: {
      isGroup?: boolean;
      key: string;
      mapId: string;
      mode: string;
      storageName: string;
      ticket?: string;
      version?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatResultValue, void>({
      path: `/storage/data-stores`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * @description 不存在则写入，存在则更新，操作成功则返回true，操作失败则返回false；如果操作时key已被lock且ticket不正确，则抛出33000009异常
   *
   * @tags DataStores
   * @name SetUsingPost
   * @summary 写入/更新数据
   * @request POST:/storage/data-stores
   * @secure
   */
  setUsingPost = (params: SetParam, requestParams: RequestParams = {}) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/storage/data-stores`,
      method: 'POST',
      body: params,
      type: ContentType.Json,
      ...requestParams,
    });
  /**
   * @description 针对某个key增长一定的值，并返回增长后的值；
   *
   * @tags DataStores
   * @name IncrUsingPost
   * @summary 针对某个key增长一定的值，并返回增长后的值；
   * @request POST:/storage/data-stores/incr
   * @secure
   */
  incrUsingPost = (params: IncrParam, requestParams: RequestParams = {}) =>
    this.request<FrontEndDataFormatInt, void>({
      path: `/storage/data-stores/incr`,
      method: 'POST',
      body: params,
      type: ContentType.Json,
      ...requestParams,
    });

  /**
   * @description 逻辑删除，可通过参数控制是否返回删除的内容；如果操作时key已被lock且ticket不正确，则抛出33000009异常
   *
   * @tags DataStores
   * @name RemoveUsingDelete
   * @summary 删除数据
   * @request DELETE:/storage/data-stores
   * @secure
   */
  removeUsingDelete = (
    params: RemoveParam,
    requestParams: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatResultValue, void>({
      path: `/storage/data-stores`,
      method: 'DELETE',
      body: params,
      type: ContentType.Json,
      ...requestParams,
    });
  /**
   * @description 成功则返回true，失败则返回false，已被锁定抛出33000009异常
   *
   * @tags DataStores
   * @name LockUsingPost
   * @summary key读写加锁
   * @request POST:/storage/data-stores/lock
   * @secure
   */
  lockUsingPost = (params: LockParam, requestParams: RequestParams = {}) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/storage/data-stores/lock`,
      method: 'POST',
      body: params,
      type: ContentType.Json,
      ...requestParams,
    });
  /**
   * @description constraint参数控制约束与排序条件
   *
   * @tags DataStores
   * @name PageListUsingGet
   * @summary 分页查询
   * @request GET:/storage/data-stores/page
   * @secure
   */
  pageListUsingGet = (
    query: {
      'constraint.ascending'?: boolean;
      'constraint.max'?: number;
      'constraint.min'?: number;
      'constraint.target'?: string;
      'isGroup'?: boolean;
      'limit'?: number;
      'mapId': string;
      'mode': string;
      'offset'?: number;
      'storageName': string;
    },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatPageResponseResultValue, void>({
      path: `/storage/data-stores/page`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * @description 如果该表存在则直接返回true，不存在则创建并返回true，如果创建失败则返回false
   *
   * @tags DataStores
   * @name PrepareUsingPost
   * @summary 准备存储表
   * @request POST:/storage/data-stores/prepare
   * @secure
   */
  prepareUsingPost = (
    params: PrepareParam,
    requestParams: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/storage/data-stores/prepare`,
      method: 'POST',
      body: params,
      type: ContentType.Json,
      ...requestParams,
    });
  /**
   * @description 成功返回true，失败返回false
   *
   * @tags DataStores
   * @name DeleteStorageUsingDelete
   * @summary 删除存储表
   * @request DELETE:/storage/data-stores/storage
   * @secure
   */
  deleteStorageUsingDelete = (
    params: PrepareParam,
    requestParams: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/storage/data-stores/storage`,
      method: 'DELETE',
      body: params,
      ...requestParams,
    });
  /**
   * @description 成功则返回true，失败则返回false
   *
   * @tags DataStores
   * @name UnlockUsingPost
   * @summary key读写解锁
   * @request POST:/storage/data-stores/unlock
   * @secure
   */
  unlockUsingPost = (params: LockParam, requestParams: RequestParams = {}) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/storage/data-stores/unlock`,
      method: 'POST',
      body: params,
      type: ContentType.Json,
      ...requestParams,
    });
}
