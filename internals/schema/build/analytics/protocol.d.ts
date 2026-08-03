import { MuUTF8, MuVoid, MuStruct, MuVarint, MuOption, MuFloat32, MuFloat64 } from '@box-local/mudb/schema';
export declare const AnalyticsEventEntrySchema: MuStruct<{
    name: MuUTF8;
    user_id: MuOption<MuVarint>;
    ip: MuOption<MuUTF8>;
    server_name: MuOption<MuUTF8>;
    extra: MuOption<MuUTF8>;
}>;
export declare const AnalyticsTopEntrySchema: MuStruct<{
    server_name: MuUTF8;
    rss: MuVarint;
    heap_total: MuVarint;
    heap_used: MuVarint;
    external: MuVarint;
    time_user: MuVarint;
    time_system: MuVarint;
    cpu_user: MuFloat32;
    cpu_system: MuFloat32;
}>;
export declare const AnalyticsEngineEntrySchema: MuStruct<{
    server_name: MuUTF8;
    up_bandwidth: MuVarint;
    down_bandwidth: MuVarint;
    clock: MuFloat64;
    tick: MuFloat64;
    frameskips: MuVarint;
    entities: MuVarint;
    connections: MuVarint;
    chats: MuVarint;
    bodies: MuVarint;
    contacts: MuVarint;
    particles: MuVarint;
    players: MuVarint;
    player_inputs: MuVarint;
    server_players: MuVarint;
    ipfs_up: MuVarint;
    ipfs_down: MuVarint;
    ipfs_error: MuVarint;
    script_log: MuVarint;
    script_error: MuVarint;
    sql_queries: MuVarint;
    sql_rows: MuVarint;
    sql_errors: MuVarint;
    socket_closed: MuVarint;
    min_ping: MuFloat64;
    max_ping: MuFloat64;
    avg_ping: MuFloat64;
    min_tick: MuFloat64;
    max_tick: MuFloat64;
    avg_tick: MuFloat64;
}>;
export declare const AnalyticsHttpEntrySchema: MuStruct<{
    server_name: MuUTF8;
    host: MuUTF8;
    ip: MuUTF8;
    method: MuUTF8;
    path: MuUTF8;
    referer: MuUTF8;
    user_agent: MuUTF8;
}>;
export declare const AnalyticsRPCSchema: {
    name: string;
    api: {
        addEvent: {
            arg: MuStruct<{
                name: MuUTF8;
                user_id: MuOption<MuVarint>;
                ip: MuOption<MuUTF8>;
                server_name: MuOption<MuUTF8>;
                extra: MuOption<MuUTF8>;
            }>;
            ret: MuVoid;
        };
        addTop: {
            arg: MuStruct<{
                server_name: MuUTF8;
                rss: MuVarint;
                heap_total: MuVarint;
                heap_used: MuVarint;
                external: MuVarint;
                time_user: MuVarint;
                time_system: MuVarint;
                cpu_user: MuFloat32;
                cpu_system: MuFloat32;
            }>;
            ret: MuVoid;
        };
        addEngine: {
            arg: MuStruct<{
                server_name: MuUTF8;
                up_bandwidth: MuVarint;
                down_bandwidth: MuVarint;
                clock: MuFloat64;
                tick: MuFloat64;
                frameskips: MuVarint;
                entities: MuVarint;
                connections: MuVarint;
                chats: MuVarint;
                bodies: MuVarint;
                contacts: MuVarint;
                particles: MuVarint;
                players: MuVarint;
                player_inputs: MuVarint;
                server_players: MuVarint;
                ipfs_up: MuVarint;
                ipfs_down: MuVarint;
                ipfs_error: MuVarint;
                script_log: MuVarint;
                script_error: MuVarint;
                sql_queries: MuVarint;
                sql_rows: MuVarint;
                sql_errors: MuVarint;
                socket_closed: MuVarint;
                min_ping: MuFloat64;
                max_ping: MuFloat64;
                avg_ping: MuFloat64;
                min_tick: MuFloat64;
                max_tick: MuFloat64;
                avg_tick: MuFloat64;
            }>;
            ret: MuVoid;
        };
        addHttp: {
            arg: MuStruct<{
                server_name: MuUTF8;
                host: MuUTF8;
                ip: MuUTF8;
                method: MuUTF8;
                path: MuUTF8;
                referer: MuUTF8;
                user_agent: MuUTF8;
            }>;
            ret: MuVoid;
        };
    };
};
type UndefinedKeys<T> = {
    [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];
type UndefinedToOptional<T> = {
    [K in Exclude<keyof T, UndefinedKeys<T>>]: T[K];
} & {
    [K in UndefinedKeys<T>]?: T[K];
};
export type AnalyticsEvent = UndefinedToOptional<typeof AnalyticsEventEntrySchema.identity>;
export type AnalyticsTop = typeof AnalyticsTopEntrySchema.identity;
export type AnalyticsEngine = typeof AnalyticsEngineEntrySchema.identity;
export type AnalyticsHttp = typeof AnalyticsHttpEntrySchema.identity;
export {};
//# sourceMappingURL=protocol.d.ts.map