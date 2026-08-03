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
  CreateGameEditParam,
  ResSingleValueVOBoolean,
  ResSingleValueVOString,
} from '../data-contracts';
import { HttpClient } from '../http-client';
import { ContentType, RequestParams } from '../interface';

export class Container<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags 容器模块
   * @name CreateGameEditUsingPost
   * @summary 容器-创建游戏地图
   * @request POST:/container/create-game-edit
   */
  createGameEditUsingPost = (
    param: CreateGameEditParam,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOString, void>({
      path: `/container/create-game-edit`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 容器模块
   * @name GetEditorExperienceStatusUsingGet
   * @summary 容器-查询是否开启编辑器体验功能
   * @request GET:/container/editor-experience-status
   */
  getEditorExperienceStatusUsingGet = (params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/container/editor-experience-status`,
      method: 'GET',
      ...params,
    });
}
