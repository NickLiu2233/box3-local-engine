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
  AddCollaborationMemberParam,
  AddCollaborationRoleParam,
  CollaborationBanUnbanParam,
  CollaborationMemberSortParam,
  FrontEndDataFormatBoolean,
  FrontEndDataFormatCollaborationRoleVO,
  FrontEndDataFormatCollaborationTicketVO,
  FrontEndDataFormatInt,
  FrontEndDataFormatListCollaborationApplyVO,
  FrontEndDataFormatListCollaborationMemberVO,
  FrontEndDataFormatListCollaborationPermissionVO,
  FrontEndDataFormatListCollaborationRoleVO,
  FrontEndDataFormatMemberPermissionVO,
  TerminateCollaborationParam,
  UpdateCollaborationMemberParam,
  UpdateCollaborationRoleParam,
  UpdateMapPrivacyParam,
} from './data-contracts';
import { HttpClient } from '../http-client';

import { ContentType, RequestParams } from '../interface';

export class Collaboration<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags 协作模块
   * @name ApplyListUsingGet
   * @summary 查询协作申请列表
   * @request GET:/collaboration/apply
   * @secure
   */
  applyListUsingGet = (query: { mapId: string }, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatListCollaborationApplyVO, void>({
      path: `/collaboration/apply`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name ApplyUsingPost
   * @summary 发起协作申请
   * @request POST:/collaboration/apply
   * @secure
   */
  applyUsingPost = (query: { mapId: string }, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/apply`,
      method: 'POST',
      query: query,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name ApplyExistUsingGet
   * @summary 检查用户是否申请过
   * @request GET:/collaboration/apply/exist
   * @secure
   */
  applyExistUsingGet = (query: { mapId: string }, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/apply/exist`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name NewApplyUsingGet
   * @summary 查询是否有新的申请
   * @request GET:/collaboration/apply/new
   * @secure
   */
  newApplyUsingGet = (query: { mapId: string }, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/apply/new`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name RejectApplyUsingPost
   * @summary 拒绝协作申请
   * @request POST:/collaboration/apply/reject
   * @secure
   */
  rejectApplyUsingPost = (
    query: { applyId: string; mapId: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/apply/reject`,
      method: 'POST',
      query: query,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name BanUsingPost
   * @summary 拉黑协作者
   * @request POST:/collaboration/ban
   * @secure
   */
  banUsingPost = (
    param: CollaborationBanUnbanParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/ban`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name AddMemberUsingPost
   * @summary 新增协作者
   * @request POST:/collaboration/member
   * @secure
   * @return 如果是图主，接口返回null
   */
  addMemberUsingPost = (
    param: AddCollaborationMemberParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatCollaborationRoleVO, void>({
      path: `/collaboration/member`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name UpdateMemberUsingPut
   * @summary 编辑协作者
   * @request PUT:/collaboration/member
   * @secure
   */
  updateMemberUsingPut = (
    param: UpdateCollaborationMemberParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/member`,
      method: 'PUT',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name DeleteMemberUsingDelete
   * @summary 删除协作者
   * @request DELETE:/collaboration/member
   * @secure
   */
  deleteMemberUsingDelete = (
    query: { mapId: string; userId: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/member`,
      method: 'DELETE',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name MemberListUsingGet
   * @summary 查询协作者列表
   * @request GET:/collaboration/member/list
   * @secure
   */
  memberListUsingGet = (
    query: { mapId: string; type?: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatListCollaborationMemberVO, void>({
      path: `/collaboration/member/list`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name MemberPermissionUsingGet
   * @summary 查询协作者权限
   * @request GET:/collaboration/member/permission
   * @secure
   */
  memberPermissionUsingGet = (
    query: { mapId: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatMemberPermissionVO, void>({
      path: `/collaboration/member/permission`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name MemberSortUsingPost
   * @summary 协作者排序
   * @request POST:/collaboration/member/sort
   * @secure
   */
  memberSortUsingPost = (
    param: CollaborationMemberSortParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/member/sort`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name PermissionsUsingGet
   * @summary 获取权限点列表
   * @request GET:/collaboration/permission
   * @secure
   */
  permissionsUsingGet = (
    query: { mapId: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatListCollaborationPermissionVO, void>({
      path: `/collaboration/permission`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name RoleListUsingGet
   * @summary 协作角色列表
   * @request GET:/collaboration/role
   * @secure
   */
  roleListUsingGet = (query: { mapId: string }, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatListCollaborationRoleVO, void>({
      path: `/collaboration/role`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name AddRoleUsingPost
   * @summary 新增协作角色
   * @request POST:/collaboration/role
   * @secure
   */
  addRoleUsingPost = (
    param: AddCollaborationRoleParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/role`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name UpdateRoleUsingPut
   * @summary 编辑协作角色
   * @request PUT:/collaboration/role
   * @secure
   */
  updateRoleUsingPut = (
    param: UpdateCollaborationRoleParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/role`,
      method: 'PUT',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name DeleteRoleUsingDelete
   * @summary 删除协作角色
   * @request DELETE:/collaboration/role
   * @secure
   */
  deleteRoleUsingDelete = (
    query: { mapId: string; roleId: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/role`,
      method: 'DELETE',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name TerminateUsingPost
   * @summary 终止协作
   * @request POST:/collaboration/terminate
   * @secure
   */
  terminateUsingPost = (
    param: TerminateCollaborationParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/terminate`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name GetTicketUsingGet
   * @summary 获取分享ticket
   * @request GET:/collaboration/ticket
   * @secure
   */
  getTicketUsingGet = (
    query: { mapId: string; roleId?: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatCollaborationTicketVO, void>({
      path: `/collaboration/ticket`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name TicketRefreshUsingGet
   * @summary 刷新ticket过期时间
   * @request GET:/collaboration/ticket/refresh
   * @secure
   */
  ticketRefreshUsingGet = (
    query: { mapId: string; roleId?: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatCollaborationTicketVO, void>({
      path: `/collaboration/ticket/refresh`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name UnbanUsingPost
   * @summary 取消拉黑协作者
   * @request POST:/collaboration/unban
   * @secure
   */
  unbanUsingPost = (
    param: CollaborationBanUnbanParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/collaboration/unban`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 协作模块
   * @name MapPrivacyUsingGet
   * @summary 查询地图隐私
   * @request GET:/map/privacy
   * @secure
   */
  mapPrivacyUsingGet = (query: { mapId: string }, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatInt, void>({
      path: `/map/privacy`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 协作模块
   * @name UpdateMapPrivacyUsingPut
   * @summary 编辑地图隐私
   * @request PUT:/map/privacy
   * @secure
   */
  updateMapPrivacyUsingPut = (
    param: UpdateMapPrivacyParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/map/privacy`,
      method: 'PUT',
      body: param,
      type: ContentType.Json,
      ...params,
    });
}
