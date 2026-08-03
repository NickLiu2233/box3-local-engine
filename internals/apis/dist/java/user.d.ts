import { FollowParam, UserUpdateParam, WearingSkins } from '../data-contracts';
import { HttpClient } from '../http-client';
import { RequestParams } from '../interface';
export declare class JavaUser<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
    /**
     * No description
     *
     * @tags 用户
     * @name NoticeAvatarUsingPatch
     * @summary 用户-将头像状态改为重视
     * @request PATCH:/user/avatar/notice
     */
    noticeAvatarUsingPatch: (params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name GetAvatarStatusUsingGet
     * @summary 用户-获取自身头像审核状态
     * @request GET:/user/avatar/status
     */
    getAvatarStatusUsingGet: (params?: RequestParams) => Promise<import("../data-contracts").AvatarStatusVO>;
    /**
     * No description
     *
     * @tags 用户
     * @name GetAvatarUploadStatusUsingGet
     * @summary 用户-获取头像上传状态
     * @request GET:/user/avatar/upload-status
     */
    getAvatarUploadStatusUsingGet: (params?: RequestParams) => Promise<import("../data-contracts").AvatarUploadStatusVO>;
    /**
     * No description
     *
     * @tags 用户
     * @name AddBlockUsingPatch
     * @summary 用户-屏蔽某人
     * @request PATCH:/user/block/{userId}
     */
    addBlockUsingPatch: (userId: number, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name GetBlocklistUsingGet
     * @summary 用户-获取自己屏蔽列表
     * @request GET:/user/blocklist
     */
    getBlocklistUsingGet: (params?: RequestParams) => Promise<import("../data-contracts").BlocklistUserInfoVO[]>;
    /**
     * No description
     *
     * @tags 用户
     * @name ListBrowseHistoryUsingGet
     * @summary 用户-获取用户浏览记录
     * @request GET:/user/browse-history
     */
    listBrowseHistoryUsingGet: (query?: {
        limit?: number;
        offset?: number;
        type?: number;
    }, params?: RequestParams) => Promise<import("../data-contracts").PageResponseUserBrowseHistoryVO>;
    /**
     * No description
     *
     * @tags 用户
     * @name ClearBrowseHistoryUsingDelete
     * @summary 用户-清空浏览历史
     * @request DELETE:/user/browse/clear
     */
    clearBrowseHistoryUsingDelete: (params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name AddBrowseHistoryUsingPost
     * @summary 用户-添加内容浏览历史
     * @request POST:/user/browse/record/{contentId}
     */
    addBrowseHistoryUsingPost: (contentId?: string, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name DeleteBrowseHistoryUsingDelete
     * @summary 用户-删除某个内容的浏览记录
     * @request DELETE:/user/browse/{contentId}
     */
    deleteBrowseHistoryUsingDelete: (contentId?: string, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name GetEventStatusUsingGet
     * @summary 用户-获取事件状态
     * @request GET:/user/event/status
     */
    getEventStatusUsingGet: (params?: RequestParams) => Promise<import("../data-contracts").EventStatusVO>;
    /**
     * No description
     *
     * @tags 用户
     * @name GetByParamUsingGet
     * @summary 用户-根据条件获取用户信息
     * @request GET:/user/get/param
     */
    getByParamUsingGet: (query?: {
        id?: number;
        publishedContentsCount?: boolean;
        username?: string;
    }, params?: RequestParams) => Promise<import("../data-contracts").SimpleUserInfoAndStatisticsVO>;
    /**
     * No description
     *
     * @tags 用户-交互
     * @name CollectContentUsingPost
     * @summary 交互-收藏内容
     * @request POST:/user/interactive/collect/{contentId}
     */
    collectContentUsingPost: (contentId?: string, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户-交互
     * @name DeleteCollectedContentUsingDelete
     * @summary 交互-取消内容收藏
     * @request DELETE:/user/interactive/collect/{contentId}
     */
    deleteCollectedContentUsingDelete: (contentId?: string, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户-交互
     * @name FollowUsingPost
     * @summary 交互-关注/取消关注
     * @request POST:/user/interactive/follow
     */
    followUsingPost: (param: FollowParam, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户-交互
     * @name ListFollowerUsingGet
     * @summary 交互-分页获取粉丝列表
     * @request GET:/user/interactive/follower/list
     */
    listFollowerUsingGet: (query: {
        limit?: number;
        offset?: number;
        userId: number;
    }, params?: RequestParams) => Promise<import("../data-contracts").PageResponseSimpleUserInfoAndFollowingVO>;
    /**
     * No description
     *
     * @tags 用户-交互
     * @name ListFollowingUsingGet
     * @summary 交互-分页获取关注列表
     * @request GET:/user/interactive/following/list
     */
    listFollowingUsingGet: (query: {
        limit?: number;
        offset?: number;
        userId: number;
    }, params?: RequestParams) => Promise<import("../data-contracts").PageResponseSimpleUserInfoAndFollowingVO>;
    /**
     * No description
     *
     * @tags 用户
     * @name GetLanguageUsingGet
     * @summary 用户-获取用户语言环境
     * @request GET:/user/language
     */
    getLanguageUsingGet: (params?: RequestParams) => Promise<import("../data-contracts").UserLanguageVO>;
    /**
     * No description
     *
     * @tags 用户
     * @name SetLanguageUsingPatch
     * @summary 用户-设置用户语言环境
     * @request PATCH:/user/language/{language}
     */
    setLanguageUsingPatch: (language?: string, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name ListByParamUsingGet
     * @summary 用户-根据条件分页获取用户信息
     * @request GET:/user/list/param
     */
    listByParamUsingGet: (query?: {
        cmid?: number;
        displayname?: string;
        id?: number;
        limit?: number;
        offset?: number;
        username?: string;
    }, params?: RequestParams) => Promise<import("../data-contracts").PageResponseSimpleUserInfoVO>;
    /**
     * No description
     *
     * @tags 用户
     * @name AddPlayHistoryUsingPost
     * @summary 用户-添加播放记录
     * @request POST:/user/play/record/{containerName}
     */
    addPlayHistoryUsingPost: (containerName?: string, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name CheckPunishInfoUsingPatch
     * @summary 用户-校验惩罚信息
     * @request PATCH:/user/punish/check
     */
    checkPunishInfoUsingPatch: (params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name GiveEventSkinUsingPost
     * @summary 用户-给予事件皮肤
     * @request POST:/user/skin/event/give/{eventChoseStatus}
     */
    giveEventSkinUsingPost: (eventChoseStatus?: string, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name SetWearingSkinsUsingPatch
     * @summary 用户-设置皮肤
     * @request PATCH:/user/skin/set
     */
    setWearingSkinsUsingPatch: (wearingSkins: WearingSkins, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name ListSkinLibraryUsingGet
     * @summary 用户-获取用户所拥有的皮肤名称
     * @request GET:/user/skin/{userId}
     */
    listSkinLibraryUsingGet: (userId?: string, params?: RequestParams) => Promise<string[]>;
    /**
     * No description
     *
     * @tags 用户
     * @name AgreeTermUsingPatch
     * @summary 用户-同意条款
     * @request PATCH:/user/term/agree/{term}
     */
    agreeTermUsingPatch: (term?: string, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name UnblockUsingPatch
     * @summary 用户-取消屏蔽
     * @request PATCH:/user/unblock/{userId}
     */
    unblockUsingPatch: (userId: number, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name UpdateUserInfoUsingPut
     * @summary 用户-更新用户信息
     * @request PUT:/user/update
     */
    updateUserInfoUsingPut: (param: UserUpdateParam, params?: RequestParams) => Promise<import("../data-contracts").SingleValueVOBoolean>;
    /**
     * No description
     *
     * @tags 用户
     * @name viewCount
     * @summary 增加用户查看该作品的次数
     * @request GET:/content/view/increase
     */
    viewCount: (content_id: number) => Promise<import("../data-contracts").SingleValueVOBoolean>;
}
//# sourceMappingURL=user.d.ts.map