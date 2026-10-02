
/** 权限由服主在后台绑定，脚本不能设置管理员身份、地图 ID 或 IP。 */
type ModerationOptions = {
    reason: string;
    durationSeconds: number;
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
    readonly mapId: string;
    readonly scriptFingerprint: string;
    banPlayer(player: GameEntity, options: ModerationOptions): Promise<ModerationBan>;
    banCurrentIP(player: GameEntity, options: ModerationOptions): Promise<ModerationBan>;
    revokeBan(banId: string, options: {
        reason: string;
        requestId: string;
    }): Promise<{
        revoked: boolean;
        id: string;
    }>;
    getPlayerStatus(player: GameEntity): Promise<{
        status: string;
        bans: ModerationBan[];
    }>;
}
