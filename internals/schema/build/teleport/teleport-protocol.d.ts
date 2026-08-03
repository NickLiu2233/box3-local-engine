import { MuASCII, MuStruct, MuUTF8 } from '@box-local/mudb/schema';
export declare const TeleportProtocol: {
    name: string;
    client: {
        teleport: MuStruct<{
            playHash: MuASCII;
            serverId: MuUTF8;
        }>;
        editTeleport: MuASCII;
    };
    server: {};
};
//# sourceMappingURL=teleport-protocol.d.ts.map