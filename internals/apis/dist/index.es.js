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

var ContentType$1;
(function(ContentType) {
    ContentType[ContentType["Map"] = 1] = "Map";
    ContentType[ContentType["Model"] = 2] = "Model";
})(ContentType$1 || (ContentType$1 = {}));
var Permissions;
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
})(Permissions || (Permissions = {}));
var ResourceConfigs;
(function(ResourceConfigs) {
    ResourceConfigs["MapVisitor"] = "map:visitor";
})(ResourceConfigs || (ResourceConfigs = {}));

var ContentType;
(function(ContentType) {
    ContentType["Json"] = "application/json";
    ContentType["FormData"] = "multipart/form-data";
    ContentType["UrlEncoded"] = "application/x-www-form-urlencoded";
})(ContentType || (ContentType = {}));

var _interface = /*#__PURE__*/Object.freeze({
__proto__: null,
get ContentType () { return ContentType; }
});

class MaasContent extends HttpClient {
    getContentInfo(contentId, params = {}) {
        return this.request({
            path: `/content/info/${contentId}`,
            method: 'GET',
            type: ContentType.Json,
            ...params
        });
    }
    getContentInfoByToken(contentId, params = {}) {
        return this.request({
            path: `/content/info/get-by-token/${contentId}`,
            method: 'GET',
            type: ContentType.Json,
            ...params
        });
    }
    getPartnerConfig(params = {}) {
        return this.request({
            path: '/partner/config',
            method: 'GET',
            type: ContentType.Json,
            ...params
        });
    }
    getPartnerPublicConfig(query, params = {}) {
        return this.request({
            query,
            path: '/partner/config-no-auth',
            method: 'GET',
            type: ContentType.Json,
            ...params
        });
    }
    getContentId(query, params = {}) {
        return this.request({
            query,
            path: '/content/map/get-content-id',
            method: 'GET',
            type: ContentType.Json,
            ...params
        });
    }
}

class MaasAuth extends HttpClient {
    parseQueries(query) {
        const { permissions, resourceId } = query;
        let queries = [];
        if (Array.isArray(permissions)) {
            queries = queries.concat(permissions.map((permission)=>`permissions=${permission}`));
        }
        if (typeof resourceId !== 'undefined') {
            queries.push(`resourceId=${resourceId}`);
        }
        return queries.join('&');
    }
    checkPermission(query, params = {}) {
        return this.request({
            path: `/check/permission?${this.parseQueries(query)}`,
            method: 'GET',
            type: ContentType.Json,
            ...params
        });
    }
    checkPermissionByTicket(query, params = {}) {
        return this.request({
            path: `/check/permission/ticket?${this.parseQueries(query)}`,
            method: 'GET',
            type: ContentType.Json,
            ...params
        });
    }
}

class MaasUser extends HttpClient {
    authToCookie(query, params = {}) {
        return this.request({
            path: '/user/auth2Cookie',
            query,
            method: 'GET',
            type: ContentType.Json,
            ...params
        });
    }
}

class Resource extends HttpClient {
    getConfig(resourceId, params = {}) {
        return this.request({
            path: `/resource/config/ticket?resourceId=${resourceId}`,
            method: 'GET',
            type: ContentType.Json,
            ...params
        });
    }
    getConfigByToken(resourceId, params = {}) {
        return this.request({
            path: `/resource/config?resourceId=${resourceId}`,
            method: 'GET',
            type: ContentType.Json,
            ...params
        });
    }
}

class Container extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * No description
   *
   * @tags 容器模块
   * @name CreateGameEditUsingPost
   * @summary 容器-创建游戏地图
   * @request POST:/container/create-game-edit
   */ this.createGameEditUsingPost = (param, params = {})=>this.request({
                path: `/container/create-game-edit`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 容器模块
   * @name GetEditorExperienceStatusUsingGet
   * @summary 容器-查询是否开启编辑器体验功能
   * @request GET:/container/editor-experience-status
   */ this.getEditorExperienceStatusUsingGet = (params = {})=>this.request({
                path: `/container/editor-experience-status`,
                method: 'GET',
                ...params
            });
    }
}

class Maas extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * No description
   *
   * @tags 用于签发第三方登录token
   * @name setCookieWithToken
   * @summary 利用签发给第三方登录的token来设置cookie
   * @request GET:/user/auth2Cookie
   */ this.setCookieWithToken = (query)=>this.request({
                path: '/user/auth2Cookie',
                method: 'GET',
                query,
                type: ContentType.Json
            });
        /**
   * No description
   *
   * @tags 用于自动审核发布作品
   * @name autoReviewPublish
   * @summary 自动审核发布作品
   * @request POST:/map/auto-review
   */ this.autoReviewPublish = (query)=>this.request({
                path: '/map/auto-review',
                method: 'POST',
                query,
                type: ContentType.Json
            });
        /**
   * No description
   *
   * @tags 复制地图
   * @name copyMap
   * @summary 复制地图
   * @request POST:/map/copy
   */ this.mapCopyUsingPost = (query)=>this.request({
                path: '/map/copy',
                method: 'POST',
                query,
                type: ContentType.Json
            });
        /**
   * No description
   *
   * @tags 查询地图
   * @name getMapByPage
   * @summary 查询地图
   * @request GET:/map/page
   */ this.mapPageUsingGet = (query, params = {})=>this.request({
                path: '/map/page',
                method: 'GET',
                query,
                ...params
            });
        /**
   * No description
   *
   * @tags 删除地图
   * @name deleteMap
   * @summary 删除地图
   * @request DELETE:/map/contentId
   */ this.mapDeleteUsingDelete = (query, params = {})=>this.request({
                path: '/map/del',
                method: 'DELETE',
                query,
                ...params
            });
    }
}

