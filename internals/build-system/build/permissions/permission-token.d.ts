import { PermissionToken } from '@box-local/schema/permissions/permission-rda';
export declare function generatePermissionToken(secret: string, token: PermissionToken): string;
export declare function parsePermissionToken(secret: string, message: string): import("@box-local/mudb/schema/struct").Struct<{
    expireAt: import("@box-local/mudb/schema").MuDate;
    group: import("@box-local/mudb/schema").MuUTF8;
}> | null;
//# sourceMappingURL=permission-token.d.ts.map