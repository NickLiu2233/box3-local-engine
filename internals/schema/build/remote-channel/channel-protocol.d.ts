import { MuStruct, MuUTF8, MuVarint } from '@box-local/mudb/schema';
export declare const RemoteChannelProtocol: {
    name: string;
    client: {
        sendClientEvent: MuStruct<{
            tick: MuVarint;
            args: MuUTF8;
        }>;
    };
    server: {
        sendServerEvent: MuStruct<{
            tick: MuVarint;
            args: MuUTF8;
        }>;
    };
};
//# sourceMappingURL=channel-protocol.d.ts.map