export type LocalPlayerRole = 'player' | 'moderator' | 'admin';
export type LocalPlayerStatus = 'active' | 'banned';
export type RuntimePlayerIdentity = {
    subjectId: string;
    userId: string;
    username: string;
    boxId: string;
    displayName: string;
    avatar: string;
    avatarSkinId: string;
    role: LocalPlayerRole;
    status: LocalPlayerStatus;
    expiresAt: number;
};
export declare function signRuntimePlayerIdentity(identity: Omit<RuntimePlayerIdentity, 'expiresAt'>, secret: string, ttlMs?: number): string;
export declare function verifyRuntimePlayerIdentity(token: string, secret: string, now?: number): RuntimePlayerIdentity | null;
export declare function createPlayerUserKey(subjectId: string, secret: string): string;
//# sourceMappingURL=local-player-identity.d.ts.map