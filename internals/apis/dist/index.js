'use strict';

class HttpClient {
    constructor(axios){
        this.request = async ({ path, type, query, body, ...requestParams })=>{
            return this.instance.request({
                params: query,
                data: body,
                url: path,
                ...requestParams
            }).then((res)=>{
                const { code, data } = res.data;
                if (code >= 200 && code < 300) {
                    return data;
                }
                throw res.data;
            });
        };
        this.instance = axios;
    }
}

exports.ContentType = void 0;
(function(ContentType) {
    ContentType["Json"] = "application/json";
    ContentType["FormData"] = "multipart/form-data";
    ContentType["UrlEncoded"] = "application/x-www-form-urlencoded";
})(exports.ContentType || (exports.ContentType = {}));

var _interface = /*#__PURE__*/Object.freeze({
__proto__: null,
get ContentType () { return exports.ContentType; }
});

exports.UserInfoPermissions = void 0;
(function(UserInfoPermissions) {
    UserInfoPermissions[UserInfoPermissions["Admin"] = 65536] = "Admin";
})(exports.UserInfoPermissions || (exports.UserInfoPermissions = {}));
exports.SuitList = void 0;
(function(SuitList) {
    SuitList[SuitList["Suit"] = 0] = "Suit";
    SuitList[SuitList["Head"] = 1] = "Head";
    SuitList[SuitList["Shirt"] = 2] = "Shirt";
    SuitList[SuitList["Pants"] = 3] = "Pants";
    SuitList[SuitList["Shoes"] = 4] = "Shoes";
})(exports.SuitList || (exports.SuitList = {}));
exports.AvatarBodyPart = void 0;
(function(AvatarBodyPart) {
    AvatarBodyPart[AvatarBodyPart["head"] = 1] = "head";
    AvatarBodyPart[AvatarBodyPart["hips"] = 2] = "hips";
    AvatarBodyPart[AvatarBodyPart["leftFoot"] = 3] = "leftFoot";
    AvatarBodyPart[AvatarBodyPart["leftHand"] = 4] = "leftHand";
    AvatarBodyPart[AvatarBodyPart["leftLowerArm"] = 5] = "leftLowerArm";
    AvatarBodyPart[AvatarBodyPart["leftLowerLeg"] = 6] = "leftLowerLeg";
    AvatarBodyPart[AvatarBodyPart["leftShoulder"] = 7] = "leftShoulder";
    AvatarBodyPart[AvatarBodyPart["leftUpperArm"] = 8] = "leftUpperArm";
    AvatarBodyPart[AvatarBodyPart["leftUpperLeg"] = 9] = "leftUpperLeg";
    AvatarBodyPart[AvatarBodyPart["neck"] = 10] = "neck";
    AvatarBodyPart[AvatarBodyPart["rightFoot"] = 11] = "rightFoot";
    AvatarBodyPart[AvatarBodyPart["rightHand"] = 12] = "rightHand";
    AvatarBodyPart[AvatarBodyPart["rightLowerArm"] = 13] = "rightLowerArm";
    AvatarBodyPart[AvatarBodyPart["rightLowerLeg"] = 14] = "rightLowerLeg";
    AvatarBodyPart[AvatarBodyPart["rightShoulder"] = 15] = "rightShoulder";
    AvatarBodyPart[AvatarBodyPart["rightUpperArm"] = 16] = "rightUpperArm";
    AvatarBodyPart[AvatarBodyPart["rightUpperLeg"] = 17] = "rightUpperLeg";
    AvatarBodyPart[AvatarBodyPart["torso"] = 18] = "torso";
})(exports.AvatarBodyPart || (exports.AvatarBodyPart = {}));
class Createra extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * No description
   *
   * @tags gallery分享信息
   * @name getGalleryShareInfo
   * @summary 获取gallery分享需要的信息
   * @request GET:/gallery/info
   */ this.getGalleryShareInfo = (hash)=>this.request({
                path: `/gallery/info/${hash}`,
                method: 'GET'
            });
        /**
   * No description
   *
   * @tags gallery关注作者
   * @name followAuthor
   * @summary 关注gallery作者
   * @request POST:/follow/following
   */ this.followAuthor = (authorID)=>this.request({
                path: `/follow/following/${authorID}`,
                method: 'POST'
            });
        /**
   * No description
   *
   * @tags 取消关注作者
   * @name unFollowAuthor
   * @summary 取消关注gallery作者
   * @request POST:/follow/following
   */ this.unFollowAuthor = (authorID)=>this.request({
                path: `/follow/unfollow/${authorID}`,
                method: 'DELETE'
            });
        /**
   * No description
   *
   * @tags 是否开启游客登录
   * @name isLoginAsGuest
   * @summary 判断该游戏是否能够游客登录
   * @request GET:/follow/following
   */ this.isLoginAsGuest = (contentId)=>this.request({
                path: `/content/auth/guest/${contentId}`,
                method: 'GET'
            });
        /**
   * No description
   *
   * @tags 连接成功统计
   * @name online
   * @summary 统计连接成功次数
   * @request POST:/statistics/content/online
   */ this.online = (opts)=>{
            if (!opts.guestId) {
                delete opts.guestId;
            }
            if (!opts.mode) {
                delete opts.mode;
            }
            return this.request({
                path: `/statistics/content/online${window.location.search}`,
                method: 'POST',
                body: opts
            });
        };
        /**
   * No description
   *
   * @tags 断线次数统计
   * @name online
   * @summary 统计断线次数
   * @request POST:/statistics/content/offline
   */ this.offline = (contentId)=>this.request({
                path: '/statistics/content/offline',
                method: 'POST',
                body: {
                    contentId
                }
            });
        /**
   * No description
   *
   * @tags auth-controller
   * @name GetUserByTokenUsingGet
   * @summary 根据token 获取用户信息
   * @request GET:/auth/user
   * @secure
   */ this.getUserByTokenUsingGet = (params = {})=>this.request({
                path: `/auth/user`,
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags ga,e-controller
   * @name getGameInfo
   * @summary 根据container_name获取地图信息
   * @request GET: /engine/map
   * @secure
   */ this.getGameInfo = (query)=>this.request({
                path: `/engine/map`,
                method: 'GET',
                query: {
                    ...query,
                    key: '3c324d6e-2814-4d46-ba3a-b6e112bdab81'
                }
            });
        /**
   * No description
   *
   * @tags 获取商城配置
   * @name getContentStoreConfig
   * @summary 获取商城配置
   * @request GET:/creator-store/config
   */ this.getContentStoreConfig = (contentId)=>this.request({
                path: `/creator-store/config/${contentId}`,
                method: 'GET'
            });
        /**
   * No description
   *
   * @tags auth-controller
   * @name getUserSuitUsingGET
   * @summary 根据userId获取套装和皮肤信息。userId为0或者空字符串时，返回默认皮肤
   * @request GET:/avatar/suit
   * @secure
   */ this.getUserSuitUsingGET = (userId, params = {})=>this.request({
                path: `/avatar/suit${userId && `?userId=${userId}`}`,
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags 获取用户语言环境
   * @name getUserLanguage
   * @summary 获取用户语言环境
   * @request GET: /user/language
   * @secure
   */ this.fetchUserLanguage = (headers)=>this.request({
                path: `/user/language`,
                method: 'GET',
                headers
            });
        /**
   * No description
   *
   * @tags 设置用户语言环境
   * @name setUserLanguage
   * @summary 设置用户语言环境
   * @request PATCH: /user/language/{language}
   * @secure
   */ this.setUserLanguage = (language)=>this.request({
                path: `/user/language/${language}`,
                method: 'PATCH'
            });
        /**
   * No description
   *
   * @tags 获取聊天服务器地址
   * @name getWebSocketServerUsingGet
   * @summary 获取聊天服务器地址
   * @request GET:/websocket/server
   * @secure
   */ this.getWebSocketServerUsingGet = (params = {})=>this.request({
                path: '/websocket/server',
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags 获取地图下所有可用表情包
   * @name getAllStickers
   * @summary 获取地图下所有可用表情包
   * @request GET:/sticker/all
   * @secure
   */ this.getAllStickers = (query, params = {})=>this.request({
                path: '/sticker/all',
                method: 'GET',
                query,
                ...params
            });
        /**
   * No description
   *
   * @tags 获取用户商城开发者权限
   * @name getUserPaidAccessCert
   * @summary 获取用户商城开发者权限
   * @request GET:/user/cert
   * @secure
   */ this.getUserPaidAccessCert = ()=>this.request({
                path: '/user/cert',
                method: 'GET'
            });
        /**
   * No description
   *
   * @tags 分配容器：分服、动态扩容
   * @name containerAllocate
   * @summary 分配容器：分服、动态扩容
   * @request POST:/container/allocate
   * @secure
   */ this.containerAllocate = (params, headers)=>this.request({
                path: '/container/allocate',
                method: 'POST',
                body: params,
                headers
            });
        /**
   * No description
   *
   * @tags 更新容器的metadata
   * @name containerUpdateMetaData
   * @summary 更新容器的metadata
   * @request PUT: /container/metadata
   * @secure
   */ this.containerUpdateMetaData = (params, headers)=>this.request({
                path: '/container/metadata',
                method: 'PUT',
                body: params,
                headers
            });
        /**
   * No description
   *
   * @tags 更新engine version
   * @name containerInsertImageHash
   * @summary 更新engine version
   * @request POST:/container/engine-version
   * @secure
   */ this.containerInsertImageHash = (params, headers)=>this.request({
                path: '/container/engine-version',
                method: 'POST',
                body: params,
                headers
            });
        /**
   * No description
   *
   * @tags 根据容器名称删除容器
   * @name containerDeleteByName
   * @summary 根据容器名称删除容器
   * @request DELETE:/container/by-name
   * @secure
   */ this.containerDeleteByName = (query, headers)=>this.request({
                path: '/container/by-name',
                method: 'DELETE',
                query,
                headers
            });
        /**
   * No description
   *
   * @tags 根据容器名称重启容器
   * @name containerRestart
   * @summary 根据容器名称重启容器
   * @request POST:/container/restart
   * @secure
   */ this.containerRestart = (params, headers)=>this.request({
                path: '/container/restart',
                method: 'POST',
                body: params,
                headers
            });
        /**
   * No description
   *
   * @tags 获取地图工程Hash
   * @name getMapHash
   * @summary 获取地图工程Hash
   * @request GET:/map/hash
   * @secure
   */ this.getMapHash = (query, headers)=>this.request({
                path: '/engine/map/hash',
                method: 'GET',
                query,
                headers
            });
        /**
   * No description
   *
   * @tags 更新地图工程Hash
   * @name updateMapHash
   * @summary 更新地图工程Hash
   * @request PUT:/engine/map/hash
   * @secure
   */ this.updateMapHash = (params, headers)=>this.request({
                path: '/engine/map/hash',
                method: 'PUT',
                body: params,
                headers
            });
        /**
   * No description
   *
   * @tags 地图用户下线通知
   * @name reportUserOffline
   * @summary 地图用户下线通知
   * @request POST:/engine/user/offline
   * @secure
   */ this.reportUserOffline = (params, headers)=>this.request({
                path: '/engine/user/offline',
                method: 'POST',
                body: params,
                headers
            });
        /**
   * No description
   *
   * @tags 地图用户上线通知
   * @name reportUserOnline
   * @summary 地图用户上线通知
   * @request POST:/engine/user/online
   * @secure
   */ this.reportUserOnline = (params, headers)=>this.request({
                path: '/engine/user/online',
                method: 'POST',
                body: params,
                headers
            });
        /**
   * No description
   *
   * @tags 获取container name即playHash/editHash
   * @name getContainerHashById
   * @summary 获取container name
   * @request GET:/engine/container/hash
   * @secure
   */ this.getContainerHashById = (query, headers)=>this.request({
                path: '/engine/container/hash',
                method: 'GET',
                query,
                headers
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name GetCollaborationUsingGet
   * @summary 获取所有协作数据
   * @request GET:/engine/collaboration/migration
   * @secure
   */ this.getCollaborationUsingGet = (query, params = {})=>this.request({
                path: `/engine/collaboration/migration`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name CollaborationMigrationUsingPost
   * @summary 地图权限migration
   * @request POST:/engine/collaboration/migration
   * @secure
   */ this.collaborationMigrationUsingPost = (param, params = {})=>this.request({
                path: `/engine/collaboration/migration`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name GetScriptUsingGet
   * @summary 获取脚本最新信息
   * @request GET:/engine/script
   * @secure
   */ this.getScriptUsingGet = (query, params = {})=>this.request({
                path: `/engine/script`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name CreateUsingPost
   * @summary 新建/复制脚本
   * @request POST:/engine/script
   * @secure
   */ this.createUsingPost = (param, params = {})=>this.request({
                path: `/engine/script`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name DeleteUsingDelete
   * @summary 删除脚本
   * @request DELETE:/engine/script
   * @secure
   */ this.deleteUsingDelete = (query, params = {})=>this.request({
                path: `/engine/script`,
                method: 'DELETE',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name BatchUpdateHashUsingPost
   * @summary 更新共享文件Hash（批量）
   * @request POST:/engine/script/batch/update-hash
   * @secure
   */ this.batchUpdateHashUsingPost = (param, params = {})=>this.request({
                path: `/engine/script/batch/update-hash`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name ListUsingGet
   * @summary 获取脚本列表
   * @request GET:/engine/script/list
   * @secure
   */ this.listUsingGet = (query, params = {})=>this.request({
                path: `/engine/script/list`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name LockUsingPost
   * @summary 获取脚本锁
   * @request POST:/engine/script/lock
   * @secure
   */ this.lockUsingPost = (param, params = {})=>this.request({
                path: `/engine/script/lock`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name HeartbeatUsingPost
   * @summary 脚本锁心跳
   * @request POST:/engine/script/lock/heartbeat
   * @secure
   */ this.heartbeatUsingPost = (param, params = {})=>this.request({
                path: `/engine/script/lock/heartbeat`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name CheckNameUsingGet
   * @summary 校验脚本名是否可用
   * @request GET:/engine/script/name-check
   * @secure
   */ this.checkNameUsingGet = (query, params = {})=>this.request({
                path: `/engine/script/name-check`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name RenameUsingPost
   * @summary 脚本重命名
   * @request POST:/engine/script/rename
   * @secure
   */ this.renameUsingPost = (param, params = {})=>this.request({
                path: `/engine/script/rename`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name ShareUsingPost
   * @summary 共享脚本
   * @request POST:/engine/script/share
   * @secure
   */ this.shareUsingPost = (param, params = {})=>this.request({
                path: `/engine/script/share`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name UnlockUsingPost
   * @summary 释放脚本锁
   * @request POST:/engine/script/unlock
   * @secure
   */ this.unlockUsingPost = (param, params = {})=>this.request({
                path: `/engine/script/unlock`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name UnshareUsingPost
   * @summary 取消共享脚本
   * @request POST:/engine/script/unshare
   * @secure
   */ this.unshareUsingPost = (param, params = {})=>this.request({
                path: `/engine/script/unshare`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name MigrationUsingGet
   * @summary 脚本migration
   * @request GET:/engine/script/migration
   * @secure
   */ this.migrationUsingGet = (query, params = {})=>this.request({
                path: `/engine/script/migration`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 共享脚本模块
   * @name createScriptUsingPost
   * @summary 新建/复制脚本
   * @request POST:/script
   * @secure
   */ this.createScriptUsingPost = (param, params = {})=>this.request({
                path: `/script`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 共享脚本模块
   * @name deleteScriptUsingDelete
   * @summary 删除脚本
   * @request DELETE:/script
   * @secure
   */ this.deleteScriptUsingDelete = (query, params = {})=>this.request({
                path: `/script`,
                method: 'DELETE',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 共享脚本模块
   * @name renameScriptUsingPost
   * @summary 脚本重命名
   * @request POST:/script/rename
   * @secure
   */ this.renameScriptUsingPost = (param, params = {})=>this.request({
                path: `/script/rename`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name ShareUsingPost
   * @summary 共享脚本
   * @request POST:/engine/script/share
   * @secure
   */ this.shareScriptUsingPost = (param, params = {})=>this.request({
                path: `/script/share`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name UnshareUsingPost
   * @summary 取消共享脚本
   * @request POST:/engine/script/unshare
   * @secure
   */ this.unshareScriptUsingPost = (param, params = {})=>this.request({
                path: `/script/unshare`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 共享脚本模块
   * @name checkNameScriptUsingGet
   * @summary 校验脚本名是否可用
   * @request GET:/script/name-check
   * @secure
   */ this.checkNameScriptUsingGet = (query, params = {})=>this.request({
                path: `/script/name-check`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 分布式ID模块
   * @name nextGameUidListUsingGet
   * @summary 生成多个分布式ID，前端使用
   * @request GET:/uid/list
   * @secure
   */ this.nextGameUidListUsingGet = (query, params = {})=>this.request({
                path: `/uid/list`,
                method: 'GET',
                query: query,
                ...params
            });
    }
}

class Collaboration extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * No description
   *
   * @tags 协作模块
   * @name ApplyListUsingGet
   * @summary 查询协作申请列表
   * @request GET:/collaboration/apply
   * @secure
   */ this.applyListUsingGet = (query, params = {})=>this.request({
                path: `/collaboration/apply`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name ApplyUsingPost
   * @summary 发起协作申请
   * @request POST:/collaboration/apply
   * @secure
   */ this.applyUsingPost = (query, params = {})=>this.request({
                path: `/collaboration/apply`,
                method: 'POST',
                query: query,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name ApplyExistUsingGet
   * @summary 检查用户是否申请过
   * @request GET:/collaboration/apply/exist
   * @secure
   */ this.applyExistUsingGet = (query, params = {})=>this.request({
                path: `/collaboration/apply/exist`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name NewApplyUsingGet
   * @summary 查询是否有新的申请
   * @request GET:/collaboration/apply/new
   * @secure
   */ this.newApplyUsingGet = (query, params = {})=>this.request({
                path: `/collaboration/apply/new`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name RejectApplyUsingPost
   * @summary 拒绝协作申请
   * @request POST:/collaboration/apply/reject
   * @secure
   */ this.rejectApplyUsingPost = (query, params = {})=>this.request({
                path: `/collaboration/apply/reject`,
                method: 'POST',
                query: query,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name BanUsingPost
   * @summary 拉黑协作者
   * @request POST:/collaboration/ban
   * @secure
   */ this.banUsingPost = (param, params = {})=>this.request({
                path: `/collaboration/ban`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
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
   */ this.addMemberUsingPost = (param, params = {})=>this.request({
                path: `/collaboration/member`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name UpdateMemberUsingPut
   * @summary 编辑协作者
   * @request PUT:/collaboration/member
   * @secure
   */ this.updateMemberUsingPut = (param, params = {})=>this.request({
                path: `/collaboration/member`,
                method: 'PUT',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name DeleteMemberUsingDelete
   * @summary 删除协作者
   * @request DELETE:/collaboration/member
   * @secure
   */ this.deleteMemberUsingDelete = (query, params = {})=>this.request({
                path: `/collaboration/member`,
                method: 'DELETE',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name MemberListUsingGet
   * @summary 查询协作者列表
   * @request GET:/collaboration/member/list
   * @secure
   */ this.memberListUsingGet = (query, params = {})=>this.request({
                path: `/collaboration/member/list`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name MemberPermissionUsingGet
   * @summary 查询协作者权限
   * @request GET:/collaboration/member/permission
   * @secure
   */ this.memberPermissionUsingGet = (query, params = {})=>this.request({
                path: `/collaboration/member/permission`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name MemberSortUsingPost
   * @summary 协作者排序
   * @request POST:/collaboration/member/sort
   * @secure
   */ this.memberSortUsingPost = (param, params = {})=>this.request({
                path: `/collaboration/member/sort`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name PermissionsUsingGet
   * @summary 获取权限点列表
   * @request GET:/collaboration/permission
   * @secure
   */ this.permissionsUsingGet = (query, params = {})=>this.request({
                path: `/collaboration/permission`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name RoleListUsingGet
   * @summary 协作角色列表
   * @request GET:/collaboration/role
   * @secure
   */ this.roleListUsingGet = (query, params = {})=>this.request({
                path: `/collaboration/role`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name AddRoleUsingPost
   * @summary 新增协作角色
   * @request POST:/collaboration/role
   * @secure
   */ this.addRoleUsingPost = (param, params = {})=>this.request({
                path: `/collaboration/role`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name UpdateRoleUsingPut
   * @summary 编辑协作角色
   * @request PUT:/collaboration/role
   * @secure
   */ this.updateRoleUsingPut = (param, params = {})=>this.request({
                path: `/collaboration/role`,
                method: 'PUT',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name DeleteRoleUsingDelete
   * @summary 删除协作角色
   * @request DELETE:/collaboration/role
   * @secure
   */ this.deleteRoleUsingDelete = (query, params = {})=>this.request({
                path: `/collaboration/role`,
                method: 'DELETE',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name TerminateUsingPost
   * @summary 终止协作
   * @request POST:/collaboration/terminate
   * @secure
   */ this.terminateUsingPost = (param, params = {})=>this.request({
                path: `/collaboration/terminate`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name GetTicketUsingGet
   * @summary 获取分享ticket
   * @request GET:/collaboration/ticket
   * @secure
   */ this.getTicketUsingGet = (query, params = {})=>this.request({
                path: `/collaboration/ticket`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name TicketRefreshUsingGet
   * @summary 刷新ticket过期时间
   * @request GET:/collaboration/ticket/refresh
   * @secure
   */ this.ticketRefreshUsingGet = (query, params = {})=>this.request({
                path: `/collaboration/ticket/refresh`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name UnbanUsingPost
   * @summary 取消拉黑协作者
   * @request POST:/collaboration/unban
   * @secure
   */ this.unbanUsingPost = (param, params = {})=>this.request({
                path: `/collaboration/unban`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name MapPrivacyUsingGet
   * @summary 查询地图隐私
   * @request GET:/map/privacy
   * @secure
   */ this.mapPrivacyUsingGet = (query, params = {})=>this.request({
                path: `/map/privacy`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 协作模块
   * @name UpdateMapPrivacyUsingPut
   * @summary 编辑地图隐私
   * @request PUT:/map/privacy
   * @secure
   */ this.updateMapPrivacyUsingPut = (param, params = {})=>this.request({
                path: `/map/privacy`,
                method: 'PUT',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
    }
}

class CreatorStore extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * No description
   *
   * @tags 商品模块
   * @name CheckStoreAccessUsingGet
   * @summary 查询地图是否有商城权限
   * @request GET:/creator-store/access
   * @secure
   */ this.checkStoreAccessUsingGet = (query, params = {})=>this.request({
                path: `/creator-store/access`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 商品模块
   * @name GetCreatorStoreConfigUsingGet1
   * @summary 通过ContainerName获取Creator Store配置
   * @request GET:/creator-store/config
   * @secure
   */ this.getCreatorStoreConfigUsingGet1 = (query, params = {})=>this.request({
                path: `/creator-store/config`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 商品模块
   * @name UpdateCreatorStoreConfigUsingPost
   * @summary 更新Creator Store配置
   * @request POST:/creator-store/config
   * @secure
   */ this.updateCreatorStoreConfigUsingPost = (param, params = {})=>this.request({
                path: `/creator-store/config`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 商品模块
   * @name GetCreatorStoreConfigUsingGet
   * @summary 通过mapId获取Creator Store配置
   * @request GET:/creator-store/config/{mapId}
   * @secure
   */ this.getCreatorStoreConfigUsingGet = (mapId, params = {})=>this.request({
                path: `/creator-store/config/${mapId}`,
                method: 'GET',
                ...params
            });
    }
}

class Storage extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * @description 查询数据，不存在则返回null；如果操作时key已被lock且ticket不正确，则抛出33000009异常
   *
   * @tags DataStores
   * @name GetUsingGet
   * @summary 查询数据
   * @request GET:/storage/data-stores
   * @secure
   */ this.getUsingGet = (query, params = {})=>this.request({
                path: `/storage/data-stores`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * @description 不存在则写入，存在则更新，操作成功则返回true，操作失败则返回false；如果操作时key已被lock且ticket不正确，则抛出33000009异常
   *
   * @tags DataStores
   * @name SetUsingPost
   * @summary 写入/更新数据
   * @request POST:/storage/data-stores
   * @secure
   */ this.setUsingPost = (params, requestParams = {})=>this.request({
                path: `/storage/data-stores`,
                method: 'POST',
                body: params,
                type: exports.ContentType.Json,
                ...requestParams
            });
        /**
   * @description 针对某个key增长一定的值，并返回增长后的值；
   *
   * @tags DataStores
   * @name IncrUsingPost
   * @summary 针对某个key增长一定的值，并返回增长后的值；
   * @request POST:/storage/data-stores/incr
   * @secure
   */ this.incrUsingPost = (params, requestParams = {})=>this.request({
                path: `/storage/data-stores/incr`,
                method: 'POST',
                body: params,
                type: exports.ContentType.Json,
                ...requestParams
            });
        /**
   * @description 逻辑删除，可通过参数控制是否返回删除的内容；如果操作时key已被lock且ticket不正确，则抛出33000009异常
   *
   * @tags DataStores
   * @name RemoveUsingDelete
   * @summary 删除数据
   * @request DELETE:/storage/data-stores
   * @secure
   */ this.removeUsingDelete = (params, requestParams = {})=>this.request({
                path: `/storage/data-stores`,
                method: 'DELETE',
                body: params,
                type: exports.ContentType.Json,
                ...requestParams
            });
        /**
   * @description 成功则返回true，失败则返回false，已被锁定抛出33000009异常
   *
   * @tags DataStores
   * @name LockUsingPost
   * @summary key读写加锁
   * @request POST:/storage/data-stores/lock
   * @secure
   */ this.lockUsingPost = (params, requestParams = {})=>this.request({
                path: `/storage/data-stores/lock`,
                method: 'POST',
                body: params,
                type: exports.ContentType.Json,
                ...requestParams
            });
        /**
   * @description constraint参数控制约束与排序条件
   *
   * @tags DataStores
   * @name PageListUsingGet
   * @summary 分页查询
   * @request GET:/storage/data-stores/page
   * @secure
   */ this.pageListUsingGet = (query, params = {})=>this.request({
                path: `/storage/data-stores/page`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * @description 如果该表存在则直接返回true，不存在则创建并返回true，如果创建失败则返回false
   *
   * @tags DataStores
   * @name PrepareUsingPost
   * @summary 准备存储表
   * @request POST:/storage/data-stores/prepare
   * @secure
   */ this.prepareUsingPost = (params, requestParams = {})=>this.request({
                path: `/storage/data-stores/prepare`,
                method: 'POST',
                body: params,
                type: exports.ContentType.Json,
                ...requestParams
            });
        /**
   * @description 成功返回true，失败返回false
   *
   * @tags DataStores
   * @name DeleteStorageUsingDelete
   * @summary 删除存储表
   * @request DELETE:/storage/data-stores/storage
   * @secure
   */ this.deleteStorageUsingDelete = (params, requestParams = {})=>this.request({
                path: `/storage/data-stores/storage`,
                method: 'DELETE',
                body: params,
                ...requestParams
            });
        /**
   * @description 成功则返回true，失败则返回false
   *
   * @tags DataStores
   * @name UnlockUsingPost
   * @summary key读写解锁
   * @request POST:/storage/data-stores/unlock
   * @secure
   */ this.unlockUsingPost = (params, requestParams = {})=>this.request({
                path: `/storage/data-stores/unlock`,
                method: 'POST',
                body: params,
                type: exports.ContentType.Json,
                ...requestParams
            });
    }
}

class Model extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * No description
   *
   * @tags 模型模块
   * @name CopyModelUsingPost
   * @summary 复制模型
   * @request POST:/model/copy
   * @secure
   */ this.copyModelUsingPost = (query, params = {})=>this.request({
                path: `/model/copy`,
                method: 'POST',
                query: query,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 皮肤模块
   * @name saveSkinUsingPost
   * @summary 保存共享皮肤
   * @request POST:/model/skin/save
   * @secure
   */ this.saveSharedSkinUsingPost = (param, params = {})=>this.request({
                path: `/model/skin/save`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型模块
   * @name saveModelUsingPostV1
   * @summary 保存模型/保存皮肤
   * @request POST:/model/save-v1
   * @secure
   */ this.saveModelUsingPostV1 = (param, params = {})=>this.request({
                path: `/model/save-v1`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型模块
   * @name GetSnapshotsUsingGet
   * @summary 获取模型快照列表
   * @request GET:/model/snapshots/{modelId}
   * @secure
   */ this.getSnapshotsUsingGet = (modelId, query, params = {})=>this.request({
                path: `/model/snapshots/${modelId}`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型模块
   * @name updateModelUsingPost
   * @summary 更新模型数据
   * @request POST:/model/update
   * @secure
   */ this.updateModelUsingPost = (data, params = {})=>{
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
            return this.request({
                path: `/model/update`,
                method: 'POST',
                body: formData,
                type: exports.ContentType.FormData,
                ...params
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
   */ this.getModelDetailUsingGet = (modelId, params = {})=>this.request({
                path: `/model/detail/${modelId}`,
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags 模型模块
   * @name DeleteModelUsingDelete
   * @summary 删除模型
   * @request DELETE:/model/{modelId}
   * @secure
   */ this.deleteModelUsingDelete = (modelIds, params = {})=>this.request({
                path: `/model/delete`,
                method: 'DELETE',
                body: modelIds,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型、模板
   * @name AddModelSharePoolUsingPost
   * @summary 新增共享模型
   * @request POST:/model/v2/share-pool
   * @secure
   */ this.addModelSharePoolUsingPost = (param, params = {})=>this.request({
                path: `/model/v2/share-pool`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型、模板
   * @name DeleteModelSharePoolUsingDelete
   * @summary 删除共享模型
   * @request DELETE:/model/v2/share-pool
   * @secure
   */ this.deleteModelSharePoolUsingDelete = (param, params = {})=>this.request({
                path: `/model/v2/share-pool`,
                method: 'DELETE',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型-皮肤
   * @name batchAddSkinUsingPost
   * @summary 批量添加到项目皮肤库
   * @request POST:/model/skin/project/batch-add
   * @secure
   */ this.batchAddSkinUsingPost = (param, params = {})=>this.request({
                path: `/model/skin/project/batch-add`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型-皮肤
   * @name setDefaultSkinUsingPut
   * @summary 设置地图默认皮肤
   * @request PUT:/model/skin/default
   * @secure
   */ this.setDefaultSkinUsingPut = (query, params = {})=>this.request({
                path: `/model/skin/default`,
                method: 'PUT',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型-皮肤
   * @name getDefaultSkinUsingGet
   * @summary 查询默认皮肤
   * @request GET:/model/skin/default
   * @secure
   */ this.getDefaultSkinUsingGet = (query, params = {})=>this.request({
                path: `/model/skin/default`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型-皮肤
   * @name getEngineDefaultSkinUsingGet
   * @summary 查询默认皮肤。game server使用，不用登录鉴权
   * @request GET:/engine/model/skin/default
   * @secure
   */ this.getEngineDefaultSkinUsingGet = (query, params = {})=>this.request({
                path: `/engine/model/skin/default`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型-皮肤
   * @name
   * @summary 查询将指定皮肤设置为默认皮肤的地图。game server使用
   * @request GET:/model/skin/project/default-map/{skinId}
   * @secure
   */ this.getSkinMapIdList = (skinId, params = {})=>this.request({
                path: `/model/skin/project/default-map/${skinId}`,
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags 扩展地图-模型共享
   * @name saveProjectSharedModelUsingPost
   * @summary 保存/修改项目共享模型
   * @request POST:/model/project-shared/save
   * @secure
   */ this.saveProjectSharedModelUsingPost = (param, params = {})=>this.request({
                path: `/model/project-shared/save`,
                method: 'POST',
                body: param,
                type: exports.ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 扩展地图-模型共享
   * @name deleteProjectSharedModelUsingDelete
   * @summary 删除项目共享模型
   * @request DELETE:/model/project-shared
   * @secure
   */ this.deleteProjectSharedModelUsingDelete = (query, params = {})=>this.request({
                path: `/model/project-shared`,
                method: 'DELETE',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 扩展地图-模型共享
   * @name renameProjectSharedModelUsingPut
   * @summary 重命名项目共享模型
   * @request PUT:/model/project-shared/rename
   * @secure
   */ this.renameProjectSharedModelUsingPut = (query, params = {})=>this.request({
                path: `/model/project-shared/rename`,
                method: 'PUT',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 扩展地图-模型共享
   * @name copyProjectSharedModelUsingPost
   * @summary 复制模型
   * @request POST:/model/project-shared/copy
   * @secure
   */ this.copyProjectSharedModelUsingPost = (param, params = {})=>this.request({
                path: `/model/project-shared/copy`,
                method: 'POST',
                body: param,
                ...params
            });
    }
}

class Models extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * No description
   *
   * @tags 模型模块
   * @name GetModelsUsingGet
   * @summary 获取模型列表
   * @request GET:/models
   * @secure
   * @deprecated 请使用getModelsUsingGetV2
   */ this.getModelsUsingGet = (query, params = {})=>this.request({
                path: `/models`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型模块
   * @name GetModelsUsingGet
   * @summary 获取模型列表，可分页
   * @request GET:/models/v2
   * @secure
   */ this.getModelsUsingGetV2 = (query, params = {})=>this.request({
                path: `/models/v2`,
                method: 'GET',
                query: query,
                ...params
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
   */ this.searchModelUsingGet = (query, params = {})=>this.request({
                path: `/models/search`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 分页获取用户模型数据
   * @name listModelsUsingGET
   * @summary 分页获取用户模型数据
   * @request GET:/models-page
   * @secure
   */ this.listModelsUsingGET = (query, params = {})=>this.request({
                path: `/models-page`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 皮肤模块
   * @name deleteSharedSkinUsingDelete
   * @summary 删除共享皮肤
   * @request DELETE:/model/skin/{mapId}/{skinId}
   * @secure
   */ this.deleteSharedSkinUsingDelete = (param, params = {})=>this.request({
                path: `/model/skin/${param.mapId}/${param.skinId}`,
                method: 'DELETE',
                ...params
            });
        /**
   * No description
   *
   * @tags 皮肤模块
   * @name renameSharedSkinUsingPut
   * @summary 重命名共享皮肤
   * @request PUT:/model/skin/rename
   * @secure
   */ this.renameSharedSkinUsingPut = (param, params = {})=>this.request({
                path: `/model/skin/rename`,
                method: 'PUT',
                query: param,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型模块
   * @name getEngineModelsUsingGet
   * @summary 获取模型列表，可分页，game server使用，不用登录鉴权
   * @request GET:/engine/models
   * @secure
   */ this.getEngineModelsUsingGet = (query, params = {})=>this.request({
                path: `/engine/models`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 模型模块
   * @name mapModelMigrationUsingPost
   * @summary 项目模型迁移。server使用
   * @request POST:/engine/model/project-shared/migration
   * @secure
   */ this.mapModelMigrationUsingPost = (query, params = {})=>this.request({
                path: `/engine/model/project-shared/migration`,
                method: 'POST',
                query: query,
                ...params
            });
    }
}

class Upload extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * 上传文件接口
   * @param data
   * @param params
   * @returns
   */ this.fileUploadPost = (data, params = {})=>{
            const formData = new FormData();
            const { file, type } = data;
            if (file) {
                formData.append('file', file);
            }
            if (type) {
                formData.append('type', type);
            }
            return this.request({
                path: `/file-upload-auth`,
                method: 'POST',
                body: formData,
                type: exports.ContentType.FormData,
                ...params
            });
        };
    }
}

/* eslint-disable */ /* tslint:disable */ /*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */ exports.ModelMigrationState = void 0;
(function(ModelMigrationState) {
    ModelMigrationState[ModelMigrationState["Init"] = 0] = "Init";
    ModelMigrationState[ModelMigrationState["Migrating"] = 1] = "Migrating";
    ModelMigrationState[ModelMigrationState["Success"] = 2] = "Success";
    ModelMigrationState[ModelMigrationState["Fails"] = 3] = "Fails";
})(exports.ModelMigrationState || (exports.ModelMigrationState = {}));
exports.ModelType = void 0;
(function(ModelType) {
    /**
   * 私有模型/私有皮肤
   */ ModelType[ModelType["Private"] = 0] = "Private";
    /**
   * 公共模型/公共皮肤
   */ ModelType[ModelType["Public"] = 1] = "Public";
    /**
   * 地图模型
   */ ModelType[ModelType["Project"] = 2] = "Project";
    /**
   * 扩展模型/共享皮肤
   */ ModelType[ModelType["ExtensionLib"] = 3] = "ExtensionLib";
})(exports.ModelType || (exports.ModelType = {}));
exports.CreativeMode = void 0;
(function(CreativeMode) {
    CreativeMode[CreativeMode["Model"] = 1] = "Model";
    CreativeMode[CreativeMode["Skin"] = 2] = "Skin";
})(exports.CreativeMode || (exports.CreativeMode = {}));
exports.SortOrder = void 0;
(function(SortOrder) {
    SortOrder[SortOrder["CreateTimeDesc"] = 0] = "CreateTimeDesc";
    SortOrder[SortOrder["NameAsc"] = 1] = "NameAsc";
    SortOrder[SortOrder["ModifyTimeDesc"] = 2] = "ModifyTimeDesc";
})(exports.SortOrder || (exports.SortOrder = {}));
exports.SourceType = void 0;
(function(SourceType) {
    /**
   * 最新保存的模型
   */ SourceType[SourceType["Snapshot"] = 0] = "Snapshot";
    /**
   * 已发布的模型
   */ SourceType[SourceType["Release"] = 1] = "Release";
})(exports.SourceType || (exports.SourceType = {}));
exports.ModelErrorCode = void 0;
(function(ModelErrorCode) {
    ModelErrorCode[ModelErrorCode["NameExisted"] = 10020013] = "NameExisted";
    ModelErrorCode[ModelErrorCode["ModelNotExisted"] = 10020011] = "ModelNotExisted";
})(exports.ModelErrorCode || (exports.ModelErrorCode = {}));
/**
 * 请求超时时间
 */ const REQUEST_TIMEOUT = 10 * 1000;
exports.CopyEvent = void 0;
(function(CopyEvent) {
    /**
   * 主动复制
   */ CopyEvent[CopyEvent["ActiveCopy"] = 0] = "ActiveCopy";
    /**
   * 被动复制
   */ CopyEvent[CopyEvent["PassiveCopy"] = 1] = "PassiveCopy";
})(exports.CopyEvent || (exports.CopyEvent = {}));

/**
 * Editor capabilities understood by the local Creator and VOXA clients.
 *
 * These stable wire values are kept outside the removed cloud-platform
 * clients because local permission checks still exchange them at runtime.
 */ exports.Permissions = void 0;
(function(Permissions) {
    Permissions["UserEnginePlay"] = "user:engine:play";
    Permissions["UserEngineManage"] = "user:engine:manage";
    Permissions["UserEngineEditor"] = "user:engine:editor";
    Permissions["UserEngineEditorGenerate"] = "user:engine:editor:generate";
    Permissions["UserVoxelManage"] = "user:voxel:manage";
    Permissions["UserVoxelEditor"] = "user:voxel:editor";
    Permissions["UserVoxelEditorMultiObj"] = "user:voxel:editor:multi_object";
    Permissions["UserVoxelEditorMultiObjAnimation"] = "user:voxel:editor:multi_object:animation";
    Permissions["ResourceEnginePlay"] = "resource:engine:play";
})(exports.Permissions || (exports.Permissions = {}));

exports.Collaboration = Collaboration;
exports.Createra = Createra;
exports.CreatorStore = CreatorStore;
exports.HttpClient = HttpClient;
exports.Interface = _interface;
exports.Model = Model;
exports.Models = Models;
exports.REQUEST_TIMEOUT = REQUEST_TIMEOUT;
exports.Storage = Storage;
exports.Upload = Upload;
