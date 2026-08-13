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

import { CreativeMode, ModelType, ModelResp } from '../data-contracts';

export interface AccountVO {
  /** 可用余额 */
  availableBalance: string;

  /**
   * 平台币种
   * @format int32
   */
  coin: number;

  /**
   * 用户id
   * @format int64
   */
  userId: number;
}

export interface ActiveTaskProgressResp {
  /** 任务需求(返回当前任务的完成条件，eq: (进入过1张地图: 3) */
  demand?: string;

  /** 任务进度(返回当前任务的进度，eq:进入过1张地图：1) */
  progress?: string;

  /**
   * 奖励小鱼干数量
   * @format int32
   */
  reward: number;

  /**
   * 任务状态(1->未完成，2->已完成 3->已领取)
   * @format int32
   */
  status: number;

  /**
   * 任务类型(1->本周累计游玩3张地图；2->本周累计登录且游玩地图3天；3->本周累计登录且游玩地图5天)
   * @format int32
   */
  task: number;
}

export interface ActivityInfoVO {
  /** 活动描述 */
  description: string;

  /**
   * 结束时间(UTC)
   * @format date-time
   */
  endTime: string;

  /** 活动id */
  id: string;

  /** 活动详情页链接地址 */
  link: string;

  /** 封面图url */
  previewUrl: string;

  /**
   * 开始时间(UTC)
   * @format date-time
   */
  startTime: string;

  /**
   * 结束状态（0：upcoming, 1:ongoing, 2:ended，3:unpublished）
   * @format int32
   */
  status: number;
}

export interface AddCollaborationMemberParam {
  /** 地图ID */
  mapId: string;

  /** 链接分享ticket */
  ticket: string;

  /** 用户ID */
  userId: string;
}

export interface AddCollaborationRoleParam {
  /** 地图ID */
  mapId: string;

  /** 角色名称 */
  name: string;

  /** 权限列表 */
  permissions: string[];
}

export interface AddEngineVersionParam {
  /** 渠道ID: 传空默认自有渠道ID */
  appId?: string;

  /** 引擎版本 */
  engineVersion: string;
}

export interface AddMintedAddressParam {
  /** 活动id */
  activityId: string;

  /** 钱包地址 */
  address: string;

  /**
   * 白单类型，0：普通白单，1：高级白单
   * @format int32
   */
  type: number;
}

export interface AirdropInfoVo {
  /**
   * 获奖类型：1限定家具；2高级家具；3ANS 10；4抽奖券；5土地白单；6USDT；7ANS 50
   * @format int32
   */
  awardsType: number;

  /** 获奖值，ANS数、家具ID */
  awardsVal?: string;

  /**
   * 获奖时间
   * @format date-time
   */
  createdAt: string;

  /** 家具图片 */
  furnImage?: string;

  /** 家具名称 */
  furnName?: string;

  /** 是否本次进入房间获取，给前端判断今日是否已经获取 */
  getByThisTime: boolean;
}

export interface AllocateContainerParam {
  /** 地图ID */
  mapId: string;

  /** 模式：play、edit */
  mode: string;

  /** 服务ID */
  serverId?: string;
}

export interface AllocateContainerVO {
  /** HTTP服务器地址 */
  httpServerUrl: string;

  /** WebSocket服务器地址 */
  socketServerUrl: string;
}

export interface AnsStatisticsResp {
  /**
   * ans 最大释放数
   * @format int32
   */
  maxAns: number;

  /**
   * 每日 ans 最大释放数
   * @format int32
   */
  maxAnsOneDay: number;

  /**
   * 今日 ans 释放数
   * @format int32
   */
  todayAns: number;

  /**
   * ans 释放总数
   * @format int32
   */
  totalReleased: number;
}

export interface AnsTransactionResp {
  /**
   * ans 操作-[0-复活, 1-自己邀请码被使用, 2-使用他人邀请码, 3-赢得比赛]
   * @format int32
   */
  action: number;

  /**
   * ans 数量
   * @format double
   */
  ansQuantity: number;

  /**
   * 发生时间
   * @format date-time
   */
  createdAt: string;
}

export interface AppPackageVO {
  downloadUrl: string;
  updatedAt: string;
  version: string;
}

export interface AuthTypeUserVO {
  /** @format int32 */
  authType?: number;
  nickname?: string;
}

export interface AvatarComponentVo {
  /**
   * 组件部位。1头 head；2臀部 hips；3左脚 leftFoot；4左手 leftHand；5左下臂 leftLowerArm；6左小腿 leftLowerLeg；
   *     7左肩膀 leftShoulder；8左上臂 leftUpperArm；9左大腿 leftUpperLeg；10脖子 neck；11右脚 rightFoot；
   *     12右手 rightHand；13右下臂 rightLowerArm；14右小腿 rightLowerLeg；15右肩膀 rightShoulder；
   *     16右上臂 rightUpperArm；17右大腿 rightUpperLeg；18躯干 torso
   * @format int32
   */
  component: number;

  /** 组件Hash */
  hash: string;

  /**
   * 组件ID
   * @format int64
   */
  id: number;
}

export interface AvatarSkinInfoVo {
  /** 基础组件 */
  components: number[];

  /**
   * 模块ID
   * @format int64
   */
  id: number;

  /** 是否可拆分 */
  isDisassemble: boolean;

  /** 是否公开，可区分是否为用户拥有 */
  isPublic: boolean;

  /** 预览图 */
  previewUrl: string;

  /** 套装名字 */
  suitName?: string;

  /**
   * 类型，1头部、2上装、3下装、4鞋子
   * @format int32
   */
  type: number;
}

export interface AvatarSkinVo {
  /** 基础组件 */
  componentList: AvatarComponentVo[];

  /**
   * 模块ID
   * @format int64
   */
  id: number;

  /** 是否可拆分 */
  isDisassemble: boolean;

  /** 预览图 */
  previewUrl: string;

  /** 套装名字 */
  suitName?: string;

  /**
   * 类型，1头部、2上装、3下装、4鞋子
   * @format int32
   */
  type: number;
}

export interface AvatarUpdateParam {
  /** 模块ID，0全身套装、1头部、2上装、3下装、4鞋子 */
  modelIds: number[];

  /** 头像Hash */
  previewUrl: string;
}

export interface BannerConfigVo {
  /**
   * 主键
   * @format int64
   */
  id: number;

  /** 链接 */
  link?: string;

  /** 位置 */
  position: string;

  /** 图片 */
  previewUrl: string;

  /** 标题 */
  title: string;

  /**
   * 权重
   * @format int32
   */
  weight: number;
}

export interface BaseLandInfo {
  /** 地块id */
  id: string;

  /**
   * 拥有人id
   * @format int64
   */
  ownerId?: number;

  /**
   * 空间层级
   * @format int32
   */
  spatialHierarchy: number;

  /**
   * x坐标
   * @format float
   */
  x: number;

  /**
   * y坐标
   * @format float
   */
  y: number;
}

export interface BasicContentInfoVO {
  /** 地图banner */
  banner?: string[];

  /**
   * 地图id
   * @format int64
   */
  contentId: number;

  /** 地图描述 */
  description?: string;

  /** 地图名称 */
  name: string;

  /** 版本信息 */
  notice?: string;

  /** 地图游玩hash */
  playHash?: string;

  /** 地图预览图 */
  preview?: string;

  /**
   * 发布版本号，取消发布/下架情况下保留版本号，可判断是否发布过 -> 不为空且大于0
   * @format int32
   */
  publishedVersion?: number;

  /**
   * 发布的版本id，不为空为已发布，可判断当前是否已发布 -> 不为空且大于0
   * @format int64
   */
  publishedVersionId?: number;

  /**
   * 作品状态(1-未发布，2-审核中，3-已发布，4-已拒绝，5-已审核，6-已删除，7-已下架)
   * @format int32
   */
  status: number;
}

export interface BasicUserFollowAndCountVO {
  /** 用户头像 */
  avatar: string;

  /** 是否关注我 */
  follower: boolean;

  /**
   * 粉丝数量
   * @format int32
   */
  followerNum: number;

  /** 我是否关注 */
  following: boolean;

  /**
   * 关注数量
   * @format int32
   */
  followingNum: number;

  /** 用户昵称 */
  nickname: string;

  /** avatar图片 */
  previewUrl?: string;

  /**
   * 用户id
   * @format int64
   */
  userId: number;
}

export interface BasicUserFollowCountVO {
  /** 用户头像 */
  avatar: string;

  /**
   * 粉丝数量
   * @format int32
   */
  followerNum: number;

  /**
   * 关注数量
   * @format int32
   */
  followingNum: number;

  /** 用户昵称 */
  nickname: string;

  /** avatar图片 */
  previewUrl?: string;

  /**
   * 用户id
   * @format int64
   */
  userId: number;
}

export interface BasicUserVO {
  /** 用户头像 */
  avatar: string;

  /** 用户昵称 */
  nickname: string;

  /** avatar图片 */
  previewUrl?: string;

  /**
   * 用户id
   * @format int64
   */
  userId: number;
}

export interface BasicUserWithIntroVO {
  /** 用户头像 */
  avatar: string;

  /** 自我简介 */
  introduction: string;

  /** 用户昵称 */
  nickname: string;

  /** avatar图片 */
  previewUrl?: string;

  /**
   * 用户id
   * @format int64
   */
  userId: number;
}

export interface BehaviorInteractionData {
  /**
   * 评论数增长比例(1 = 0.01%)
   * @format int32
   */
  commentCountGrowthRate: number;

  /** 每日被评论次数 */
  dailyCommentCount: string;

  /** 每日被收藏次数 */
  dailyFavoriteCount: string;

  /** 每日被点赞次数 */
  dailyLikeCount: string;

  /**
   * 收藏数增长比例(1 = 0.01%)
   * @format int32
   */
  favoriteCountGrowthRate: number;

  /**
   * 点赞数增长比例(1 = 0.01%)
   * @format int32
   */
  likeCountGrowthRate: number;

  /**
   * 总评论数
   * @format int32
   */
  totalCommentCount: number;

  /**
   * 总收藏数
   * @format int32
   */
  totalFavoriteCount: number;

  /**
   * 总点赞数
   * @format int32
   */
  totalLikeCount: number;
}

export interface BehaviorPlayData {
  /**
   * 人均游玩时长（单位：秒）
   * @format int32
   */
  avgPlayDuration: number;

  /**
   * 总人均游玩时长增长比例(1 = 0.01%)
   * @format int32
   */
  avgPlayDurationGrowthRate: number;

  /** 每日人均游玩时长（逗号分割，前端自己解决横坐标，为了压缩数据量） */
  dailyAvgPlayDuration: string;

  /** 每日游玩次数（逗号分割，前端自己解决横坐标，为了压缩数据量） */
  dailyPlayCount: string;

  /** 每日总游玩时长（逗号分割，前端自己解决横坐标，为了压缩数据量） */
  dailyTotalPlayDuration: string;

  /** 每日浏览次数（逗号分割，前端自己解决横坐标，为了压缩数据量） */
  dailyViewCount: string;

  /**
   * 总游玩次数增长比例(1 = 0.01%)
   * @format int32
   */
  playCountGrowthRate: number;

  /**
   * 总游玩次数
   * @format int32
   */
  totalPlayCount: number;

  /**
   * 总游玩时长（单位：秒）
   * @format int32
   */
  totalPlayDuration: number;

  /**
   * 总游玩时长增长比例(1 = 0.01%)
   * @format int32
   */
  totalPlayDurationGrowthRate: number;

  /**
   * 总浏览次数
   * @format int32
   */
  totalViewCount: number;

  /**
   * 总浏览次数增长比例(1 = 0.01%)
   * @format int32
   */
  viewCountGrowthRate: number;
}

export interface BindAccountParam {
  /** token */
  token: string;
}

export interface BoosterInfo {
  /** 描述 */
  description: string;

  /** 封面图 */
  image: string;

  /**
   * 等级
   * @format int32
   */
  level: number;

  /** 名称 */
  name: string;

  /**
   * 存量
   * @format int64
   */
  stock: number;
}

export interface CacheReq {
  key?: string;
  value?: string;
}

export interface CancelDepositOrderParam {
  /**
   * 存款订单id
   * @format int64
   */
  depositOrderId: number;
}

export interface CatchingNFTVO {
  /** 分页数据 */
  data: PageResponseNFTInfo;

  /** 是否已完成拉取 */
  finished: boolean;
}

export interface CheckNameParam {
  /** 对应账户 metamask 则是地址 */
  account?: string;

  /** 昵称 */
  nickname?: string;
}

export interface CheckUserPermissionParam {
  /** 权限点（1: 扩展地图, 1<<16：管理员） */
  permissions: number[];
}

export interface ClaimPointParam {
  /** 地块ID */
  landId: string;
}

export interface CmAuthSyncParam {
  /** 编程猫BoxToken */
  token: string;
}

export interface CmCodeLoginParam {
  /** 编程猫账号-验证码 */
  code: string;

  /** 编程猫账号-手机号 */
  phone: string;
}

export interface CmIdcardParam {
  /** 身份证号码 */
  idcard?: string;

  /** 姓名 */
  name?: string;

  /** Token */
  token?: string;

  /**
   * 用户id
   * @format int64
   */
  userId?: number;
}

export interface CmLoginParam {
  /** 编程猫账号，包括手机号、用户名、邮箱 */
  account?: string;

  /** 编程猫账号密码 */
  password?: string;
}

export interface CmSyncLogoutParam {
  /** BoxToken */
  token: string;
}

export interface CmSyncUserInfoParam {
  /** 头像 */
  avatar?: string;

  /** 邮箱 */
  email?: string;

  /** 个人简介 */
  introduction?: string;

  /** 昵称 */
  nickname?: string;

  /** 密码 */
  password?: string;

  /** 手机号 */
  phone?: string;

  /** BoxToken */
  token: string;

  /**
   * 用户ID
   * @format int64
   */
  userId: number;
}

export interface CoinConfigVO {
  /** 是否允许存款 */
  allowDeposit: boolean;

  /** 是否允许支付 */
  allowPay: boolean;

  /** 是否允许提现 */
  allowWithdraw: boolean;

  /**
   * 平台币种
   * @format int32
   */
  coin: number;

  /** token充值汇率 */
  exchangeRate: string;

  /** 最低提现额度 */
  minWithdrawAmount: string;

  /** 服务费 */
  serviceFee: string;

  /**
   * 对应token类型
   * @format int32
   */
  token?: number;

  /** 交易状态列表 */
  transactionStatus: number[];

  /** 交易类型列表 */
  transactionTypes: number[];
}

export interface CollaborationApplyVO {
  /** 申请ID */
  applyId: string;

  /** 头像 */
  avatar: string;

  /** 是否已查看 */
  checked: boolean;

  /**
   * 申请时间戳(毫秒)
   * @format int64
   */
  createdAt: number;

  /** 昵称 */
  nickname: string;

  /** 用户ID */
  userId: string;
}

export interface CollaborationBanUnbanParam {
  /** 地图ID */
  mapId: string;

  /** 用户ID */
  userId: string;
}

export interface CollaborationMemberSortParam {
  /** 地图ID */
  mapId: string;

  /** 用户ID列表，根据传入顺序排序 */
  userIds: string[];
}

export interface CollaborationMemberVO {
  /** 头像 */
  avatar: string;

  /** 是否游客 */
  guest: boolean;

  /** 昵称 */
  nickname: string;

  /** 角色列表 */
  roles: CollaborationRoleVO[];

  /** 用户ID */
  userId: string;
}

export interface FrontEndDataFormatListLong {
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

export interface CollaborationMigrationParam {
  /** 地图ID */
  mapId: string;

  /**
   * 地图隐私
   * @format int32
   */
  mapPrivacy: number;

  /** 协作者列表 */
  members: MemberMigrationParam[];

  /** 角色列表 */
  roles: RoleMigrationParam[];
}

export interface CollaborationMigrationVO {
  /** 地图ID */
  mapId: string;

  /** 角色列表 */
  members: Member[];

  /**
   * 地图隐私
   * @format int32
   */
  privacy: number;

  /** 是否游客 */
  roles: CollaborationRoleVO[];
}

export interface CollaborationPermissionVO {
  /** 权限点名称 */
  name: string;

  /** 权限点 */
  permission: string;
}

export interface CollaborationRoleVO {
  /** 角色ID */
  id: string;

  /** 角色名称 */
  name: string;

  /** 权限列表 */
  permissions: string[];
}

export interface CollaborationTicketVO {
  /**
   * 过期时间
   * @format int64
   */
  expireAt: number;

  /** 地图ID */
  mapId: string;

  /** 角色ID：游客为空 */
  roleId?: string;

  /** 门票 */
  ticket: string;
}

export interface CollaborationVO {
  /** 是否为游客 */
  guest: boolean;

  /** 权限点 */
  permissions: string[];
}

export interface CollectParam {
  /** content */
  content?: string;

  /**
   * 类型 1-邮件
   * @format int32
   */
  type?: number;
}

export interface CommentInfoVo {
  /** 评论内容 */
  comment: string;

  /**
   * 评论id
   * @format int64
   */
  id: number;
}

export interface CommentMsgVO {
  /** 评论人头像 */
  avatar: string;

  /** 评论 */
  comment: string;

  /**
   * 评论Id
   * @format int64
   */
  commentId: number;

  /**
   * 评论人ID
   * @format int64
   */
  commentUserId: number;

  /**
   * 评论作品ID
   * @format int64
   */
  contentId: number;

  /** 作品名 */
  contentTitle: string;

  /**
   * 评论作品类型
   * @format int32
   */
  contentType: number;

  /**
   * 消息创建时间
   * @format date-time
   */
  createdAt: string;

  /**
   * 消息ID
   * @format int64
   */
  id: number;
  likeComment?: boolean;

  /**
   * 点赞量
   * @format int64
   */
  likeCount: number;

  /** 评论人昵称 */
  nickname: string;

  /** 我的评论 */
  reply?: string;

  /**
   * 消息类型，100-评论作品; 101-回复评论
   * @format int32
   */
  type: number;
}

export interface CommentParam {
  /** 评论内容 */
  comment: string;

