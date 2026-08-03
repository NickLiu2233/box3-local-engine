/**
 * 用户私有资料接口
 * 包含只能由用户自己或服务器访问的信息，用于游戏服务器和后端服务通信
 * 对应旧的 online() API 返回的 UserDetail 结构
 */
export interface IUserPrivateProfile extends IUserPublicProfile {
  /**
   * 用户 Box ID，用于标识用户在 Box 生态中的唯一身份
   * @example "alice_box"
   */
  boxId: string | null;

  /**
   * 用户语言偏好设置
   * @example Language.zh_CN
   */
  language: string;

  /**
   * 权限点位标记 (位标志)
   * - Bit 0 (值为 1): 扩展地图权限
   * - Bit 16 (值为 1<<16): 管理员权限
   * @example 0
   */
  permission: number;
}

/**
 * 用户公开资料接口
 * 包含可以公开显示的用户信息，供其他用户和公开 API 访问
 */
export interface IUserPublicProfile {
  /**
   * 用户唯一 ID
   * @example 1234567890
   */
  userId: number;

  /**
   * 用户昵称/显示名称
   * @example "JohnDoe"
   */
  displayName: string;

  /**
   * 用户头像 URL
   * @example "https://example.com/avatar.png"
   */
  avatarUrl: string;

  // /**
  //  * 用户头像框 URL
  //  * @example "https://example.com/avatar_frame.png"
  //  */
  // avatarFrame: string;

  // /**
  //  * 用户邮箱地址 (可选)
  //  * @example "john.doe@example.com"
  //  */
  // email?: string;

  // /**
  //  * 用户手机号 (可选)
  //  * @example "138****1234"
  //  */
  // phone?: string;

  // /**
  //  * 性别标识
  //  * - 0: 未知
  //  * - 1: 男
  //  * - 2: 女
  //  * @example 1
  //  */
  // gender: number;

  // /**
  //  * 生日 (ISO 8601 日期格式，可选)
  //  * @example "1990-01-01"
  //  */
  // birthday?: string;

  // /**
  //  * 用户语言设置
  //  * @example "en_US"
  //  */
  // language: string;

  // /**
  //  * 是否已完成实名认证
  //  * @example false
  //  */
  // isIdentityVerified: boolean;

  // /**
  //  * 权限点位标记 (位标志)
  //  * @example 1
  //  */
  // permission: number;

  // /**
  //  * 开发者认证类型
  //  * - 0: 普通开发者
  //  * - 1: 认证开发者
  //  * - 2: PGC工作室
  //  * @example 0
  //  */
  // certType: number;

  // /**
  //  * 渠道 ID，标识用户来自的应用渠道
  //  * @example "1"
  //  */
  // appId: string;

  // /**
  //  * 皮肤预览 URL (可选)
  //  * @example "https://example.com/skin.png"
  //  */
  // previewUrl?: string;

  // /**
  //  * 钱包类型 (可选)
  //  */
  // walletType?: number;
}
