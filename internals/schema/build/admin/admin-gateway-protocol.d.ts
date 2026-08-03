import { MuUTF8, MuVoid } from '@box-local/mudb/schema';
export declare const AdminProtocol: {
    name: string;
    client: {
        redirect: MuUTF8;
        alert: MuUTF8;
    };
    server: {
        closeWebsocket: MuVoid;
        logCurrentStore: MuVoid;
    };
};
//# sourceMappingURL=admin-gateway-protocol.d.ts.map