  /**
   * 评论内容ID
   * @format int64
   */
  contentId: number;

  /**
   * 评论分类
   * @format int32
   */
  contentType: number;

  /**
   * 回复评论ID
   * @format int64
   */
  replyTo?: number;
}

export interface CommentReplyVo {
  /** 评论内容 */
  comment: string;

  /** 创建时间 */
  createdAt: Timestamp;

  /**
   * 评论id
   * @format int64
   */
  id: number;

  /** 是否点赞 */
  isLike?: boolean;

  /**
   * 点赞数
   * @format int64
   */
  likeCount: number;

  /**
   * 回复数
   * @format int64
   */
  replyCount: number;

  /** 回复用户信息 */
  replyTo?: BasicUserVO;

  /** 评论人信息 */
  userInfo: BasicUserVO;
}

export interface CommentVo {
  /** 评论内容 */
  comment: string;

  /**
   * 创建时间
   * @format date-time
   */
  createdAt: string;

  /**
   * 评论id
   * @format int64
   */
  id: number;

  /** 是否点赞 */
  isLike?: boolean;

  /** 是否被置顶 */
  isTop: boolean;

  /**
   * 点赞数
   * @format int64
   */
  likeCount: number;

  /**
   * 回复数
   * @format int64
   */
  replyCount: number;

  /** 回复列表 */
  replyList?: CommentReplyVo[];

  /** 评论人信息 */
  userInfo: BasicUserVO;
}

export interface CompetitionResult {
  /** @format double */
  ans?: number;

  /** @format int32 */
  entersCount?: number;

  /** @format int32 */
  survivingCount?: number;

  /** @format double */
  usdt?: number;
}

export interface CompetitionResultParam {
  /** 加密后的文本 */
  encodeMsg: string;
}

export interface CompetitionResultResp {
  detail?: CompetitionResult;
  finished?: boolean;
}

export interface ContainerRestartParam {
  /** 容器名称 */
  containerName: string;
}

export interface ContentAuthorVO {
  /**
   * 用户id
   * @format int64
   */
  authorId: number;

  /** 用户头像url */
  avatar: string;

  /** Ta是否关注 */
  follower: boolean;

  /**
   * 粉丝数
   * @format int32
   */
  followerNum: number;

  /** 是否关注Ta */
  following: boolean;

  /** 用户昵称 */
  nickname: string;
}

export interface ContentDetailVO {
  /** 作品所属用户信息 */
  author?: ContentAuthorVO;

  /** 作品轮播图 */
  banner: string[];

  /** 合作者信息 */
  coAuthors?: BasicUserVO[];

  /**
   * 地图类型 0-普通地图 1-扩展主地图 2-扩展副地图
   * @format int32
   */
  combType: number;

  /**
   * 评论数
   * @format int64
   */
  commentCount: number;

  /**
   * 作品id
   * @format int64
   */
  contentId: number;

  /** 作品描述 */
  description: string;

  /**
   * 收藏数
   * @format int64
   */
  favoritesCount: number;

  /** 是否收藏 */
  isFavorites?: boolean;

  /** 是否点赞 */
  isLike?: boolean;

  /** 作品包含标签列表 */
  labels: MapLabelInfo[];

  /**
   * 点赞数
   * @format int64
   */
  likeCount: number;

  /** 作品标题 */
  name: string;

  /** 更新说明 */
  notice: string;

  /**
   * 在线人数
   * @format int64
   */
  onlineCount: number;

  /**
   * 游玩次数
   * @format int64
   */
  playCount: number;

  /** 作品地图hash */
  playHash: string;

  /** 作品小封面图 */
  preview: string;

  /**
   * 更新时间
   * @format date-time
   */
  publishedAt: string;

  /**
   * 发布版本号，取消发布/下架情况下保留版本号，可判断是否发布过 -> 不为空且大于0
   * @format int32
   */
  publishedVersion?: number;

  /**
   * 浏览量
   * @format int64
   */
  viewCount: number;
}

export interface ContentLikeVO {
  /** 是否收藏 */
  isFavorites?: boolean;

  /** 是否点赞 */
  isLike?: boolean;
}

export interface ContentReleaseVO {
  /**
   * 地图/模型id
   * @format int64
   */
  contentId: number;

  /**
   * 创建时间
   * @format date-time
   */
  createdAt: string;

  /** 版本更新内容 */
  notice?: string;

  /**
   * RELEASE版本号
   * @format int32
   */
  version: number;
}

export interface ContentStatisticsParam {
  /**
   * 内容id
   * @format int64
   */
  contentId: number;

  /** 游客id */
  guestId?: string;

  /** 模式（play, edit） */
  mode?: string;
}

export interface CourseInfo {
  /** 课程封面 */
  cover?: string;

  /** 课程描述 */
  desc?: string;

  /** 课程标题 */
  title?: string;

  /** 课程视频链接 */
  video?: string;
}

export interface CourseSeriesInfo {
  /** 系列课程 */
  courseSeries?: CourseInfo[];

  /** 系列名 */
  seriesName?: string;
}

export interface CourseVO {
  /** 课程分类列表 */
  series?: CourseSeriesInfo[];

  /** 轮播主推课程 */
  slideshow?: CourseSeriesInfo;
}

export interface CreateDepositOrderParam {
  /**
   * coin类型
   * @format int32
   */
  coin: number;

  /**
   * 网络类型: 0-ERC-20
   * @format int32
   */
  network: number;

  /**
   * token类型: 0-ETH
   * @format int32
   */
  token: number;

  /** 存款token额 */
  tokenAmount: string;

  /** 钱包地址 */
  walletAddress: string;
}

export interface CreateProductOrderParam {
  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 商品id */
  productId: string;

  /**
   * 商品版本
   * @format int32
   */
  version: number;
}

export interface CreateProductParam {
  /** 是否允许广告支付 */
  adPay: boolean;

  /**
   * 币种：0-TETH、1-TIRA
   * @format int32
   */
  coin: number;

  /** 封面 */
  cover: string;

  /** 描述 */
  description?: string;

  /** 是否提交审核 */
  isSubmitAudit: boolean;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 价格 */
  price: string;

  /** 标题 */
  title: string;
}

export interface CreateWithdrawOrderParam {
  /** 提现额(包括手续费) */
  amount: string;

  /**
   * 平台币种: 0-TETH、1-TIRA、2-小鱼干、3-代码碎片
   * @format int32
   */
  coin: number;

  /**
   * 网络: 0-ERC-20
   * @format int32
   */
  network?: number;

  /** 钱包地址 */
  walletAddress?: string;
}

export interface CreatorStoreConfigResp {
  /** 是否开启游戏内商店入口 */
  inGameStore: boolean;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;
}

export interface Data {
  /** the user done the task */
  result: boolean;
}

export interface DeleteProductParam {
  /** 商品id */
  productId: string;
}

export interface EduAsyncCreateMapInfo {
  /** 地图信息 */
  mapInfo?: EduMapInfoVO;

  /** 执行状态描述 */
  msg?: string;

  /** 请求时间(yyyy-MM-ddTHH:mm:ss) */
  requestAt: string;

  /** 请求id */
  requestId: string;

  /**
   * 执行状态(0-创建中, 1-创建成功, 2-创建失败)
   * @format int32
   */
  status: number;
}

export interface EduAsyncCreateMapParam {
  /** 地图模板hash */
  hash?: string;

  /** 请求id(异步创建使用，如果不为空则为取数据，为空则为创建) */
  requestId?: string;

  /** 地图名称 */
  title?: string;
}

export interface EduCreateMapParam {
  /** 地图模板hash */
  hash: string;

  /** 请求id(异步创建使用，如果不为空则为取数据，为空则为创建) */
  requestId?: string;

  /** 地图名称 */
  title: string;
}

export interface EduLoginParam {
  /**
   * 编程猫用户ID
   * @format int64
   */
  cmid: number;

  /** 用户不存在时使用，昵称(如果昵称存在将随机生成)，缺省：随机 */
  nickname?: string;
}

export interface EduLoginVO {
  /** 昵称 */
  nickname: string;

  /** 访问令牌 */
  token: string;

  /**
   * 用户ID
   * @format int64
   */
  userId: number;
}

export interface EduMapInfoVO {
  /**
   * 作者id
   * @format int64
   */
  authorId: number;

  /** 编辑链接 */
  editUrl?: string;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 游玩链接 */
  playUrl?: string;

  /** 地图名称 */
  title: string;
}

export interface EduPublishMapParam {
  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 地图名称 */
  title?: string;
}

export interface EduResetMapParam {
  /** 地图模板hash */
  hash: string;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;
}

export interface EmailCodeLoginParam {
  /**
   * client id:1-web，2-app
   * @format int32
   */
  cid?: number;

  /** 验证码 */
  code: string;

  /** 邮箱 */
  email: string;

  /** 语言：zh_CN-中文，en_US-英文 */
  language?: string;
}

export interface EmailRegisterParam {
  /** 电子邮箱 */
  email: string;

  /** 昵称 */
  nickname: string;

  /** 密码 */
  password?: string;

  /** 邮箱验证code */
  verifyCode: string;
}

export interface EmailSubscribeReq {
  /** 邮箱 */
  email: string;

  /** 用户名字 */
  userName?: string;
}

export interface EngineUserOnlineOfflineParam {
  /** 是否为游客 */
  guest: boolean;

  /** IP地址 */
  ip: string;

  /** 地图ID */
  mapId: string;

  /** 模式（play, edit） */
  mode: string;

  /** 服务ID */
  serverId: string;

  /** 容器名 */
  serverName: string;

  /** 用户ID or 游客ID */
  userId: string;
}

export type Error = object;

export interface FirebaseLoginParam {
  /** firebase token */
  firebaseToken: string;

  /**
   * 授权提供者（1<<2 - google, 1<<3 - Twitter, 1<<4 - Facebook）
   * @format int32
   */
  provider: number;
}

export interface FirebaseRegisterParam {
  /** 电子邮箱（选填） */
  email?: string;

  /** firebase token */
  firebaseToken: string;

  /** 昵称 */
  nickname: string;

  /** 密码 */
  password?: string;

  /** 邮箱验证code（选填，填写邮箱时必填） */
  verifyCode?: string;
}

export interface FollowAvatarVO {
  /**
   * Assets数量
   * @format int32
   */
  assetsNum: number;

  /**
   * Creations数量
   * @format int32
   */
  creationsNum: number;

  /** 是否关注我 */
  follower: boolean;

  /**
   * 粉丝数量
   * @format int32
   */
  followerNum: number;

  /** 我是否关注 */
  following: boolean;

  /**
   * 关注数量
   * @format int32
   */
  followingNum: number;

  /** 用户基本信息 */
  userInfo: BasicUserWithIntroVO;
}

export interface FollowCountInfo {
  /**
   * 粉丝人数
   * @format int32
   */
  followerNum: number;

  /**
   * 关注人数
   * @format int32
   */
  followingNum: number;

  /**
   * 用户id
   * @format int64
   */
  userId: number;
}

export interface FollowNewFollowerVO {
  /**
   * 发送信息
   * @format date-time
   */
  createdAt?: string;

  /** 打招呼信息 */
  greetMsg?: string;

  /** 用户基本信息 */
  userInfo: BasicUserVO;
}

export interface FollowParam {
  /** 打招呼问候语 */
  greetMsg?: string;

  /**
   * 关注的目标用户id
   * @format int64
   */
  targetUserId: number;
}

export interface FollowV2VO {
  /** 是否关注我 */
  follower: boolean;

  /** 我是否关注 */
  following: boolean;

  /** 游玩地图信息 */
  mapInfo?: MapReleasePlayHashInfo;

  /** 用户基本信息 */
  userInfo: BasicUserVO;
}

export interface FollowVO {
  /** 是否关注我 */
  follower: boolean;

  /** 我是否关注 */
  following: boolean;

  /** gallery地图hash */
  galleryHash?: string;

  /** 用户基本信息 */
  userInfo: BasicUserFollowCountVO;
}

export interface FormSubmitParam {
  /** 活动id */
  activityId: string;

  /** 提交人email */
  email?: string;

  /** 表单内容json字符串，json格式由前端决定，后端不做任何修改 */
  form: string;

  /** 来源推荐码 */
  recommendCode?: string;
}

export interface GalleryAutoGenParam {
  /** 钱包地址(非必填，提供给测试使用) */
  address?: string;

  /** 标题 */
  title?: string;
}

export interface GalleryManualGenParam {
  /** 钱包地址(非必填，提供给测试使用) */
  address?: string;

  /** 已选择的NFT */
  selected: NFTInfo[];

  /** 标题 */
  title?: string;
}

export interface GalleryMapVO {
  /** 作者信息(可能为空，因为地图可能是运营人员手动生成的) */
  authorInfo?: BasicUserFollowAndCountVO;

  /**
   * 作者对应的box用户id
   * @format int64
   */
  userId?: number;

  /**
   * 浏览次数
   * @format int64
   */
  visitNum: number;
}

export interface GalleryTaskVO {
  /** 钱包地址 */
  address: string;

  /**
   * 任务创建时间（UTC）
   * @format date-time
   */
  createdAt: string;

  /**
   * 出现异常时的异常码
   * @format int64
   */
  exceptionCode?: number;

  /** 地图hash */
  mapHash?: string;
  nfts?: NFTInfo[];

  /**
   * 任务状态：0-等待中，1-NFT获取中，2-地图生成中，3-已完成，4-发生异常
   * @format int32
   */
  status: number;

  /**
   * 任务更新时间（UTC）
   * @format date-time
   */
  updatedAt: string;

  /**
   * 用户id
   * @format int64
   */
  userId: number;
}

export interface GameResultResp {
  /** 是否正在进行比赛 */
  hasGameOnGoing: boolean;

  /** 是否有下一场比赛 */
  hasNextGame: boolean;

  /**
   * 下一场比赛时间 - 如果超过 24 小时
   * @format date-time
   */
  nextGameDate?: string;

  /** 是否超过 24 小时 */
  over24Hour: boolean;

  /**
   * 距离下一场的毫秒数 - 如果小于 24 小时
   * @format int64
   */
  time: number;
}

export type HashMap = Record<string, object>;

export interface IdcardParam {
  /** 身份证号码 */
  idcard?: string;

  /** 姓名 */
  name?: string;
}

export interface ItemOptionVO {
  /** 存款金额 */
  amount?: string;

  /**
   * 平台币种
   * @format int32
   */
  coin?: number;

  /**
   * optionId
   * @format int64
   */
  id?: number;

  /**
   * 实际币种
   * @format int32
   */
  token: number;

  /** token数额 */
  tokenAmount: string;

  /**
   * 操作类型，1充值，2打赏
   * @format int32
   */
  type?: number;
}

export interface JSONConfig {
  dateFormat?: string;
  ignoreCase?: boolean;
  ignoreError?: boolean;
  ignoreNullValue?: boolean;
  order?: boolean;
  stripTrailingZeros?: boolean;
  transientSupport?: boolean;
}

export interface LandBlock {
  /** 属性 */
  attributes: MarketAttributes[];

  /** 横幅 */
  banner: string[];

  /** 组合信息 */
  bundle?: LandMapBundleInfo;

  /** 特殊建筑信息 */
  characteristic: LandCharacteristicInfo;

  /**
   * 绑定的地图id
   * @format int64
   */
  contentId: number;

  /** 地块id */
  id: string;

  /** 封面图 */
  imageUrl: string;

  /**
   * 地块等级
   * @format int32
   */
  level: number;

  /** 地块名称 */
  name: string;

  /** 所属人钱包地址 */
  ownerAddress: string;

  /**
   * 拥有人id
   * @format int64
   */
  ownerId?: number;

  /** opensea跳转链接 */
  permalink?: string;

  /** 地块当前售卖价格 */
  price?: number;

  /**
   * 所属区域编号
   * @format int32
   */
  regionNo: number;

  /**
   * 空间层级
   * @format int32
   */
  spatialHierarchy: number;

  /**
   * tokenId
   * @format int32
   */
  tokenId: number;

  /**
   * 0盲盒，1土地
   * @format int32
   */
  type?: number;

  /**
   * x坐标
   * @format float
   */
  x: number;

  /**
   * y坐标
   * @format float
   */
  y: number;
}

export interface LandBlockAndUpgradeInfo {
  /** 地块信息 */
  landInfo: LandListBlock;

  /** 最新一次升级记录 */
  lastUpgradeRecord?: LandUpgradeRecord;
}

export interface LandBlockVO {
  /** 属性 */
  attributes: MarketAttributes[];

  /** 横幅 */
  banner: string[];

  /** 组合信息 */
  bundle?: LandMapBundleInfo;

  /**
   * 绑定的地图id
   * @format int64
   */
  contentId: number;

  /** 地块id */
  id: string;

  /** 封面图 */
  imageUrl: string;

  /**
   * 地块等级
   * @format int32
   */
  level: number;

  /** 地块名称 */
  name: string;

  /** 地块拥有人信息 */
  owner?: MarketUserVO;

  /** opensea跳转链接 */
  permalink?: string;

  /** 地块当前售卖价格 */
  price?: number;

  /**
   * 所属区域编号
   * @format int32
   */
  regionNo: number;

  /**
   * 空间层级
   * @format int32
   */
  spatialHierarchy: number;

  /**
   * 质押状态：0-未质押 1-质押中 2-pending
   * @format int32
   */
  stakeStatus: number;

  /**
   * tokenId
   * @format int32
   */
  tokenId: number;

  /**
   * 0盲盒，1土地
   * @format int32
   */
  type?: number;

  /**
   * x坐标
   * @format float
   */
  x: number;

  /**
   * y坐标
   * @format float
   */
  y: number;
}

export interface LandBundleEditParam {
  /**
   * 组合id
   * @format int64
   */
  id: number;

  /** 原始图片URL */
  imageUrl: string;

  /** 组合地块id集合 */
  landIds: string[];

  /** 编辑后的logo图片URL */
  logoUrl: string;

  /** 组合名称 */
  name: string;

  /** 涉及地域编号 */
  regionNo: number[];

