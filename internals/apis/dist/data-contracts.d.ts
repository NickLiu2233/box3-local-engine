export interface ActivityDetail {
    /** 活动的描述 */
    activityDescription?: string;
    /**
     * 活动结束时间
     * @format date-time
     */
    activityEndTime?: string;
    /** 活动的名字 */
    activityName?: string;
    /**
     * 活动开始时间
     * @format date-time
     */
    activityStartTime?: string;
    /** 活动是否开放-暂时不使用 */
    enabled?: boolean;
    /** 活动是否开始 */
    started?: boolean;
}
export interface ActivityInfo {
    /** 活动的描述 */
    activityDescription?: string;
    /**
     * 活动结束时间
     * @format date-time
     */
    activityEndTime?: string;
    /** 活动的名字 */
    activityName?: string;
    /**
     * 活动开始时间
     * @format date-time
     */
    activityStartTime?: string;
    /** 活动是否开放 */
    enabled?: boolean;
}
export interface ActivitySkinConfigSaveParam {
    /** 皮肤颜色主题（多个以分号隔开） */
    color: string;
    /**
     * 活动结束时间（UTC）
     * @format date-time
     */
    endTime: string;
    /** 缺省为保存操作，有值为编辑操作 */
    id?: string;
    /** 皮肤(多个以逗号隔开) */
    skins: string;
    /**
     * 活动开始时间（UTC）
     * @format date-time
     */
    startTime: string;
    /** 主题 */
    topic: string;
    /** 获奖用户BoxID(多个以逗号隔开) */
    usernames: string;
}
export interface ActivitySkinConfigVO {
    /** 皮肤颜色主题（多个以分号隔开） */
    color: string;
    /** 是否符合条件 */
    eligible: boolean;
    /**
     * 活动结束时间（UTC）
     * @format date-time
     */
    endTime: string;
    /** 活动id */
    id: string;
    /** 是否已领取 */
    received: boolean;
    /** 已经领取的皮肤id */
    receivedSkin?: string;
    /** 活动可领取皮肤（多个以逗号隔开） */
    skins: string;
    /**
     * 活动开始时间（UTC）
     * @format date-time
     */
    startTime: string;
    /** 活动主题 */
    topic: string;
}
export interface ActivitySkinExistedVO {
    /** 是否已拥有 */
    existed: boolean;
    /** 皮肤id */
    skinId: string;
}
export interface AddApplicationParam {
    /** 答案 */
    answer: string;
    /** description must not be empty */
    description: string;
    /** 用户名称 */
    name?: string;
    /** 申请选填手机 */
    phone?: string;
    /** 题目 */
    topic: string;
}
export interface AddBannerParam {
    /** banner链接 */
    bannerLink?: string;
    /** 移动端图片 */
    bannerMobile?: string;
    /** PC端图片 */
    bannerPc: string;
    /** 是否可用 */
    enabled: boolean;
    /**
     * id 更新时需要
     * @format int64
     */
    id?: number;
    /**
     * 有效时间开始
     * @format int64
     */
    timeFrom: number;
    /**
     * 有效时间结束
     * @format int64
     */
    timeTo: number;
    /** 标题 */
    title?: string;
    /**
     * 排序权重
     * @format int32
     */
    weight: number;
}
export interface AddCommentParam {
    /**
     * 根评论id
     * @format int64
     */
    baseCommentId: number;
    /** 评论内容 */
    comment: string;
    /**
     * 作品id
     * @format int64
     */
    contentId: number;
    /**
     * 被回复的二级评论id
     * @format int64
     */
    replyTo: number;
    /**
     * 被回复评论的用户id
     * @format int64
     */
    replyUserId: number;
}
export interface AddEngineVersionParam {
    /** 引擎版本 */
    version: string;
}
export interface AddFingerprintParam {
    /** 评论内容 */
    comment: string;
    /** 指纹 */
    fingerprint: string;
}
export interface AddIpParam {
    /** ip段起始 */
    begin: string;
    /** 封禁备注 */
    comment: string;
    /** ip段结束 */
    end?: string;
}
export interface AddSkinParam {
    /** 描述 */
    describe?: string;
    /** 昵称 */
    displayName?: string;
    /**
     * id 更新时需要
     * @format int64
     */
    id?: number;
    /** 图片地址 */
    image?: string;
    /** 名称 */
    name: string;
    /**
     * 状态
     * @format int32
     */
    status?: number;
}
export interface AdminActivitySkinConfigVO {
    /** 皮肤颜色主题（多个以分号隔开） */
    color: string;
    /**
     * 配置创建时间
     * @format date-time
     */
    createdAt: string;
    /**
     * 活动结束时间（UTC）
     * @format date-time
     */
    endTime: string;
    /** 活动id */
    id: string;
    /** 活动可领取皮肤（多个以逗号隔开） */
    skins: string;
    /**
     * 活动开始时间（UTC）
     * @format date-time
     */
    startTime: string;
    /** 活动主题 */
    topic: string;
    /**
     * 配置更新时间
     * @format date-time
     */
    updatedAt: string;
    /** 获奖用户BoxID（多个以逗号隔开） */
    usernames: string;
}
export interface AnnualReporting {
    /** 与用户合作地图最多次数的人的昵称和头像 */
    collaboratorNameAndAvatar?: BasicData;
    /** 用户发布作品中浏览量最高的作品名称和封面图 */
    contentNameAndAvatarWithHighestViews?: BasicData;
    /**
     * 用户“与我共享”中地图的数量
     * @format int32
     */
    contentSharedCount?: number;
    /** 用户创作的地图总数/模型总数/音乐总数 */
    createdContentCounts?: ContentCount[];
    /** 用户第一个粉丝的昵称和头像 */
    firstFollowerNameAndAvatar?: BasicData;
    /** 用户第一个关注的人的昵称和头像 */
    firstFollowingNameAndAvatar?: BasicData;
    /** 用户第一个发布的作品的名称和封面，以及时间 */
    firstPublishContent?: FirstPublishContentVO;
    /** 用户游玩次数最多的地图名称及地图封面截图 */
    mostPlayMapNameAndAvatar?: BasicData;
    /** 用户参与创作节获取的皮肤 */
    participateActivity2GotSkinNames?: string[];
    /**
     * 用户参与创作节的次数
     * @format int32
     */
    participateActivityCount?: number;
    /** 用户发布的地图总数/模型总数/音乐总数 */
    publishedContentCounts?: ContentCount[];
    /** 用户昵称和头像 */
    userNameAndAvatar?: BasicData;
    /**
     * 用户注册时间
     * @format int32
     */
    userRegisterDays?: number;
}
export interface ApplicationAuditParam {
    /**
     * 申请者ID
     * @format int64
     */
    applicantId?: number;
    /**
     * 操作状态： 2-通过，3-拒绝
     * @format int32
     */
    status?: number;
}
export interface AuthorInfoAndFollowCountVO {
    /** 作者头像 */
    avatar: string;
    /** 作者名称 */
    displayname: string;
    /** 用户粉丝与关注数量信息 */
    followCountInfo: StatisticsUserFollowInfo;
    /** 是否关注 */
    isFollowing: boolean;
    /**
     * tag（0-普通用户，1-官方账号）
     * @format int32
     */
    tag?: number;
    /**
     * 作者id
     * @format int64
     */
    userId: number;
}
export interface AuthorListVO {
    /** 作者头像 */
    avatar: string;
    /** 作者名称 */
    displayname: string;
    /**
     * tag（0-普通用户，1-官方账号）
     * @format int32
     */
    tag?: number;
    /**
     * 作者id
     * @format int64
     */
    userId: number;
}
export interface AvatarReviewInfoVO {
    /** 头像 */
    avatar: string;
    /**
     * 创建时间
     * @format date-time
     */
    createAt: string;
    /** 用户昵称 */
    displayname: string;
    /**
     * 审核id
     * @format int64
     */
    id: number;
    /** 理由 */
    reason: string;
    /**
     * 头像审核状态：0-待审核, 1-已拒绝, 2-被重视, 3-已通过, 4-已取消
     * @format int32
     */
    status: number;
    /**
     * 用户id
     * @format int64
     */
    userId: number;
    /** BoxID */
    username: string;
}
export interface AvatarStatusVO {
    /** 头像 */
    avatar: string;
    /** 理由 */
    reason: string;
    /**
     * 头像审核状态：0-待审核, 1-已拒绝, 2-被重视, 3-已通过, 4-已取消
     * @format int32
     */
    status: number;
    /**
     * 更新时间
     * @format date-time
     */
    updateAt: string;
}
export interface AvatarUploadStatusVO {
    /**
     * 0-不能上传, 1-可以上传
     * @format int32
     */
    canUpload?: number;
    /** 最后一次的头像Hash */
    lastHash: string;
}
export interface BannerClientVO {
    /** banner链接 */
    bannerLink?: string;
    /** 移动端图片 */
    bannerMobile?: string;
    /** PC端图片 */
    bannerPc?: string;
}
export interface BannerManageVO {
    /** banner链接 */
    bannerLink?: string;
    /** 移动端图片 */
    bannerMobile?: string;
    /** PC端图片 */
    bannerPc?: string;
    /** 创建人 */
    displayname?: string;
    /** 是否可用 */
    enabled?: boolean;
    /**
     * id
     * @format int64
     */
    id?: number;
    /** 有效时间开始 */
    timeFrom?: string;
    /** 有效时间结束 */
    timeTo?: string;
    /** 标题 */
    title?: string;
    /**
     * 排序权重
     * @format int32
     */
    weight?: number;
}
export interface BaseQuery {
    /**
     * 查询数量
     * @format int32
     */
    limit?: number;
    /**
     * 偏移量
     * @format int32
     */
    offset?: number;
}
export interface BasicData {
    /** 图像/头像 */
    avatar?: string;
    /** 名称 */
    name?: string;
}
export interface BlocklistUserInfoVO {
    /** 头像 */
    avatar: string;
    /** 个性签名 */
    description: string;
    /** 用户昵称 */
    displayname: string;
    /**
     * 用户id
     * @format int64
     */
    id: number;
}
export interface BugReportListVO {
    /** 容器名字 */
    containerName: string;
    /**
     * 内容id
     * @format int64
     */
    contentId: number;
    /**
     * 创建时间
     * @format date-time
     */
    createdAt: string;
    /** 描述 */
    description: string;
    /** 环境 */
    environment: string;
    /**
     * bug上报信息id
     * @format int64
     */
    id: number;
    /**
     * 上报人id
     * @format int64
     */
    reporterId: number;
    /** 上报人昵称 */
    reporterName: string;
    /**
     * 处理人id
     * @format int64
     */
    reviewerId: number;
    /** 截屏 */
    screenshots: string[];
    /**
     * bug状态
     * @format int32
     */
    status: number;
    /** bug主题 */
    subject: string;
    /**
     * 更新时间
     * @format date-time
     */
    updatedAt: string;
}
export interface CheckUsernameParam {
    /** 用户名称集合 */
    usernames?: string[];
}
export interface CheckUsernameResultVO {
    /** 失败的username集合 */
    fails: string[];
    /** 用户信息集合 */
    users: UserInfo[];
}
export interface CommentAndBestReplyVO {
    /** 头像hash */
    avatar: string;
    /** 最佳回复 */
    bestReply: CommentInfoVO;
    /** 评论内容 */
    comment: string;
    /**
     * 创建时间
     * @format date-time
     */
    createdAt: string;
    /** 用户昵称 */
    displayname: string;
    /**
     * 评论id
     * @format int64
     */
    id: number;
    /** 是否点赞 */
    isLike: boolean;
    /**
     * 点赞数量
     * @format int64
     */
    likeCount: number;
    /**
     * 回复数量
     * @format int64
     */
    replyCount: number;
    /**
     * 标签
     * @format int32
     */
    tag: number;
    /**
     * 用户id
     * @format int64
     */
    userId: number;
}
export interface CommentInfoVO {
    /** 头像hash */
    avatar: string;
    /**
     * 根评论id
     * @format int64
     */
    baseCommentId: number;
    /** 评论内容 */
    comment: string;
    /**
     * 创建时间
     * @format date-time
     */
    createdAt: string;
    /** 用户昵称 */
    displayname: string;
    /**
     * 评论id
     * @format int64
     */
    id: number;
    /** 是否点赞 */
    isLike: boolean;
    /**
     * 点赞数量
     * @format int64
     */
    likeCount: number;
    /**
     * 回复数量
     * @format int64
     */
    replyCount: number;
    /** 回复评论的用户昵称 */
    replyDisplayname?: string;
    /**
     * 被回复的二级评论id
     * @format int64
     */
    replyTo: number;
    /**
     * 被回复评论的用户id
     * @format int64
     */
    replyUserId: number;
    /**
     * 标签
     * @format int32
     */
    tag: number;
    /**
     * 用户id
     * @format int64
     */
    userId: number;
}
export interface ContentAddParam {
    /**
     * 内容类型(2-模型，3-音乐)
     * @format int32
     */
    contentType: number;
    /** 内容描述 */
    describe?: string;
    /** 引擎版本 */
    engineVersion?: string;
    /** 封面图 */
    image: string;
    /** 内容名称 */
    name: string;
    /** 数据 */
    projectData: string;
}
export interface ContentAddVO {
    /**
     * 内容id
     * @format int64
     */
    contentId: number;
    /**
     * 版本号id
     * @format int64
     */
    versionId: number;
}
export interface ContentChooseParam {
    /**
     * 当chooseType 为 2-首页推荐 时, 使用子类型: 0-综合, 1-游戏, 2-模型, 3-音乐
     * @format int32
     */
    chooseSubType?: number;
    /**
     * 选择类型(0-精选, 1-潜力新作(禁止使用),2-首页推荐专用)
     * @format int32
     */
    chooseType: number;
    /**
     * 当chooseType 为 0-精选 时, 使用内容类型：1-游戏, 2-模型, 3-音乐
     * @format int32
     */
    contentType?: number;
    /** 作品的id集合 */
    contents?: number[];
}
export interface ContentCopyParam {
    /**
     * 复制的目标内容id
     * @format int64
     */
    contentId: number;
    /** 内容描述 */
    describe?: string;
    /** 引擎版本 */
    engineVersion?: string;
    /** 内容hash */
    hash: string;
    /** 封面图 */
    image: string;
    /** 内容名称 */
    name: string;
    /**
     * 内容类型(1-游戏,2-模型,3-音乐)
     * @format int32
     */
    type: number;
    /** url */
    url?: string;
}
export interface ContentCount {
    /**
     * 数量
     * @format int32
     */
    count?: number;
    /**
     * 作品类型, 1 游戏, 2 资源, 3 音乐
     * @format int32
     */
    type?: number;
}
export interface ContentGameUpdateParam {
    /**
     * 内容id
     * @format int64
     */
    contentId: number;
    /** 内容描述 */
    describe?: string;
    /** 引擎版本 */
    engineVersion?: string;
    /** hash */
    hash: string;
    /** 封面图 */
    image: string;
    /** 内容名称 */
    name: string;
}
export interface ContentPrivateExtra {
    /** edit容器名 */
    editContainerName: string;
    /**
     * 发布版本
     * @format int32
     */
    onPublishVersion: number;
    /** play容器名 */
    playContainerName: string;
    /**
     * 发布版本id
     * @format int64
     */
    publishedVersionId: number;
    /** 审核信息 */
    reviewInfo?: ProjectReviewInfo;
    /**
     * 内容状态(1-unpublished,2-underReview,3-published,4-rejected,5-censored,6-removed)
     * @format int32
     */
    status: number;
    /**
     * 状态对应的版本
     * @format int32
     */
    statusVersion: number;
    /**
     * 内容类型(1-game,2-asset,3-music)
     * @format int32
     */
    type: number;
}
export interface ContentPublicListExtra {
    /**
     * 被评论次数
     * @format int64
     */
    commentCount: number;
    /**
     * 可评论状态(0-normal, 1-ownerDisabled)
     * @format int32
     */
    commentStatus: number;
    /** edit容器名（已去除，永为空） */
    editContainerName: string;
    /** play容器名 */
    playContainerName: string;
}
export interface ContentPublishParam {
    /** 音频hash */
    audioHash?: string;
    /** banner */
    banner?: string[];
    /**
     * 内容id
     * @format int64
     */
    contentId: number;
    /** 内容描述 */
    describe?: string;
    /**
     * 音频时长(ms)
     * @format int32
     */
    duration?: number;
    /** 内容hash */
    hash?: string;
    /** 封面图 */
    image?: string;
    /** 内容名称 */
    name?: string;
    /** 公告 */
    notice?: string;
    /** 自定义短链 */
    shortname?: string;
}
export interface ContentStatusHistoryVO {
    /**
     * 审核人id
     * @format int64
     */
    auditorId: number;
    /**
     * 内容id
     * @format int64
     */
    contentId: number;
    /**
     * 创建时间
     * @format date-time
     */
    createdAt: string;
    /**
     * id
     * @format int64
     */
    id: number;
    /** 审核信息 */
    reviewInfo: ProjectReviewInfo;
    /**
     * 审核状态(1-未发布，2-审核中，3-已发布，4-已拒绝，5-已审核，6-已删除)
     * @format int32
     */
    status: number;
    /**
     * 更新时间
     * @format date-time
     */
    updatedAt: string;
    /**
     * 版本号
     * @format int32
     */
    version: number;
    /**
     * 版本号id
     * @format int32
     */
    versionId: number;
}
export interface ContentUpdateParam {
    /**
     * 内容id
     * @format int64
     */
    contentId: number;
    /**
     * 内容类型(2-模型，3-音乐)
     * @format int32
     */
    contentType: number;
    /** 内容描述 */
    describe?: string;
    /** 引擎版本 */
    engineVersion?: string;
    /** 封面图 */
    image: string;
    /** 内容名称 */
    name: string;
    /** 数据 */
    projectData: string;
}
export interface Contribution {
    /** 不同类型贡献细节 */
    contributionInfos?: ContributionInfo[];
    /** 日子 */
    date?: string;
    /**
     * 贡献总数
     * @format int32
     */
    totalTimes?: number;
}
export interface ContributionInfo {
    /**
     * 贡献等级： 0， 1, 4, 6 对应等级： 无贡献，初， 中，高
     * @format int32
     */
    level?: number;
    /**
     * 当前类型的贡献次数
     * @format int32
     */
    times?: number;
    /**
     * 贡献类型： 0-创作， 1-学习
     * @format int32
     */
    type?: number;
}
export interface ContributionParam {
    /**
     * 具体的贡献行为
     * @format int64
     */
    action?: number;
    /**
     * 作品 id, 当贡献行为为发布作品的时候, 不为空
     * @format int64
     */
    contentId?: number;
    /**
     * 用户id
     * @format int64
     */
    userId?: number;
}
export interface CreatInvitationCodeParam {
    /**
     * 过期时间 单位h, 不传表示永不过期
     * @format int32
     */
    expireAt?: number;
    /**
     * 生成数量
     * @format int32
     */
    repeat: number;
}
export interface CreateInvatitionCodeVO {
    /** 邀请码列表 */
    codes?: string[];
}
export interface DeleteBySearchParam {
    /** 描述 */
    description: string;
    /** 关键词 */
    keyword: string;
    /** 标识 */
    preview: boolean;
    /**
     * 评论删除的原因
     * @format int32
     */
    reason: number;
}
export interface DeleteBySearchResult {
    displayname?: string;
    /** @format int64 */
    id?: number;
    /** @format int32 */
    total?: number;
    username?: string;
}
export interface DeleteBySearchVO {
    badUsers?: DeleteBySearchResult[];
    /** @format int32 */
    count?: number;
}
export interface DeleteCommentParam {
    /**
     * 评论id
     * @format int64
     */
    commentId: number;
    /** 描述 */
    description: string;
    /**
     * 删除原因
     * @format int32
     */
    reason: number;
    /** 截屏 */
    screenshot: string[];
}
export interface DeletedListVO {
    /** 评论内容 */
    comment: string;
    /**
     * 作品id
     * @format int64
     */
    contentId: number;
    /**
     * 创建时间
     * @format date-time
     */
    createdAt: string;
    /** 描述 */
    description: string;
    /**
     * 主键id
     * @format int64
     */
    id: number;
    /**
     * 作品名称
     * @format int64
     */
    name: number;
    /** 操作人昵称 */
    operatorDisplayname: string;
    /**
     * 操作人id
     * @format int64
     */
    operatorId: number;
    /** 操作人账号 */
    operatorUsername: string;
    /** 删除原因 */
    reason: string;
    /** 截屏 */
    screenshot: string[];
    /** 用户昵称 */
    targetDisplayname: string;
    /**
     * 用户id
     * @format int64
     */
    userId: number;
}
export interface EventDetailVO {
    content?: string;
    creator?: string;
    creatorName?: string;
    deleted?: boolean;
    /** @format int64 */
    id?: number;
    /** @format int32 */
    receiverType?: number;
    receivers?: ReceiverVO[];
    /** @format date-time */
    sendAt?: string;
    /** @format int64 */
    sender?: number;
    senderName?: string;
    sent?: boolean;
    title?: string;
}
export interface EventManageVO {
    /** @format float */
    clickRatio?: number;
    /** @format int64 */
    clickedTotal?: number;
    /** @format int64 */
    creator?: number;
    creatorName?: string;
    deleted?: boolean;
    /** @format int64 */
    id?: number;
    /** @format int64 */
    readTotal?: number;
    /** @format int64 */
    receiverTotal?: number;
    /** @format int32 */
    receiverType?: number;
    /** @format date-time */
    sendAt?: string;
    /** @format int64 */
    sender?: number;
    senderName?: string;
    sent?: boolean;
    title?: string;
}
export interface EventStatusVO {
    /**
     * 皮肤状态(0-none,1-codeWriter,2-modeler,3-architect,4-audioMaker)
     * @format int32
     */
    chosenStatus: number;
    /**
     * 创建时间
     * @format date-time
     */
    createdAt: string;
    /** 昵称 */
    displayname: string;
    /**
     * 第几位岛名
     * @format int64
     */
    number: number;
}
export interface FirstPublishContentVO {
    /** 作品图像 */
    contentImage?: string;
    /** 作品名字 */
    contentName?: string;
    /**
     * 作品发布时间
     * @format date-time
     */
    publishedDate?: string;
}
export interface FollowParam {
    /**
     * 被关注用户id
     * @format int64
     */
    id: number;
    /** true-关注,false-取消关注 */
    isFollow: boolean;
}
export interface ForceResetIllegalParam {
    /** 期望的用户id集合 */
    exceptIds?: number[];
    /**
     * 用户id
     * @format int64
     */
    id?: number;
    /** 关键字 */
    keyword?: string;
    /** 是否预览 */
    preview?: boolean;
    /**
     * 非法参数类型：0-昵称,1-个人签名
     * @format int32
     */
    type?: number;
}
export interface ForceRestIllegalResultVO {
    /**
     * 数量
     * @format int64
     */
    count: number;
    /** 用户昵称 */
    displayname: string;
    /**
     * 用户id
     * @format int64
     */
    id: number;
    /** 账号 */
    username: string;
}
export interface GetContentVO {
    /** 音频hash */
    audioHash: string;
    /** 作者信息 */
    author: AuthorInfoAndFollowCountVO;
    /** 封面 */
    banner: string[];
    /** 合作者信息 */
    collaborator: UserBaseAndFollowStatus[];
    /**
     * 被评论次数
     * @format int64
     */
    commentCount: number;
    /**
     * 可评论状态(0-normal, 1-ownerDisabled)
     * @format int32
     */
    commentStatus: number;
    /**
     * 内容id
     * @format int64
     */
    contentId: number;
    /**
     * 创建时间
     * @format date-time
     */
    createdAt: string;
    /** 描述 */
    describe: string;
    /**
     * 持续时长
     * @format int32
     */
    duration: number;
    /** edit容器名 */
    editContainerName: string;
    /** 是否全局不可用 */
    globalDisabled: boolean;
    /** hash */
    hash: string;
    /** 图片 */
    image: string;
    /** 是否收藏 */
    isCollected: boolean;
    /** meshHash【主态时存在】 */
    meshHash: string;
    /** 名称 */
    name: string;
    /** 公告 */
    notice: string;
    /**
     * 发布版本
     * @format int32
     */
    onPublishVersion: number;
    /** play容器名 */
    playContainerName: string;
    /**
     * 被执行次数
     * @format int64
     */
    playCount: number;
    /**
     * 发布时间
     * @format date-time
     */
    publishedAt: string;
    /**
     * 发布版本id
     * @format int64
     */
    publishedVersionId: number;
    /** 审核信息【主态时存在】 */
    reviewInfo?: ProjectReviewInfo;
    /**
     * 内容状态【主态时存在】(1-unpublished,2-underReview,3-published,4-rejected,5-censored,6-removed)
     * @format int32
     */
    status?: number;
    /**
     * statusVersion【主态时存在】
     * @format int32
     */
    statusVersion?: number;
    /**
     * 内容类型(1-game,2-asset,3-music)
     * @format int32
     */
    type: number;
    /** url */
    url: string;
    /**
     * 版本号
     * @format int64
     */
    version: number;
    /**
     * 版本id
     * @format int64
     */
    versionId: number;
    /**
     * 被浏览次数
     * @format int64
     */
    viewCount: number;
}
export interface GiveActivitySkinParam {
    /** 活动名字 */
    activityName?: string;
    /** 皮肤名字 */
    skinName?: string;
}
export interface GiveSkinParam {
    /** 皮肤名称 */
    skinName?: string;
    /**
     * 用户ID
     * @format int64
     */
    userId?: number;
}
export interface HelpListVO {
    /** 联系方式 */
    contact: string;
    /**
     * 创建时间
     * @format date-time
     */
    createdAt: string;
    /** 内容描述 */
    detail: string;
    /**
     * 求助id
     * @format int64
     */
    id: number;
    /** 用户昵称 */
    name: string;
    /**
     * 处理人id
     * @format int64
     */
    processorId: number;
    /** 问题主题 */
    title: string;
    /** 用户代理 */
    userAgent: string;
}
export interface IdcardParam {
    /** 身份证号码 */
    idcard?: string;
    /** 姓名 */
    name?: string;
}
export interface InvitationApplicationVO {
    /** 创建时间 */
    createdAt?: Timestamp;
    /**
     * 状态： 1-等待审核，2-通过，3-拒绝
     * @format int32
     */
    status?: number;
    /** 更新时间 */
    updatedAt?: Timestamp;
}
export interface InvitationInfoVO {
    /** 过期时间 */
    expireAt?: Timestamp;
    /**
     * 邀请码状态；1-待使用，2-过期，3-已使用，4-不存在
     * @format int32
     */
    status?: number;
    /** userName */
    userName?: string;
}
export interface InvitationResult {
    /**
     * 通过分享产生的新用户的数量
     * @format int32
     */
    invite2ProduceNewUserCount?: number;
    /**
     * 分享成功的数量
     * @format int32
     */
    inviteSuccessCount?: number;
}
export interface InvititionApplicationListVO {
    /** 答案 */
    answer?: string;
    /** 用户注册时间 */
    applicantCreatedAt?: string;
    /**
     * 申请人ID
     * @format int32
     */
    applicantId?: number;
    /** 用户昵称 */
    applicantName?: string;
    /**
     * 申请人发布作品数
     * @format int32
     */
    applicantPublishedContentsCount?: number;
    /** 申请提交时间 */
    createdAt?: string;
    /** 申请理由 */
    description?: string;
    /**
     * id
     * @format int32
     */
    id?: number;
    /** 用户昵称 ？ 应当使用applicantName */
    name?: string;
    /**
     * 审核员ID
     * @format int32
     */
    operatorId?: number;
    /** 审核员昵称 */
    operatorName?: string;
    /** 用户申请时填的手机号 */
    phone?: object;
    /**
     * 状态 1-等待，2-通过，3-拒绝
     * @format int32
     */
    status?: number;
    /** 题目 */
    topic?: string;
    /**
     * 申请类型 默认1-创作者权限
     * @format int32
     */
    type?: number;
    /** 申请更新时间 */
    updatedAt?: string;
}
export interface LastPunishVO {
    /** @format int64 */
    ban?: number;
    /** @format int32 */
    banEditor?: number;
    comment?: string;
    /** @format date-time */
    createdAt?: string;
    deleteComment?: boolean;
    /** @format int64 */
    mute?: number;
    operatorDisplayName?: string;
    /** @format int64 */
    reputation?: number;
}
export interface LikeCommentParam {
    /**
     * 评论id
     * @format int64
     */
    commentId: number;
    /** 是否点赞 */
    isLike: boolean;
}
export interface ListContentVO {
    /** 音频hash */
    audioHash: string;
    /** 作者信息 */
    author?: AuthorListVO;
    /**
     * 内容id
     * @format int64
     */
    contentId: number;
    /**
     * 创建时间
     * @format date-time
     */
    createdAt: string;
    /** 描述 */
    describe: string;
    /**
     * 持续时长
     * @format int32
     */
    duration: number;
    /** hash */
    hash: string;
    /** 图片 */
    image: string;
    /** 名称 */
    name: string;
    /**
     * 被执行次数
     * @format int64
     */
    playCount: number;
    /** 查询个人内容时的额外信息 */
    privateInfo?: ContentPrivateExtra;
    /** 查询公共内容时的额外信息 */
    publicInfo?: ContentPublicListExtra;
    /** url */
    url: string;
    /**
     * 版本号
     * @format int64
     */
    version: number;
    /**
     * 版本id
     * @format int64
     */
    versionId: number;
    /**
     * 被浏览次数
     * @format int64
     */
    viewCount: number;
}
export interface ListHomepageResult {
    /** 作者头像 */
    authorAvatar: string;
    /**
     * 作者id
     * @format int64
     */
    authorId: number;
    /** 作者 */
    authorName: string;
    /**
     * 评论数
     * @format int32
     */
    commentCount: number;
    /**
     * 作品id
     * @format int64
     */
    contentId: number;
    /** 作品图片 */
    image: string;
    /** 作品名字 */
    name: string;
    /** 运行容器名称 */
    playContainerName: string;
    /**
     * 评论数
     * @format int32
     */
    playCount: number;
    /**
     * 类型: 1-游戏，2-模型， 3-音乐
     * @format int32
     */
    type: number;
    /**
     * 浏览数
     * @format int32
     */
    viewCount: number;
}
export interface ListRecommendResult {
    /** 语音hash */
    audioHash: string;
    /** 作者hash */
    authorAvatar: string;
    /**
     * 作者id
     * @format int32
     */
    authorId: number;
    /** 作者名字 */
    authorName: string;
    /** 容器名字 */
    containerName: string;
    /**
     * 作品id
     * @format int64
     */
    contentId: number;
    /**
     * 期限
     * @format int32
     */
    duration: number;
    /** 作品hash */
    hash: string;
    /** 作品图片 */
    image: string;
    /** 作品名字 */
    name: string;
    /**
     * 版本
     * @format int64
     */
    version: number;
    /**
     * 版本id
     * @format int64
     */
    versionId: number;
    /**
     * 浏览数
     * @format int32
     */
    viewCount: number;
}
export interface NotifyParam {
    content?: string;
    id?: string;
    receivers?: Receivers;
    /** @format date-time */
    sendAt?: string;
    /** @format int64 */
    sender?: number;
    title?: string;
}
export interface OauthRedirectVO {
    /** 重定向地址  前端自己选择如何打开 */
    url?: string;
}
export interface PermissionUpdateParam {
    /**
     * 需要添加的权限
     * @format int32
     */
    permission: number;
    /**
     * 需要添加权限的用户Id
     * @format int64
     */
    userId: number;
}
export interface ProjectReviewInfo {
    /** 具体细节 */
    details: string;
    /** 理由 */
    reason: string[];
    /** 标题 */
    title: string;
}
export interface ReceiverVO {
    displayName?: string;
    /** @format int64 */
    id?: number;
    username?: string;
}
export interface Receivers {
    data?: number[];
    type?: string;
}
export interface ReportVO {
    authorDisplayName?: string;
    /** @format int64 */
    authorId?: number;
    /** @format int32 */
    ban?: number;
    comment?: string;
    containerName?: string;
    /** @format int64 */
    contentId?: number;
    contentName?: string;
    /** @format int32 */
    contentType?: number;
    /** @format date-time */
    createdAt?: string;
    deleteComment?: boolean;
    description?: string;
    displayName?: string;
    /** @format int64 */
    id?: number;
    /** @format int32 */
    mute?: number;
    /** @format date-time */
    operateTime?: string;
    /** @format int64 */
    operatorId?: number;
    operatorName?: string;
    /** @format int32 */
    reason?: number;
    relatedLog?: string;
    /** @format int64 */
    reputation?: number;
    screenshot?: string[];
    /** @format int32 */
    status?: number;
    /** @format int64 */
    targetId?: number;
    targetName?: string;
    /** @format int64 */
    targetRep?: number;
    /** @format int32 */
    total?: number;
    /** @format int32 */
    type?: number;
    /** @format int64 */
    userId?: number;
    /** @format int64 */
    userRep?: number;
    /** @format int32 */
    weight?: number;
}
export interface RequestHelpParam {
    /** 联系方式 */
    contact: string;
    /** 内容描述 */
    detail: string;
    /** 用户昵称 */
    name: string;
    /** 问题主题 */
    title: string;
}
export interface ResourceGroupVO {
    /** @format date-time */
    createdAt?: string;
    /** @format int32 */
    id?: number;
    limitsCpu?: string;
    limitsMemory?: string;
    name?: string;
    requestsCpu?: string;
    requestsMemory?: string;
    /** @format date-time */
    updatedAt?: string;
}
export interface ReviewAvatarParam {
    /**
     * 头像审核id
     * @format int64
     */
    id: number;
    /** 备注理由 */
    reason?: string;
    /**
     * 头像审核状态：0-待审核, 1-拒绝, 2-重视, 3-通过, 4-取消
     * @format int32
     */
    status: number;
}
export interface SaveUserParam {
    /** 昵称 */
    displayname: string;
    /** 是否禁用 */
    isBnUser?: boolean;
    /** 密码 */
    password: string;
    /** BoxID */
    username: string;
}
export interface SearchCommentInfoVO {
    /** 评论内容 */
    comment: string;
    /**
     * 作品id
     * @format int64
     */
    contentId: number;
    /** 作品名称 */
    contentName: string;
    /**
     * 作品类型
     * @format int64
     */
    contentType: number;
    /** 创建时间 */
    createdAt: Timestamp;
    /**
     * 用户id
     * @format int64
     */
    id: number;
}
export interface SearchUserResultVO {
    avatar?: string;
    banEditor?: boolean;
    /** @format date-time */
    bannedTill?: string;
    displayName?: string;
    lastPunishVO?: LastPunishVO;
    /** @format date-time */
    mutedTill?: string;
    /** @format int64 */
    reputation?: number;
    /** @format int64 */
    targetId?: number;
}
export interface SetUserTagParam {
    /**
     * 用户id
     * @format int64
     */
    id?: number;
    /**
     * 标签
     * @format int32
     */
    tag?: number;
}
export interface ShareActivityRecordParam {
    /** 活动名字 */
    activityName?: string;
    /** 设备id */
    deviceId?: string;
    /**
     * 用户id-分享人的id
     * @format int64
     */
    userId?: number;
}
export interface SimpleUserInfoAndFollowingVO {
    /** 头像 */
    avatar: string;
    /** 头像hash */
    avatarHash: string;
    /**
     * 头像状态(0-waiting, 1-rejected, 2-noticed, 3-accepted, 4-cancelled)
     * @format int32
     */
    avatarStatus?: number;
    /**
     * 生日
     * @format date-time
     */
    birthday: string;
    /**
     * 编程猫用户id, 缺省值：0
     * @format int64
     */
    cmid: number;
    /** 个性签名 */
    description: string;
    /** 用户昵称 */
    displayname: string;
    /** 是否为首次登陆 */
    firstLogin: boolean;
    /**
     * 用户标记
     * @format int32
     */
    flags: number;
    /**
     * 性别：0-male,1-female,2-unknow
     * @format int32
     */
    gender: number;
    /**
     * 用户id
     * @format int64
     */
    id: number;
    /** 是否关注 */
    isFollowing: boolean;
    /**
     * 用户权限
     * @format int32
     */
    permission: number;
    /**
     * 荣誉值
     * @format int64
     */
    reputation: number;
    /**
     * 账号状态：0-normal，1-limited，2-warning，3-banned
     * @format int32
     */
    status: number;
    /**
     * 标签
     * @format int32
     */
    tag: number;
    /** 账号 */
    username: string;
}
export interface SimpleUserInfoAndStatisticsVO {
    /** 用户粉丝与关注数量信息 */
    followCountInfo: StatisticsUserFollowInfo;
    /** 用户基本信息(包含是否关注) */
    userInfo: SimpleUserInfoAndFollowingVO;
    /** 用户发布地图/模型/音乐等数量计数 */
    userPublishedCountInfo: StatisticsUserPublishedContent;
}
export interface SimpleUserInfoVO {
    /** 头像 */
    avatar: string;
    /** 头像hash */
    avatarHash: string;
    /**
     * 头像状态(0-waiting, 1-rejected, 2-noticed, 3-accepted, 4-cancelled)
     * @format int32
     */
    avatarStatus?: number;
    /**
     * 生日
     * @format date-time
     */
    birthday: string;
    /**
     * 编程猫用户id, 缺省值：0
     * @format int64
     */
    cmid: number;
    /** 个性签名 */
    description: string;
    /** 用户昵称 */
    displayname: string;
    /** 是否为首次登陆 */
    firstLogin: boolean;
    /**
     * 用户标记
     * @format int32
     */
    flags: number;
    /**
     * 性别：0-male,1-female,2-unknow
     * @format int32
     */
    gender: number;
    /**
     * 用户id
     * @format int64
     */
    id: number;
    /**
     * 用户权限
     * @format int32
     */
    permission: number;
    /**
     * 荣誉值
     * @format int64
     */
    reputation: number;
    /**
     * 账号状态：0-normal，1-limited，2-warning，3-banned
     * @format int32
     */
    status: number;
    /**
     * 标签
     * @format int32
     */
    tag: number;
    /** 账号 */
    username: string;
    /** 用户皮肤 */
    wearingSkins: WearingSkins;
}
export interface WearingSkins {
    head?: string;
    hips?: string;
    leftFoot?: string;
    leftHand?: string;
    leftLowerArm?: string;
    leftLowerLeg?: string;
    leftShoulder?: string;
    leftUpperArm?: string;
    leftUpperLeg?: string;
    neck?: string;
    rightFoot?: string;
    rightHand?: string;
    rightLowerArm?: string;
    rightLowerLeg?: string;
    rightShoulder?: string;
    rightUpperArm?: string;
    rightUpperLeg?: string;
    torso?: string;
}
export interface SkinVO {
    /**
     * 作者id
     * @format int64
     */
    authorId?: number;
    /** 创建时间 */
    createdAt?: Timestamp;
    /** 描述 */
    describe?: string;
    /** 显示名称 */
    displayname?: string;
    /** @format int64 */
    id?: number;
    /** 图片 */
    image?: string;
    /** 皮肤名称 */
    name?: string;
    /**
     * 价格
     * @format int64
     */
    price?: number;
    /**
     * 状态 0-not4sale 非售 1-onsale 在售
     * @format int32
     */
    status?: number;
    /** 更新时间 */
    updatedAt?: Timestamp;
}
export interface StatisticsUserFollowInfo {
    /**
     * 粉丝数
     * @format int32
     */
    followerCount: number;
    /**
     * 关注数
     * @format int32
     */
    followingCount: number;
    /**
     * 用户id
     * @format int64
     */
    userId: number;
}
export interface StatisticsUserPublishedContent {
    /**
     * 发布地图数
     * @format int32
     */
    publishedMapCount: number;
    /**
     * 发布模型数
     * @format int32
     */
    publishedModelCount: number;
    /**
     * 发布音乐数
     * @format int32
     */
    publishedMusicCount: number;
    /**
     * 用户id
     * @format int64
     */
    userId: number;
}
export interface SubmitBugReportParam {
    /**
     * 内容id
     * @format int64
     */
    contentId: number;
    /** 描述 */
    description: string;
    /** 环境 */
    environment: string;
    /** 截屏 */
    screenshots: string[];
    /** bug主题 */
    subject: string;
}
export interface TaskReceivedStatus {
    /** 当前任务对应的皮肤是否被领取 */
    received?: boolean;
    /** 当前任务对应的皮肤 */
    skinName?: string;
    /**
     * 任务号
     * @format int32
     */
    task?: number;
}
export interface Timestamp {
    /** @format int32 */
    date?: number;
    /** @format int32 */
    day?: number;
    /** @format int32 */
    hours?: number;
    /** @format int32 */
    minutes?: number;
    /** @format int32 */
    month?: number;
    /** @format int32 */
    nanos?: number;
    /** @format int32 */
    seconds?: number;
    /** @format int64 */
    time?: number;
    /** @format int32 */
    timezoneOffset?: number;
    /** @format int32 */
    year?: number;
}
export interface UnReadVO {
    /** @format int64 */
    unreadEvents?: number;
    /** @format int64 */
    unreadPrepared?: number;
}
export interface UpdateStatusParam {
    /**
     * 作品id
     * @format int64
     */
    contentId: number;
    /**
     * 作品状态
     * @format int32
     */
    status: number;
}
export interface UserBaseAndFollowStatus {
    /** 头像 */
    avatar: string;
    /** 名称 */
    displayname: string;
    /** 是否关注 */
    isFollowing: boolean;
    /**
     * 标记（0-普通用户，1-官方账号）
     * @format int32
     */
    tag?: number;
    /**
     * 用户id
     * @format int64
     */
    userId: number;
}
export interface UserBrowseHistoryVO {
    /** 作者头像 */
    authorAvatar: string;
    /**
     * 作者id
     * @format int64
     */
    authorId: number;
    /** 作者名称 */
    authorName: string;
    /**
     * 评论次数
     * @format int64
     */
    commentCount: number;
    /**
     * 内容id
     * @format int64
     */
    contentId: number;
    /** 内容封面图 */
    image: string;
    /** 内容名称 */
    name: string;
    /**
     * 被执行次数
     * @format int64
     */
    playCount: number;
}
export type UserInfo = object;
export interface UserInfoAndFollowingVO {
    /**
     * oauth授权类型
     * @format int32
     */
    authInfo: number;
    /** 头像 */
    avatar: string;
    /** 头像hash */
    avatarHash: string;
    /**
     * 头像状态(0-waiting, 1-rejected, 2-noticed, 3-accepted, 4-cancelled)
     * @format int32
     */
    avatarStatus?: number;
    /** 是否禁止编辑 */
    banEditor: boolean;
    /**
     * 账号封禁终止时间
     * @format date-time
     */
    bannedTill: string;
    /**
     * 生日
     * @format date-time
     */
    birthday: string;
    /** 黑名单列表 */
    blocklist?: number[];
    /**
     * 编程猫用户id
     * @format int64
     */
    cmid?: number;
    /**
     * 创建时间
     * @format date-time
     */
    createdAt: string;
    /** 个性签名 */
    description?: string;
    /** 用户昵称 */
    displayname: string;
    /** Email */
    email?: string;
    /** 是否为首次登陆 */
    firstLogin: boolean;
    /**
     * 用户标记
     * @format int32
     */
    flags: number;
    /**
     * 性别：0-male,1-female,2-unknow
     * @format int32
     */
    gender: number;
    /**
     * 金币数量
     * @format int64
     */
    gold: number;
    /**
     * 用户id
     * @format int64
     */
    id: number;
    /** 是否关注 */
    isFollowing: boolean;
    /** 语言 */
    language?: string;
    /**
     * 禁言终止时间
     * @format date-time
     */
    mutedTill: string;
    /**
     * 用户权限
     * @format int32
     */
    permission: number;
    /** 手机号 */
    phone: string;
    /**
     * 荣誉值
     * @format int64
     */
    reputation: number;
    /**
     * 账号状态：0-normal，1-limited，2-warning，3-banned
     * @format int32
     */
    status: number;
    /**
     * 标签
     * @format int32
     */
    tag: number;
    /**
     * 更新时间时间
     * @format date-time
     */
    updatedAt: string;
    /** 账号 */
    username: string;
    /** 用户皮肤 */
    wearingSkins: WearingSkins;
}
export interface UserInvitationCodeParam {
    /** 邀请码 */
    code?: string;
}
export interface UserLanguageVO {
    /**
     * 用户id
     * @format int64
     */
    id: number;
    /** 语言配置(zh_CN:中文, en_US:英文) */
    language: string;
}
export interface UserPunishVO {
    /** @format int64 */
    ban?: number;
    /** @format int32 */
    banEditor?: number;
    comment?: string;
    deleteComment?: boolean;
    displayName?: string;
    /** @format int64 */
    id?: number;
    /** @format int64 */
    mute?: number;
    /** @format date-time */
    operateTime?: string;
    /** @format int64 */
    operatorId?: number;
    operatorName?: string;
    /** @format int64 */
    reputation?: number;
    /** @format int64 */
    userId?: number;
}
export interface ValidSender {
    avatar?: string;
    displayName?: string;
    /** @format int64 */
    id?: number;
    userName?: string;
}
export interface PageResponseAvatarReviewInfoVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: AvatarReviewInfoVO[];
}
export interface PageResponseBannerClientVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: BannerClientVO[];
}
export interface PageResponseBannerManageVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: BannerManageVO[];
}
export interface PageResponseBugReportListVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: BugReportListVO[];
}
export interface PageResponseCommentAndBestReplyVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: CommentAndBestReplyVO[];
}
export interface PageResponseCommentInfoVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: CommentInfoVO[];
}
export interface PageResponseContentStatusHistoryVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: ContentStatusHistoryVO[];
}
export interface PageResponseDeletedListVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: DeletedListVO[];
}
export interface PageResponseEventManageVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: EventManageVO[];
}
export interface PageResponseHelpListVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: HelpListVO[];
}
export interface PageResponseInvititionApplicationListVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: InvititionApplicationListVO[];
}
export interface PageResponseListContentVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: ListContentVO[];
}
export interface PageResponseListHomepageResult {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: ListHomepageResult[];
}
export interface PageResponseListRecommendResult {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: ListRecommendResult[];
}
export interface PageResponseReportVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: ReportVO[];
}
export interface PageResponseSimpleUserInfoAndFollowingVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: SimpleUserInfoAndFollowingVO[];
}
export interface PageResponseSimpleUserInfoVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: SimpleUserInfoVO[];
}
export interface PageResponseSkinVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: SkinVO[];
}
export interface PageResponseUserBrowseHistoryVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: UserBrowseHistoryVO[];
}
export interface PageResponseUserInfoAndFollowingVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: UserInfoAndFollowingVO[];
}
export interface PageResponseUserPunishVO {
    /**
     * 总数
     * @format int64
     */
    count?: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows?: UserPunishVO[];
}
export interface SingleValueVOLocalDateTime {
    /**
     * 值
     * @format date-time
     */
    value: string;
}
export interface SingleValueVOBoolean {
    /** 值 */
    value: boolean;
}
export interface SingleValueVOInt {
    /**
     * 值
     * @format int32
     */
    value: number;
}
export interface SingleValueVOLong {
    /**
     * 值
     * @format int64
     */
    value: number;
}
export interface SingleValueVOString {
    /** 值 */
    value: string;
}
export interface ResActivityDetail {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ActivityDetail;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResActivitySkinConfigVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ActivitySkinConfigVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResAdminActivitySkinConfigVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: AdminActivitySkinConfigVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResAnnualReporting {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: AnnualReporting;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResCheckUsernameResultVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: CheckUsernameResultVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResCommentInfoVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: CommentInfoVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResContentAddVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ContentAddVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResCreateInvatitionCodeVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: CreateInvatitionCodeVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResDeleteBySearchVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: DeleteBySearchVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResEventDetailVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: EventDetailVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResForceRestIllegalResultVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ForceRestIllegalResultVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResGetContentVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: GetContentVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResInvitationApplicationVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: InvitationApplicationVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResInvitationInfoVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: InvitationInfoVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResInvitationResult {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: InvitationResult;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResLastPunishVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: LastPunishVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResListActivitySkinExistedVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ActivitySkinExistedVO[];
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResListContribution {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: Contribution[];
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResListResourceGroupVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ResourceGroupVO[];
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResListSearchCommentInfoVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: SearchCommentInfoVO[];
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResListTaskReceivedStatus {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: TaskReceivedStatus[];
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResListValidSender {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ValidSender[];
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseAvatarReviewInfoVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseAvatarReviewInfoVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseBannerClientVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseBannerClientVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseBannerManageVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseBannerManageVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseBugReportListVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseBugReportListVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseCommentAndBestReplyVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseCommentAndBestReplyVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseCommentInfoVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseCommentInfoVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseContentStatusHistoryVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseContentStatusHistoryVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseDeletedListVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseDeletedListVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseEventManageVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseEventManageVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseHelpListVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseHelpListVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseInvititionApplicationListVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseInvititionApplicationListVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseListContentVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseListContentVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseListHomepageResult {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseListHomepageResult;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseListRecommendResult {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseListRecommendResult;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseReportVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseReportVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseSkinVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseSkinVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseUserInfoAndFollowingVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseUserInfoAndFollowingVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageResponseUserPunishVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseUserPunishVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResResourceGroupVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ResourceGroupVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResSearchUserResultVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: SearchUserResultVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResSimpleUserInfoVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: SimpleUserInfoVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResSingleValueVOLocalDateTime {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: SingleValueVOLocalDateTime;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResSingleValueVOInt {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: SingleValueVOInt;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResSingleValueVOLong {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: SingleValueVOLong;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResSkinVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: SkinVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResUnReadVO {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: UnReadVO;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResBoolean {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: boolean;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResObject {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: object;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResString {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: string;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResNumber {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: number;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export declare enum ModelMigrationState {
    Init = 0,
    Migrating = 1,
    Success = 2,
    Fails = 3
}
export interface ResModelMigration {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ModelMigrationState;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export declare enum ModelType {
    /**
     * 私有模型/私有皮肤
     */
    Private = 0,
    /**
     * 公共模型/公共皮肤
     */
    Public = 1,
    /**
     * 地图模型
     */
    Project = 2,
    /**
     * 扩展模型/共享皮肤
     */
    ExtensionLib = 3
}
/**
 * 创作模式
 * 1 - 自由创作(默认)；
 * 2 - 定向创作-人物装扮;
 */
export declare enum CreativeMode {
    Model = 1,
    Skin = 2
}
/**
 * 排序方式
 * 0 - 按创建时间 - 倒序 (默认)；
 * 1 - 按名称 - 升序;
 * 2 - 按修改时间 - 倒序;
 */
export declare enum SortOrder {
    CreateTimeDesc = 0,
    NameAsc = 1,
    ModifyTimeDesc = 2
}
/**
 * 私有模型的类型
 * 0 - snapshot
 * 1 - release
 */
export declare enum SourceType {
    /**
     * 最新保存的模型
     */
    Snapshot = 0,
    /**
     * 已发布的模型
     */
    Release = 1
}
export type SaveModelV1Props = {
    /**
     * 模型id。
     * 如果不填写，代表创建。
     */
    modelId?: number;
    /**
     * 动画标志
     */
    animated?: boolean;
    /**
     * 是否自动保存
     */
    autoSave: boolean;
    /**
     * 模型文件哈希
     */
    modelFileHash: string;
    /**
     * 模型名字
     */
    modelName: string;
    /**
     * 模型类型
     */
    modelType: ModelType;
    /**
     * 预览图哈希
     */
    modelPreviewFileHash: string;
    /**
     * 工程文件哈希
     */
    modelProjectFileHash: string;
};
export interface ResListModelResp {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ModelResp[];
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResPageModelResp {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: PageResponseModelResp;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface PageResponseModelResp {
    /**
     * 总数
     * @format int64
     */
    count: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows: ModelResp[];
}
export interface ResModelResp {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ModelResp;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ResDefaultModelResp {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ModelResp | undefined;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ModelResp {
    /**
     * 动画标志
     */
    animated: boolean;
    /** 创建时间 */
    createdAt: string;
    /**
     * 创作模式，1自由创作(默认)；2定向创作-人物装扮
     * @format int32
     */
    creativeMode: CreativeMode;
    /** 模型的文件hash */
    fileHash: string;
    /**
     * 模型描述，简介
     */
    modelDescription: string;
    /**
     * 模型文件hash
     */
    modelFileHash: string;
    /**
     * @deprecated
     * 旧的返回字段
     * 目前等于modelFileHash
     * 模型文件hash
     */
    modelFileUUID: string;
    /** 模型文件url */
    modelFileUrl: string;
    /**
     * 模型 id
     * @format int64
     */
    modelId: number;
    /** 模型名字 */
    modelName: string;
    /**
     * 模型预览图 hash
     */
    modelPreviewHash: string;
    /**
     * @deprecated
     * 旧的返回字段
     * 目前等于modelPreviewHash
     * 模型预览图 hash
     */
    modelPreviewUUID: string;
    /** 模型预览图url */
    modelPreviewUrl: string;
    /**
     * 模型类型
     */
    modelType: ModelType;
    /**
     * 模型的工程文件hash
     */
    projectFileHash: string;
    /**
     * @deprecated
     * 旧的返回字段
     * 目前等于projectFileHash
     * 模型的工程文件 hash
     */
    projectFileUUID: string;
    /** 模型的工程文件url */
    projectFileUrl: string;
    /** 更新时间 */
    updatedAt: string;
}
export type UpdateModelProps = {
    /**
     * 模型id。
     */
    modelId: number;
    /**
     * 动画标志
     */
    animated?: boolean;
    /**
     * 模型文件 hash。地图渲染使用。
     */
    modelFileHash?: string;
    /**
     * @deprecated
     * 旧的字段
     * 请直接传入modelFileHash
     */
    modelFile?: Blob;
    /**
     * 模型名字
     */
    modelName?: string;
};
export interface ResListModelSnapshotResp {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: ModelSnapshotResp[];
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface ModelSnapshotResp {
    /** 快照-生成时间 */
    createdAt: Timestamp;
    /**
     * 快照-模型文件hash
     */
    modelFileHash: string;
    /**
     * @deprecated
     * 旧的返回字段
     * 目前等于modelFileHash
     * 快照-模型文件hash
     */
    modelFileUUID: string;
    /**
     * 快照-模型预览图
     */
    modelPreviewHash: string;
    /**
     * @deprecated
     * 旧的返回字段
     * 目前等于modelPreviewHash
     * 快照-模型预览图
     */
    modelPreviewUUID: string;
    /**
     * 快照-模型的工程文件
     */
    projectFileHash: string;
    /**
     * @deprecated
     * 旧的返回字段
     * 目前等于projectFileHash
     * 快照-模型的工程文件
     */
    projectFileUUID: string;
    /**
     * 快照 id
     * @format int64
     */
    snapshotId: number;
}
export interface MapResp {
    audioHash?: string;
    banner?: string;
    contentId: string;
    createdAt?: Timestamp;
    describe?: string;
    /** @format int32 */
    duration?: number;
    editContainerName: string;
    hash: string;
    image: string;
    name?: string;
    notice?: string;
    /** @format int32 */
    onPublishVersion?: number;
    playContainerName?: string;
    /** @format int64 */
    playCount?: number;
    publishedAt?: Timestamp;
    /** @format int64 */
    publishedVersionId?: number;
    /** @format int32 */
    type: number;
    url?: string;
    /** @format int64 */
    version?: number;
    /** @format int64 */
    versionId?: number;
    /** @format int64 */
    viewCount?: number;
}
export interface PageResponseMapResp {
    /**
     * 总数
     * @format int64
     */
    count: number;
    /** 扩展字段 */
    extra?: object;
    /** 数据 */
    rows: MapResp[];
}
export interface FrontEndDataFormatArray {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: number[];
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface AddModelSharePoolParam {
    /** 地图ID */
    mapId: string;
    /** 原始模型ID */
    originModelId: string;
    /**
     * 源类型，0-复制snapshot(不填就默认0), 1-复制release
     * @format int32
     */
    sourceType?: number;
}
export interface FrontEndDataFormatBoolean {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: boolean;
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
export interface DeleteModelShareParam {
    /** 地图ID */
    mapId: string;
    /** 模型ID */
    modelId: string;
}
export interface ModelSkinProjectParam {
    /**
     * 地图ID
     */
    mapId: number;
    /**
     * 原始皮肤ID
     */
    originSkinIds: number[];
    /**
     * 原始皮肤类型
     * 0 - 私有
     * 1 - 公有
     */
    sourceType: SourceType;
}
export declare enum ModelErrorCode {
    NameExisted = 10020013,
    ModelNotExisted = 10020011
}
export interface GetModelsParam {
    creativeMode?: CreativeMode;
    /**
     * 是否排除默认皮肤，当查询项目皮肤的时候使用，默认false
     */
    excludeDefaultSkin?: boolean;
    limit?: number;
    /**
     * 地图ID：modelType=3时必传
     */
    mapId?: number;
    modelName?: string;
    modelType: ModelType;
    offset?: number;
    /**
     * 列表排序方式。默认按创作时间倒叙
     */
    orderBy?: SortOrder;
    containerMode?: 'edit' | 'play';
}
/**
 * 请求超时时间
 */
export declare const REQUEST_TIMEOUT: number;
export declare enum CopyEvent {
    /**
     * 主动复制
     */
    ActiveCopy = 0,
    /**
     * 被动复制
     */
    PassiveCopy = 1
}
export interface FrontEndDataFormatArrayString {
    /**
     * 状态码，200为成功，其他均为异常
     * @format int32
     */
    code: number;
    /** 业务数据 */
    data: string[];
    /** 返回消息 */
    msg: string;
    /** 请求追中id，每次请求唯一(可能为空) */
    traceId?: string;
}
//# sourceMappingURL=data-contracts.d.ts.map