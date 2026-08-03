import type { AxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import { HttpClient } from '../http-client';
import { ContentType, RequestParams, TRes } from '../interface';
import {
  AddPhotoParam,
  AddTempChatUserParam,
  BatchUpdateScriptHashParam,
  CollaborationMigrationParam,
  CreateScriptParam,
  CreateTempChatParam,
  DeletePhotoParam,
  DeleteTempChatParam,
  FrontEndDataFormatBoolean,
  FrontEndDataFormatCollaborationMigrationVO,
  FrontEndDataFormatListLong,
  FrontEndDataFormatListPhotoVO,
  FrontEndDataFormatListString,
  FrontEndDataFormatModelV1,
  FrontEndDataFormatModelVO,
  FrontEndDataFormatScriptListVO,
  FrontEndDataFormatScriptVO,
  FrontEndDataFormatPhotoVO,
  FrontEndDataFormatSetString,
  FrontEndDataFormatString,
  LockHeartbeatParam,
  LockScriptParam,
  ProjectModelCopyParam,
  RemoveTempChatUserParam,
  ScriptRenameParam,
  ShareScriptParam,
  UnlockScriptParam,
  UnshareScriptParam,
  FrontEndDataFormatRelationInfoVo,
} from './data-contracts';
import { FrontEndDataFormatArrayString } from '../data-contracts';

interface Resp<T> {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;
  /** 业务数据 */
  data: T;
  /** 返回消息 */
  msg: string;
  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

type GalleryMapVO = {
  code: number;
  msg: string;
  data: {
    error_code?: number;
    authorInfo: {
      avatar: string;
      follower: boolean;
      following: boolean;
      nickname: string;
      userId: number;
      followerNum: number;
    };
    visitNum: number;
    userId: number;
  };
  traceId: string;
};

type GallerySimpleValue = {
  code: number;
  msg: string;
  data: { value: boolean };
  traceId: string;
};

export type LocaleFullType = 'en_US' | 'zh_CN';

export interface FrontEndDataFormatUserInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UserInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface UserInfoVO {
  /**
   * 登陆方式, (0-未知, 1-Email, 2-Metamask, 4-Google(Venly), 8-Twitter(Venly))
   * @format int32
   */
  authType: number;

  /** 头像 */
  avatar: string;

  /** @format date */
  birthday: string;

  /** 邮箱 */
  email: string;

  /**
   * 性别：0-未知，1-男，2-女
   * @format int32
   */
  gender: number;

  /** 是否设置了密码 */
  hasSetPwd?: boolean;

  /** 语言设置：zh_CN，en_US */
  language: string;

  /** 昵称 */
  nickname: string;
  token?: string;

  /**
   * 用户ID
   * @format int64
   */
  userId: number;

  /** 钱包地址 */
  wallet?: string;

  /**
   * 钱包类型，（-1或null-未知，0-metamask，1-venly）
   * @format int32
   */
  walletType?: number;

  phone: string;

  /**
   * 权限点（1: 扩展地图, 1<<16：管理员）
   * @format integer(int32)
   */
  permission: UserInfoPermissions;
}

export enum UserInfoPermissions {
  Admin = 1 << 16,
}

export type GetMapInfoQuery = {
  containerName: string;
  mode: 'play' | 'edit';
};

export type MapInfoRes = {
  appId: string;
  auditStatus: number;
  authorId: number;
  cover: string;
  createdAt: string;
  description: string;
  editHash: string;
  labels: string[];
  latestReleaseVersion: number;
  likeCount: number;
  mapId: number;
  mediaResourcesHash: string[];
  notice: string;
  onlineCount: number;
  playCount: number;
  playHash: string;
  reason: string[];
  releaseVersion: number;
  templateId: number;
  title: string;
  updatedAt: string;
  viewCount: number;
  combType: number; // 地图类型（0-普通地图，1-扩展主图，2-扩展副图）
};

export type StoreConfigResp = {
  mapId: number;
  inGameStore: boolean;
};

export enum SuitList {
  Suit,
  Head,
  Shirt,
  Pants,
  Shoes,
}

export enum AvatarBodyPart {
  head = 1,
  hips = 2,

  leftFoot = 3,
  leftHand = 4,
  leftLowerArm = 5,
  leftLowerLeg = 6,
  leftShoulder = 7,
  leftUpperArm = 8,
  leftUpperLeg = 9,

  neck = 10,

  rightFoot = 11,
  rightHand = 12,
  rightLowerArm = 13,
  rightLowerLeg = 14,
  rightShoulder = 15,
  rightUpperArm = 16,
  rightUpperLeg = 17,

  torso = 18,
}

export type AvatarInfo = {
  /**
   * 模块ID
   */
  id: number;
  /**
   * 预览图
   */
  previewUrl: string;
  /**
   * 套装名字
   */
  suitName: string;
  /**
   * 套装类型
   */
  type: SuitList;
  /**
   * 基础组件
   */
  componentList: {
    /**
     * 组件部位
     */
    component: AvatarBodyPart;
    /**
     * 部位皮肤hash值
     */
    hash: string;
    /**
     * 模块ID
     */
    id: number;
  }[];
}[];

export type StickerPackList = StickerPack[];

type StickerPack = {
  /**
   * 表情列表
   */
  stickers: Sticker[];
  /**
   * 表情主题ID
   */
  themeId: string;
  /**
   * 表情主题名称
   */
  themeName: string;
};

type Sticker = {
  /**
   * 表情ID
   */
  stickerId: number;
  /**
   * 表情名称
   */
  stickerName: string;
  /**
   * 表情图片地址
   */
  stickerUrl: string;
};

export type UserLanguageRes = {
  language: string;
  userId: number;
};

export type ContainerSessionRes = {
  httpServerUrl: string;
  socketServerUrl: string;
};

export type ContainerGetMetaDataRes = {
  serverNumber: number;
  mode: 'play' | 'edit';
  socketServerUrl: string;
  apiServerUrl: string;
  cssBundle: string;
  cssAdminBundle: string;
  jsBundle: string;
  jsAdminBundle: string;
  frameskips: number;
  players: number;
  maxPlayers: number;
}[];

export class Createra<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags gallery分享信息
   * @name getGalleryShareInfo
   * @summary 获取gallery分享需要的信息
   * @request GET:/gallery/info
   */
  public getGalleryShareInfo = (hash: string) =>
    this.request<GalleryMapVO, void>({
      path: `/gallery/info/${hash}`,
      method: 'GET',
    });
  /**
   * No description
   *
   * @tags gallery关注作者
   * @name followAuthor
   * @summary 关注gallery作者
   * @request POST:/follow/following
   */
  public followAuthor = (authorID: number) =>
    this.request<GallerySimpleValue, void>({
      path: `/follow/following/${authorID}`,
      method: 'POST',
    });
  /**
   * No description
   *
   * @tags 取消关注作者
   * @name unFollowAuthor
   * @summary 取消关注gallery作者
   * @request POST:/follow/following
   */
  public unFollowAuthor = (authorID: number) =>
    this.request<GallerySimpleValue, void>({
      path: `/follow/unfollow/${authorID}`,
      method: 'DELETE',
    });
  /**
   * No description
   *
   * @tags 是否开启游客登录
   * @name isLoginAsGuest
   * @summary 判断该游戏是否能够游客登录
   * @request GET:/follow/following
   */
  public isLoginAsGuest = (contentId: number) =>
    this.request<GallerySimpleValue, void>({
      path: `/content/auth/guest/${contentId}`,
      method: 'GET',
    });
  /**
   * No description
   *
   * @tags 连接成功统计
   * @name online
   * @summary 统计连接成功次数
   * @request POST:/statistics/content/online
   */
  public online = (opts: {
    contentId: number;
    guestId?: string;
    mode?: string;
  }) => {
    if (!opts.guestId) {
      delete opts.guestId;
    }
    if (!opts.mode) {
      delete opts.mode;
    }
    return this.request<GallerySimpleValue, void>({
      path: `/statistics/content/online${window.location.search}`,
      method: 'POST',
      body: opts,
    });
  };
  /**
   * No description
   *
   * @tags 断线次数统计
   * @name online
   * @summary 统计断线次数
   * @request POST:/statistics/content/offline
   */
  public offline = (contentId: number) =>
    this.request<GallerySimpleValue, void>({
      path: '/statistics/content/offline',
      method: 'POST',
      body: {
        contentId,
      },
    });
  /**
   * No description
   *
   * @tags auth-controller
   * @name GetUserByTokenUsingGet
   * @summary 根据token 获取用户信息
   * @request GET:/auth/user
   * @secure
   */
  public getUserByTokenUsingGet = (params: RequestParams = {}) =>
    this.request<FrontEndDataFormatUserInfoVO, void>({
      path: `/auth/user`,
      method: 'GET',
      ...params,
    });

  /**
   * No description
   *
   * @tags ga,e-controller
   * @name getGameInfo
   * @summary 根据container_name获取地图信息
   * @request GET: /engine/map
   * @secure
   */
  public getGameInfo = (query: GetMapInfoQuery) =>
    this.request<TRes<MapInfoRes>, void>({
      path: `/engine/map`,
      method: 'GET',
      query: {
        ...query,
        key: '3c324d6e-2814-4d46-ba3a-b6e112bdab81', // 固定值
      },
    });
  /**
   * No description
   *
   * @tags 获取商城配置
   * @name getContentStoreConfig
   * @summary 获取商城配置
   * @request GET:/creator-store/config
   */
  public getContentStoreConfig = (contentId: number) =>
    this.request<Resp<StoreConfigResp>>({
      path: `/creator-store/config/${contentId}`,
      method: 'GET',
    });

  /**
   * No description
   *
   * @tags auth-controller
   * @name getUserSuitUsingGET
   * @summary 根据userId获取套装和皮肤信息。userId为0或者空字符串时，返回默认皮肤
   * @request GET:/avatar/suit
   * @secure
   */
  public getUserSuitUsingGET = (userId: string, params: RequestParams = {}) =>
    this.request<Resp<AvatarInfo>, void>({
      path: `/avatar/suit${userId && `?userId=${userId}`}`,
      method: 'GET',
      ...params,
    });

  /**
   * No description
   *
   * @tags 获取用户语言环境
   * @name getUserLanguage
   * @summary 获取用户语言环境
   * @request GET: /user/language
   * @secure
   */
  public fetchUserLanguage = (headers?: AxiosRequestHeaders) =>
    this.request<TRes<UserLanguageRes>, void>({
      path: `/user/language`,
      method: 'GET',
      headers,
    });
  /**
   * No description
   *
   * @tags 设置用户语言环境
   * @name setUserLanguage
   * @summary 设置用户语言环境
   * @request PATCH: /user/language/{language}
   * @secure
   */
  public setUserLanguage = (language: LocaleFullType) =>
    this.request<TRes<UserLanguageRes>, void>({
      path: `/user/language/${language}`,
      method: 'PATCH',
    });

  /**
   * No description
   *
   * @tags 获取聊天服务器地址
   * @name getWebSocketServerUsingGet
   * @summary 获取聊天服务器地址
   * @request GET:/websocket/server
   * @secure
   */
  public getWebSocketServerUsingGet = (params: RequestParams = {}) =>
    this.request<Resp<string>, void>({
      path: '/websocket/server',
      method: 'GET',
      ...params,
    });

  /**
   * No description
   *
   * @tags 获取地图下所有可用表情包
   * @name getAllStickers
   * @summary 获取地图下所有可用表情包
   * @request GET:/sticker/all
   * @secure
   */
  public getAllStickers = (
    query?: { mapId: number },
    params: RequestParams = {},
  ) =>
    this.request<Resp<StickerPackList>, void>({
      path: '/sticker/all',
      method: 'GET',
      query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 获取用户商城开发者权限
   * @name getUserPaidAccessCert
   * @summary 获取用户商城开发者权限
   * @request GET:/user/cert
   * @secure
   */
  public getUserPaidAccessCert = () =>
    this.request<Resp<{ value: boolean }>, void>({
      path: '/user/cert',
      method: 'GET',
    });

  /**
   * No description
   *
   * @tags 分配容器：分服、动态扩容
   * @name containerAllocate
   * @summary 分配容器：分服、动态扩容
   * @request POST:/container/allocate
   * @secure
   */
  public containerAllocate = (
    params: {
      mapId: number;
      mode: 'play' | 'edit';
      serverId: string | string[];
      refererServerId: string;
      teamId: string;
    },
    headers: AxiosRequestConfig['headers'],
  ) =>
    this.request<Resp<ContainerSessionRes>>({
      path: '/container/allocate',
      method: 'POST',
      body: params,
      headers,
    });
  /**
   * No description
   *
   * @tags 更新容器的metadata
   * @name containerUpdateMetaData
   * @summary 更新容器的metadata
   * @request PUT: /container/metadata
   * @secure
   */
  public containerUpdateMetaData = (
    params: {
      ip: string;
      name: string;
      players: number;
      port: number;
      id: string;
    },
    headers?: AxiosRequestHeaders,
  ) =>
    this.request<Resp<boolean>>({
      path: '/container/metadata',
      method: 'PUT',
      body: params,
      headers,
    });
  /**
   * No description
   *
   * @tags 更新engine version
   * @name containerInsertImageHash
   * @summary 更新engine version
   * @request POST:/container/engine-version
   * @secure
   */
  public containerInsertImageHash = (
    params: {
      appId: string;
      engineVersion: string;
    },
    headers?: AxiosRequestHeaders,
  ) =>
    this.request<Resp<boolean>>({
      path: '/container/engine-version',
      method: 'POST',
      body: params,
      headers,
    });
  /**
   * No description
   *
   * @tags 根据容器名称删除容器
   * @name containerDeleteByName
   * @summary 根据容器名称删除容器
   * @request DELETE:/container/by-name
   * @secure
   */
  public containerDeleteByName = (
    query: { containerName: string },
    headers?: AxiosRequestHeaders,
  ) =>
    this.request<Resp<boolean>>({
      path: '/container/by-name',
      method: 'DELETE',
      query,
      headers,
    });
  /**
   * No description
   *
   * @tags 根据容器名称重启容器
   * @name containerRestart
   * @summary 根据容器名称重启容器
   * @request POST:/container/restart
   * @secure
   */
  public containerRestart = (
    params: { containerName: string },
    headers?: AxiosRequestHeaders,
  ) =>
    this.request<Resp<boolean>>({
      path: '/container/restart',
      method: 'POST',
      body: params,
      headers,
    });
  /**
   * No description
   *
   * @tags 获取地图工程Hash
   * @name getMapHash
   * @summary 获取地图工程Hash
   * @request GET:/map/hash
   * @secure
   */
  public getMapHash = (
    query: { mapId: string; mode: string },
    headers?: AxiosRequestHeaders,
  ) =>
    this.request<Resp<string>>({
      path: '/engine/map/hash',
      method: 'GET',
      query,
      headers,
    });
  /**
   * No description
   *
   * @tags 更新地图工程Hash
   * @name updateMapHash
   * @summary 更新地图工程Hash
   * @request PUT:/engine/map/hash
   * @secure
   */
  public updateMapHash = (
    params: { mapId: string; hash: string },
    headers?: AxiosRequestHeaders,
  ) =>
    this.request<Resp<boolean>>({
      path: '/engine/map/hash',
      method: 'PUT',
      body: params,
      headers,
    });
  /**
   * No description
   *
   * @tags 传送
   * @name containerTeleport
   * @summary 传送
   * @request POST:/container/teleport
   * @secure
   */
  public containerTeleport = (
    params: {
      mapId: string;
      targetMapId: string;
      teamId: string;
      /**
       * 指定服务器id
       * - 服务器id需要是有效的id（需要是后端提供的id，比如曾经创建过的服务器id）
       */
      serverId?: string;
      /**
       * 控制传送目标服务器的准入用户
       * teleport api支持入参serverId后，引擎不会再传该参数了
       */
      userIds?: string[];
    },
    headers?: AxiosRequestHeaders,
  ) =>
    this.request<Resp<{ serverId: string; playHash: string }>>({
      path: '/container/teleport',
      method: 'POST',
      body: params,
      headers,
    });

  /**
   * No description
   *
   * @tags 获取喵贝壳
   * @name getMiaoShells
   * @summary 获取喵贝壳
   * @request POST:/reward/map/user
   * @secure
   */
  public getMiaoShells = (
    query: { mapId: string; userId: string },
    headers?: AxiosRequestHeaders,
  ) =>
    this.request<Resp<string>>({
      path: '/reward/map/user',
      method: 'GET',
      query,
      headers,
    });

  /**
   * @description type: 0关注 1粉丝 2好友。返回用户id列表
   *
   * @tags 引擎后端相关
   * @name GetSocialRelationUsingGet
   * @summary 用户社交关系查询
   * @request GET:/engine/social/relation
   * @secure
   */
  getSocialRelationUsingGet = (
    query: { type: number; userId: number },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatListLong, void>({
      path: `/engine/social/relation`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   *
   * @tags 引擎后端相关
   * @name GetSocialRelationInfoUsingGet
   * @summary 获取用户好友信息
   * @request GET:/engine/follow/relation-info
   * @secure
   */
  getSocialRelationInfoUsingGet = (
    query: { userId: number },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatRelationInfoVo, void>({
      path: `/engine/follow/relation-info`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 地图用户下线通知
   * @name reportUserOffline
   * @summary 地图用户下线通知
   * @request POST:/engine/user/offline
   * @secure
   */
  public reportUserOffline = (
    params: {
      guest: boolean;
      ip: string;
      mapId: string;
      mode: string;
      serverId: string;
      serverName: string;
      userId: string;
    },
    headers?: AxiosRequestHeaders,
  ) =>
    this.request<Resp<boolean>>({
      path: '/engine/user/offline',
      method: 'POST',
      body: params,
      headers,
    });
  /**
   * No description
   *
   * @tags 地图用户上线通知
   * @name reportUserOnline
   * @summary 地图用户上线通知
   * @request POST:/engine/user/online
   * @secure
   */
  public reportUserOnline = (
    params: {
      guest: boolean;
      ip: string;
      mapId: string;
      mode: string;
      serverId: string;
      serverName: string;
      userId: string;
    },
    headers?: AxiosRequestHeaders,
  ) =>
    this.request<Resp<boolean>>({
      path: '/engine/user/online',
      method: 'POST',
      body: params,
      headers,
    });
  /**
   * No description
   *
   * @tags 获取container name即playHash/editHash
   * @name getContainerHashById
   * @summary 获取container name
   * @request GET:/engine/container/hash
   * @secure
   */
  public getContainerHashById = (
    query: {
      mapId: string;
      mode: 'play' | 'edit';
    },
    headers?: AxiosRequestHeaders,
  ) =>
    this.request<Resp<string>>({
      path: '/engine/container/hash',
      method: 'GET',
      query,
      headers,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name GetCollaborationUsingGet
   * @summary 获取所有协作数据
   * @request GET:/engine/collaboration/migration
   * @secure
   */
  getCollaborationUsingGet = (
    query: { mapId: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatCollaborationMigrationVO, void>({
      path: `/engine/collaboration/migration`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name CollaborationMigrationUsingPost
   * @summary 地图权限migration
   * @request POST:/engine/collaboration/migration
   * @secure
   */
  collaborationMigrationUsingPost = (
    param: CollaborationMigrationParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/collaboration/migration`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name CreateTempChatUsingPost
   * @summary 创建临时聊天
   * @request POST:/engine/chat/temp
   * @secure
   */
  createTempChatUsingPost = (
    param: CreateTempChatParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatString, void>({
      path: `/engine/chat/temp`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name DeleteTempChatUsingDelete
   * @summary 删除临时聊天
   * @request DELETE:/engine/chat/temp
   * @secure
   */
  deleteTempChatUsingDelete = (
    param: DeleteTempChatParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/chat/temp`,
      method: 'DELETE',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name AddTempChatUserUsingPost
   * @summary 新增临时聊天用户
   * @request POST:/engine/chat/temp/add-user
   * @secure
   */
  addTempChatUserUsingPost = (
    param: AddTempChatUserParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatSetString, void>({
      path: `/engine/chat/temp/add-user`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name TempChatIdsUsingGet
   * @summary 查询地图下所有临时聊天ID列表
   * @request GET:/engine/chat/temp/ids
   * @secure
   */
  tempChatIdsUsingGet = (
    query: { mapId: number; mode: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatListString, void>({
      path: `/engine/chat/temp/ids`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name RemoveTempChatUserUsingPost
   * @summary 移除临时聊天用户
   * @request POST:/engine/chat/temp/remove-user
   * @secure
   */
  removeTempChatUserUsingPost = (
    param: RemoveTempChatUserParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatListString, void>({
      path: `/engine/chat/temp/remove-user`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name GetTempChatUsersUsingGet
   * @summary 根据ID查询聊天用户列表
   * @request GET:/engine/chat/temp/users
   * @secure
   */
  getTempChatUsersUsingGet = (
    query: { tempChatId: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatListString, void>({
      path: `/engine/chat/temp/users`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name GetScriptUsingGet
   * @summary 获取脚本最新信息
   * @request GET:/engine/script
   * @secure
   */
  getScriptUsingGet = (
    query: { id: string; mapId: number },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatScriptVO, void>({
      path: `/engine/script`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name CreateUsingPost
   * @summary 新建/复制脚本
   * @request POST:/engine/script
   * @secure
   */
  createUsingPost = (param: CreateScriptParam, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatScriptVO, void>({
      path: `/engine/script`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name DeleteUsingDelete
   * @summary 删除脚本
   * @request DELETE:/engine/script
   * @secure
   */
  deleteUsingDelete = (
    query: { id: string; mapId: number },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/script`,
      method: 'DELETE',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name BatchUpdateHashUsingPost
   * @summary 更新共享文件Hash（批量）
   * @request POST:/engine/script/batch/update-hash
   * @secure
   */
  batchUpdateHashUsingPost = (
    param: BatchUpdateScriptHashParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/script/batch/update-hash`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name ListUsingGet
   * @summary 获取脚本列表
   * @request GET:/engine/script/list
   * @secure
   */
  listUsingGet = (
    query: { mapId: number; mode: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatScriptListVO, void>({
      path: `/engine/script/list`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name LockUsingPost
   * @summary 获取脚本锁
   * @request POST:/engine/script/lock
   * @secure
   */
  lockUsingPost = (param: LockScriptParam, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/script/lock`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name HeartbeatUsingPost
   * @summary 脚本锁心跳
   * @request POST:/engine/script/lock/heartbeat
   * @secure
   */
  heartbeatUsingPost = (
    param: LockHeartbeatParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/script/lock/heartbeat`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name CheckNameUsingGet
   * @summary 校验脚本名是否可用
   * @request GET:/engine/script/name-check
   * @secure
   */
  checkNameUsingGet = (
    query: { id?: string; mapId: number; newName: string },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/script/name-check`,
      method: 'GET',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name RenameUsingPost
   * @summary 脚本重命名
   * @request POST:/engine/script/rename
   * @secure
   */
  renameUsingPost = (param: ScriptRenameParam, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/script/rename`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name ShareUsingPost
   * @summary 共享脚本
   * @request POST:/engine/script/share
   * @secure
   */
  shareUsingPost = (param: ShareScriptParam, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/script/share`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name UnlockUsingPost
   * @summary 释放脚本锁
   * @request POST:/engine/script/unlock
   * @secure
   */
  unlockUsingPost = (param: UnlockScriptParam, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/script/unlock`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name UnshareUsingPost
   * @summary 取消共享脚本
   * @request POST:/engine/script/unshare
   * @secure
   */
  unshareUsingPost = (param: UnshareScriptParam, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatString, void>({
      path: `/engine/script/unshare`,
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
   * @summary 脚本migration
   * @request GET:/engine/script/migration
   * @secure
   */
  migrationUsingGet = (query: { mapId: number }, params: RequestParams = {}) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/engine/script/migration`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 共享脚本模块
   * @name createScriptUsingPost
   * @summary 新建/复制脚本
   * @request POST:/script
   * @secure
   */
  createScriptUsingPost = (
    param: CreateScriptParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatScriptVO, void>({
      path: `/script`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 共享脚本模块
   * @name deleteScriptUsingDelete
   * @summary 删除脚本
   * @request DELETE:/script
   * @secure
   */
  deleteScriptUsingDelete = (
    query: { id: string; mapId: number },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/script`,
      method: 'DELETE',
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags 共享脚本模块
   * @name renameScriptUsingPost
   * @summary 脚本重命名
   * @request POST:/script/rename
   * @secure
   */
  renameScriptUsingPost = (
    param: ScriptRenameParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/script/rename`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name ShareUsingPost
   * @summary 共享脚本
   * @request POST:/engine/script/share
   * @secure
   */
  shareScriptUsingPost = (
    param: ShareScriptParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/script/share`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 引擎后端相关
   * @name UnshareUsingPost
   * @summary 取消共享脚本
   * @request POST:/engine/script/unshare
   * @secure
   */
  unshareScriptUsingPost = (
    param: UnshareScriptParam,
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatString, void>({
      path: `/script/unshare`,
      method: 'POST',
      body: param,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags 共享脚本模块
   * @name checkNameScriptUsingGet
   * @summary 校验脚本名是否可用
   * @request GET:/script/name-check
   * @secure
   */
  checkNameScriptUsingGet = (
    query: { id?: string; mapId: number; newName: string; share?: boolean },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatBoolean, void>({
      path: `/script/name-check`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * No description
   *
   * @tags 分布式ID模块
   * @name nextGameUidListUsingGet
   * @summary 生成多个分布式ID，前端使用
   * @request GET:/uid/list
   * @secure
   */
  nextGameUidListUsingGet = (
    query: { num: number },
    params: RequestParams = {},
  ) =>
    this.request<FrontEndDataFormatArrayString, void>({
      path: `/uid/list`,
      method: 'GET',
      query: query,
      ...params,
    });
}