  /**
   * 空间层次
   * @format int32
   */
  spatialHierarchy: number;
}

export interface LandBundleInfo {
  /**
   * 审核时间
   * @format date-time
   */
  auditAt: string;

  /** 不通过理由 */
  auditReason: string;

  /**
   * 创建时间
   * @format date-time
   */
  createdAt: string;

  /** @format int64 */
  id?: number;

  /** 原始图片url */
  imageUrl: string;

  /** 组合地块id集合 */
  landIds: BaseLandInfo[];

  /** logo地址 */
  logoUrl: string;

  /** 组合名称 */
  name: string;

  /** 涉及地域编号 */
  regionNo: number[];

  /**
   * 空间层级
   * @format int32
   */
  spatialHierarchy: number;

  /**
   * 审核状态（0-待审核，1-已通过，2-审核不通过，3-已经失效）
   * @format int32
   */
  status: number;

  /**
   * 更新时间
   * @format date-time
   */
  updatedAt: string;

  /**
   * 创建者用户id
   * @format int64
   */
  userId: number;
}

export interface LandBundleListInfo {
  /**
   * 审核时间
   * @format date-time
   */
  auditAt: string;

  /** 不通过理由 */
  auditReason: string;

  /**
   * 创建时间
   * @format date-time
   */
  createdAt: string;

  /** @format int64 */
  id?: number;

  /** 原始图片url */
  imageUrl: string;

  /** 组合地块集合 */
  lands: BaseLandInfo[];

  /** logo地址 */
  logoUrl: string;

  /** 组合名称 */
  name: string;

  /** 涉及地域编号 */
  regionNo: number[];

  /**
   * 空间层级
   * @format int32
   */
  spatialHierarchy: number;

  /**
   * 审核状态（0-待审核，1-已通过，2-审核不通过，3-已经失效）
   * @format int32
   */
  status: number;

  /**
   * 更新时间
   * @format date-time
   */
  updatedAt: string;

  /**
   * 创建者用户id
   * @format int64
   */
  userId: number;
}

export interface LandBundleSaveParam {
  /** 原始图片URL */
  imageUrl: string;

  /** 组合地块id集合 */
  landIds: string[];

  /** 编辑后的logo图片URL */
  logoUrl: string;

  /** 组合名称 */
  name: string;

  /** 涉及地域编号 */
  regionNo: number[];

  /**
   * 空间层次
   * @format int32
   */
  spatialHierarchy: number;
}

export interface LandCharacteristicInfo {
  /**
   * 辐射加成百分比
   * @format float
   */
  boostPercentage: number;

  /** 特殊建筑群id */
  id: string;

  /** 建筑群名称 */
  name: string;

  /**
   * 建筑群稀有度
   * @format int32
   */
  rarity: number;
}

export interface LandContentVO {
  /** 地图宣传banner */
  banners?: string[];

  /**
   * 地图id
   * @format int64
   */
  contentId: number;

  /** 地图描述 */
  description?: string;

  /**
   * 点赞数
   * @format int64
   */
  likeCount: number;

  /** 地图名称 */
  name: string;

  /** 更新说明 */
  notice?: string;

  /**
   * 在线用户
   * @format int64
   */
  onlineCount: number;

  /** 地图拥有人信息 */
  owner?: FollowVO;

  /**
   * 游玩次数
   * @format int64
   */
  playCount: number;

  /** 地图playHash */
  playHash: string;

  /** 地图预览图 */
  preview: string;

  /**
   * 发布时间
   * @format date-time
   */
  publishedAt?: string;

  /** 地图tag */
  tags?: string[];
}

export interface LandCoordinateInfo {
  /** Land Id */
  id: string;

  /**
   * 空间层级
   * @format int32
   */
  spatialHierarchy?: number;

  /**
   * X坐标
   * @format float
   */
  x?: number;

  /**
   * Y坐标
   * @format float
   */
  y?: number;
}

export interface LandInfoVO {
  /** 地块是否开放 */
  available: boolean;

  /** 地图宣传banner */
  banners?: string[];

  /**
   * 地图id
   * @format int64
   */
  contentId?: number;

  /** 地图描述 */
  description?: string;

  /** 地块id */
  id: string;

  /** 地块logo图片地址 */
  logoUrl?: string;

  /** 地图名称 */
  name?: string;

  /** 地块拥有人信息 */
  owner?: FollowV2VO;

  /** 地图playHash */
  playHash?: string;

  /** 地图预览图 */
  preview?: string;

  /** 地图tag */
  tags?: string[];

  /**
   * 地块x坐标
   * @format float
   */
  x: number;

  /**
   * 地块y坐标
   * @format float
   */
  y: number;
}

export interface LandListBlock {
  /** 地块id */
  id: string;

  /** 地貌封面图 */
  imageUrl: string;

  /**
   * 地块等级
   * @format int32
   */
  level: number;

  /**
   * 地块名称
   * @format int32
   */
  name: number;

  /**
   * 拥有人id
   * @format int64
   */
  ownerId?: number;

  /** 地块当前售卖价格 */
  price?: number;

  /**
   * 空间层级
   * @format int32
   */
  spatialHierarchy: number;

  /**
   * tokenId
   * @format int32
   */
  tokenId?: number;

  /**
   * x坐标
   * @format float
   */
  x: number;

  /**
   * y坐标
   * @format float
   */
  y: number;
}

export interface LandMap {
  /** 组合 */
  bundles: LandMapBundleInfo[];

  /** 地块 */
  lands: LandMapBlock[];

  /**
   * 空间层级
   * @format int32
   */
  spatialHierarchy: number;
}

export interface LandMapBlock {
  /** 特殊建筑信息 */
  characteristic?: LandCharacteristicInfo;

  /**
   * 地图id
   * @format int64
   */
  contentId?: number;

  /** 地块id */
  id: string;

  /**
   * 地块等级
   * @format int32
   */
  level: number;

  /** 土地名称 */
  name: string;

  /**
   * 在线数量
   * @format int64
   */
  onlineCount: number;

  /**
   * 拥有人id
   * @format int64
   */
  ownerId: number;

  /**
   * 游玩次数
   * @format int64
   */
  playCount: number;

  /** 游戏封面图 */
  preview?: string;

  /**
   * 所属区域编号
   * @format int32
   */
  regionNo: number;

  /**
   * 空间层级
   * @format int32
   */
  spatialHierarchy: number;

  /**
   * 地貌类型Id
   * @format int64
   */
  terrainId: number;

  /**
   * tokenId
   * @format int32
   */
  tokenId?: number;

  /**
   * x坐标
   * @format float
   */
  x: number;

  /**
   * y坐标
   * @format float
   */
  y: number;
}

export interface LandMapBundleInfo {
  /**
   * 组合id
   * @format int64
   */
  id: number;

  /** 原图地址 */
  imageUrl: string;

  /** 组合内的土地id */
  lands: BaseLandInfo[];

  /** logo地址 */
  logoUrl: string;

  /** 所属区域编号 */
  regionNo: number[];

  /**
   * 拥有人id
   * @format int64
   */
  userId: number;
}

export interface LandMapVO {
  /**
   * 六边形地图开放上限圈层
   * @format int32
   */
  cycle: number;

  /** Land地图已被占据的地块信息 */
  occupiedLands: LandPreviewInfo[];
}

export interface LandOnSaleResp {
  /** 是否在售 */
  isOnSale: boolean;

  /** OpenSea链接 */
  permalink?: string;
}

export interface LandPreviewInfo {
  /** 地块是否开放 */
  available: boolean;

  /** 地块id */
  id: string;

  /** 地块logo图片地址 */
  logoUrl?: string;

  /**
   * 地块拥有人id
   * @format int64
   */
  ownerId?: number;

  /**
   * 地块x坐标
   * @format float
   */
  x: number;

  /**
   * 地块y坐标
   * @format float
   */
  y: number;
}

export interface LandSpatialConfigVO {
  /**
   * 高度
   * @format int32
   */
  height: number;

  /**
   * id
   * @format int64
   */
  id: number;

  /** 空间名称 */
  name: string;

  /**
   * 空间层级
   * @format int32
   */
  spatialHierarchy: number;

  /**
   * 宽度
   * @format int32
   */
  width: number;
}

export interface LandTerrain {
  /** 背景色 */
  color: string;

  /**
   * 地貌id
   * @format int64
   */
  id: number;

  /** 地块模型数据(obj类型) */
  objData: LandTerrainModelObj;

  /** 地块模型类型（例如：obj，后续扩展） */
  type: string;
}

export interface LandTerrainModelObj {
  img?: string;
  mtl?: string;
  obj?: string;
}

export interface LandUpgradeParam {
  /** 土地id */
  landId: string;
}

export interface LandUpgradeRecord {
  /** 钱包地址 */
  address: string;

  /**
   * 消耗升级券数量
   * @format int32
   */
  boosterCount: number;

  /**
   * 消耗升级券等级
   * @format int32
   */
  boosterLevel: number;

  /**
   * 升级时间
   * @format date-time
   */
  createdAt: string;

  /**
   * 错误类型(0-其他错误，1-升级券不足)
   * @format int32
   */
  failedType: number;

  /** @format int64 */
  id?: number;

  /** 土地id */
  landId: string;

  /**
   * 升级到的等级
   * @format int32
   */
  nextLevel: number;

  /** 是否已读 */
  readFlag: boolean;

  /**
   * 升级状态(0-升级中，1-升级成功，2-升级失败)
   * @format int32
   */
  status: number;

  /**
   * 更新时间
   * @format date-time
   */
  updatedAt: string;

  /**
   * 升级用户id
   * @format int64
   */
  userId: number;
}

export interface LandVO {
  /** 绑定地图信息 */
  contentInfo: LandContentVO;

  /** 地块信息 */
  landInfo: LandBlockVO;
}

export interface LeaderResp {
  /**
   * ans
   * @format double
   */
  ans?: number;

  /** 用户头像 */
  avatar?: string;

  /** 用户昵称 */
  nickName?: string;

  /**
   * usdt
   * @format double
   */
  usdt?: number;
}

export interface LevelConfigInfo {
  /** 该等级收益加成百分比 */
  boostPercentage: string;

  /**
   * 升到该级所需升级券数量
   * @format int32
   */
  boosterCount: number;

  /**
   * 升级券的等级
   * @format int32
   */
  boosterLevel: number;

  /**
   * 升级券等级
   * @format int32
   */
  level: number;
}

export interface LikeMsgVO {
  /** 点赞/收藏用户头像 */
  avatar: string;

  /** 我的评论 */
  comment?: string;

  /** 评论ID */
  commentId?: string;

  /**
   * 作品ID
   * @format int64
   */
  contentId?: number;

  /** 作品标题 */
  contentTitle?: string;

  /**
   * 作品类型
   * @format int32
   */
  contentType?: number;

  /**
   * 消息创建时间
   * @format date-time
   */
  createdAt?: string;

  /**
   * 消息ID
   * @format int64
   */
  id: number;

  /** 点赞/收藏用户昵称 */
  nickname: string;

  /**
   * 消息类型，200-点赞作品;201-点赞评论;202-收藏作品
   * @format int32
   */
  type: number;

  /**
   * userId
   * @format int64
   */
  userId: number;
}

export interface Link {
  href?: string;
  templated?: boolean;
}

export interface LoginParam {
  /** 电子邮箱 */
  account?: string;

  /**
   * client id:1-web，2-app
   * @format int32
   */
  cid?: number;

  /** 语言：zh_CN-中文，en_US-英文 */
  language?: string;

  /** 密码 */
  password?: string;
}

export interface LotteryActivityVo {
  /** 活动ID */
  activityId: string;

  /** 抽奖码数组，五个分别对应：login,invite friends,play game,join in discord,join in tg */
  codes: string[];

  /** 活动描述 */
  description: string;

  /**
   * 活动结束时间（UTC）
   * @format date-time
   */
  endTime: string;

  /**
   * 邀请的用户数，0-3
   * @format int32
   */
  invitedUserCount: number;

  /** 邀请的用户ID */
  invitedUserId: string[];

  /**
   * 活动开始时间（UTC）
   * @format date-time
   */
  startTime: string;
}

export interface LuckyDrawRecordPageVO {
  /** 奖品id */
  awardsId: string;

  /** 奖品名称 */
  awardsName: string;

  /** 中奖用户昵称 */
  nickname: string;

  /**
   * 中奖时间
   * @format date-time
   */
  time: string;

  /**
   * 中奖用户id
   * @format int64
   */
  userId: number;
}

export interface MapInfoVO {
  /** 渠道ID */
  appId: string;

  /** 作者ID */
  authorId: string;

  /**
   * 组合类型(0-普通地图,1-主图,2-副图)
   * @format int32
   */
  combType: number;

  /**
   * 创建时间（毫秒）
   * @format int64
   */
  createdAt: number;

  /** 地图ID */
  mapId: string;

  /**
   * 发布时间（毫秒）
   * @format int64
   */
  publishedAt?: number;

  /**
   * 发布版本
   * @format int32
   */
  releaseVersion: number;

  /** 创建时的模板ID */
  templateId: string;
}

export interface MapLabelInfo {
  /**
   * 标签id
   * @format int64
   */
  labelId: number;

  /** 标签标识 */
  labelKey: string;

  /** 标签名称 */
  labelName: string;
}

export interface MapOnlineUserVO {
  /**
   * 在线用户数量
   * @format int32
   */
  count: number;

  /** 在线用户列表(不含游客) */
  onlineUsers: BasicUserVO[];
}

export interface MapReleaseInfo {
  /** 地图所属渠道id */
  appId: string;

  /**
   * 作者id
   * @format int64
   */
  authorId: number;

  /**
   * 地图类型 0-普通地图 1-扩展主地图 2-扩展副地图
   * @format int32
   */
  combType: number;

  /**
   * 评论数
   * @format int32
   */
  commentCount: number;

  /** 封面图 */
  cover: string;

  /**
   * 当前上线的版本号
   * @format int32
   */
  currentReleaseVersion?: number;

  /** 地图描述 */
  description: string;

  /**
   * 收藏数
   * @format int32
   */
  favoritesCount: number;

  /** 地图所关联的标签 */
  labels: MapLabelInfo[];

  /**
   * 点赞数
   * @format int32
   */
  likeCount: number;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 地图关联媒体文件（图片、视频） */
  mediaResourcesHash: string[];

  /** 更新日志 */
  notice: string;

  /**
   * 在线用户
   * @format int32
   */
  onlineCount: number;

  /**
   * 游玩次数
   * @format int32
   */
  playCount: number;

  /** 游玩路径 */
  playHash: string;

  /**
   * 版本时间
   * @format date-time
   */
  publishedAt: string;

  /** 地图标题 */
  title: string;

  /**
   * 更新时间
   * @format date-time
   */
  updateAt: string;

  /**
   * 版本号
   * @format int32
   */
  version: number;

  /**
   * 浏览量
   * @format int32
   */
  viewCount: number;
}

export interface MapReleasePlayHashInfo {
  /**
   * 地图id
   * @format int64
   */
  mapId?: number;

  /** 游玩容器 */
  playHash?: string;

  /** 地图名称 */
  title?: string;
}

export interface MapRewardCountVO {
  /**
   * 地图Id
   * @format int64
   */
  mapId: number;

  /**
   * 打赏人数
   * @format int32
   */
  userCount: number;
}

export interface MapSnapshotInfo {
  /** 地图所属渠道id */
  appId: string;

  /**
   * 审核状态（0-Pending, 1-Approved, 2-Denied, 3-CancelAudit, 4-CancelPublish）
   * @format int32
   */
  auditStatus?: number;

  /**
   * 作者id
   * @format int64
   */
  authorId: number;

  /**
   * 地图类型（0-普通地图，1-扩展主图，2-扩展幅图）
   * @format int32
   */
  combType?: number;

  /** 封面图 */
  cover: string;

  /**
   * 创建时间
   * @format date-time
   */
  createdAt: string;

  /** 地图描述 */
  description: string;

  /** 编辑器路径 */
  editHash?: string;

  /** 地图所关联的标签 */
  labels: MapLabelInfo[];

  /**
   * 最新一次发布的版本号
   * @format int32
   */
  latestReleaseVersion?: number;

  /**
   * 点赞数
   * @format int32
   */
  likeCount: number;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 地图关联媒体文件（图片、视频） */
  mediaResourcesHash: string[];

  /** 更新日志 */
  notice: string;

  /**
   * 在线用户
   * @format int32
   */
  onlineCount: number;

  /**
   * 游玩次数
   * @format int32
   */
  playCount: number;

  /** 游玩路径 */
  playHash?: string;

  /** 审核理由 */
  reason?: string[];

  /**
   * 当前上线版本
   * @format int32
   */
  releaseVersion?: number;

  /**
   * 模板id
   * @format int64
   */
  templateId?: number;

  /** 地图标题 */
  title: string;

  /**
   * 更新时间
   * @format date-time
   */
  updatedAt: string;

  /**
   * 浏览量
   * @format int32
   */
  viewCount: number;
}

export interface MapStatisticsInfo {
  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 预览图 */
  preview: string;

  /**
   * 地图首次一次发布时间
   * @format date-time
   */
  publishedAt: string;

  /** 是否为协作地图 */
  shared: boolean;

  /** 地图标题 */
  title: string;

  /**
   * 活跃用户数
   * @format int32
   */
  totalActivePlayerCount: number;

  /**
   * 新增用户数
   * @format int32
   */
  totalNewPlayerCount: number;

  /**
   * 总游玩次数
   * @format int32
   */
  totalPlayCount: number;

  /**
   * 总游玩时长（单位：秒）
   * @format int32
   */
  totalPlayDuration: number;

  /**
   * 累计游玩用户数
   * @format int32
   */
  totalPlayerCount: number;

  /**
   * 总浏览次数
   * @format int32
   */
  totalViewCount: number;

  /**
   * 当前发布地图版本号(为空则表示当前已下架)
   * @format int32
   */
  version: number;
}

export interface MarketAttributes {
  /** 属性类型 */
  traitType: string;

  /** 属性值 */
  value: string;
}

export interface MarketUserVO {
  /** 钱包地址 */
  address: string;