var UserInfoPermissions;
(function(UserInfoPermissions) {
    UserInfoPermissions[UserInfoPermissions["Admin"] = 65536] = "Admin";
})(UserInfoPermissions || (UserInfoPermissions = {}));
var SuitList;
(function(SuitList) {
    SuitList[SuitList["Suit"] = 0] = "Suit";
    SuitList[SuitList["Head"] = 1] = "Head";
    SuitList[SuitList["Shirt"] = 2] = "Shirt";
    SuitList[SuitList["Pants"] = 3] = "Pants";
    SuitList[SuitList["Shoes"] = 4] = "Shoes";
})(SuitList || (SuitList = {}));
var AvatarBodyPart;
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
})(AvatarBodyPart || (AvatarBodyPart = {}));
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
   * @tags 传送
   * @name containerTeleport
   * @summary 传送
   * @request POST:/container/teleport
   * @secure
   */ this.containerTeleport = (params, headers)=>this.request({
                path: '/container/teleport',
                method: 'POST',
                body: params,
                headers
            });
        /**
   * No description
   *
   * @tags 获取喵贝壳
   * @name getMiaoShells
   * @summary 获取喵贝壳
   * @request POST:/reward/map/user
   * @secure
   */ this.getMiaoShells = (query, headers)=>this.request({
                path: '/reward/map/user',
                method: 'GET',
                query,
                headers
            });
        /**
   * @description type: 0关注 1粉丝 2好友。返回用户id列表
   *
   * @tags 引擎后端相关
   * @name GetSocialRelationUsingGet
   * @summary 用户社交关系查询
   * @request GET:/engine/social/relation
   * @secure
   */ this.getSocialRelationUsingGet = (query, params = {})=>this.request({
                path: `/engine/social/relation`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   *
   * @tags 引擎后端相关
   * @name GetSocialRelationInfoUsingGet
   * @summary 获取用户好友信息
   * @request GET:/engine/follow/relation-info
   * @secure
   */ this.getSocialRelationInfoUsingGet = (query, params = {})=>this.request({
                path: `/engine/follow/relation-info`,
                method: 'GET',
                query: query,
                ...params
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
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name CreateTempChatUsingPost
   * @summary 创建临时聊天
   * @request POST:/engine/chat/temp
   * @secure
   */ this.createTempChatUsingPost = (param, params = {})=>this.request({
                path: `/engine/chat/temp`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name DeleteTempChatUsingDelete
   * @summary 删除临时聊天
   * @request DELETE:/engine/chat/temp
   * @secure
   */ this.deleteTempChatUsingDelete = (param, params = {})=>this.request({
                path: `/engine/chat/temp`,
                method: 'DELETE',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name AddTempChatUserUsingPost
   * @summary 新增临时聊天用户
   * @request POST:/engine/chat/temp/add-user
   * @secure
   */ this.addTempChatUserUsingPost = (param, params = {})=>this.request({
                path: `/engine/chat/temp/add-user`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name TempChatIdsUsingGet
   * @summary 查询地图下所有临时聊天ID列表
   * @request GET:/engine/chat/temp/ids
   * @secure
   */ this.tempChatIdsUsingGet = (query, params = {})=>this.request({
                path: `/engine/chat/temp/ids`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name RemoveTempChatUserUsingPost
   * @summary 移除临时聊天用户
   * @request POST:/engine/chat/temp/remove-user
   * @secure
   */ this.removeTempChatUserUsingPost = (param, params = {})=>this.request({
                path: `/engine/chat/temp/remove-user`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name GetTempChatUsersUsingGet
   * @summary 根据ID查询聊天用户列表
   * @request GET:/engine/chat/temp/users
   * @secure
   */ this.getTempChatUsersUsingGet = (query, params = {})=>this.request({
                path: `/engine/chat/temp/users`,
                method: 'GET',
                query: query,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
                ...requestParams
            });
    }
}

class JavaAuth extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * No description
   *
   * @tags 权限
   * @name GetAuthHashUsingGet
   * @summary 权限-获取token
   * @request GET:/auth/auth/{type}
   */ this.getAuthHashUsingGet = (type, params = {})=>this.request({
                path: `/auth/auth/${type}`,
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name BindCodemaoUsingPost
   * @summary 权限-编程猫账号绑定(前提是已经进行codemao账号登录)
   * @request POST:/auth/bind/codemao
   */ this.bindCodemaoUsingPost = (codemaoLoginParam, params = {})=>this.request({
                path: `/auth/bind/codemao`,
                method: 'POST',
                body: codemaoLoginParam,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name CheckBlackUsingPost
   * @summary 权限-Ip与游客黑名单校验
   * @request POST:/auth/check-black
   */ this.checkBlackUsingPost = (param, params = {})=>this.request({
                path: `/auth/check-black`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name UpdateEmailUsingPatch
   * @summary 权限-修改绑定邮箱
   * @request PATCH:/auth/email
   */ this.updateEmailUsingPatch = (param, params = {})=>this.request({
                path: `/auth/email`,
                method: 'PATCH',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name LoginUsingPost
   * @summary 权限-登录
   * @request POST:/auth/login
   */ this.loginUsingPost = (loginParam, params = {})=>this.request({
                path: `/auth/login`,
                method: 'POST',
                body: loginParam,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name CodemaoLoginUsingPost
   * @summary 权限-编程猫账号登录
   * @request POST:/auth/login/codemao
   */ this.codemaoLoginUsingPost = (codemaoLoginParam, params = {})=>this.request({
                path: `/auth/login/codemao`,
                method: 'POST',
                body: codemaoLoginParam,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name FirebaseLoginUsingPost
   * @summary 权限-Firebase登录
   * @request POST:/auth/login/firebase
   */ this.firebaseLoginUsingPost = (firebaseLoginParam, params = {})=>this.request({
                path: `/auth/login/firebase`,
                method: 'POST',
                body: firebaseLoginParam,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name FlashLoginUsingPost
   * @summary 权限-一键登录 APP端 原生
   * @request POST:/auth/login/flash
   */ this.flashLoginUsingPost = (loginParam, params = {})=>this.request({
                path: `/auth/login/flash`,
                method: 'POST',
                body: loginParam,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name OauthAppUsingPost
   * @summary 权限-第三方登录 APP端 原生
   * @request POST:/auth/login/oauth/app
   */ this.oauthAppUsingPost = (oauthLoginParam, params = {})=>this.request({
                path: `/auth/login/oauth/app`,
                method: 'POST',
                body: oauthLoginParam,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name OauthUsingPost
   * @summary 权限-第三方登陆/绑定 web端
   * @request POST:/auth/login/oauth/web
   */ this.oauthUsingPost = (oauthCallBackParam, params = {})=>this.request({
                path: `/auth/login/oauth/web`,
                method: 'POST',
                body: oauthCallBackParam,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name WebOauthUrlUsingPost
   * @summary 权限-第三方登录 web端 获取第三方授权地址
   * @request POST:/auth/login/oauth/web-url
   */ this.webOauthUrlUsingPost = (oauthLoginParam, params = {})=>this.request({
                path: `/auth/login/oauth/web-url`,
                method: 'POST',
                body: oauthLoginParam,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name PhoneLoginUsingPost
   * @summary 权限-短信登录
   * @request POST:/auth/login/phone
   */ this.phoneLoginUsingPost = (param, params = {})=>this.request({
                path: `/auth/login/phone`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name LogoutUsingPost
   * @summary 权限-退出登录
   * @request POST:/auth/logout
   */ this.logoutUsingPost = (params = {})=>this.request({
                path: `/auth/logout`,
                method: 'POST',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name OfflineUsingPost
   * @summary 权限-离线标记
   * @request POST:/auth/offline
   */ this.offlineUsingPost = (params = {})=>this.request({
                path: `/auth/offline`,
                method: 'POST',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name OnlineUsingPost
   * @summary 权限-在线标记
   * @request POST:/auth/online/{entry}
   */ this.onlineUsingPost = (entry, params = {})=>this.request({
                path: `/auth/online/${entry}`,
                method: 'POST',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name UpdatePhoneUsingPatch
   * @summary 权限-修改绑定手机
   * @request PATCH:/auth/phone
   */ this.updatePhoneUsingPatch = (param, params = {})=>this.request({
                path: `/auth/phone`,
                method: 'PATCH',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name UpdatePwdUsingPatch
   * @summary 权限-修改密码
   * @request PATCH:/auth/pwd
   */ this.updatePwdUsingPatch = (param, params = {})=>this.request({
                path: `/auth/pwd`,
                method: 'PATCH',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name RegisterUsingPost
   * @summary 权限-注册
   * @request POST:/auth/register
   */ this.registerUsingPost = (param, params = {})=>this.request({
                path: `/auth/register`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name ExperienceRegisterUsingPost
   * @summary 权限-体验号快捷注册【请求头携带Device-ID】
   * @request POST:/auth/register/experience
   */ this.experienceRegisterUsingPost = (query, params = {})=>this.request({
                path: `/auth/register/experience`,
                method: 'POST',
                query: query,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name VerifyResetPwdCodeUsingPost
   * @summary 权限-密码重置-验证码校验
   * @request POST:/auth/reset-pwd/verify
   */ this.verifyResetPwdCodeUsingPost = (param, params = {})=>this.request({
                path: `/auth/reset-pwd/verify`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name SendCodeUsingPost
   * @summary 权限-发送验证码
   * @request POST:/auth/send-code
   */ this.sendCodeUsingPost = (param, params = {})=>this.request({
                path: `/auth/send-code`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name SetCookieUsingPost
   * @summary 权限-设置cookie
   * @request POST:/auth/set-cookie
   */ this.setCookieUsingPost = (query, params = {})=>this.request({
                path: `/auth/set-cookie`,
                method: 'POST',
                query: query,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 权限
   * @name UnbindUsingPost
   * @summary 权限-微信/qq/微博/编程猫账号解绑
   * @request POST:/auth/unbind/{provider}
   */ this.unbindUsingPost = (provider, params = {})=>this.request({
                path: `/auth/unbind/${provider}`,
                method: 'POST',
                type: ContentType.Json,
                ...params
            });
    }
}

class JavaUser extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * No description
   *
   * @tags 用户
   * @name NoticeAvatarUsingPatch
   * @summary 用户-将头像状态改为重视
   * @request PATCH:/user/avatar/notice
   */ this.noticeAvatarUsingPatch = (params = {})=>this.request({
                path: `/user/avatar/notice`,
                method: 'PATCH',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name GetAvatarStatusUsingGet
   * @summary 用户-获取自身头像审核状态
   * @request GET:/user/avatar/status
   */ this.getAvatarStatusUsingGet = (params = {})=>this.request({
                path: `/user/avatar/status`,
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name GetAvatarUploadStatusUsingGet
   * @summary 用户-获取头像上传状态
   * @request GET:/user/avatar/upload-status
   */ this.getAvatarUploadStatusUsingGet = (params = {})=>this.request({
                path: `/user/avatar/upload-status`,
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name AddBlockUsingPatch
   * @summary 用户-屏蔽某人
   * @request PATCH:/user/block/{userId}
   */ this.addBlockUsingPatch = (userId, params = {})=>this.request({
                path: `/user/block/${userId}`,
                method: 'PATCH',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name GetBlocklistUsingGet
   * @summary 用户-获取自己屏蔽列表
   * @request GET:/user/blocklist
   */ this.getBlocklistUsingGet = (params = {})=>this.request({
                path: `/user/blocklist`,
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name ListBrowseHistoryUsingGet
   * @summary 用户-获取用户浏览记录
   * @request GET:/user/browse-history
   */ this.listBrowseHistoryUsingGet = (query, params = {})=>this.request({
                path: `/user/browse-history`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name ClearBrowseHistoryUsingDelete
   * @summary 用户-清空浏览历史
   * @request DELETE:/user/browse/clear
   */ this.clearBrowseHistoryUsingDelete = (params = {})=>this.request({
                path: `/user/browse/clear`,
                method: 'DELETE',
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name AddBrowseHistoryUsingPost
   * @summary 用户-添加内容浏览历史
   * @request POST:/user/browse/record/{contentId}
   */ this.addBrowseHistoryUsingPost = (contentId, params = {})=>this.request({
                path: `/user/browse/record/${contentId}`,
                method: 'POST',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name DeleteBrowseHistoryUsingDelete
   * @summary 用户-删除某个内容的浏览记录
   * @request DELETE:/user/browse/{contentId}
   */ this.deleteBrowseHistoryUsingDelete = (contentId, params = {})=>this.request({
                path: `/user/browse/${contentId}`,
                method: 'DELETE',
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name GetEventStatusUsingGet
   * @summary 用户-获取事件状态
   * @request GET:/user/event/status
   */ this.getEventStatusUsingGet = (params = {})=>this.request({
                path: `/user/event/status`,
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name GetByParamUsingGet
   * @summary 用户-根据条件获取用户信息
   * @request GET:/user/get/param
   */ this.getByParamUsingGet = (query, params = {})=>this.request({
                path: `/user/get/param`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户-交互
   * @name CollectContentUsingPost
   * @summary 交互-收藏内容
   * @request POST:/user/interactive/collect/{contentId}
   */ this.collectContentUsingPost = (contentId, params = {})=>this.request({
                path: `/user/interactive/collect/${contentId}`,
                method: 'POST',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户-交互
   * @name DeleteCollectedContentUsingDelete
   * @summary 交互-取消内容收藏
   * @request DELETE:/user/interactive/collect/{contentId}
   */ this.deleteCollectedContentUsingDelete = (contentId, params = {})=>this.request({
                path: `/user/interactive/collect/${contentId}`,
                method: 'DELETE',
                ...params
            });
        /**
   * No description
   *
   * @tags 用户-交互
   * @name FollowUsingPost
   * @summary 交互-关注/取消关注
   * @request POST:/user/interactive/follow
   */ this.followUsingPost = (param, params = {})=>this.request({
                path: `/user/interactive/follow`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户-交互
   * @name ListFollowerUsingGet
   * @summary 交互-分页获取粉丝列表
   * @request GET:/user/interactive/follower/list
   */ this.listFollowerUsingGet = (query, params = {})=>this.request({
                path: `/user/interactive/follower/list`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户-交互
   * @name ListFollowingUsingGet
   * @summary 交互-分页获取关注列表
   * @request GET:/user/interactive/following/list
   */ this.listFollowingUsingGet = (query, params = {})=>this.request({
                path: `/user/interactive/following/list`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name GetLanguageUsingGet
   * @summary 用户-获取用户语言环境
   * @request GET:/user/language
   */ this.getLanguageUsingGet = (params = {})=>this.request({
                path: `/user/language`,
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name SetLanguageUsingPatch
   * @summary 用户-设置用户语言环境
   * @request PATCH:/user/language/{language}
   */ this.setLanguageUsingPatch = (language, params = {})=>this.request({
                path: `/user/language/${language}`,
                method: 'PATCH',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name ListByParamUsingGet
   * @summary 用户-根据条件分页获取用户信息
   * @request GET:/user/list/param
   */ this.listByParamUsingGet = (query, params = {})=>this.request({
                path: `/user/list/param`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name AddPlayHistoryUsingPost
   * @summary 用户-添加播放记录
   * @request POST:/user/play/record/{containerName}
   */ this.addPlayHistoryUsingPost = (containerName, params = {})=>this.request({
                path: `/user/play/record/${containerName}`,
                method: 'POST',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name CheckPunishInfoUsingPatch
   * @summary 用户-校验惩罚信息
   * @request PATCH:/user/punish/check
   */ this.checkPunishInfoUsingPatch = (params = {})=>this.request({
                path: `/user/punish/check`,
                method: 'PATCH',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name GiveEventSkinUsingPost
   * @summary 用户-给予事件皮肤
   * @request POST:/user/skin/event/give/{eventChoseStatus}
   */ this.giveEventSkinUsingPost = (eventChoseStatus, params = {})=>this.request({
                path: `/user/skin/event/give/${eventChoseStatus}`,
                method: 'POST',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name SetWearingSkinsUsingPatch
   * @summary 用户-设置皮肤
   * @request PATCH:/user/skin/set
   */ this.setWearingSkinsUsingPatch = (wearingSkins, params = {})=>this.request({
                path: `/user/skin/set`,
                method: 'PATCH',
                body: wearingSkins,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name ListSkinLibraryUsingGet
   * @summary 用户-获取用户所拥有的皮肤名称
   * @request GET:/user/skin/{userId}
   */ this.listSkinLibraryUsingGet = (userId, params = {})=>this.request({
                path: `/user/skin/${userId}`,
                method: 'GET',
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name AgreeTermUsingPatch
   * @summary 用户-同意条款
   * @request PATCH:/user/term/agree/{term}
   */ this.agreeTermUsingPatch = (term, params = {})=>this.request({
                path: `/user/term/agree/${term}`,
                method: 'PATCH',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name UnblockUsingPatch
   * @summary 用户-取消屏蔽
   * @request PATCH:/user/unblock/{userId}
   */ this.unblockUsingPatch = (userId, params = {})=>this.request({
                path: `/user/unblock/${userId}`,
                method: 'PATCH',
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name UpdateUserInfoUsingPut
   * @summary 用户-更新用户信息
   * @request PUT:/user/update
   */ this.updateUserInfoUsingPut = (param, params = {})=>this.request({
                path: `/user/update`,
                method: 'PUT',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 用户
   * @name viewCount
   * @summary 增加用户查看该作品的次数
   * @request GET:/content/view/increase
   */ this.viewCount = (content_id)=>this.request({
                path: `/content/view/increase/${content_id}`,
                method: 'GET'
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.FormData,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.Json,
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
                type: ContentType.FormData,
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
 */ var ModelMigrationState;
(function(ModelMigrationState) {
    ModelMigrationState[ModelMigrationState["Init"] = 0] = "Init";
    ModelMigrationState[ModelMigrationState["Migrating"] = 1] = "Migrating";
    ModelMigrationState[ModelMigrationState["Success"] = 2] = "Success";
    ModelMigrationState[ModelMigrationState["Fails"] = 3] = "Fails";
})(ModelMigrationState || (ModelMigrationState = {}));
var ModelType;
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
})(ModelType || (ModelType = {}));
var CreativeMode;
(function(CreativeMode) {
    CreativeMode[CreativeMode["Model"] = 1] = "Model";
    CreativeMode[CreativeMode["Skin"] = 2] = "Skin";
})(CreativeMode || (CreativeMode = {}));
var SortOrder;
(function(SortOrder) {
    SortOrder[SortOrder["CreateTimeDesc"] = 0] = "CreateTimeDesc";
    SortOrder[SortOrder["NameAsc"] = 1] = "NameAsc";
    SortOrder[SortOrder["ModifyTimeDesc"] = 2] = "ModifyTimeDesc";
})(SortOrder || (SortOrder = {}));
var SourceType;
(function(SourceType) {
    /**
   * 最新保存的模型
   */ SourceType[SourceType["Snapshot"] = 0] = "Snapshot";
    /**
   * 已发布的模型
   */ SourceType[SourceType["Release"] = 1] = "Release";
})(SourceType || (SourceType = {}));
var ModelErrorCode;
(function(ModelErrorCode) {
    ModelErrorCode[ModelErrorCode["NameExisted"] = 10020013] = "NameExisted";
    ModelErrorCode[ModelErrorCode["ModelNotExisted"] = 10020011] = "ModelNotExisted";
})(ModelErrorCode || (ModelErrorCode = {}));
/**
 * 请求超时时间
 */ const REQUEST_TIMEOUT = 10 * 1000;
var CopyEvent;
(function(CopyEvent) {
    /**
   * 主动复制
   */ CopyEvent[CopyEvent["ActiveCopy"] = 0] = "ActiveCopy";
    /**
   * 被动复制
   */ CopyEvent[CopyEvent["PassiveCopy"] = 1] = "PassiveCopy";
})(CopyEvent || (CopyEvent = {}));

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var md5$1 = {exports: {}};

function commonjsRequire(path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var core$1 = {exports: {}};

var core = core$1.exports;

var hasRequiredCore;

function requireCore () {
	if (hasRequiredCore) return core$1.exports;
	hasRequiredCore = 1;
	(function (module, exports) {
		(function(root, factory) {
		    {
		        // CommonJS
		        module.exports = factory();
		    }
		})(core, function() {
		    /*globals window, global, require*/ /**
			 * CryptoJS core components.
			 */ var CryptoJS = CryptoJS || function(Math1, undefined$1) {
		        var crypto;
		        // Native crypto from window (Browser)
		        if (typeof window !== 'undefined' && window.crypto) {
		            crypto = window.crypto;
		        }
		        // Native crypto in web worker (Browser)
		        if (typeof self !== 'undefined' && self.crypto) {
		            crypto = self.crypto;
		        }
		        // Native crypto from worker
		        if (typeof globalThis !== 'undefined' && globalThis.crypto) {
		            crypto = globalThis.crypto;
		        }
		        // Native (experimental IE 11) crypto from window (Browser)
		        if (!crypto && typeof window !== 'undefined' && window.msCrypto) {
		            crypto = window.msCrypto;
		        }
		        // Native crypto from global (NodeJS)
		        if (!crypto && typeof commonjsGlobal !== 'undefined' && commonjsGlobal.crypto) {
		            crypto = commonjsGlobal.crypto;
		        }
		        // Native crypto import via require (NodeJS)
		        if (!crypto && typeof commonjsRequire === 'function') {
		            try {
		                crypto = require('crypto');
		            } catch (err) {}
		        }
		        /*
			     * Cryptographically secure pseudorandom number generator
			     *
			     * As Math.random() is cryptographically not safe to use
			     */ var cryptoSecureRandomInt = function() {
		            if (crypto) {
		                // Use getRandomValues method (Browser)
		                if (typeof crypto.getRandomValues === 'function') {
		                    try {
		                        return crypto.getRandomValues(new Uint32Array(1))[0];
		                    } catch (err) {}
		                }
		                // Use randomBytes method (NodeJS)
		                if (typeof crypto.randomBytes === 'function') {
		                    try {
		                        return crypto.randomBytes(4).readInt32LE();
		                    } catch (err) {}
		                }
		            }
		            throw new Error('Native crypto module could not be used to get secure random number.');
		        };
		        /*
			     * Local polyfill of Object.create

			     */ var create = Object.create || function() {
		            function F() {}
		            return function(obj) {
		                var subtype;
		                F.prototype = obj;
		                subtype = new F();
		                F.prototype = null;
		                return subtype;
		            };
		        }();
		        /**
			     * CryptoJS namespace.
			     */ var C = {};
		        /**
			     * Library namespace.
			     */ var C_lib = C.lib = {};
		        /**
			     * Base object for prototypal inheritance.
			     */ var Base = C_lib.Base = function() {
		            return {
		                /**
			             * Creates a new object that inherits from this object.
			             *
			             * @param {Object} overrides Properties to copy into the new object.
			             *
			             * @return {Object} The new object.
			             *
			             * @static
			             *
			             * @example
			             *
			             *     var MyType = CryptoJS.lib.Base.extend({
			             *         field: 'value',
			             *
			             *         method: function () {
			             *         }
			             *     });
			             */ extend: function(overrides) {
		                    // Spawn
		                    var subtype = create(this);
		                    // Augment
		                    if (overrides) {
		                        subtype.mixIn(overrides);
		                    }
		                    // Create default initializer
		                    if (!subtype.hasOwnProperty('init') || this.init === subtype.init) {
		                        subtype.init = function() {
		                            subtype.$super.init.apply(this, arguments);
		                        };
		                    }
		                    // Initializer's prototype is the subtype object
		                    subtype.init.prototype = subtype;
		                    // Reference supertype
		                    subtype.$super = this;
		                    return subtype;
		                },
		                /**
			             * Extends this object and runs the init method.
			             * Arguments to create() will be passed to init().
			             *
			             * @return {Object} The new object.
			             *
			             * @static
			             *
			             * @example
			             *
			             *     var instance = MyType.create();
			             */ create: function() {
		                    var instance = this.extend();
		                    instance.init.apply(instance, arguments);
		                    return instance;
		                },
		                /**
			             * Initializes a newly created object.
			             * Override this method to add some logic when your objects are created.
			             *
			             * @example
			             *
			             *     var MyType = CryptoJS.lib.Base.extend({
			             *         init: function () {
			             *             // ...
			             *         }
			             *     });
			             */ init: function() {},
		                /**
			             * Copies properties into this object.
			             *
			             * @param {Object} properties The properties to mix in.
			             *
			             * @example
			             *
			             *     MyType.mixIn({
			             *         field: 'value'
			             *     });
			             */ mixIn: function(properties) {
		                    for(var propertyName in properties){
		                        if (properties.hasOwnProperty(propertyName)) {
		                            this[propertyName] = properties[propertyName];
		                        }
		                    }
		                    // IE won't copy toString using the loop above
		                    if (properties.hasOwnProperty('toString')) {
		                        this.toString = properties.toString;
		                    }
		                },
		                /**
			             * Creates a copy of this object.
			             *
			             * @return {Object} The clone.
			             *
			             * @example
			             *
			             *     var clone = instance.clone();
			             */ clone: function() {
		                    return this.init.prototype.extend(this);
		                }
		            };
		        }();
		        /**
			     * An array of 32-bit words.
			     *
			     * @property {Array} words The array of 32-bit words.
			     * @property {number} sigBytes The number of significant bytes in this word array.
			     */ var WordArray = C_lib.WordArray = Base.extend({
		            /**
			         * Initializes a newly created word array.
			         *
			         * @param {Array} words (Optional) An array of 32-bit words.
			         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.lib.WordArray.create();
			         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
			         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
			         */ init: function(words, sigBytes) {
		                words = this.words = words || [];
		                if (sigBytes != undefined$1) {
		                    this.sigBytes = sigBytes;
		                } else {
		                    this.sigBytes = words.length * 4;
		                }
		            },
		            /**
			         * Converts this word array to a string.
			         *
			         * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
			         *
			         * @return {string} The stringified word array.
			         *
			         * @example
			         *
			         *     var string = wordArray + '';
			         *     var string = wordArray.toString();
			         *     var string = wordArray.toString(CryptoJS.enc.Utf8);
			         */ toString: function(encoder) {
		                return (encoder || Hex).stringify(this);
		            },
		            /**
			         * Concatenates a word array to this word array.
			         *
			         * @param {WordArray} wordArray The word array to append.
			         *
			         * @return {WordArray} This word array.
			         *
			         * @example
			         *
			         *     wordArray1.concat(wordArray2);
			         */ concat: function(wordArray) {
		                // Shortcuts
		                var thisWords = this.words;
		                var thatWords = wordArray.words;
		                var thisSigBytes = this.sigBytes;
		                var thatSigBytes = wordArray.sigBytes;
		                // Clamp excess bits
		                this.clamp();
		                // Concat
		                if (thisSigBytes % 4) {
		                    // Copy one byte at a time
		                    for(var i = 0; i < thatSigBytes; i++){
		                        var thatByte = thatWords[i >>> 2] >>> 24 - i % 4 * 8 & 0xff;
		                        thisWords[thisSigBytes + i >>> 2] |= thatByte << 24 - (thisSigBytes + i) % 4 * 8;
		                    }
		                } else {
		                    // Copy one word at a time
		                    for(var j = 0; j < thatSigBytes; j += 4){
		                        thisWords[thisSigBytes + j >>> 2] = thatWords[j >>> 2];
		                    }
		                }
		                this.sigBytes += thatSigBytes;
		                // Chainable
		                return this;
		            },
		            /**
			         * Removes insignificant bits.
			         *
			         * @example
			         *
			         *     wordArray.clamp();
			         */ clamp: function() {
		                // Shortcuts
		                var words = this.words;
		                var sigBytes = this.sigBytes;
		                // Clamp
		                words[sigBytes >>> 2] &= 0xffffffff << 32 - sigBytes % 4 * 8;
		                words.length = Math1.ceil(sigBytes / 4);
		            },
		            /**
			         * Creates a copy of this word array.
			         *
			         * @return {WordArray} The clone.
			         *
			         * @example
			         *
			         *     var clone = wordArray.clone();
			         */ clone: function() {
		                var clone = Base.clone.call(this);
		                clone.words = this.words.slice(0);
		                return clone;
		            },
		            /**
			         * Creates a word array filled with random bytes.
			         *
			         * @param {number} nBytes The number of random bytes to generate.
			         *
			         * @return {WordArray} The random word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.lib.WordArray.random(16);
			         */ random: function(nBytes) {
		                var words = [];
		                for(var i = 0; i < nBytes; i += 4){
		                    words.push(cryptoSecureRandomInt());
		                }
		                return new WordArray.init(words, nBytes);
		            }
		        });
		        /**
			     * Encoder namespace.
			     */ var C_enc = C.enc = {};
		        /**
			     * Hex encoding strategy.
			     */ var Hex = C_enc.Hex = {
		            /**
			         * Converts a word array to a hex string.
			         *
			         * @param {WordArray} wordArray The word array.
			         *
			         * @return {string} The hex string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
			         */ stringify: function(wordArray) {
		                // Shortcuts
		                var words = wordArray.words;
		                var sigBytes = wordArray.sigBytes;
		                // Convert
		                var hexChars = [];
		                for(var i = 0; i < sigBytes; i++){
		                    var bite = words[i >>> 2] >>> 24 - i % 4 * 8 & 0xff;
		                    hexChars.push((bite >>> 4).toString(16));
		                    hexChars.push((bite & 0x0f).toString(16));
		                }
		                return hexChars.join('');
		            },
		            /**
			         * Converts a hex string to a word array.
			         *
			         * @param {string} hexStr The hex string.
			         *
			         * @return {WordArray} The word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
			         */ parse: function(hexStr) {
		                // Shortcut
		                var hexStrLength = hexStr.length;
		                // Convert
		                var words = [];
		                for(var i = 0; i < hexStrLength; i += 2){
		                    words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << 24 - i % 8 * 4;
		                }
		                return new WordArray.init(words, hexStrLength / 2);
		            }
		        };
		        /**
			     * Latin1 encoding strategy.
			     */ var Latin1 = C_enc.Latin1 = {
		            /**
			         * Converts a word array to a Latin1 string.
			         *
			         * @param {WordArray} wordArray The word array.
			         *
			         * @return {string} The Latin1 string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
			         */ stringify: function(wordArray) {
		                // Shortcuts
		                var words = wordArray.words;
		                var sigBytes = wordArray.sigBytes;
		                // Convert
		                var latin1Chars = [];
		                for(var i = 0; i < sigBytes; i++){
		                    var bite = words[i >>> 2] >>> 24 - i % 4 * 8 & 0xff;
		                    latin1Chars.push(String.fromCharCode(bite));
		                }
		                return latin1Chars.join('');
		            },
		            /**
			         * Converts a Latin1 string to a word array.
			         *
			         * @param {string} latin1Str The Latin1 string.
			         *
			         * @return {WordArray} The word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
			         */ parse: function(latin1Str) {
		                // Shortcut
		                var latin1StrLength = latin1Str.length;
		                // Convert
		                var words = [];
		                for(var i = 0; i < latin1StrLength; i++){
		                    words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << 24 - i % 4 * 8;
		                }
		                return new WordArray.init(words, latin1StrLength);
		            }
		        };
		        /**
			     * UTF-8 encoding strategy.
			     */ var Utf8 = C_enc.Utf8 = {
		            /**
			         * Converts a word array to a UTF-8 string.
			         *
			         * @param {WordArray} wordArray The word array.
			         *
			         * @return {string} The UTF-8 string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
			         */ stringify: function(wordArray) {
		                try {
		                    return decodeURIComponent(escape(Latin1.stringify(wordArray)));
		                } catch (e) {
		                    throw new Error('Malformed UTF-8 data');
		                }
		            },
		            /**
			         * Converts a UTF-8 string to a word array.
			         *
			         * @param {string} utf8Str The UTF-8 string.
			         *
			         * @return {WordArray} The word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
			         */ parse: function(utf8Str) {
		                return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
		            }
		        };
		        /**
			     * Abstract buffered block algorithm template.
			     *
			     * The property blockSize must be implemented in a concrete subtype.
			     *
			     * @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
			     */ var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
		            /**
			         * Resets this block algorithm's data buffer to its initial state.
			         *
			         * @example
			         *
			         *     bufferedBlockAlgorithm.reset();
			         */ reset: function() {
		                // Initial values
		                this._data = new WordArray.init();
		                this._nDataBytes = 0;
		            },
		            /**
			         * Adds new data to this block algorithm's buffer.
			         *
			         * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
			         *
			         * @example
			         *
			         *     bufferedBlockAlgorithm._append('data');
			         *     bufferedBlockAlgorithm._append(wordArray);
			         */ _append: function(data) {
		                // Convert string to WordArray, else assume WordArray already
		                if (typeof data == 'string') {
		                    data = Utf8.parse(data);
		                }
		                // Append
		                this._data.concat(data);
		                this._nDataBytes += data.sigBytes;
		            },
		            /**
			         * Processes available data blocks.
			         *
			         * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
			         *
			         * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
			         *
			         * @return {WordArray} The processed data.
			         *
			         * @example
			         *
			         *     var processedData = bufferedBlockAlgorithm._process();
			         *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
			         */ _process: function(doFlush) {
		                var processedWords;
		                // Shortcuts
		                var data = this._data;
		                var dataWords = data.words;
		                var dataSigBytes = data.sigBytes;
		                var blockSize = this.blockSize;
		                var blockSizeBytes = blockSize * 4;
		                // Count blocks ready
		                var nBlocksReady = dataSigBytes / blockSizeBytes;
		                if (doFlush) {
		                    // Round up to include partial blocks
		                    nBlocksReady = Math1.ceil(nBlocksReady);
		                } else {
		                    // Round down to include only full blocks,
		                    // less the number of blocks that must remain in the buffer
		                    nBlocksReady = Math1.max((nBlocksReady | 0) - this._minBufferSize, 0);
		                }
		                // Count words ready
		                var nWordsReady = nBlocksReady * blockSize;
		                // Count bytes ready
		                var nBytesReady = Math1.min(nWordsReady * 4, dataSigBytes);
		                // Process blocks
		                if (nWordsReady) {
		                    for(var offset = 0; offset < nWordsReady; offset += blockSize){
		                        // Perform concrete-algorithm logic
		                        this._doProcessBlock(dataWords, offset);
		                    }
		                    // Remove processed words
		                    processedWords = dataWords.splice(0, nWordsReady);
		                    data.sigBytes -= nBytesReady;
		                }
		                // Return processed words
		                return new WordArray.init(processedWords, nBytesReady);
		            },
		            /**
			         * Creates a copy of this object.
			         *
			         * @return {Object} The clone.
			         *
			         * @example
			         *
			         *     var clone = bufferedBlockAlgorithm.clone();
			         */ clone: function() {
		                var clone = Base.clone.call(this);
		                clone._data = this._data.clone();
		                return clone;
		            },
		            _minBufferSize: 0
		        });
		        /**
			     * Abstract hasher template.
			     *
			     * @property {number} blockSize The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
			     */ C_lib.Hasher = BufferedBlockAlgorithm.extend({
		            /**
			         * Configuration options.
			         */ cfg: Base.extend(),
		            /**
			         * Initializes a newly created hasher.
			         *
			         * @param {Object} cfg (Optional) The configuration options to use for this hash computation.
			         *
			         * @example
			         *
			         *     var hasher = CryptoJS.algo.SHA256.create();
			         */ init: function(cfg) {
		                // Apply config defaults
		                this.cfg = this.cfg.extend(cfg);
		                // Set initial values
		                this.reset();
		            },
		            /**
			         * Resets this hasher to its initial state.
			         *
			         * @example
			         *
			         *     hasher.reset();
			         */ reset: function() {
		                // Reset data buffer
		                BufferedBlockAlgorithm.reset.call(this);
		                // Perform concrete-hasher logic
		                this._doReset();
		            },
		            /**
			         * Updates this hasher with a message.
			         *
			         * @param {WordArray|string} messageUpdate The message to append.
			         *
			         * @return {Hasher} This hasher.
			         *
			         * @example
			         *
			         *     hasher.update('message');
			         *     hasher.update(wordArray);
			         */ update: function(messageUpdate) {
		                // Append
		                this._append(messageUpdate);
		                // Update the hash
		                this._process();
		                // Chainable
		                return this;
		            },
		            /**
			         * Finalizes the hash computation.
			         * Note that the finalize operation is effectively a destructive, read-once operation.
			         *
			         * @param {WordArray|string} messageUpdate (Optional) A final message update.
			         *
			         * @return {WordArray} The hash.
			         *
			         * @example
			         *
			         *     var hash = hasher.finalize();
			         *     var hash = hasher.finalize('message');
			         *     var hash = hasher.finalize(wordArray);
			         */ finalize: function(messageUpdate) {
		                // Final message update
		                if (messageUpdate) {
		                    this._append(messageUpdate);
		                }
		                // Perform concrete-hasher logic
		                var hash = this._doFinalize();
		                return hash;
		            },
		            blockSize: 512 / 32,
		            /**
			         * Creates a shortcut function to a hasher's object interface.
			         *
			         * @param {Hasher} hasher The hasher to create a helper for.
			         *
			         * @return {Function} The shortcut function.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
			         */ _createHelper: function(hasher) {
		                return function(message, cfg) {
		                    return new hasher.init(cfg).finalize(message);
		                };
		            },
		            /**
			         * Creates a shortcut function to the HMAC's object interface.
			         *
			         * @param {Hasher} hasher The hasher to use in this HMAC helper.
			         *
			         * @return {Function} The shortcut function.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
			         */ _createHmacHelper: function(hasher) {
		                return function(message, key) {
		                    return new C_algo.HMAC.init(hasher, key).finalize(message);
		                };
		            }
		        });
		        /**
			     * Algorithm namespace.
			     */ var C_algo = C.algo = {};
		        return C;
		    }(Math);
		    return CryptoJS;
		}); 
	} (core$1));
	return core$1.exports;
}

var md5 = md5$1.exports;

var hasRequiredMd5;

function requireMd5 () {
	if (hasRequiredMd5) return md5$1.exports;
	hasRequiredMd5 = 1;
	(function (module, exports) {
		(function(root, factory) {
		    {
		        // CommonJS
		        module.exports = factory(requireCore());
		    }
		})(md5, function(CryptoJS) {
		    (function(Math1) {
		        // Shortcuts
		        var C = CryptoJS;
		        var C_lib = C.lib;
		        var WordArray = C_lib.WordArray;
		        var Hasher = C_lib.Hasher;
		        var C_algo = C.algo;
		        // Constants table
		        var T = [];
		        // Compute constants
		        (function() {
		            for(var i = 0; i < 64; i++){
		                T[i] = Math1.abs(Math1.sin(i + 1)) * 0x100000000 | 0;
		            }
		        })();
		        /**
			     * MD5 hash algorithm.
			     */ var MD5 = C_algo.MD5 = Hasher.extend({
		            _doReset: function() {
		                this._hash = new WordArray.init([
		                    0x67452301,
		                    0xefcdab89,
		                    0x98badcfe,
		                    0x10325476
		                ]);
		            },
		            _doProcessBlock: function(M, offset) {
		                // Swap endian
		                for(var i = 0; i < 16; i++){
		                    // Shortcuts
		                    var offset_i = offset + i;
		                    var M_offset_i = M[offset_i];
		                    M[offset_i] = (M_offset_i << 8 | M_offset_i >>> 24) & 0x00ff00ff | (M_offset_i << 24 | M_offset_i >>> 8) & 0xff00ff00;
		                }
		                // Shortcuts
		                var H = this._hash.words;
		                var M_offset_0 = M[offset + 0];
		                var M_offset_1 = M[offset + 1];
		                var M_offset_2 = M[offset + 2];
		                var M_offset_3 = M[offset + 3];
		                var M_offset_4 = M[offset + 4];
		                var M_offset_5 = M[offset + 5];
		                var M_offset_6 = M[offset + 6];
		                var M_offset_7 = M[offset + 7];
		                var M_offset_8 = M[offset + 8];
		                var M_offset_9 = M[offset + 9];
		                var M_offset_10 = M[offset + 10];
		                var M_offset_11 = M[offset + 11];
		                var M_offset_12 = M[offset + 12];
		                var M_offset_13 = M[offset + 13];
		                var M_offset_14 = M[offset + 14];
		                var M_offset_15 = M[offset + 15];
		                // Working varialbes
		                var a = H[0];
		                var b = H[1];
		                var c = H[2];
		                var d = H[3];
		                // Computation
		                a = FF(a, b, c, d, M_offset_0, 7, T[0]);
		                d = FF(d, a, b, c, M_offset_1, 12, T[1]);
		                c = FF(c, d, a, b, M_offset_2, 17, T[2]);
		                b = FF(b, c, d, a, M_offset_3, 22, T[3]);
		                a = FF(a, b, c, d, M_offset_4, 7, T[4]);
		                d = FF(d, a, b, c, M_offset_5, 12, T[5]);
		                c = FF(c, d, a, b, M_offset_6, 17, T[6]);
		                b = FF(b, c, d, a, M_offset_7, 22, T[7]);
		                a = FF(a, b, c, d, M_offset_8, 7, T[8]);
		                d = FF(d, a, b, c, M_offset_9, 12, T[9]);
		                c = FF(c, d, a, b, M_offset_10, 17, T[10]);
		                b = FF(b, c, d, a, M_offset_11, 22, T[11]);
		                a = FF(a, b, c, d, M_offset_12, 7, T[12]);
		                d = FF(d, a, b, c, M_offset_13, 12, T[13]);
		                c = FF(c, d, a, b, M_offset_14, 17, T[14]);
		                b = FF(b, c, d, a, M_offset_15, 22, T[15]);
		                a = GG(a, b, c, d, M_offset_1, 5, T[16]);
		                d = GG(d, a, b, c, M_offset_6, 9, T[17]);
		                c = GG(c, d, a, b, M_offset_11, 14, T[18]);
		                b = GG(b, c, d, a, M_offset_0, 20, T[19]);
		                a = GG(a, b, c, d, M_offset_5, 5, T[20]);
		                d = GG(d, a, b, c, M_offset_10, 9, T[21]);
		                c = GG(c, d, a, b, M_offset_15, 14, T[22]);
		                b = GG(b, c, d, a, M_offset_4, 20, T[23]);
		                a = GG(a, b, c, d, M_offset_9, 5, T[24]);
		                d = GG(d, a, b, c, M_offset_14, 9, T[25]);
		                c = GG(c, d, a, b, M_offset_3, 14, T[26]);
		                b = GG(b, c, d, a, M_offset_8, 20, T[27]);
		                a = GG(a, b, c, d, M_offset_13, 5, T[28]);
		                d = GG(d, a, b, c, M_offset_2, 9, T[29]);
		                c = GG(c, d, a, b, M_offset_7, 14, T[30]);
		                b = GG(b, c, d, a, M_offset_12, 20, T[31]);
		                a = HH(a, b, c, d, M_offset_5, 4, T[32]);
		                d = HH(d, a, b, c, M_offset_8, 11, T[33]);
		                c = HH(c, d, a, b, M_offset_11, 16, T[34]);
		                b = HH(b, c, d, a, M_offset_14, 23, T[35]);
		                a = HH(a, b, c, d, M_offset_1, 4, T[36]);
		                d = HH(d, a, b, c, M_offset_4, 11, T[37]);
		                c = HH(c, d, a, b, M_offset_7, 16, T[38]);
		                b = HH(b, c, d, a, M_offset_10, 23, T[39]);
		                a = HH(a, b, c, d, M_offset_13, 4, T[40]);
		                d = HH(d, a, b, c, M_offset_0, 11, T[41]);
		                c = HH(c, d, a, b, M_offset_3, 16, T[42]);
		                b = HH(b, c, d, a, M_offset_6, 23, T[43]);
		                a = HH(a, b, c, d, M_offset_9, 4, T[44]);
		                d = HH(d, a, b, c, M_offset_12, 11, T[45]);
		                c = HH(c, d, a, b, M_offset_15, 16, T[46]);
		                b = HH(b, c, d, a, M_offset_2, 23, T[47]);
		                a = II(a, b, c, d, M_offset_0, 6, T[48]);
		                d = II(d, a, b, c, M_offset_7, 10, T[49]);
		                c = II(c, d, a, b, M_offset_14, 15, T[50]);
		                b = II(b, c, d, a, M_offset_5, 21, T[51]);
		                a = II(a, b, c, d, M_offset_12, 6, T[52]);
		                d = II(d, a, b, c, M_offset_3, 10, T[53]);
		                c = II(c, d, a, b, M_offset_10, 15, T[54]);
		                b = II(b, c, d, a, M_offset_1, 21, T[55]);
		                a = II(a, b, c, d, M_offset_8, 6, T[56]);
		                d = II(d, a, b, c, M_offset_15, 10, T[57]);
		                c = II(c, d, a, b, M_offset_6, 15, T[58]);
		                b = II(b, c, d, a, M_offset_13, 21, T[59]);
		                a = II(a, b, c, d, M_offset_4, 6, T[60]);
		                d = II(d, a, b, c, M_offset_11, 10, T[61]);
		                c = II(c, d, a, b, M_offset_2, 15, T[62]);
		                b = II(b, c, d, a, M_offset_9, 21, T[63]);
		                // Intermediate hash value
		                H[0] = H[0] + a | 0;
		                H[1] = H[1] + b | 0;
		                H[2] = H[2] + c | 0;
		                H[3] = H[3] + d | 0;
		            },
		            _doFinalize: function() {
		                // Shortcuts
		                var data = this._data;
		                var dataWords = data.words;
		                var nBitsTotal = this._nDataBytes * 8;
		                var nBitsLeft = data.sigBytes * 8;
		                // Add padding
		                dataWords[nBitsLeft >>> 5] |= 0x80 << 24 - nBitsLeft % 32;
		                var nBitsTotalH = Math1.floor(nBitsTotal / 0x100000000);
		                var nBitsTotalL = nBitsTotal;
		                dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = (nBitsTotalH << 8 | nBitsTotalH >>> 24) & 0x00ff00ff | (nBitsTotalH << 24 | nBitsTotalH >>> 8) & 0xff00ff00;
		                dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = (nBitsTotalL << 8 | nBitsTotalL >>> 24) & 0x00ff00ff | (nBitsTotalL << 24 | nBitsTotalL >>> 8) & 0xff00ff00;
		                data.sigBytes = (dataWords.length + 1) * 4;
		                // Hash final blocks
		                this._process();
		                // Shortcuts
		                var hash = this._hash;
		                var H = hash.words;
		                // Swap endian
		                for(var i = 0; i < 4; i++){
		                    // Shortcut
		                    var H_i = H[i];
		                    H[i] = (H_i << 8 | H_i >>> 24) & 0x00ff00ff | (H_i << 24 | H_i >>> 8) & 0xff00ff00;
		                }
		                // Return final computed hash
		                return hash;
		            },
		            clone: function() {
		                var clone = Hasher.clone.call(this);
		                clone._hash = this._hash.clone();
		                return clone;
		            }
		        });
		        function FF(a, b, c, d, x, s, t) {
		            var n = a + (b & c | ~b & d) + x + t;
		            return (n << s | n >>> 32 - s) + b;
		        }
		        function GG(a, b, c, d, x, s, t) {
		            var n = a + (b & d | c & ~d) + x + t;
		            return (n << s | n >>> 32 - s) + b;
		        }
		        function HH(a, b, c, d, x, s, t) {
		            var n = a + (b ^ c ^ d) + x + t;
		            return (n << s | n >>> 32 - s) + b;
		        }
		        function II(a, b, c, d, x, s, t) {
		            var n = a + (c ^ (b | ~d)) + x + t;
		            return (n << s | n >>> 32 - s) + b;
		        }
		        /**
			     * Shortcut function to the hasher's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     *
			     * @return {WordArray} The hash.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hash = CryptoJS.MD5('message');
			     *     var hash = CryptoJS.MD5(wordArray);
			     */ C.MD5 = Hasher._createHelper(MD5);
		        /**
			     * Shortcut function to the HMAC's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     * @param {WordArray|string} key The secret key.
			     *
			     * @return {WordArray} The HMAC.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hmac = CryptoJS.HmacMD5(message, key);
			     */ C.HmacMD5 = Hasher._createHmacHelper(MD5);
		    })(Math);
		    return CryptoJS.MD5;
		}); 
	} (md5$1));
	return md5$1.exports;
}

var md5Exports = requireMd5();
var MD5 = /*@__PURE__*/getDefaultExportFromCjs(md5Exports);

var sha256$1 = {exports: {}};

var sha256 = sha256$1.exports;

var hasRequiredSha256;

function requireSha256 () {
	if (hasRequiredSha256) return sha256$1.exports;
	hasRequiredSha256 = 1;
	(function (module, exports) {
		(function(root, factory) {
		    {
		        // CommonJS
		        module.exports = factory(requireCore());
		    }
		})(sha256, function(CryptoJS) {
		    (function(Math1) {
		        // Shortcuts
		        var C = CryptoJS;
		        var C_lib = C.lib;
		        var WordArray = C_lib.WordArray;
		        var Hasher = C_lib.Hasher;
		        var C_algo = C.algo;
		        // Initialization and round constants tables
		        var H = [];
		        var K = [];
		        // Compute constants
		        (function() {
		            function isPrime(n) {
		                var sqrtN = Math1.sqrt(n);
		                for(var factor = 2; factor <= sqrtN; factor++){
		                    if (!(n % factor)) {
		                        return false;
		                    }
		                }
		                return true;
		            }
		            function getFractionalBits(n) {
		                return (n - (n | 0)) * 0x100000000 | 0;
		            }
		            var n = 2;
		            var nPrime = 0;
		            while(nPrime < 64){
		                if (isPrime(n)) {
		                    if (nPrime < 8) {
		                        H[nPrime] = getFractionalBits(Math1.pow(n, 1 / 2));
		                    }
		                    K[nPrime] = getFractionalBits(Math1.pow(n, 1 / 3));
		                    nPrime++;
		                }
		                n++;
		            }
		        })();
		        // Reusable object
		        var W = [];
		        /**
			     * SHA-256 hash algorithm.
			     */ var SHA256 = C_algo.SHA256 = Hasher.extend({
		            _doReset: function() {
		                this._hash = new WordArray.init(H.slice(0));
		            },
		            _doProcessBlock: function(M, offset) {
		                // Shortcut
		                var H = this._hash.words;
		                // Working variables
		                var a = H[0];
		                var b = H[1];
		                var c = H[2];
		                var d = H[3];
		                var e = H[4];
		                var f = H[5];
		                var g = H[6];
		                var h = H[7];
		                // Computation
		                for(var i = 0; i < 64; i++){
		                    if (i < 16) {
		                        W[i] = M[offset + i] | 0;
		                    } else {
		                        var gamma0x = W[i - 15];
		                        var gamma0 = (gamma0x << 25 | gamma0x >>> 7) ^ (gamma0x << 14 | gamma0x >>> 18) ^ gamma0x >>> 3;
		                        var gamma1x = W[i - 2];
		                        var gamma1 = (gamma1x << 15 | gamma1x >>> 17) ^ (gamma1x << 13 | gamma1x >>> 19) ^ gamma1x >>> 10;
		                        W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
		                    }
		                    var ch = e & f ^ ~e & g;
		                    var maj = a & b ^ a & c ^ b & c;
		                    var sigma0 = (a << 30 | a >>> 2) ^ (a << 19 | a >>> 13) ^ (a << 10 | a >>> 22);
		                    var sigma1 = (e << 26 | e >>> 6) ^ (e << 21 | e >>> 11) ^ (e << 7 | e >>> 25);
		                    var t1 = h + sigma1 + ch + K[i] + W[i];
		                    var t2 = sigma0 + maj;
		                    h = g;
		                    g = f;
		                    f = e;
		                    e = d + t1 | 0;
		                    d = c;
		                    c = b;
		                    b = a;
		                    a = t1 + t2 | 0;
		                }
		                // Intermediate hash value
		                H[0] = H[0] + a | 0;
		                H[1] = H[1] + b | 0;
		                H[2] = H[2] + c | 0;
		                H[3] = H[3] + d | 0;
		                H[4] = H[4] + e | 0;
		                H[5] = H[5] + f | 0;
		                H[6] = H[6] + g | 0;
		                H[7] = H[7] + h | 0;
		            },
		            _doFinalize: function() {
		                // Shortcuts
		                var data = this._data;
		                var dataWords = data.words;
		                var nBitsTotal = this._nDataBytes * 8;
		                var nBitsLeft = data.sigBytes * 8;
		                // Add padding
		                dataWords[nBitsLeft >>> 5] |= 0x80 << 24 - nBitsLeft % 32;
		                dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = Math1.floor(nBitsTotal / 0x100000000);
		                dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = nBitsTotal;
		                data.sigBytes = dataWords.length * 4;
		                // Hash final blocks
		                this._process();
		                // Return final computed hash
		                return this._hash;
		            },
		            clone: function() {
		                var clone = Hasher.clone.call(this);
		                clone._hash = this._hash.clone();
		                return clone;
		            }
		        });
		        /**
			     * Shortcut function to the hasher's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     *
			     * @return {WordArray} The hash.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hash = CryptoJS.SHA256('message');
			     *     var hash = CryptoJS.SHA256(wordArray);
			     */ C.SHA256 = Hasher._createHelper(SHA256);
		        /**
			     * Shortcut function to the HMAC's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     * @param {WordArray|string} key The secret key.
			     *
			     * @return {WordArray} The HMAC.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hmac = CryptoJS.HmacSHA256(message, key);
			     */ C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
		    })(Math);
		    return CryptoJS.SHA256;
		}); 
	} (sha256$1));
	return sha256$1.exports;
}

var sha256Exports = requireSha256();
var SHA256 = /*@__PURE__*/getDefaultExportFromCjs(sha256Exports);

/**
 * 生成签名（sha256 + md5）
 * 算法与旧平台客户端保持兼容。
 * @params 签名的参数字典
 * @secretKey 秘钥
 */ function getSignature(params, secretKey) {
    const timestamp = new Date().getTime();
    const dict = {
        ...params,
        timestamp
    };
    // 将参数名按照ASCII码从小到大（A～Z）排序
    const keyList = Object.keys(dict).sort();
    // 按顺序拼接key=value
    const keyValueList = keyList.reduce((list, key)=>{
        const val = dict[key];
        // undefined，null，空字符串不参与校验
        if (![
            undefined,
            null,
            ''
        ].includes(val)) {
            if (Array.isArray(val)) {
                list.push(`${key}=${val.length}`);
            } else if (typeof val === 'object') {
                list.push(`${key}=json-obj`);
            } else {
                list.push(`${key}=${val}`);
            }
        }
        return list;
    }, []);
    // 拼接secretKey的md5
    keyValueList.push(`key=${MD5(secretKey).toString()}`);
    // 连接所有参数，进行md5加密
    const md5Value = MD5(keyValueList.join('&')).toString();
    // 再进行sha256加密，全大写
    const hash = SHA256(md5Value).toString().toUpperCase();
    return {
        hash,
        timestamp
    };
}
/**
 * 生成用于签名（sha256 + md5）的请求拦截器。
 * 算法与旧平台客户端保持兼容。
 * @param out 会被更新headers字段，如果没有headers，会添加headers字段
 * @param requestData 请求的数据。params是query参数，data是body参数。
 * @param secretKey 秘钥
 */ function appendSignatureHeaders(out, requestData, secretKey) {
    const { params, data } = requestData;
    /**
   * 按照平台的代码逻辑，优先判断了data的类型，处理成某种字典结构，再进行签名
   * - 如果是数组，生成一个 { array: data } 结构
   * - 如果是字符串、数组，生成一个 { body: data } 结构
   * - 其余情况，与params合并成一个字典对象，理论上不会有接口同时存在params和data参数。后端的说法是为了通用以防万一。
   */ let signatureParams;
    if (Array.isArray(data)) {
        signatureParams = {
            array: data
        };
    } else if ([
        'number',
        'string'
    ].includes(typeof data)) {
        signatureParams = {
            body: data
        };
    } else {
        signatureParams = {
            ...params,
            ...data
        };
    }
    const signature = getSignature(signatureParams, secretKey);
    if (out.headers) {
        Object.assign(out.headers, signature);
    } else {
        out.headers = signature;
    }
    return out;
}

class VobiApi extends HttpClient {
    predict(data, secretKey, params = {}) {
        appendSignatureHeaders(params, {
            data
        }, secretKey);
        return this.request({
            path: 'ai/vobi/predict',
            method: 'POST',
            type: ContentType.Json,
            body: data,
            ...params
        });
    }
}

class MapGroupProject extends HttpClient {
    constructor(...args){
        super(...args);
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name GetProjcetUsingGet
   * @summary 获取地图组工程数据
   * @request GET:/map-group-project
   * @secure
   */ this.getProjectUsingGet = (query, params = {})=>this.request({
                path: `/engine/map-group-project`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name SaveProjectUsingPost
   * @summary 保存地图组工程数据
   * @request POST:/map-group-project
   * @secure
   */ this.saveProjectUsingPost = (param, params = {})=>this.request({
                path: `/engine/map-group-project`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name MigrationUsingGet
   * @summary 地图组工程migration
   * @request GET:/map-group-project/migration
   * @secure
   */ this.migrationUsingGet = (query, params = {})=>this.request({
                path: `/engine/map-group-project/migration`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name UpdateVersionUsingPost
   * @summary 保存地图地图组工程版本
   * @request POST:/map-group-project/version
   * @secure
   */ this.updateVersionUsingPost = (param, params = {})=>this.request({
                path: `/engine/map-group-project/version`,
                method: 'POST',
                body: param,
                type: ContentType.Json,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name GetDefaultScreenIdUsingGet
   * @summary 获取地图默认屏幕ID
   * @request GET:/engine/default-screen-id
   * @secure
   */ this.getDefaultScreenIdUsingGet = (query, params = {})=>this.request({
                path: `/engine/default-screen-id`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name playPictureMigrationUsingGet
   * @summary play端共享图片的migration，返回hash值
   * @request GET:/engine/map-group-project/picture/migration
   * @secure
   */ this.playPictureMigrationUsingGet = (query, params = {})=>this.request({
                path: `/engine/map-group-project/picture/migration`,
                method: 'GET',
                query: query,
                ...params
            });
        /**
   * No description
   *
   * @tags 引擎后端相关
   * @name nextUidListUsingGet
   * @summary 生成多个全局唯一UID
   * @request GET:/engine/uid/list
   * @secure
   */ this.nextUidListUsingGet = (query, params = {})=>this.request({
                path: `/engine/uid/list`,
                method: 'GET',
                query: query,
                ...params
            });
    }
}

export { AvatarBodyPart, Collaboration, Container, ContentType$1 as ContentType, CopyEvent, Createra, CreativeMode, CreatorStore, HttpClient, _interface as Interface, JavaAuth, JavaUser, Maas, MaasAuth, MaasContent, MaasUser, MapGroupProject, Model, ModelErrorCode, ModelMigrationState, ModelType, Models, Permissions, REQUEST_TIMEOUT, Resource, ResourceConfigs, SortOrder, SourceType, Storage, SuitList, Upload, UserInfoPermissions, VobiApi, appendSignatureHeaders, getSignature };
