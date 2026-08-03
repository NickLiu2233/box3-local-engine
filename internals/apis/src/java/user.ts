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
  FollowParam,
  ResAvatarStatusVO,
  ResAvatarUploadStatusVO,
  ResEventStatusVO,
  ResListBlocklistUserInfoVO,
  ResListString,
  ResPageResponseSimpleUserInfoAndFollowingVO,
  ResPageResponseSimpleUserInfoVO,
  ResPageResponseUserBrowseHistoryVO,
  ResSimpleUserInfoAndStatisticsVO,
  ResSingleValueVOBoolean,
  ResUserLanguageVO,
  UserUpdateParam,
  WearingSkins,
} from '../data-contracts';
import { HttpClient } from '../http-client';
import { ContentType, RequestParams } from '../interface';

export class JavaUser<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags 用户
   * @name NoticeAvatarUsingPatch
   * @summary 用户-将头像状态改为重视
   * @request PATCH:/user/avatar/notice
   */
  noticeAvatarUsingPatch = (params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/avatar/notice`,
      method: 'PATCH',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name GetAvatarStatusUsingGet
   * @summary 用户-获取自身头像审核状态
   * @request GET:/user/avatar/status
   */
  getAvatarStatusUsingGet = (params: RequestParams = {}) =>
    this.request<ResAvatarStatusVO, void>({
      path: `/user/avatar/status`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name GetAvatarUploadStatusUsingGet
   * @summary 用户-获取头像上传状态
   * @request GET:/user/avatar/upload-status
   */
  getAvatarUploadStatusUsingGet = (params: RequestParams = {}) =>
    this.request<ResAvatarUploadStatusVO, void>({
      path: `/user/avatar/upload-status`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name AddBlockUsingPatch
   * @summary 用户-屏蔽某人
   * @request PATCH:/user/block/{userId}
   */
  addBlockUsingPatch = (userId: number, params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/block/${userId}`,
      method: 'PATCH',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name GetBlocklistUsingGet
   * @summary 用户-获取自己屏蔽列表
   * @request GET:/user/blocklist
   */
  getBlocklistUsingGet = (params: RequestParams = {}) =>
    this.request<ResListBlocklistUserInfoVO, void>({
      path: `/user/blocklist`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name ListBrowseHistoryUsingGet
   * @summary 用户-获取用户浏览记录
   * @request GET:/user/browse-history
   */
  listBrowseHistoryUsingGet = (
    query?: { limit?: number; offset?: number; type?: number },
    params: RequestParams = {},
  ) =>
    this.request<ResPageResponseUserBrowseHistoryVO, void>({
      path: `/user/browse-history`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name ClearBrowseHistoryUsingDelete
   * @summary 用户-清空浏览历史
   * @request DELETE:/user/browse/clear
   */
  clearBrowseHistoryUsingDelete = (params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/browse/clear`,
      method: 'DELETE',
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name AddBrowseHistoryUsingPost
   * @summary 用户-添加内容浏览历史
   * @request POST:/user/browse/record/{contentId}
   */
  addBrowseHistoryUsingPost = (
    contentId?: string,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/browse/record/${contentId}`,
      method: 'POST',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name DeleteBrowseHistoryUsingDelete
   * @summary 用户-删除某个内容的浏览记录
   * @request DELETE:/user/browse/{contentId}
   */
  deleteBrowseHistoryUsingDelete = (
    contentId?: string,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/browse/${contentId}`,
      method: 'DELETE',
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name GetEventStatusUsingGet
   * @summary 用户-获取事件状态
   * @request GET:/user/event/status
   */
  getEventStatusUsingGet = (params: RequestParams = {}) =>
    this.request<ResEventStatusVO, void>({
      path: `/user/event/status`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name GetByParamUsingGet
   * @summary 用户-根据条件获取用户信息
   * @request GET:/user/get/param
   */
  getByParamUsingGet = (
    query?: {
      id?: number;
      publishedContentsCount?: boolean;
      username?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<ResSimpleUserInfoAndStatisticsVO, void>({
      path: `/user/get/param`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户-交互
   * @name CollectContentUsingPost
   * @summary 交互-收藏内容
   * @request POST:/user/interactive/collect/{contentId}
   */
  collectContentUsingPost = (contentId?: string, params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/interactive/collect/${contentId}`,
      method: 'POST',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户-交互
   * @name DeleteCollectedContentUsingDelete
   * @summary 交互-取消内容收藏
   * @request DELETE:/user/interactive/collect/{contentId}
   */
  deleteCollectedContentUsingDelete = (
    contentId?: string,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/interactive/collect/${contentId}`,
      method: 'DELETE',
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户-交互
   * @name FollowUsingPost
   * @summary 交互-关注/取消关注
   * @request POST:/user/interactive/follow
   */
  followUsingPost = (param: FollowParam, params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/interactive/follow`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户-交互
   * @name ListFollowerUsingGet
   * @summary 交互-分页获取粉丝列表
   * @request GET:/user/interactive/follower/list
   */
  listFollowerUsingGet = (
    query: { limit?: number; offset?: number; userId: number },
    params: RequestParams = {},
  ) =>
    this.request<ResPageResponseSimpleUserInfoAndFollowingVO, void>({
      path: `/user/interactive/follower/list`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户-交互
   * @name ListFollowingUsingGet
   * @summary 交互-分页获取关注列表
   * @request GET:/user/interactive/following/list
   */
  listFollowingUsingGet = (
    query: { limit?: number; offset?: number; userId: number },
    params: RequestParams = {},
  ) =>
    this.request<ResPageResponseSimpleUserInfoAndFollowingVO, void>({
      path: `/user/interactive/following/list`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name GetLanguageUsingGet
   * @summary 用户-获取用户语言环境
   * @request GET:/user/language
   */
  getLanguageUsingGet = (params: RequestParams = {}) =>
    this.request<ResUserLanguageVO, void>({
      path: `/user/language`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name SetLanguageUsingPatch
   * @summary 用户-设置用户语言环境
   * @request PATCH:/user/language/{language}
   */
  setLanguageUsingPatch = (language?: string, params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/language/${language}`,
      method: 'PATCH',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name ListByParamUsingGet
   * @summary 用户-根据条件分页获取用户信息
   * @request GET:/user/list/param
   */
  listByParamUsingGet = (
    query?: {
      cmid?: number;
      displayname?: string;
      id?: number;
      limit?: number;
      offset?: number;
      username?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<ResPageResponseSimpleUserInfoVO, void>({
      path: `/user/list/param`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name AddPlayHistoryUsingPost
   * @summary 用户-添加播放记录
   * @request POST:/user/play/record/{containerName}
   */
  addPlayHistoryUsingPost = (
    containerName?: string,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/play/record/${containerName}`,
      method: 'POST',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name CheckPunishInfoUsingPatch
   * @summary 用户-校验惩罚信息
   * @request PATCH:/user/punish/check
   */
  checkPunishInfoUsingPatch = (params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/punish/check`,
      method: 'PATCH',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name GiveEventSkinUsingPost
   * @summary 用户-给予事件皮肤
   * @request POST:/user/skin/event/give/{eventChoseStatus}
   */
  giveEventSkinUsingPost = (
    eventChoseStatus?: string,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/skin/event/give/${eventChoseStatus}`,
      method: 'POST',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name SetWearingSkinsUsingPatch
   * @summary 用户-设置皮肤
   * @request PATCH:/user/skin/set
   */
  setWearingSkinsUsingPatch = (
    wearingSkins: WearingSkins,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/skin/set`,
      method: 'PATCH',
      body: wearingSkins,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name ListSkinLibraryUsingGet
   * @summary 用户-获取用户所拥有的皮肤名称
   * @request GET:/user/skin/{userId}
   */
  listSkinLibraryUsingGet = (userId?: string, params: RequestParams = {}) =>
    this.request<ResListString, void>({
      path: `/user/skin/${userId}`,
      method: 'GET',
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name AgreeTermUsingPatch
   * @summary 用户-同意条款
   * @request PATCH:/user/term/agree/{term}
   */
  agreeTermUsingPatch = (term?: string, params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/term/agree/${term}`,
      method: 'PATCH',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name UnblockUsingPatch
   * @summary 用户-取消屏蔽
   * @request PATCH:/user/unblock/{userId}
   */
  unblockUsingPatch = (userId: number, params: RequestParams = {}) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/unblock/${userId}`,
      method: 'PATCH',
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name UpdateUserInfoUsingPut
   * @summary 用户-更新用户信息
   * @request PUT:/user/update
   */
  updateUserInfoUsingPut = (
    param: UserUpdateParam,
    params: RequestParams = {},
  ) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/user/update`,
      method: 'PUT',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 用户
   * @name viewCount
   * @summary 增加用户查看该作品的次数
   * @request GET:/content/view/increase
   */
  viewCount = (content_id: number) =>
    this.request<ResSingleValueVOBoolean, void>({
      path: `/content/view/increase/${content_id}`,
      method: 'GET',
    });
}