  /** 用户头像 */
  avatar?: string;

  /** 用户昵称 */
  nickname?: string;

  /**
   * 用户id
   * @format int64
   */
  userId?: number;
}

export interface MarketplacePageVo {
  /** NFT藏品分类id */
  collectionId: string;

  /**
   * 绑定的地图id（未绑定则为null）
   * @format int64
   */
  contentId?: number;

  /** Land坐标信息 */
  coordinate?: LandCoordinateInfo;

  /** market item id */
  id: string;

  /** 图片 */
  imageUrl: string;

  /** 地块id */
  landId?: string;

  /** 名称 */
  name: string;

  /** 购买链接 */
  permalink: string;

  /** 当前价格，为空则不是在售 */
  price?: number;

  /**
   * NFT编号
   * @format int32
   */
  tokenId: number;

  /**
   * 0盲盒，1土地
   * @format int32
   */
  type: number;

  /** 用户信息 */
  userVo?: MarketUserVO;
}

export interface Member {
  /** 是否拉黑 */
  ban: boolean;

  /** 是否游客 */
  guest: boolean;

  /** 角色列表 */
  roles: Role[];

  /** 用户ID */
  userId: string;
}

export interface MemberMigrationParam {
  /** 是否拉黑 */
  ban: boolean;

  /** 角色名称列表：为空则表示游客 */
  roles: string[];

  /** 用户ID */
  userId: string;
}

export interface MemberPermissionVO {
  /** 是否为Admin */
  admin: boolean;

  /** 协作身份：为空则表示既非协作者也非游客 */
  collaboration: CollaborationVO;

  /**
   * 地图ID
   * @format int64
   */
  mapId: number;

  /**
   * 地图隐私
   * @format int32
   */
  mapPrivacy: number;

  /** 是否为Owner */
  owner: boolean;
}

export interface MetaDataVO {
  /**
   * 容器ID
   * @format int64
   */
  id: number;

  /** 内网IP */
  ip: string;

  /**
   * 地图ID
   * @format int64
   */
  mapId: number;

  /**
   * 最大在线人数
   * @format int32
   */
  maxPlayers: number;

  /** 模式：play、edit */
  mode: string;

  /** 容器全称 */
  name: string;

  /**
   * 在线人数
   * @format int32
   */
  players: number;

  /**
   * 端口
   * @format int32
   */
  port: number;

  /**
   * 发布版本号: edit传0
   * @format int64
   */
  releaseVersion: number;

  /** 状态：Running、Pending */
  status: string;
}

export interface MetamaskLoginParam {
  /** metamask钱包地址 */
  address: string;

  /** 语言：zh_CN-中文，en_US-英文 */
  language?: string;

  /** metamask签名 */
  sign: string;

  /** 随机校验值 */
  state: string;
}

export interface MetamaskRegisterParam {
  /** metamask钱包地址 */
  address: string;

  /** 电子邮箱(选填) */
  email?: string;

  /** 语言：zh_CN-中文，en_US-英文 */
  language?: string;

  /** 昵称 */
  nickname: string;

  /** 密码 */
  password?: string;

  /** metamask签名 */
  sign: string;

  /** 随机校验值 */
  state: string;

  /** 验证码(邮箱存在时必填) */
  verifyCode?: string;
}

export interface MintStatusVO {
  /**
   * 当前状态结束时间（UTC，注意：当currentStatus=9时，此字段表示的时间可能无意义）
   * @format date-time
   */
  currentEndTime?: string;

  /**
   * 当前状态(0-coming soon, 1-premium whitelist mint countdown, 2-premium whitelist mint, 3-standard whitelist mint countdown, 4-standard whitelist mint, 5-pause, 6-mint end7-reveal countdown, 8-reveal，9-reveal end)
   * @format int32
   */
  currentStatus: number;

  /**
   * 当前服务器时间(UTC)
   * @format date-time
   */
  serverTime: string;
}

export interface MockProductOrderParam {
  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 商品id */
  productId: string;

  /**
   * 商品版本
   * @format int32
   */
  version: number;
}

export interface ModelAndUserVO {
  /** 动画标志 */
  animated: boolean;

  /** 作者信息 */
  author: BasicUserVO;

  /**
   * 模型 id
   * @format int64
   */
  id: number;

  /**
   * 点赞数
   * @format int32
   */
  likeCount?: number;

  /** 模型预览图url */
  previewUrl: string;

  /** 模型名字 */
  title: string;

  /**
   * 浏览量
   * @format int32
   */
  viewCount: number;
}

export interface ModelAndView {
  empty?: boolean;
  model?: object;
  modelMap?: Record<string, object>;
  reference?: boolean;
  status?:
    | '100 CONTINUE'
    | '101 SWITCHING_PROTOCOLS'
    | '102 PROCESSING'
    | '103 CHECKPOINT'
    | '200 OK'
    | '201 CREATED'
    | '202 ACCEPTED'
    | '203 NON_AUTHORITATIVE_INFORMATION'
    | '204 NO_CONTENT'
    | '205 RESET_CONTENT'
    | '206 PARTIAL_CONTENT'
    | '207 MULTI_STATUS'
    | '208 ALREADY_REPORTED'
    | '226 IM_USED'
    | '300 MULTIPLE_CHOICES'
    | '301 MOVED_PERMANENTLY'
    | '302 FOUND'
    | '302 MOVED_TEMPORARILY'
    | '303 SEE_OTHER'
    | '304 NOT_MODIFIED'
    | '305 USE_PROXY'
    | '307 TEMPORARY_REDIRECT'
    | '308 PERMANENT_REDIRECT'
    | '400 BAD_REQUEST'
    | '401 UNAUTHORIZED'
    | '402 PAYMENT_REQUIRED'
    | '403 FORBIDDEN'
    | '404 NOT_FOUND'
    | '405 METHOD_NOT_ALLOWED'
    | '406 NOT_ACCEPTABLE'
    | '407 PROXY_AUTHENTICATION_REQUIRED'
    | '408 REQUEST_TIMEOUT'
    | '409 CONFLICT'
    | '410 GONE'
    | '411 LENGTH_REQUIRED'
    | '412 PRECONDITION_FAILED'
    | '413 PAYLOAD_TOO_LARGE'
    | '413 REQUEST_ENTITY_TOO_LARGE'
    | '414 URI_TOO_LONG'
    | '414 REQUEST_URI_TOO_LONG'
    | '415 UNSUPPORTED_MEDIA_TYPE'
    | '416 REQUESTED_RANGE_NOT_SATISFIABLE'
    | '417 EXPECTATION_FAILED'
    | '418 I_AM_A_TEAPOT'
    | '419 INSUFFICIENT_SPACE_ON_RESOURCE'
    | '420 METHOD_FAILURE'
    | '421 DESTINATION_LOCKED'
    | '422 UNPROCESSABLE_ENTITY'
    | '423 LOCKED'
    | '424 FAILED_DEPENDENCY'
    | '425 TOO_EARLY'
    | '426 UPGRADE_REQUIRED'
    | '428 PRECONDITION_REQUIRED'
    | '429 TOO_MANY_REQUESTS'
    | '431 REQUEST_HEADER_FIELDS_TOO_LARGE'
    | '451 UNAVAILABLE_FOR_LEGAL_REASONS'
    | '500 INTERNAL_SERVER_ERROR'
    | '501 NOT_IMPLEMENTED'
    | '502 BAD_GATEWAY'
    | '503 SERVICE_UNAVAILABLE'
    | '504 GATEWAY_TIMEOUT'
    | '505 HTTP_VERSION_NOT_SUPPORTED'
    | '506 VARIANT_ALSO_NEGOTIATES'
    | '507 INSUFFICIENT_STORAGE'
    | '508 LOOP_DETECTED'
    | '509 BANDWIDTH_LIMIT_EXCEEDED'
    | '510 NOT_EXTENDED'
    | '511 NETWORK_AUTHENTICATION_REQUIRED';
  view?: View;
  viewName?: string;
}

export interface ModelCategoryInfoVo {
  /** 模型 */
  modelList: ModelInfoVo[];

  /** tab标识 */
  tabKey: string;

  /** tab名称 */
  tabName: string;
}

export interface ModelDetailVo {
  /** 动画标志 */
  animated: boolean;

  /** 作者信息 */
  author: ContentAuthorVO;

  /**
   * 评论数
   * @format int64
   */
  commentCount: number;

  /**
   * 发布时间/更新发布时间
   * @format date-time
   */
  createdAt: string;

  /** 模型描述、简介 */
  description: string;

  /**
   * 收藏数
   * @format int64
   */
  favoritesCount: number;

  /**
   * 模型 id
   * @format int64
   */
  id: number;

  /** 是否收藏 */
  isFavorites?: boolean;

  /** 是否点赞 */
  isLike?: boolean;

  /**
   * 点赞数
   * @format int64
   */
  likeCount: number;

  /** 模型文件url */
  modelFileHash: string;

  /**
   * 模型类型[0-私有, 1-共有, 2-项目]
   * @format int32
   */
  modelType: number;

  /** 更新描述 */
  notice?: string;

  /** 模型预览图url */
  previewUrl: string;

  /** 模型名字 */
  title: string;

  /**
   * 浏览量
   * @format int64
   */
  viewCount: number;
}

export interface ModelInfoVo {
  /** 动画标志 */
  animated: boolean;

  /**
   * 模型 id
   * @format int64
   */
  id: number;

  /** 模型预览图url */
  previewUrl: string;

  /** 模型名字 */
  title: string;

  /**
   * 浏览量
   * @format int32
   */
  viewCount: number;
}

export interface ModelSnapshotInfoParam {
  /** 模型描述 */
  description?: string;

  /**
   * 模型ID
   * @format int64
   */
  modelId: number;

  /** 更新说明 */
  notice?: string;

  /** 标题 */
  title: string;
}

export interface ModelSnapshotInfoVo {
  /** 描述 */
  description?: string;

  /**
   * 模型ID
   * @format int64
   */
  modelId: number;

  /** 更新描述 */
  notice?: string;

  /** 封面图 */
  previewUrl?: string;

  /**
   * 发布版本号，取消发布/下架情况下保留版本号，可判断是否发布过 -> 不为空且大于0
   * @format int32
   */
  releaseVersion?: number;

  /** 模型名称 */
  title?: string;
}

export interface ModelSnapshotVO {
  /**
   * 快照-生成时间
   * @format date-time
   */
  createdAt: string;

  /** 快照-模型文件 hash */
  modelFileHash: string;

  /** 快照-模型文件 */
  modelFileUUID: string;

  /** 快照-模型文件url */
  modelFileUrl: string;

  /** 快照-模型预览图 hash */
  modelPreviewHash: string;

  /** 快照-模型预览图 */
  modelPreviewUUID: string;

  /** 快照-模型预览图url */
  modelPreviewUrl: string;

  /** 快照-模型的工程文件 hash */
  projectFileHash: string;

  /** 快照-模型的工程文件 */
  projectFileUUID: string;

  /** 快照-模型的工程文件url */
  projectFileUrl: string;

  /**
   * 快照 id
   * @format int64
   */
  snapshotId: number;
}

export interface ModelTemplateResp {
  /** 描述 */
  description: string;

  /**
   * 模板id
   * @format int64
   */
  id: number;

  /** 名称 */
  name: string;

  /** 封面图 */
  previewUrl: string;
}

export interface ModelUgcPageInfoVo {
  /**
   * 审核状态
   * @format int32
   */
  auditStatus?: number;

  /**
   * 模型创建时间
   * @format date-time
   */
  createdAt: string;

  /**
   * 最新已发布的版本号，没有则代表 Not Published
   * @format int32
   */
  curVersion?: number;

  /** 描述 */
  description?: string;

  /** 模型文件url */
  fileUrl: string;

  /**
   * 模型ID
   * @format int64
   */
  id: number;

  /**
   * 模型类型[0-私有, 1-共有, 2-项目]
   * @format int32
   */
  modelType: number;

  /** 更新描述 */
  notice?: string;

  /** 封面图 */
  previewUrl?: string;

  /** 模型的工程文件url */
  projectFileUrl: string;

  /** 审核不通过原因 */
  reason?: string[];

  /**
   * 发布版本号，取消发布/下架情况下保留版本号，可判断是否发布过 -> 不为空且大于0
   * @format int32
   */
  releaseVersion?: number;

  /** 模型名称 */
  title: string;

  /**
   * 模型最后修改时间
   * @format date-time
   */
  updatedAt?: string;

  /**
   * 总浏览量
   * @format int32
   */
  viewCount?: number;
}

export interface MsgCountVO {
  /**
   * 数量
   * @format int32
   */
  count: number;

  /**
   * 消息类型，1-评论；2-赞和收藏；3-系统消息
   * @format int32
   */
  type: number;
}

export interface MysteryListVO {
  /** 已开盒的土地 */
  lands: LandBlock[];

  /**
   * 剩余盲盒数量
   * @format int32
   */
  remainingCount: number;

  /** 剩余盲盒的tokenId（按tokenId升序） */
  remainingTokenIds: number[];

  /**
   * 总数
   * @format int32
   */
  totalCount: number;
}

export interface MysteryRecordRollVO {
  /** 拥有人钱包地址（加密） */
  address: string;

  /** 稀有度 */
  rarity: string;
}

export interface MysteryRevealParam {
  /** metamask钱包地址 */
  address: string;

  /** metamask签名 */
  sign: string;

  /** 随机校验值 */
  state: string;

  /**
   * 需要开启的tokenId
   * @format int32
   */
  tokenId: number;
}

export interface NFTInfo {
  /** NFT图片地址 */
  imageUrl: string;

  /** NFT名称 */
  name?: string;

  /** NFT在opensea链接 */
  permalink?: string;

  /** 项目名 */
  projectName?: string;

  /** 拥有者名称 */
  username?: string;
}

export interface NFTWorldsClaimAwardsRecordVO {
  /**
   * 数量
   * @format int32
   */
  count: number;

  /** id */
  id: string;

  /** 名称 */
  name: string;
}

export interface NFTWorldsClaimStatusVO {
  firstTime: boolean;

  /** @format int32 */
  passType: number;

  /** @format int64 */
  remainingSecond: number;
}

export interface ParkourActivityInfoVO {
  /** 展示期结束时间 */
  announcementEndTime?: string;

  /** 展示期开始时间 */
  announcementStartTime?: string;

  /** 创作期结束时间 */
  creationEndTime?: string;

  /** 创作期开始时间 */
  creationStartTime?: string;

  /** 投票期结束时间 */
  selectionEndTime?: string;

  /** 投票期开始时间 */
  selectionStartTime?: string;

  /**
   * 活动状态 0：upcoming, 1：ongoing, 10：创作期， 11：投票期，12：公示期，2：ended
   * @format int32
   */
  status?: number;

  /** 是否可投票 */
  voteEnabled?: boolean;
}

export interface ParkourContentVO {
  /**
   * 作品id
   * @format int64
   */
  contentId?: number;

  /** 作品名称 */
  contentName?: string;

  /** 作品地图hash */
  playHash?: string;

  /** 作品预览图 */
  preview?: string;

  /** 团队名称 */
  teamName?: string;

  /**
   * 用户已投票数
   * @format int32
   */
  userVotedCount?: number;

  /**
   * 作品总得票数
   * @format int32
   */
  voteCount?: number;
}

export interface PassFormActivityDetailVO {
  /** 活动id */
  activityId: string;

  /**
   * 当前用户贡献数（分享成功数）
   * @format int32
   */
  contributorNum?: number;

  /**
   * 活动截止时间
   * @format date-time
   */
  endTime?: string;

  /** 已提交过的表单内容json串，为空则说明没有提交过 */
  form?: string;

  /** 当前用户推荐码 */
  recommendCode?: string;

  /**
   * 活动开始时间
   * @format date-time
   */
  startTime?: string;
}

export interface PassFormActivityInfoVO {
  /** 是否显示入口 */
  entryVisible?: boolean;

  /**
   * 参与人数
   * @format int32
   */
  playerNum?: number;
}

export interface PassFormSubmitParam {
  /** 活动id */
  activityId: string;

  /** Discord ID */
  discordId?: string;

  /** 提交人email */
  email: string;

  /** 邮箱验证码 */
  emailCode?: string;

  /** 表单内容json字符串，json格式由前端决定，后端不做任何修改 */
  form: string;

  /** 来源推荐码 */
  recommendCode?: string;

  /** Twitter地址 */
  twitterLink?: string;

  /** 钱包地址 */
  walletAddress: string;
}

export interface PerfectProfilesParam {
  /** 验证码 */
  code?: string;

  /** 昵称 */
  nickname?: string;

  /** 手机号 */
  phone?: string;

  /** 密码 */
  pwd?: string;
}

export interface PhoneCodeLoginParam {
  /** 验证码 */
  code: string;

  /** 手机号 */
  phone: string;
}

export interface PhoneCodeSendParam {
  /**
   * 验证码类型，7-完善账号，10-校验手机号，11-更改手机号，12-设置密码
   * @format int32
   */
  codeType: number;

  /** 手机号，前缀要加国际区号 */
  phone?: string;
}

export interface PhoneCodeVerifyParam {
  /** 验证码 */
  code: string;

  /**
   * 验证码类型，11-更改手机号
   * @format int32
   */
  codeType: number;
}

export interface PhonePwdLoginParam {
  /** 手机号 */
  phone: string;

  /** 密码 */
  pwd: string;
}

export interface PlayerBehaviorInfo {
  /** 互动数据 */
  interactionData?: BehaviorInteractionData;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 游玩数据 */
  playData?: BehaviorPlayData;
}

export interface PlayerRetentionInfo {
  /**
   * 次日留存人数
   * @format int32
   */
  day1Retention: number;

  /**
   * 第三十天留存人数
   * @format int32
   */
  day30Retention: number;

  /**
   * 第七天留存人数
   * @format int32
   */
  day7Retention: number;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 日期 */
  time: string;

  /**
   * 总人数
   * @format int32
   */
  totalPlayerCount: number;
}

export interface PlayerStatisticsInfo {
  /**
   * 活跃用户数增长率（1 = 0.01%）
   * @format int32
   */
  activePlayerCountGrowthRate?: number;

