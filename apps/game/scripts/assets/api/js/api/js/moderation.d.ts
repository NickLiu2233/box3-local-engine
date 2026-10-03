
/** 权限由服主在后台绑定，脚本不能设置管理员身份、地图 ID 或 IP。 */
type ModerationOptions = {
    /** 处罚原因，会写入后台审计。 */
    reason: string;
    /** 封禁秒数，不能超过后台授权上限。 */
    durationSeconds: number;
    /** 默认仅本地图；全服处罚还需要后台允许。 */
    scope?: 'map' | 'server';
    /** 重试同一操作时复用此值，避免重复处罚。 */
    requestId: string;
};
type ModerationBan = {
    id: string;
    scope: 'map' | 'server';
    expiresAt: string;
};
interface GameModeration {
    /** 仅创作端可读取的服务端脚本指纹；游玩端没有此属性。修改脚本后需要重新绑定。 */
    readonly scriptFingerprint?: string;
    /** 封禁当前地图中的玩家账号，返回处罚 ID 和截止时间。 */
    banPlayer: (player: GameEntity, options: ModerationOptions) => Promise<ModerationBan>;
    /** 封禁玩家当前连接的 IP。共享网络可能影响其他玩家，请谨慎使用。 */
    banCurrentIP: (player: GameEntity, options: ModerationOptions) => Promise<ModerationBan>;
    /** 解除同一授权在本图创建的处罚；原因和请求 ID 必填。 */
    revokeBan: (banId: string, options: {
        reason: string;
        requestId: string;
    }) => Promise<{
        revoked: boolean;
        id: string;
    }>;
    /** 查询当前玩家的账号状态和本图处罚，不暴露 IP 或密钥。 */
    getPlayerStatus: (player: GameEntity) => Promise<{
        status: string;
        bans: ModerationBan[];
    }>;
}
