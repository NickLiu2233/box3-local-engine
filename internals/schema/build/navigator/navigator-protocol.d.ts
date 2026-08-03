export declare const NavigatorProtocol: {
    name: string;
    client: {
        postMessage: import("@box-local/mudb/schema").MuStruct<{
            type: import("@box-local/mudb/schema").MuUTF8;
            value: import("@box-local/mudb/schema").MuUTF8;
            isOld: import("@box-local/mudb/schema").MuBoolean;
        }>;
    };
    server: {
        messageEvent: import("@box-local/mudb/schema").MuStruct<{
            data: import("@box-local/mudb/schema").MuJSON;
        }>;
    };
};
//# sourceMappingURL=navigator-protocol.d.ts.map