  /** 每日活跃用户纵坐标值（逗号分割，前端自己解决横坐标，为了压缩数据量） */
  dailyActivePlayerCount: string;

  /** 每日新增用户纵坐标值（逗号分割，前端自己解决横坐标，为了压缩数据量） */
  dailyNewPlayerCount: string;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /**
   * 新增用户数增长率（1 = 0.01%）
   * @format int32
   */
  newPlayerCountGrowthRate?: number;

  /**
   * 累计游玩增长率（1 = 0.01%）
   * @format int32
   */
  playerCountGrowthRate?: number;

  /**
   * 活跃用户数
   * @format int32
   */
  totalActivePlayerCount: number;

  /**
   * 新增用户数
   * @format int32
   */
  totalNewPlayerCount: number;

  /**
   * 累计游玩用户数
   * @format int32
   */
  totalPlayerCount: number;
}

export interface PlayerSurvivingResp {
  /** @format int32 */
  survivingCount?: number;
}

export interface PreAvatarVo {
  /** 头像地址 */
  avatar?: string;

  /**
   * 头像编号
   * @format int32
   */
  id?: number;
}

export interface ProductDetailResp {
  /** 是否允许广告支付 */
  adPay: boolean;

  /**
   * 币种
   * @format int32
   */
  coin: number;

  /** 封面 */
  cover: string;

  /** 描述 */
  description: string;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 价格 */
  price: string;

  /** 商品id */
  productId: string;

  /** 是否发布 */
  published: boolean;

  /**
   * 状态
   * @format int32
   */
  status: number;

  /** 标题 */
  title: string;

  /**
   * 版本
   * @format int32
   */
  version: number;
}

export interface ProductPublishParam {
  /** 商品id */
  productId: string;

  /** 是否发布 */
  published: boolean;
}

export interface ProductResp {
  /** 是否允许广告支付 */
  adPay: boolean;

  /**
   * 作者id
   * @format int64
   */
  authorId: number;

  /**
   * 币种
   * @format int32
   */
  coin: number;

  /** 封面 */
  cover: string;

  /** 描述 */
  description: string;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 价格 */
  price: string;

  /** 商品id */
  productId: string;

  /** 标题 */
  title: string;

  /**
   * 版本
   * @format int32
   */
  version: number;
}

export interface ProductSubmitAuditParam {
  /** 商品id */
  productId: string;
}

export interface PutObjectResp {
  dir?: string;
  fileName?: string;
  fullPath?: string;
  isSuccess?: boolean;
  msg?: string;
  url?: string;
  versionId?: string;
}

export interface QuestNData {
  /** the user done the task */
  result: boolean;
}

export type QuestNError = object;

export interface QuestNResult {
  /** 校验结果 */
  data: QuestNData;

  /** 报错信息 */
  error?: QuestNError;
}

export interface RaffleTicketNumVo {
  /**
   * 一天能获得多少抽奖券
   * @format int32
   */
  dayMaxTicket: number;

  /**
   * 当前还能获得多少抽奖券
   * @format int32
   */
  dayRemainTicket: number;

  /**
   * 总的抽奖券剩余数量
   * @format int32
   */
  ticketNum: number;
}

export interface RechargeActivityVO {
  /** 累积充值N元 */
  accumulate: string;

  /** 小鱼干奖励 */
  driedFish: string;

  /** 是否已领取奖励 */
  isReceived: boolean;

  /** 是否有皮肤奖励 */
  skinReward: boolean;

  /**
   * 任务状态，0->初始；1->未完成；2->已完成
   * @format int32
   */
  status: number;

  /**
   * 任务，1-4
   * @format int32
   */
  task: number;
}

export interface RechargeOrderParam {
  /**
   * itemOptionId
   * @format int64
   */
  itemOptionId: number;

  /**
   * 支付方式，微信Native支付->10; 微信H5支付->11; 支付宝Web支付->20; 支付宝Wap支付->21;
   * @format int32
   */
  paymentType: number;

  /**
   * 支付宝PC扫码支付的方式。默认4
   * 支持前置模式和跳转模式。
   * 前置模式是将二维码前置到商户的订单确认页的模式。需要商户在自己的页面中以 iframe 方式请求支付宝页面。具体支持的枚举值有以下几种：
   * 0：订单码-简约前置模式，对应 iframe 宽度不能小于600px，高度不能小于300px；
   * 1：订单码-前置模式，对应iframe 宽度不能小于 300px，高度不能小于600px；
   * 3：订单码-迷你前置模式，对应 iframe 宽度不能小于 75px，高度不能小于75px；
   * 4：订单码-可定义宽度的嵌入式二维码，商户可根据需要设定二维码的大小。
   * 跳转模式下，用户的扫码界面是由支付宝生成的，不在商户的域名下。支持传入的枚举值有：
   * 2：订单码-跳转模式
   * 枚举值
   * 订单码-简约前置模式: 0
   * 订单码-前置模式: 1
   * 订单码-迷你前置模式: 3
   * 订单码-可定义宽度的嵌入式二维码: 4
   */
  qrPayMode?: string;

  /**
   * 支付宝商户自定义二维码宽度。默认100。注：qr_pay_mode=4时该参数生效
   * @format int64
   */
  qrcodeWidth?: number;
}

export interface RechargeOrderVO {
  /** 充值金额 */
  amount: string;

  /**
   * 充值币种
   * @format int32
   */
  coin: number;

  /**
   * 下单时间
   * @format date-time
   */
  createdAt: string;

  /**
   * 订单过期时间，UTC
   * @format date-time
   */
  expireAt?: string;

  /**
   * 充值订单号
   * @format int64
   */
  orderId: number;

  /**
   * 支付订单号
   * @format int64
   */
  paymentOrderId: number;

  /** 支付返回结果。微信Native返回二维码链接；微信H5支付返回链接；支付宝支付都返回脚本 */
  paymentResult: string;

  /**
   * 订单状态
   * @format int32
   */
  status: number;

  /**
   * 使用币种
   * @format int32
   */
  token: number;

  /** 使用币种数量 */
  tokenAmount: string;
}

export interface RedeemTicketParam {
  /**
   * 兑换抽奖券数量
   * @format int32
   */
  ticket: number;
}

export interface RedeemableTicketVO {
  /**
   * 每日可兑换
   * @format int32
   */
  dayRedeemableTicket: number;

  /**
   * 剩余可兑换
   * @format int32
   */
  todayRedeemableTicket: number;
}

export interface RelationInfoVo {
  /**
   * 粉丝数
   * @format int32
   */
  followerNum: number;
  /**
   * 关注人数
   * @format int32
   */
  followingNum: number;
  /**
   * 朋友数量（相互关注）
   * @format int32
   */
  friendsNum: number;
}

export interface ResetEmailParam {
  /** 新邮箱的验证码 */
  code: string;

  /** 新邮箱 */
  email: string;

  /** 验证旧邮箱拿到的token */
  token: string;
}

export interface ResetPasswordParam {
  /** 验证码 */
  code: string;

  /** 手机号 */
  phone: string;

  /** 新密码 */
  pwd: string;
}

export interface ResetPwdParam {
  /** 新密码 */
  pwd: string;

  /** token */
  token: string;
}

export interface ReviveParam {
  /** 加密的 boxId */
  encodeBoxId?: string;

  /**
   * 当日场次d
   * @format int32
   */
  round?: number;
}

export interface RewardCenterAwardInfoVO {
  /**
   * 获奖类型：5-whitelist,10-社区合作白单,11-land s,12-land a, 13-land b,14-land c, 15-6000 TETH, 16-5000 TETH, 17-3000 TETH, 18-2000 TETH, 19-1000 TETH, 20-500 TETH, 21-300 TETH, 22-2000 TIRA, 23-1800 TIRA, 24-500 TIRA
   * @format int32
   */
  awardsType: number;

  /** 获奖值 1份 */
  awardsVal?: string;

  /**
   * 获奖时间
   * @format date-time
   */
  createdAt?: string;

  /** 获奖用户昵称 */
  nickname?: string;
}

export interface RewardCenterAwardVO {
  /**
   * 获奖类型：5-whitelist,10-社区合作白单,11-land s,12-land a, 13-land b,14-land c, 15-6000 TETH, 16-5000 TETH, 17-3000 TETH, 18-2000 TETH, 19-1000 TETH, 20-500 TETH, 21-300 TETH, 22-2000 TIRA, 23-1800 TIRA, 24-500 TIRA
   * @format int32
   */
  awardsType: number;

  /** 获奖值 1份 */
  awardsVal?: string;
}

export interface RewardConfigMassVO {
  nextGameConfig?: RewardConfigVO;
  todayConfigs?: RewardConfigVO[];
}

export interface RewardConfigVO {
  /**
   * ans 数量
   * @format int32
   */
  ans?: number;

  /**
   * 比赛结束时间
   * @format date-time
   */
  endTime?: string;

  /**
   * nft 数量
   * @format int32
   */
  nft?: number;

  /** nft 名字 */
  nftName?: string;

  /**
   * 场次
   * @format int32
   */
  round: number;

  /** 游戏端映射的 key */
  season: string;

  /**
   * 比赛开始时间
   * @format date-time
   */
  startTime: string;

  /**
   * usdt 数量
   * @format int32
   */
  usdt?: number;

  /**
   * 白名单数量
   * @format int32
   */
  wl?: number;
}

export interface RewardHistoryResp {
  /** 比赛的日期 */
  date?: string;

  /** 用户昵称 */
  nickName?: string;

  /** nft */
  npfName?: string;

  /**
   * 数量
   * @format double
   */
  quantity?: number;

  /**
   * 比赛场次
   * @format int32
   */
  round?: number;

  /**
   * 代币的类型
   * @format int32
   */
  tokenType?: number;

  /**
   * 用户
   * @format int64
   */
  userId?: number;
}

export interface RewardParam {
  /**
   * 打赏档位ID
   * @format int64
   */
  id: number;

  /**
   * 打赏地图ID
   * @format int64
   */
  mapId: number;
}

export interface Role {
  /** 角色ID */
  id: string;

  /** 角色名称 */
  roleName: string;
}

export interface RoleMigrationParam {
  /** 角色名称 */
  name: string;

  /** 权限点 */
  permissions: string[];
}

export interface RollingRewardResp {
  /** 用户头像 */
  avatar?: string;

  /** 如果是 nft 类型, nft 名字  */
  nftName?: string;

  /** 用户昵称 */
  nickName?: string;

  /**
   * 数量
   * @format double
   */
  quantity?: number;

  /** 代币类型 */
  tokenType?: string;
}

export interface RoomAuthorVO {
  /** @format int64 */
  authorId?: number;
  nickname?: string;
}

export interface RoomAwardsRecordPageVo {
  /**
   * 获奖类型：1限定家具；2高级家具；3ANS 10；4抽奖券；5土地白单；6USDT；7ANS 50
   * @format int32
   */
  awardsType: number;

  /** 获奖值，ANS数、家具ID、USDT数 */
  awardsVal?: string;

  /**
   * 获奖时间
   * @format date-time
   */
  createdAt: string;

  /** 家具名称 */
  furnName?: string;

  /**
   * 发奖时间，为空就是还没发放
   * @format date-time
   */
  releaseTime: string;
}

export interface RoomContentVO {
  /** 作品所属用户信息 */
  author: RoomAuthorVO;

  /** room作品轮播图 */
  banners: string[];

  /**
   * room作品id
   * @format int64
   */
  contentId: number;

  /** room作品描述 */
  description: string;

  /** room作品标题 */
  name: string;

  /**
   * 在线人数
   * @format int32
   */
  onlineCount: number;

  /**
   * 被游玩次数
   * @format int32
   */
  playCount: number;

  /** room作品地图hash */
  playHash: string;

  /** room作品小封面图 */
  preview: string;

  /**
   * 模板类型id
   * @format int64
   */
  templateId: number;
}

export interface RoomCreateParam {
  /**
   * 模板id
   * @format int64
   */
  templateId: number;

  /** 标题 */
  title: string;
}

export interface RoomDeleteParam {
  /**
   * room作品id
   * @format int64
   */
  contentId: number;
}

export interface RoomDesignInfoV2Vo {
  /** 房主头像 */
  avatar?: string;

  /**
   * contentId
   * @format int64
   */
  contentId?: number;

  /** contentName */
  contentName?: string;

  /**
   * 点赞数量
   * @format int32
   */
  likeCount?: number;

  /** 进入房间的用户当天是否点赞过该房间 */
  likeRecord?: boolean;

  /** 我的房间游玩容器 */
  myRoomPlayHash?: string;

  /**
   * 新家具数量，上次点击Decoration之后新增的家具
   * @format int32
   */
  newFurnNum: number;

  /** 用户昵称 xxx‘s Room */
  nickName?: string;

  /**
   * 游玩数量
   * @format int32
   */
  playCount?: number;

  /**
   * 抽奖券数量，仅获取本人房间信息时返回
   * @format int32
   */
  raffleTicketNum: number;

  /**
   * 房间ID
   * @format int64
   */
  roomId?: number;

  /**
   * 房间用户createra id
   * @format int64
   */
  userId?: number;
}

export interface RoomDesignVo {
  /**
   * 内容ID
   * @format int64
   */
  contentId: number;

  /** 内容名称 */
  contentName: string;

  /** 房间是否为本次创建 */
  createInThisTime: boolean;

  /** 游玩容器 */
  playHash: string;
}

export interface RoomFurnLinkV2Param {
  /** 家具编号 */
  furnId: string;

  /** 家具链接，为空则设置空 */
  link?: string;
}

export interface RoomFurnParam {
  /**
   * 家具ID
   * @format int64
   */
  id: number;

  /** 家具链接 */
  link?: string;

  /**
   * 家具类型
   * @format int32
   */
  type?: number;
}

export interface RoomFurnVo {
  /** 家具编号 */
  furnId: string;

  /** 家具图片 */
  furnImage: string;

  /**
   * 家具ID
   * @format int64
   */
  id: number;

  /** 家具链接 */
  link?: string;

  /** 家具名 */
  name: string;

  /** 家具标签：主题标签以及合作标签->看theme字段、等级标签->level-general普通家具；level-restrictive限定家具；level-superior高级家具 */
  tag: string[];

  /** 家具主题：theme-cute；theme-jp-style；theme-hallowmas；theme-frog；theme-game；partner-wonderpals；partner-kopoko；theme-twitter；theme-world-cup；theme-cute-2；theme-jp-style-2；theme-game-2；theme-frog-2 */
  theme: string;

  /** 家具主题图片 */
  themeImage: string;

  /**
   * 家具类型 1墙纸、2地板、3电视、4桌子、5挂饰、6床、7衣柜、8茶几
   * @format int32
   */
  type: number;
}

export interface RoomInstalledFurnVo {
  /** 房间用户boxId */
  boxId: string;

  /**
   * 房间用户boxUserId
   * @format int64
   */
  boxUserId: number;

  /** 家具 */
  furnList?: RoomFurnVo[];

  /**
   * 房间用户ID
   * @format int64
   */
  userId: number;
}

export interface RoomLotteryAwardsVo {
  /**
   * 获奖类型：1限定家具；2高级家具；3ANS 10；4抽奖券；5土地白单；6USDT(此处弃用)；7ANS 50; 8USDT 10
   * @format int32
   */
  awardsType: number;

  /** 中奖值，ANS数、家具ID、USDT数 */
  awardsVal?: string;

  /** 家具图片 */
  furnImage?: string;

  /** 家具名称 */
  furnName?: string;
}

export interface RoomOfficialParam {
  /**
   * 点赞数量
   * @format int32
   */
  likeCount?: number;

  /** 家具链接 */
  link?: string;

  /** 创建官方账号校验码 */
  sign?: string;

  /**
   * 主题ID，没有则随机
   * @format int64
   */
  themeId?: number;

  /**
   * 用户ID
   * @format int64
   */
  userId?: number;
}

export interface RoomOfficialVo {
  /** 游玩容器 */
  playHash: string;
}

export interface RoomRankingListVo {
  /** 我的排名 */
  myRanking?: RoomRankingVo;

  /** 分页信息 */
  page?: PageResponseRoomRankingVo;
}

export interface RoomRankingVo {
  /** 头像 */
  avatar?: string;

  /** 奖金，USDT */
  awards?: string;

  /**
   * roomId
   * @format int64
   */
  id: number;

  /**
   * 点赞数量
   * @format int64
   */
  likeCount: number;

  /** 房主昵称，前端加上 's room 即为房间名 */
  nickname: string;

  /** 排序 */
  order: string;

  /** 游玩容器 */
  playHash: string;

  /**
   * userId 房主ID，可判断是否属于本人房间
   * @format int64
   */
  userId: number;
}

export interface RoomTagVo {
  /** USDT奖金 */
  awards?: string;

  /** 标签key：room-rank排行榜；room-restrictive限定家具；room-superior高级家具；room-airdrop空投；room-lottery抽奖；room-integrity家具完整度 */
  key: string;

  /**
   * 用户排名
   * @format int32
   */
  order?: number;
}

export interface RoomUpdateProfileParam {
  /**
   * room作品id
   * @format int64
   */
  contentId: number;

  /** 新标题 */
  title: string;
}

export interface SaveModelParam {
  /** 动画标志 */
  animated?: boolean;

  /** 自动保存/手动保存 */
  autoSave: boolean;

  /** 模型文件哈希 */
  modelFileHash: string;

  /**
   * 模型 id - 新建为空
   * @format int64
   */
  modelId?: number;

  /** 模型名字 */
  modelName: string;

  /** 模型预览图哈希 */
  modelPreviewFileHash: string;

  /** 模型工程哈希 */
  modelProjectFileHash: string;
}

export interface SaveProjectSharedModelParam extends SaveModelParam {
  /**
   * 地图id
   * @format int64
   */
  mapId: number;
}

export interface SaveModelParamV1 extends SaveModelParam {
  /**
   * 模型类型
   * @format int32
   */
  modelType: ModelType;
  /**
   * 创作模式，1自由创作(默认)；2定向创作-人物装扮
   * @format int32
   */
  creativeMode?: CreativeMode;
}

export interface SaveSharedSkinParam extends SaveModelParamV1 {
  /**
   * 地图id
   * @format int64
   */
  mapId: number;
}

export interface SendCmLoginCodeParam {
  /** 用户设备id */
  deviceId?: string;

