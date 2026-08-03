"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsRPCSchema = exports.AnalyticsHttpEntrySchema = exports.AnalyticsEngineEntrySchema = exports.AnalyticsTopEntrySchema = exports.AnalyticsEventEntrySchema = void 0;
const schema_1 = require("@box-local/mudb/schema");
exports.AnalyticsEventEntrySchema = new schema_1.MuStruct({
    name: new schema_1.MuUTF8(),
    user_id: new schema_1.MuOption(new schema_1.MuVarint()),
    ip: new schema_1.MuOption(new schema_1.MuUTF8()),
    server_name: new schema_1.MuOption(new schema_1.MuUTF8()),
    extra: new schema_1.MuOption(new schema_1.MuUTF8()),
});
exports.AnalyticsTopEntrySchema = new schema_1.MuStruct({
    server_name: new schema_1.MuUTF8(),
    rss: new schema_1.MuVarint(),
    heap_total: new schema_1.MuVarint(),
    heap_used: new schema_1.MuVarint(),
    external: new schema_1.MuVarint(),
    time_user: new schema_1.MuVarint(),
    time_system: new schema_1.MuVarint(),
    cpu_user: new schema_1.MuFloat32(),
    cpu_system: new schema_1.MuFloat32(),
});
exports.AnalyticsEngineEntrySchema = new schema_1.MuStruct({
    server_name: new schema_1.MuUTF8(),
    up_bandwidth: new schema_1.MuVarint(),
    down_bandwidth: new schema_1.MuVarint(),
    clock: new schema_1.MuFloat64(),
    tick: new schema_1.MuFloat64(),
    frameskips: new schema_1.MuVarint(),
    entities: new schema_1.MuVarint(),
    connections: new schema_1.MuVarint(),
    chats: new schema_1.MuVarint(),
    bodies: new schema_1.MuVarint(),
    contacts: new schema_1.MuVarint(),
    particles: new schema_1.MuVarint(),
    players: new schema_1.MuVarint(),
    player_inputs: new schema_1.MuVarint(),
    server_players: new schema_1.MuVarint(),
    // more diagnostics
    ipfs_up: new schema_1.MuVarint(),
    ipfs_down: new schema_1.MuVarint(),
    ipfs_error: new schema_1.MuVarint(),
    // number of lines logged
    script_log: new schema_1.MuVarint(),
    script_error: new schema_1.MuVarint(),
    // sql stats
    sql_queries: new schema_1.MuVarint(),
    sql_rows: new schema_1.MuVarint(),
    sql_errors: new schema_1.MuVarint(),
    // closed sockets
    socket_closed: new schema_1.MuVarint(),
    // ping in ticks
    min_ping: new schema_1.MuFloat64(),
    max_ping: new schema_1.MuFloat64(),
    avg_ping: new schema_1.MuFloat64(),
    // tick time in ms
    min_tick: new schema_1.MuFloat64(),
    max_tick: new schema_1.MuFloat64(),
    avg_tick: new schema_1.MuFloat64(),
});
exports.AnalyticsHttpEntrySchema = new schema_1.MuStruct({
    server_name: new schema_1.MuUTF8(),
    host: new schema_1.MuUTF8(),
    ip: new schema_1.MuUTF8(),
    method: new schema_1.MuUTF8(),
    path: new schema_1.MuUTF8(),
    referer: new schema_1.MuUTF8(),
    user_agent: new schema_1.MuUTF8(),
});
exports.AnalyticsRPCSchema = {
    name: 'analytics',
    api: {
        addEvent: {
            arg: exports.AnalyticsEventEntrySchema,
            ret: new schema_1.MuVoid(),
        },
        addTop: {
            arg: exports.AnalyticsTopEntrySchema,
            ret: new schema_1.MuVoid(),
        },
        addEngine: {
            arg: exports.AnalyticsEngineEntrySchema,
            ret: new schema_1.MuVoid(),
        },
        addHttp: {
            arg: exports.AnalyticsHttpEntrySchema,
            ret: new schema_1.MuVoid(),
        },
    },
};