  /** 编程猫账号-手机号 */
  phone: string;
}

export interface SetEmailParam {
  /** 邮箱验证码 */
  code: string;

  /** 邮箱 */
  email: string;
}

export interface SetMetamaskParam {
  /** metamask钱包地址 */
  address: string;

  /** metamask签名 */
  sign: string;

  /** 随机校验值 */
  state: string;
}

export interface SignInTaskProgressResp {
  /**
   * 活动阶段
   * @format int32
   */
  activityStage: number;

  /**
   * 当前需要操作的任务
   * @format int32
   */
  currentTask: number;

  /** 阶段结束日期 */
  endTime: string;

  /**
   * 补签次数
   * @format int32
   */
  reSignTimes: number;

  /** 每日签到信息 */
  signInTasks: SignInTaskResp[];

  /** 阶段开始日期 */
  startTime: string;
}

export interface SignInTaskResp {
  /**
   * 奖励类型 1-小鱼干 2-皮肤
   * @format int32
   */
  category: number;

  /** 日期 */
  date: string;

  /** 奖励内容：eg:2 / {皮肤封面图} */
  reward: string;

  /**
   * 签到状态：0-未签到 1-可补签 2-已签到
   * @format int32
   */
  signInStatus: number;

  /**
   * 约定的taskId
   * @format int32
   */
  task: number;
}

export interface SimpleContentAndUserVO {
  /** 作者信息 */
  author: BasicUserVO;

  /**
   * 地图id
   * @format int64
   */
  contentId: number;

  /** 地图描述 */
  description?: string;

  /**
   * 点赞数
   * @format int32
   */
  likeCount?: number;

  /** 地图名称 */
  name: string;

  /**
   * 在线人数
   * @format int64
   */
  onlineCount: number;

  /**
   * 游玩人数
   * @format int64
   */
  playCount: number;

  /** 地图playHash */
  playHash: string;

  /** 地图预览图 */
  preview?: string;
}

export interface SimpleContentInfoVO {
  /**
   * 地图id
   * @format int64
   */
  contentId: number;

  /** 地图描述 */
  description?: string;

  /** 地图名称 */
  name: string;

  /**
   * 在线人数
   * @format int64
   */
  onlineCount?: number;

  /**
   * 游玩人数
   * @format int64
   */
  playCount?: number;

  /** 地图playHash */
  playHash: string;

  /** 地图预览图 */
  preview?: string;
}

export interface StakeAssetVO {
  /** 可领取的积分 */
  claimablePoints: string;

  /**
   * 平台币种
   * @format int32
   */
  coin: number;

  /** 每日收益 */
  dailyRate: string;

  /** 土地ID */
  id: string;

  /** 封面图 */
  imageUrl: string;

  /** 土地名称 */
  name: string;

  /** 拥有者钱包 */
  ownerAddress: string;

  /**
   * 拥有人id
   * @format int64
   */
  ownerId: number;

  /** 土地评级 */
  rarity: string;

  /**
   * 质押时间
   * @format int64
   */
  stakeTime: number;

  /**
   * 质押天数
   * @format int32
   */
  stakedDays: number;

  /**
   * 质押状态 0-未质押，1-已质押，2-pending
   * @format int32
   */
  status: number;

  /**
   * tokenId
   * @format int32
   */
  tokenId: number;

  /**
   * 解质押时间
   * @format int64
   */
  unstakeTime: number;

  /**
   * x坐标
   * @format float
   */
  x: number;

  /**
   * y坐标
   * @format float
   */
  y: number;
}

export interface StakeCancelParam {
  /** 地块ID */
  landId: string;
}

export interface StakeConfigVO {
  /** 质押活动配置 */
  activityInfoVO: ActivityInfoVO;

  /** 收益详情Url */
  descriptionOfRateUrl: string;

  /** 详情页Url */
  moreDetailUrl: string;
}

export interface StakeDashboardResp {
  /** 可领取的积分 */
  claimablePoints: string;

  /** 每日增长的积分 */
  dailyRate: string;

  /** 已领取的积分 */
  totalClaimedPoints: string;
}

export interface StakeParam {
  /** 地块ID */
  landId: string;
}

export interface StakeRankResp {
  /** 昵称 */
  nickname: string;

  /**
   * 排名
   * @format int32
   */
  rank: number;

  /**
   * 排名变化
   * @format int32
   */
  rankChange: number;

  /** 积分总数 */
  score: string;

  /**
   * 质押地块数量
   * @format int32
   */
  stakedLands: number;

  /** 质押每日积分收益 */
  stakingRate: string;

  /**
   * 到达该分数的时间戳(毫秒)
   * @format int64
   */
  updatedAt: number;

  /**
   * 用户ID
   * @format int64
   */
  userId: number;
}

export interface StakeResp {
  /**
   * 领取时间
   * @format int64
   */
  claimTime: number;

  /** 可领取的积分 */
  claimablePoints: string;

  /**
   * 平台币种
   * @format int32
   */
  coin: number;

  /** 每日收益 */
  dailyRate: string;

  /** 土地ID */
  id: string;

  /** 封面图 */
  imageUrl: string;

  /** 是否质押 */
  isStaked: boolean;

  /** 土地名称 */
  name: string;

  /** 拥有者钱包 */
  ownerAddress: string;

  /**
   * 拥有人id
   * @format int64
   */
  ownerId: number;

  /** 土地评级 */
  rarity: string;

  /**
   * 质押时间
   * @format int64
   */
  stakeTime: number;

  /**
   * 质押天数
   * @format int32
   */
  stakedDays: number;

  /**
   * tokenId
   * @format int32
   */
  tokenId: number;

  /**
   * 解质押时间
   * @format int64
   */
  unstakeTime: number;

  /**
   * x坐标
   * @format float
   */
  x: number;

  /**
   * y坐标
   * @format float
   */
  y: number;
}

export interface StakeV2Param {
  /** 地块ID */
  tokenIds: number[];

  /** tx_hash */
  txHash: string;
}

export interface StaticConfigVo {
  /**
   * 复活一次消耗多少 ans
   * @format int32
   */
  revive2Resume?: number;

  /**
   * 复活次数的限制
   * @format int32
   */
  reviveTimesLimit?: number;

  /**
   * 填了邀请码对方获取: ans 数
   * @format int32
   */
  share2Earn?: number;

  /**
   * 填了邀请码自己获取: ans 数
   * @format int32
   */
  useShareCode2Earn?: number;
}

export interface StatisticsMapInfo {
  /**
   * 地图id
   * @format int64
   */
  mapId: number;

  /** 预览图 */
  preview: string;

  /**
   * 地图首次一次发布时间
   * @format date-time
   */
  publishedAt: string;

  /** 是否为协作地图 */
  shared: boolean;

  /** 地图标题 */
  title: string;

  /**
   * 当前发布地图版本号(为空则表示当前已下架)
   * @format int32
   */
  version: number;
}

export interface StickerPackVO {
  /** 表情列表 */
  stickers: StickerVO[];

  /** 表情主题ID */
  themeId: string;

  /** 表情主题名称 */
  themeName: string;
}

export interface StickerVO {
  /**
   * 表情ID
   * @format int64
   */
  stickerId: number;

  /** 表情名称 */
  stickerName: string;

  /** 表情图片地址 */
  stickerUrl: string;
}

export interface SubmitShareCodeParam {
  /** 邀请码 */
  shareCode: string;
}

export interface SuitVo {
  /** 模块，当前套装包含的模块，返回此信息方便换装，如果是整套不可拆分的情况或者本身就是模块，则为空 */
  avatarSkinInfos?: AvatarSkinInfoVo[];

  /** 基础组件 */
  componentList: AvatarComponentVo[];

  /**
   * 套装/模块ID
   * @format int64
   */
  id: number;

  /** 是否可拆分 */
  isDisassemble: boolean;

  /** 是否公开，可区分是否为用户拥有 */
  isPublic: boolean;

  /** 预览图 */
  previewUrl: string;

  /** 套装名字 */
  suitName: string;
}

export interface SysMsgVO {
  /**
   * 作品ID
   * @format int64
   */
  contentId?: number;

  /** 作品标题 */
  contentTitle?: string;

  /**
   * 作品类型
   * @format int32
   */
  contentType?: number;

  /**
   * 消息创建时间
   * @format date-time
   */
  createdAt?: string;

  /** 跳转链接 */
  hasLink: boolean;

  /**
   * 消息ID
   * @format int64
   */
  id: number;

  /** 消息体 */
  msgContent: string;

  /** 消息标题 */
  title: string;

  /**
   * 消息类型，300-封号;301-作品审核结果-通过;302-作品审核不通过;303-所收藏作品更新;304-所关注作者发布新作品
   * @format int32
   */
  type: number;
}

export interface TabContentsVO {
  /** 作品列表 */
  contents: SimpleContentInfoVO[];

  /** tab栏标识 */
  tabKey: string;

  /** tab栏名称 */
  tabName: string;
}

export interface TaskParam {
  /** 进度(可以固定写成 1) */
  progress: string;

  /**
   * 任务(4->分享世界大厅)
   * @format int32
   */
  task: number;
}

export interface TaskProgressVo {
  /**
   * 新手任务截止时间
   * @format date-time
   */
  overAt: string;

  /** 新手任务奖励是否领取 */
  receivedReward: boolean;

  /** 任务状态列表 */
  tasks: TaskResp[];
}

export interface TaskResp {
  /** 任务需求(返回当前任务的完成条件，eq: (进入3次世界大厅: 3) */
  demand?: string;

  /** 任务进度(返回当前任务的进度，eq:进入过1次世界大厅：1) */
  progress?: string;

  /**
   * 任务状态(0->初始状态，1->未完成，2->已完成)
   * @format int32
   */
  status: number;

  /**
   * 任务类型(1->进入世界大厅；2->游玩地图；3->关注用户；4-> 分享世界大厅)
   * @format int32
   */
  task: number;
}

export interface TeleportParam {
  /** 地图ID */
  mapId: string;

  /** 目标地图ID */
  targetMapId: string;

  /** 用户ID列表 */
  userIds: string[];
}

export interface TeleportVO {
  /** 游玩Hash */
  playHash: string;

  /** 服务ID */
  serverId: string;
}

export interface TemplateVO {
  /** banner轮播图 */
  banner: string[];

  /** 描述 */
  description: string;

  /**
   * 模板id
   * @format int64
   */
  id: number;

  /**
   * 最大允许通过此模板创建的作品数量
   * @format int32
   */
  limit: number;

  /** 封面图 */
  previewUrl: string;

  /** 标题 */
  title: string;

  /**
   * 模板类型, 1:空白模版，2.官方的其他模版，3.NFT Gallery
   * @format int32
   */
  type: number;
}

export interface TerminateCollaborationParam {
  /** 地图ID */
  mapId: string;
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

export interface TokenLoginParam {
  /** token。移动应用登录传[授权临时票据code] */
  token: string;
}

export interface TopicResp {
  /**
   * 答案
   * @format int32
   */
  answer: number;

  /**
   * 题目等级
   * @format int32
   */
  level: number;

  /** 题目内容 */
  topic: string;

  /**
   * 题目 id
   * @format int64
   */
  topicId: number;

  /** 题目名字 */
  topicName: string;

  /**
   * 题目类型
   * @format int32
   */
  type: number;
}

export interface TransactionResp {
  /** 金额 */
  amount: string;

  /**
   * 币种
   * @format int32
   */
  coin: number;

  /**
   * 创建时间(Timestamp毫秒级)
   * @format int64
   */
  createdAt: number;

  /**
   * 状态
   * @format int32
   */
  status: number;

  /** 交易详情 */
  transactionDetail: string;

  /**
   * 交易流水id
   * @format int64
   */
  transactionId: number;

  /**
   * 交易类型
   * @format int32
   */
  type: number;

  /**
   * 用户id
   * @format int64
   */
  userId: number;
}

export interface UgcContentCancelAuditParam {
  /**
   * 作品ID
   * @format int64
   */
  contentId: number;
}

export interface UgcContentCancelPublishParam {
  /**
   * 作品ID
   * @format int64
   */
  contentId: number;
}

export interface UgcContentCopyParam {
  /**
   * 作品ID
   * @format int64
   */
  contentId: number;

  /**
   * 主地图id(组复制与普通地图复制可不填，幅图复制必填)
   * @format int64
   */
  mainMapId?: number;

  /** 作品标题 */
  title?: string;
}

export interface UgcContentCreateParam {
  /**
   * 主地图id（扩展地图使用）
   * @format int64
   */
  mainMapId?: number;

  /**
   * 模板id
   * @format int64
   */
  templateId: number;

  /** 标题 */
  title: string;
}

export interface UgcContentCreateVo {
  /** 编辑容器hash */
  editHash?: string;
}

export interface UgcContentPageParam {
  /**
   * 审核状态 0 pending、1 approved、2 denied
   * @format int32
   */
  auditStatus?: number;

  /**
   * 作品状态：0 notPublish、1 published
   * @format int32
   */
  contentStatus?: number;

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

  /**
   * 1 updatedAt更新时间、 2 publishedAt发布时间、 3 createdAt创建时间
   * @format int32
   */
  orderBy?: number;

  /** true | false, // true为倒序，与orderBy同时出现 */
  orderDesc?: boolean;

  /**
   * 创作身份 0 owner、1 collaborator
   * @format int32
   */
  ownership?: number;

  /**
   * 查询地图类型，0-普通地图，1-扩展地图
   * @format int32
   */
  type?: number;
}

export interface UgcContentPageVo {
  /**
   * 审核状态
   * @format int32
   */
  auditStatus?: number;

  /**
   * 审核 通过/拒绝 的时间
   * @format date-time
   */
  auditTime?: string;

  /**
   * 地图作者id
   * @format int64
   */
  authorId: number;

  /** 协作权限 */
  collaborationPermissions?: string[];

  /**
   * 地图类型（0-普通地图，1-扩展主图，2-扩展幅图）
   * @format int32
   */
  combType: number;

  /**
   * 内容创建时间
   * @format date-time
   */
  createdAt: string;

  /** 描述 */
  describe?: string;

  /** 编辑容器Hash */
  editHash: string;

  /**
   * 内容ID
   * @format int64
   */
  id: number;

  /** 封面图 */
  image?: string;

  /** 是否为Gallery */
  isGallery?: boolean;

  /** 是否为RoomDesign */
  isRoomDesign?: boolean;

  /** 内容名称 */
  name: string;

  /**
   * 在线游玩人数
   * @format int32
   */
  onlinePlayer?: number;

  /**
   * 总浏览量
   * @format int32
   */
  playCount?: number;

  /** 游玩容器Hash */
  playHash?: string;

  /**
   * 发布版本号，取消发布/下架情况下保留版本号，可判断是否发布过 -> 不为空且大于0
   * @format int32
   */
  publishedVersion?: number;

  /**
   * 发布的版本id，不为空为已发布，可判断当前是否已发布 -> 不为空且大于0
   * @format int64
   */
  publishedVersionId?: number;

  /** 审核不通过原因 */
  reason?: string[];

  /** 是否为分享作品 */
  shared: boolean;

  /** 幅地图列表 */
  subMaps: UgcSubMapVO[];

  /**
   * 内容最后修改时间
   * @format date-time
   */
  updatedAt?: string;

  /**
   * 最新已发布的版本号，没有则代表 Not Published
   * @format int32
   */
  version?: number;
}

export interface UgcContentPublishParam {
  /** 横幅 */
  banner?: string[];

  /**
   * 作品ID
   * @format int64
   */
  contentId: number;

  /** 描述 */
  describe?: string;

  /** 封面图 */
  image?: string;

  /** 地图名称 */
  name: string;

  /** 版本更新信息 */
  notice?: string;
}

export interface UgcMapSwitchCombParam {
  /**
   * 作品ID
   * @format int64
   */
  contentId: number;
}

export interface UgcSubMapVO {
  /**
   * 作者id
   * @format int64
   */
  authorId: number;

  /**
   * 地图类型（0-普通地图，1-扩展主图，2-扩展幅图）
   * @format int32
   */
  combType: number;

  /**
   * 内容创建时间
   * @format date-time
   */
  createdAt: string;

  /** 编辑容器Hash */
  editHash?: string;

  /**
   * 内容ID
   * @format int64
   */
  id: number;

  /** 内容名称 */
  name: string;

  /** 游玩容器Hash */
  playHash?: string;

  /**
   * 发布版本号
   * @format int32
   */
  releaseVersion?: number;
}

export interface UpdateAvatarParam {
  /** 头像地址 */
  avatar?: string;
}

export interface UpdateAvatarParamV2 {
  /**
   * 头像编号
   * @format int32
   */
  id?: number;
}

export interface UpdateCollaborationMemberParam {
  /** 地图ID */
  mapId: string;

  /** 角色ID列表：传空表示游客 */
  roleIds: string[];

  /** 用户ID */
  userId: string;
}

export interface UpdateCollaborationRoleParam {
  /** 角色ID */
  id: string;

  /** 地图ID */
  mapId: string;

  /** 名称 */
  name: string;

  /** 权限列表 */
  permissions: string[];
}

export interface UpdateCreatorStoreConfigParam {
  /** 是否开启游戏内商城入口 */
  inGameStore: boolean;

  /**
   * 地图id
   * @format int64
   */
  mapId: number;
}

export interface UpdateDepositOrderTransactionHashParam {
  /**
   * 存款订单id
   * @format int64
   */
  depositOrderId: number;

  /** 存款交易TransactionHash */
  transactionHash: string;
}

export interface UpdateHashParam {
  /** 工程Hash */
  hash: string;

  /** 地图ID */
  mapId: string;
}

export interface UpdateIntroductionParam {
  /** 用户简介 */
  introduction: string;
}

export interface UpdateMapPrivacyParam {
  /** 地图ID */
  mapId: string;

  /**
   * 隐私类型：0-公开、1-仅限被邀请用户、2-私密、3-游客可查看代码
   * @format int32
   */
  type: number;
}

export interface UpdateMetadataParam {
  /** 容器ID */
  id: string;

  /** 内网IP */
  ip: string;

  /** 容器全称 */
  name: string;

  /**
   * 在线人数
   * @format int32
   */
  players: number;

  /**
   * 端口
   * @format int32
   */
  port: number;
}

export interface UpdateNicknameParam {
  /** 昵称 */
  nickname: string;
}

export interface UpdatePasswordParam {
  /** 验证码 */
  code: string;

  /** 新密码 */
  pwd: string;
}

export interface UpdatePhoneParam {
  /** 验证码 */
  code: string;

  /** 手机号，前缀要加国际区号 */
  phone: string;

  /** 口令，由手机号验证通过后获得 */
  token?: string;
}

export interface UpdateProductParam {
  /** 是否允许广告支付 */
  adPay: boolean;

  /**
   * 币种：0-TETH、1-TIRA
   * @format int32
   */
  coin: number;

  /** 封面 */
  cover: string;

  /** 描述 */
  description?: string;

  /** 是否提交审核 */
  isSubmitAudit: boolean;

  /** 价格 */
  price: string;

  /** 商品id */
  productId: string;

  /** 地图id */
  title: string;
}

export interface UpdatePwdParam {
  /** 新密码 */
  newPwd: string;

  /** 旧密码 */
  oldPwd: string;
}

export interface UpdateUserMiniChatBoxSwitchParam {
  /** 开关状态 */
  status: boolean;
}

export interface UpdateWorldHallGuideStepParam {
  /**
   * 新手引导步骤， 1：完成Avatar编辑，2：完成新手引导
   * @format int32
   */
  step: number;
}

export interface UsageStatisticsResp {
  /**
   * 今日 邀请码被使用次数
   * @format int32
   */
  codeBeUsedTimes: number;

  /**
   * 今日 使用了邀请码的次数
   * @format int32
   */
  usedCodeTimes: number;
}

export interface UserAvatarVo {
  /** 用户皮肤json，key为部件名字，value为皮肤名字 */
  wearingSkins?: Record<string, object>;
}

export interface UserBanStatusVO {
  /** 封禁处理时间 */
  createdAt: string;

  /**
   * 封禁时长
   * @format int32
   */
  duration: number;

  /** 处理原因 */
  reason: string;

  /**
   * 封禁状态：0 正常 1 封号
   * @format int32
   */
  status: number;
}

export interface UserBankCardParam {
  /** 持卡人 */
  bankCardHolder: string;

  /** 银行卡号 */
  bankCardNumber: string;

  /** 银行卡绑定手机号 */
  bankCardPhoneNumber: string;

  /** 银行卡名称 */
  bankName: string;

  /** 手机验证码 */
  code?: string;
}

export interface UserBankCardVO {
  /** 持卡人 */
  bankCardHolder: string;

  /** 银行卡号 */
  bankCardNumber: string;

  /** 银行卡名称 */
  bankName: string;

  /** 银行卡绑定手机号 */
  phone: string;
}

export interface UserFavoritesVO {
  /** 地图 */
  map?: SimpleContentInfoVO;

  /** 模型 */
  model?: ModelInfoVo;
}

export interface UserInfo2VO {
  /**
   * 登陆方式, (0-未知, 1-Email, 2-Metamask, 4-Google(Venly), 8-Twitter(Venly))
   * @format int32
   */
  authType: number;

  /** 头像 */
  avatar?: string;

  /** @format date */
  birthday?: string;

  /**
   * 开发者认证类型，（0-普通开发者，1-认证开发者，2-PGC工作室）
   * @format int32
   */
  certType?: number;

  /** 邮箱 */
  email?: string;

  /**
   * 性别：0-未知，1-男，2-女
   * @format int32
   */
  gender?: number;

  /** 是否已经实名认证 */
  hasAuthenticated?: boolean;

  /** 是否设置了密码 */
  hasSetPwd?: boolean;

  /** 语言设置：zh_CN，en_US */
  language?: string;

  /** 昵称 */
  nickname?: string;

  /**
   * 权限点（1: 扩展地图, 1<<16：管理员）
   * @format int32
   */
  permission: number;

  /** 手机号 */
  phone?: string;

  /** 皮肤，如果没有设置，就是用Nacos配置的默认皮肤 */
  previewUrl?: string;

  /** 是否新注册用户 */
  register: boolean;
  token?: string;

  /** 用户银行卡号 */
  userBankCardNum?: string;

  /**
   * 用户ID
   * @format int64
   */
  userId?: number;

  /** 钱包地址 */
  wallet?: string;

  /**
   * 钱包类型，（-1或null-未知，0-metamask，1-venly）
   * @format int32
   */
  walletType?: number;
}

export interface UserInfoVO {
  /**
   * 登陆方式, (0-未知, 1-Email, 2-Metamask, 4-Google(Venly), 8-Twitter(Venly))
   * @format int32
   */
  authType: number;

  /** 头像 */
  avatar?: string;

  /** @format date */
  birthday?: string;

  /**
   * 开发者认证类型，（0-普通开发者，1-认证开发者，2-PGC工作室）
   * @format int32
   */
  certType?: number;

  /** 邮箱 */
  email?: string;

  /**
   * 性别：0-未知，1-男，2-女
   * @format int32
   */
  gender?: number;

  /** 是否已经实名认证 */
  hasAuthenticated?: boolean;

  /** 是否设置了密码 */
  hasSetPwd?: boolean;

  /** 语言设置：zh_CN，en_US */
  language?: string;

  /** 昵称 */
  nickname?: string;

  /**
   * 权限点（1: 扩展地图, 1<<16：管理员）
   * @format int32
   */
  permission: number;

  /** 手机号 */
  phone?: string;

  /** 皮肤，如果没有设置，就是用Nacos配置的默认皮肤 */
  previewUrl?: string;
  token?: string;

  /** 用户银行卡号 */
  userBankCardNum?: string;

  /**
   * 用户ID
   * @format int64
   */
  userId?: number;

  /** 钱包地址 */
  wallet?: string;

  /**
   * 钱包类型，（-1或null-未知，0-metamask，1-venly）
   * @format int32
   */
  walletType?: number;
}

export interface UserLanguageVO {
  /** 语言配置(zh_CN:中文, en_US:英文) */
  language: string;

  /**
   * 用户id
   * @format int64
   */
  userId: number;
}

export interface UserPermissionVO {
  /** 是否拥有对应权限 */
  hashOwnership: boolean;

  /**
   * 权限点（1: 扩展地图, 1<<16：管理员）
   * @format int32
   */
  permission: number;
}

export interface UserProfileConfigParam {
  /** profileKey，showLands、showExperience、showModels、showPlayedRecently */
  profileKey?: string;

  /** value */
  profileValue?: boolean;
}

export interface UserProfileConfigVo {
  /** profileKey，showLands、showExperience、showModels、showPlayedRecently、showFavorites */
  profileKey?: string;

  /** value */
  profileValue?: boolean;
}

export interface UserProfileVo {
  /** 头像图片 */
  avatar: string;

  /** 皮肤 */
  avatarSkin: AvatarSkinVo[];

  /** about me */
  introduction: string;

  /** 用户昵称 */
  nickname: string;

  /** avatar图片 */
  previewUrl?: string;

  /**
   * 用户ID
   * @format int64
   */
  userId: number;
}

export interface UserSharedInfoVo {
  /** id */
  id?: string;

  /** 分享信息 */
  info?: Record<string, object>;

  /**
   * 用户ID
   * @format int64
   */
  userId?: number;
}

export interface UserStakeRankResp {
  /** 下一个目标分数 */
  nextTargetScore: string;

  /**
   * 排名
   * @format int32
   */
  rank: number;

  /**
   * 排名变化
   * @format int32
   */
  rankChange: number;

  /** 分数 */
  score: string;

  /** 质押每日收益 */
  stakingRate: string;
}

export interface VenlyLoginParam {
  /**
   * 授权提供者（1<<2 - google, 1<<3 - Twitter, 1<<5 - Venly）
   * @format int32
   */
  provider: number;

  /** venly token */
  venlyToken: string;
}

export interface VenlyRegisterParam {
  /** 钱包地址 */
  address: string;

  /** 电子邮箱（选填） */
  email?: string;

  /** 昵称 */
  nickname: string;

  /** 密码 */
  password?: string;

  /**
   * 授权提供者（1<<2 - google, 1<<3 - Twitter, 1<<5 - Venly）
   * @format int32
   */
  provider: number;

  /** venly token */
  venlyToken: string;

  /** 邮箱验证code（选填，填写邮箱时必填） */
  verifyCode?: string;
}

export interface VerifyCodeSendParam {
  /** 账户 */
  account: string;

  /**
   * 验证码类型，1-注册，2-重置密码，3-验证码登录，4-修改邮箱验证码（老邮箱），5-修改邮箱验证码（新邮箱）, 6-参加活动验证邮箱地址验证码，7-完善账号信息，8-手机验证码登录，9-手机号重置密码
   * @format int32
   */
  codeType: number;
}

export interface VerifyEmailParam {
  /** 验证码 */
  code: string;

  /** 邮箱地址 */
  email: string;
}

export interface VerifyResetCodeParam {
  /** 账户 */
  account: string;

  /** 验证码 */
  code: string;
}

export interface View {
  contentType?: string;
}

export interface VobiPredictParam {
  /** prompt */
  prompt: string;
}

export interface VoteInfoVO {
  /** 是否已获得登录相关的票数 */
  loginVoteObtained?: boolean;

  /** 是否已获得分享相关的票数 */
  shareVoteObtained?: boolean;

  /**
   * 总票数
   * @format int32
   */
  totalVoteCount?: number;

  /**
   * 已投票数
   * @format int32
   */
  usedVoteCount?: number;
}

export interface VoteParam {
  /** 活动id */
  activityId: string;

  /**
   * 作品id
   * @format int64
   */
  contentId: number;
}

export interface WechatNotifyResult {
  code?: string;
  message?: string;
}

export interface WinnerRecordVO {
  /**
   * 奖品发放时间
   * @format date-time
   */
  awardClaimTime?: string;

  /**
   * 奖品数量
   * @format int32
   */
  awardsCount?: number;

  /** 作品名称 */
  contentName?: string;

  /** 用户昵称 */
  nickname?: string;

  /**
   * 用户id
   * @format int64
   */
  userId?: number;
}

export interface WorldCupBalanceVariationVO {
  /**
   * 奖惩数
   * @format float
   */
  amount?: number;

  /** 被分享人昵称，或者预测的赛事球队 */
  extra?: string;

  /**
   * 时间
   * @format date-time
   */
  time?: string;

  /**
   * 奖惩类型，1：分享，2：预测
   * @format int32
   */
  type?: number;
}

export interface WorldCupJoinDetailVO {
  /**
   * 余额
   * @format float
   */
  balance: number;

  /** 奖金池是否够提现 */
  isEnough: boolean;

  /**
   * 结束状态（0：upcoming, 1:ongoing, 2:ended）
   * @format int32
   */
  status: number;

  /**
   * 总的皮肤数量
   * @format int32
   */
  totalSkinCount: number;

  /** 今天是否已解锁过 */
  unlockedOnceToday: boolean;

  /**
   * 已解锁皮肤数量
   * @format int32
   */
  unlockedSkinCount: number;

  /**
   * 已提现金额
   * @format float
   */
  withdrawAmount?: number;
}

export interface WorldCupLatestSchedulesVO {
  /**
   * 结束状态（0：upcoming, 1:ongoing, 2:ended）
   * @format int32
   */
  status: number;

  /** 世界杯最终前三甲球队 */
  winnerTeams?: WorldCupTeamVO[];

  /** 最近赛程列表 */
  worldCupMatches?: WorldCupMatchVO[];
}

export interface WorldCupMatchVO {
  /** 是否允许平局 */
  allowDraw: boolean;

  /**
   * 截止投注时间
   * @format date-time
   */
  endPredictTime: string;

  /**
   * 赛程id
   * @format int64
   */
  id: number;

  /** 赔率 */
  odds: number[];

  /** 预测情况 */
  predictionDetail?: WorldCupPredictionDetailVO;

  /**
   * 开赛时间
   * @format date-time
   */
  startTime: string;

  /** 队伍 */
  teams: WorldCupTeamVO[];
}

export interface WorldCupNewResultVO {
  /** 胜方球队队徽图片url */
  badgeUrl?: string;

  /**
   * 获得奖金额
   * @format float
   */
  bonus?: number;

  /** 胜方球队名称 */
  teamName?: string;

  /**
   * 胜方球队id，平局时为0，没有出赛果时为null
   * @format int64
   */
  winnerTeamId: number;
}

export interface WorldCupPredictionDetailVO {
  /**
   * 预测的胜负类型，0：打平、1：A队胜、2：B队胜
   * @format int32
   */
  pick: number;

  /**
   * 投注金额
   * @format float
   */
  stake: number;
}

export interface WorldCupPredictionParam {
  /** 活动id */
  activityId: string;

  /**
   * 分享来源人id
   * @format int64
   */
  fromUserId?: number;

  /**
   * 赛程id
   * @format int64
   */
  matchId: number;

  /**
   * 预测胜负类型，0：打平、1：A队胜、2：B队胜
   * @format int32
   */
  pick: number;
}

export interface WorldCupPredictionVO {
  /** 赛程是否允许有平局 */
  allowDraw: boolean;

  /**
   * 挣得、获利。负数表示预测错误
   * @format float
   */
  earning?: number;

  /**
   * 赛事开始时间
   * @format date-time
   */
  gameStartAt: string;

  /**
   * 预测胜负类型，0：打平、1：A队胜、2：B队胜
   * @format int32
   */
  pick: number;

  /**
   * 实际胜负类型，-1：未出赛果，0：打平、1：A队胜、2：B队胜
   * @format int32
   */
  resultPick: number;

  /** 球队 */
  teams: WorldCupTeamWithScoreVO[];
}

export interface WorldCupSkinVO {
  /** 皮肤图片url */
  image: string;

  /** 皮肤名称 */
  name: string;
}

export interface WorldCupTeamVO {
  /** 队徽图片url */
  badgeUrl: string;

  /** 队名 */
  teamName: string;
}

export interface WorldCupTeamWithScoreVO {
  /** 队徽图片url */
  badgeUrl: string;

  /**
   * 得分
   * @format int32
   */
  score?: number;

  /** 队名 */
  teamName: string;
}

export interface WorldCupWithdrawParam {
  /** 活动id */
  activityId: string;

  /** 钱包地址 */
  address: string;
}

export interface FrontEndDataFormat {
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

export interface FrontEndDataFormatAccountVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: AccountVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatActivityInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ActivityInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatAirdropInfoVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: AirdropInfoVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatAllocateContainerVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: AllocateContainerVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatAnsStatisticsResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: AnsStatisticsResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatAppPackageVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: AppPackageVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatBasicContentInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: BasicContentInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatBasicUserVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: BasicUserVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatCatchingNFTVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CatchingNFTVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatCoinConfigVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CoinConfigVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatCollaborationMigrationVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CollaborationMigrationVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatCollaborationRoleVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CollaborationRoleVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatCollaborationTicketVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CollaborationTicketVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatCommentInfoVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CommentInfoVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatCompetitionResultResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CompetitionResultResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatContentDetailVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ContentDetailVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatContentLikeVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ContentLikeVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatCourseVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CourseVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatCreatorStoreConfigResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CreatorStoreConfigResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatEduAsyncCreateMapInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: EduAsyncCreateMapInfo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatEduLoginVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: EduLoginVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatEduMapInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: EduMapInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatFollowAvatarVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: FollowAvatarVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatFollowCountInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: FollowCountInfo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatGalleryMapVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: GalleryMapVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatGalleryTaskVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: GalleryTaskVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatGameResultResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: GameResultResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatHashMap {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: Record<string, object>;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatLandBlockVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LandBlockVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatLandBundleInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LandBundleInfo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatLandInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LandInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatLandMapVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LandMapVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatLandMap {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LandMap;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatLandOnSaleResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LandOnSaleResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatLandSpatialConfigVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LandSpatialConfigVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatLandVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LandVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatLevelConfigInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LevelConfigInfo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListActiveTaskProgressResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ActiveTaskProgressResp[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListActivityInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ActivityInfoVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListAnsTransactionResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: AnsTransactionResp[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListAuthTypeUserVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: AuthTypeUserVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListAvatarSkinVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: AvatarSkinVo[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListBannerConfigVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: BannerConfigVo[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListBoosterInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: BoosterInfo[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListCollaborationApplyVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CollaborationApplyVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListCollaborationMemberVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CollaborationMemberVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListCollaborationPermissionVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CollaborationPermissionVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListCollaborationRoleVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: CollaborationRoleVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListEduMapInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: EduMapInfoVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListItemOptionVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ItemOptionVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListLandMapBlock {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LandMapBlock[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListLandSpatialConfigVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LandSpatialConfigVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListLandTerrain {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LandTerrain[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListLeaderResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LeaderResp[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListMapStatisticsInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MapStatisticsInfo[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListModelCategoryInfoVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ModelCategoryInfoVo[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListModelInfoVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ModelInfoVo[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListModelSnapshotVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ModelSnapshotVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListModelVO {
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

export interface FrontEndDataFormatListMsgCountVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MsgCountVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListMysteryRecordRollVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MysteryRecordRollVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListNFTWorldsClaimAwardsRecordVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: NFTWorldsClaimAwardsRecordVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListParkourContentVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ParkourContentVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListPlayerRetentionInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PlayerRetentionInfo[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListPreAvatarVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PreAvatarVo[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListProductDetailResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ProductDetailResp[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListRechargeActivityVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RechargeActivityVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListRewardCenterAwardInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RewardCenterAwardInfoVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListRewardHistoryResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RewardHistoryResp[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListRollingRewardResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RollingRewardResp[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListRoomFurnVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RoomFurnVo[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListStakeRankResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: StakeRankResp[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListStickerPackVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: StickerPackVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListTabContentsVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: TabContentsVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListTopicResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: TopicResp[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListUgcSubMapVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UgcSubMapVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListUserPermissionVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UserPermissionVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListUserProfileConfigVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UserProfileConfigVo[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListPhotoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PhotoVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPhotoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PhotoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatListString {
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

export interface FrontEndDataFormatSetString {
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

export interface FrontEndDataFormatLotteryActivityVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: LotteryActivityVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatMapInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MapInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatMapOnlineUserVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MapOnlineUserVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatMapReleaseInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MapReleaseInfo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatMapRewardCountVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MapRewardCountVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatMapSnapshotInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MapSnapshotInfo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatMapIntAccountVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: Record<string, AccountVO>;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatMapIntCoinConfigVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: Record<string, CoinConfigVO>;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatMemberPermissionVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MemberPermissionVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatMetaDataVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MetaDataVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatMintStatusVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MintStatusVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatModelDetailVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ModelDetailVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatModelSnapshotInfoVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ModelSnapshotInfoVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatModelVO {
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

export interface FrontEndDataFormatMysteryListVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: MysteryListVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatNFTWorldsClaimStatusVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: NFTWorldsClaimStatusVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseActivityInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseActivityInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseCommentMsgVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseCommentMsgVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseCommentReplyVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseCommentReplyVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseCommentVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseCommentVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseContentReleaseVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseContentReleaseVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseFollowNewFollowerVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseFollowNewFollowerVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseFollowV2VO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseFollowV2VO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseFollowVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseFollowVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseLandBlockAndUpgradeInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseLandBlockAndUpgradeInfo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseLandBundleListInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseLandBundleListInfo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseLikeMsgVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseLikeMsgVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseLuckyDrawRecordPageVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseLuckyDrawRecordPageVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseMarketplacePageVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseMarketplacePageVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseModelAndUserVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseModelAndUserVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseModelInfoVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseModelInfoVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseModelTemplateResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseModelTemplateResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseModelUgcPageInfoVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseModelUgcPageInfoVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseModelVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseModelVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseProductResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseProductResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseRewardCenterAwardInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseRewardCenterAwardInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseRoomAwardsRecordPageVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseRoomAwardsRecordPageVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseRoomContentVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseRoomContentVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseSimpleContentAndUserVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseSimpleContentAndUserVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseSimpleContentInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseSimpleContentInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseStakeAssetVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseStakeAssetVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseStakeResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseStakeResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseSuitVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseSuitVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseSysMsgVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseSysMsgVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseTemplateVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseTemplateVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseTransactionResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseTransactionResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseUgcContentPageVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseUgcContentPageVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseUserFavoritesVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseUserFavoritesVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseWinnerRecordVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseWinnerRecordVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseWorldCupBalanceVariationVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseWorldCupBalanceVariationVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseWorldCupPredictionVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseWorldCupPredictionVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPageResponseString {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseString;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatParkourActivityInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ParkourActivityInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPassFormActivityDetailVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PassFormActivityDetailVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPassFormActivityInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PassFormActivityInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPlayerBehaviorInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PlayerBehaviorInfo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPlayerStatisticsInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PlayerStatisticsInfo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPlayerSurvivingResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PlayerSurvivingResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatPutObjectResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PutObjectResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRaffleTicketNumVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RaffleTicketNumVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRechargeOrderVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RechargeOrderVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRedeemableTicketVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RedeemableTicketVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRelationInfoVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RelationInfoVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRewardCenterAwardVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RewardCenterAwardVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRewardConfigMassVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RewardConfigMassVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRoomDesignInfoV2Vo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RoomDesignInfoV2Vo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRoomDesignVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RoomDesignVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRoomInstalledFurnVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RoomInstalledFurnVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRoomLotteryAwardsVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RoomLotteryAwardsVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRoomOfficialVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RoomOfficialVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRoomRankingListVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RoomRankingListVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatRoomTagVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: RoomTagVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatSignInTaskProgressResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: SignInTaskProgressResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatSingleValueVOBoolean {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: SingleValueVOBoolean;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatSingleValueVOInt {
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

export interface FrontEndDataFormatSingleValueVOLong {
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

export interface FrontEndDataFormatSingleValueVOString {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: SingleValueVOString;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatStakeConfigVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: StakeConfigVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatStakeDashboardResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: StakeDashboardResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatStakeResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: StakeResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatStaticConfigVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: StaticConfigVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatStatisticsMapInfo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: StatisticsMapInfo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatTaskProgressVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: TaskProgressVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatTeleportVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: TeleportVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatUgcContentCreateVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UgcContentCreateVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatUsageStatisticsResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UsageStatisticsResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatUserAvatarVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UserAvatarVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatUserBanStatusVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UserBanStatusVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatUserBankCardVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UserBankCardVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatUserInfo2VO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UserInfo2VO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

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

export interface FrontEndDataFormatUserLanguageVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UserLanguageVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatUserProfileVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UserProfileVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatUserSharedInfoVo {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UserSharedInfoVo;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatUserStakeRankResp {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: UserStakeRankResp;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatVoteInfoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: VoteInfoVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatWorldCupJoinDetailVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: WorldCupJoinDetailVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatWorldCupLatestSchedulesVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: WorldCupLatestSchedulesVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatWorldCupNewResultVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: WorldCupNewResultVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatWorldCupSkinVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: WorldCupSkinVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
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

export interface FrontEndDataFormatDouble {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /**
   * 业务数据
   * @format double
   */
  data: number;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatInt {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /**
   * 业务数据
   * @format int32
   */
  data: number;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatLong {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /**
   * 业务数据
   * @format int64
   */
  data: number;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatString {
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

export type MapIntAccountVO = Record<string, AccountVO>;

export type MapIntCoinConfigVO = Record<string, CoinConfigVO>;

export type MapStringLink = Record<string, Link>;

export interface PageResponseActivityInfoVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: ActivityInfoVO[];
}

export interface PageResponseCommentMsgVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: CommentMsgVO[];
}

export interface PageResponseCommentReplyVo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: CommentReplyVo[];
}

export interface PageResponseCommentVo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: CommentVo[];
}

export interface PageResponseContentReleaseVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: ContentReleaseVO[];
}

export interface PageResponseFollowNewFollowerVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: FollowNewFollowerVO[];
}

export interface PageResponseFollowV2VO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: FollowV2VO[];
}

export interface PageResponseFollowVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: FollowVO[];
}

export interface PageResponseLandBlockAndUpgradeInfo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: LandBlockAndUpgradeInfo[];
}

export interface PageResponseLandBundleListInfo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: LandBundleListInfo[];
}

export interface PageResponseLikeMsgVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: LikeMsgVO[];
}

export interface PageResponseLuckyDrawRecordPageVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: LuckyDrawRecordPageVO[];
}

export interface PageResponseMarketplacePageVo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: MarketplacePageVo[];
}

export interface PageResponseModelAndUserVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: ModelAndUserVO[];
}

export interface PageResponseModelInfoVo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: ModelInfoVo[];
}

export interface PageResponseModelTemplateResp {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: ModelTemplateResp[];
}

export interface PageResponseModelUgcPageInfoVo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: ModelUgcPageInfoVo[];
}

export interface PageResponseModelVO {
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

export interface PageResponseNFTInfo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: NFTInfo[];
}

export interface PageResponseProductResp {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: ProductResp[];
}

export interface PageResponseRewardCenterAwardInfoVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: RewardCenterAwardInfoVO[];
}

export interface PageResponseRoomAwardsRecordPageVo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: RoomAwardsRecordPageVo[];
}

export interface PageResponseRoomContentVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: RoomContentVO[];
}

export interface PageResponseRoomRankingVo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: RoomRankingVo[];
}

export interface PageResponseSimpleContentAndUserVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: SimpleContentAndUserVO[];
}

export interface PageResponseSimpleContentInfoVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: SimpleContentInfoVO[];
}

export interface PageResponseStakeAssetVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: StakeAssetVO[];
}

export interface PageResponseStakeResp {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: StakeResp[];
}

export interface PageResponseSuitVo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: SuitVo[];
}

export interface PageResponseSysMsgVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: SysMsgVO[];
}

export interface PageResponseTemplateVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: TemplateVO[];
}

export interface PageResponseTransactionResp {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: TransactionResp[];
}

export interface PageResponseUgcContentPageVo {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: UgcContentPageVo[];
}

export interface PageResponseUserFavoritesVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: UserFavoritesVO[];
}

export interface PageResponseWinnerRecordVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: WinnerRecordVO[];
}

export interface PageResponseWorldCupBalanceVariationVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: WorldCupBalanceVariationVO[];
}

export interface PageResponseWorldCupPredictionVO {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: WorldCupPredictionVO[];
}

export interface PageResponseString {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: string[];
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

export interface FrontEndDataFormatModelV1 {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ModelVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface ModelVO {
  /** 动画标志 */
  animated: boolean;

  /**
   * 创建时间
   * @format date-time
   */
  createdAt: string;

  /**
   * 创作模式，1自由创作(默认)；2定向创作-人物装扮
   * @format int32
   */
  creativeMode: number;

  /** 模型的文件 hash */
  fileHash: string;

  /** 模型描述、简介 */
  modelDescription: string;

  /** 快照-模型文件 hash */
  modelFileHash: string;

  /** 模型文件 */
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

  /** 快照-模型预览图 hash */
  modelPreviewHash: string;

  /** 模型预览图 */
  modelPreviewUUID: string;

  /** 模型预览图url */
  modelPreviewUrl: string;

  /**
   * 模型类型[0-私有, 1-共有, 2-项目]
   * @format int32
   */
  modelType: number;

  /** 快照-模型的工程文件 hash */
  projectFileHash: string;

  /** 模型的工程文件 */
  projectFileUUID: string;

  /** 模型的工程文件url */
  projectFileUrl: string;

  /**
   * 更新时间
   * @format date-time
   */
  updatedAt: string;
}

export interface ProjectModelCopyParam {
  /**
   * 复制事件，0主动复制，1被动复制（需hash查重）
   * @format int32
   */
  event?: number;

  /**
   * 地图ID
   * @format int64
   */
  mapId: number;

  /**
   * 原始模型ID
   * @format int64
   */
  originModelId: number;

  /**
   * 复制类型，0-复制snapshot(不填就默认0), 1-复制release
   * @format int32
   */
  sourceType?: number;
}

export interface LockParam {
  /** 是否为扩展地图组（缺省：false） */
  isGroup?: boolean;

  /** key(length<=1000) */
  key: string;

  /** 地图id(扩展地图为主图id) */
  mapId: string;

  /** 模式(play/edit) */
  mode: string;

  /** 操作空间名(length<=50 && ^[a-zA-Z0-9_]+$) */
  storageName: string;

  /** 锁定ticket(加解锁时必填，其他操作选填) */
  ticket?: string;
}

export interface PrepareParam {
  /** 是否为扩展地图组（缺省：false） */
  isGroup?: boolean;

  /** 地图id(扩展地图为主图id) */
  mapId: string;

  /** 模式(play/edit) */
  mode: string;

  /** 操作空间名(length<=50 && ^[a-zA-Z0-9_]+$) */
  storageName: string;
}

export interface RemoveParam {
  /** 是否为扩展地图组（缺省：false） */
  isGroup?: boolean;

  /** key(length<=1000) */
  key: string;

  /** 地图id(扩展地图为主图id) */
  mapId: string;

  /** 模式(play/edit) */
  mode: string;

  /** 是否返回删除的内容(缺省：false) */
  returnOld?: boolean;

  /** 操作空间名(length<=50 && ^[a-zA-Z0-9_]+$) */
  storageName: string;

  /** 锁定ticket(加解锁时必填，其他操作选填) */
  ticket?: string;
}

export interface ResultValue {
  /**
   * 创建时间戳
   * @format int64
   */
  createTime: number;

  /** key */
  key: string;

  /** 元数据 */
  metadata: string;

  /**
   * 更新时间戳
   * @format int64
   */
  updateTime: number;

  /** value(json) */
  value: string;

  /** 版本号 */
  version: string;
}

export interface SetParam {
  /** 是否为扩展地图组（缺省：false） */
  isGroup?: boolean;

  /** key(length<=1000) */
  key: string;

  /** 地图id(扩展地图为主图id) */
  mapId: string;

  /** metadata(json, size<=100KB) */
  metadata?: string;

  /** 模式(play/edit) */
  mode: string;

  /** 操作空间名(length<=50 && ^[a-zA-Z0-9_]+$) */
  storageName: string;

  /** 锁定ticket(加解锁时必填，其他操作选填) */
  ticket?: string;

  /** value(json, size<=2MB) */
  value: string;
}
export interface IncrParam {
  /** 是否为扩展地图组（缺省：false） */
  isGroup?: boolean;

  /** key(length<=1000) */
  key: string;

  /** 地图id(扩展地图为主图id) */
  mapId: string;

  /** 模式(play/edit) */
  mode: string;

  /** 操作空间名(length<=50 && ^[a-zA-Z0-9_]+$) */
  storageName: string;

  /** 增长的值（正数为增，负数为减） */
  value: number;
}

export interface FrontEndDataFormatPageResponseResultValue {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PageResponseResultValue;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface FrontEndDataFormatResultValue {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ResultValue;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
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

export interface PageResponseResultValue {
  /**
   * 总数
   * @format int64
   */
  count: number;

  /** 扩展字段 */
  extra?: object;

  /** 数据 */
  rows: ResultValue[];
}

export interface AddPhotoParam {
  /** 地图ID */
  mapId: string;

  /** 图片集合 */
  photos: Photo[];
}

export interface FrontEndDataFormatListPhotoVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: PhotoVO[];

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface PhotoVO {
  /** 图片Hash */
  hash: string;

  /** 图片ID */
  id: string;

  /** 图片名称 */
  name: string;

  /** 封面图Hash */
  previewImage: string;

  /**
   * 图片大小(KB)
   * @format int64
   */
  size: number;
  /**
   * 创建时间
   * @format int64
   */
  createdAt: number;
  /**
   * 更新时间
   * @format int64
   */
  updateAt: number;
}

export interface Photo {
  /** 图片Hash */
  hash: string;

  /** 图片名称 */
  name: string;

  /** 封面图Hash */
  previewImage: string;

  /**
   * 图片大小(KB)
   * @format int64
   */
  size: number;
}

export interface DeletePhotoParam {
  /** 图片ID */
  id: string;

  /** 地图ID */
  mapId: string;
}

export interface ScriptVO {
  hash: string;
  id: string;
  name: string;
  share: boolean;

  /** @format int32 */
  type: number;
}

export interface FrontEndDataFormatScriptVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ScriptVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface ScriptHash {
  /** 脚本Hash */
  hash: string;

  /** 脚本ID */
  id: string;
}

export interface BatchUpdateScriptHashParam {
  /**
   * 地图ID
   * @format int64
   */
  mapId: number;

  /** 脚本集合 */
  scripts: ScriptHash[];
}

export interface ScriptListVO {
  clientScripts: ScriptDetailVO[];
  serverScripts: ScriptDetailVO[];
}

export interface ScriptDetailVO {
  hash: string;
  id: string;

  /** @format int64 */
  lockedMapId: number;
  lockedMapTitle: string;
  name: string;
  share: boolean;

  /** @format int32 */
  type: number;
}

export interface FrontEndDataFormatScriptListVO {
  /**
   * 状态码，200为成功，其他均为异常
   * @format int32
   */
  code: number;

  /** 业务数据 */
  data: ScriptListVO;

  /** 返回消息 */
  msg: string;

  /** 请求追中id，每次请求唯一(可能为空) */
  traceId?: string;
}

export interface LockScriptParam {
  /** 脚本ID */
  id: string;

  /**
   * 地图ID
   * @format int64
   */
  mapId: number;
}

export interface LockHeartbeatParam {
  /** 脚本ID */
  id: string;

  /**
   * 地图ID
   * @format int64
   */
  mapId: number;
}
export interface ScriptRenameParam {
  /** 原脚本ID */
  id: string;

  /**
   * 地图ID
   * @format int64
   */
  mapId: number;

  /** 新脚本名称 */
  newName: string;
}

export interface ShareScriptParam {
  /** 脚本Hash */
  hash: string;

  /** 脚本ID */
  id: string;

  /**
   * 地图ID
   * @format int64
   */
  mapId: number;
}
export interface UnlockScriptParam {
  /** 脚本ID */
  id: string;

  /**
   * 地图ID
   * @format int64
   */
  mapId: number;
}

export interface UnshareScriptParam {
  /** 脚本ID */
  id: string;

  /**
   * 地图ID
   * @format int64
   */
  mapId: number;
}
export interface CreateScriptParam {
  /** 复制源脚本ID */
  id?: string;

  /**
   * 地图ID
   * @format int64
   */
  mapId: number;

  /** 脚本名称：0-服务器脚本、1-客户端脚本（复制会忽略该字段） */
  name?: string;

  /**
   * 脚本类型：0-服务器脚本、1-客户端脚本（复制会忽略该字段）
   * @format int32
   */
  type?: ScriptType;
}

export enum ShareScriptErrorCode {
  /** 脚本不存在 */
  ScriptNotExist = 21010001,
  /** 脚本锁获取失败 */
  ScriptGetLockFailed = 21010002,
  /** 脚本被他图锁定 */
  ScriptLockedByAnotherMap = 21010003,
  /** 非扩展地图,禁止操作 */
  NotCombMap = 21010005,
  /** 脚本名称重复 */
  ScriptNameRepeat = 21010007,
  /** 地图锁获取失败 */
  ScriptGlobalLockFailed = 21010008,
}

/**
 * 脚本类型：0-服务器脚本、1-客户端脚本
 */
export enum ScriptType {
  Server = 0,
  Client = 1,
}
