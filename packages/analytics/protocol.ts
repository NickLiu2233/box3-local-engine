import {
  MuUTF8,
  MuVoid,
  MuStruct,
  MuVarint,
  MuOption,
  MuFloat32,
  MuFloat64,
} from '@box-local/mudb/schema';

export const AnalyticsEventEntrySchema = new MuStruct({
  name: new MuUTF8(),
  user_id: new MuOption(new MuVarint()),
  ip: new MuOption(new MuUTF8()),
  server_name: new MuOption(new MuUTF8()),
  extra: new MuOption(new MuUTF8()),
});

export const AnalyticsTopEntrySchema = new MuStruct({
  server_name: new MuUTF8(),
  rss: new MuVarint(),
  heap_total: new MuVarint(),
  heap_used: new MuVarint(),
  external: new MuVarint(),
  time_user: new MuVarint(),
  time_system: new MuVarint(),
  cpu_user: new MuFloat32(),
  cpu_system: new MuFloat32(),
});
export const AnalyticsEngineEntrySchema = new MuStruct({
  server_name: new MuUTF8(),
  up_bandwidth: new MuVarint(),
  down_bandwidth: new MuVarint(),
  clock: new MuFloat64(),
  tick: new MuFloat64(),
  frameskips: new MuVarint(),
  entities: new MuVarint(),
  connections: new MuVarint(),
  chats: new MuVarint(),
  bodies: new MuVarint(),
  contacts: new MuVarint(),
  particles: new MuVarint(),
  players: new MuVarint(),
  player_inputs: new MuVarint(),
  server_players: new MuVarint(),

  // more diagnostics
  ipfs_up: new MuVarint(),
  ipfs_down: new MuVarint(),
  ipfs_error: new MuVarint(),

  // number of lines logged
  script_log: new MuVarint(),
  script_error: new MuVarint(),

  // sql stats
  sql_queries: new MuVarint(),
  sql_rows: new MuVarint(),
  sql_errors: new MuVarint(),

  // closed sockets
  socket_closed: new MuVarint(),

  // ping in ticks
  min_ping: new MuFloat64(),
  max_ping: new MuFloat64(),
  avg_ping: new MuFloat64(),

  // tick time in ms
  min_tick: new MuFloat64(),
  max_tick: new MuFloat64(),
  avg_tick: new MuFloat64(),
});
export const AnalyticsHttpEntrySchema = new MuStruct({
  server_name: new MuUTF8(),
  host: new MuUTF8(),
  ip: new MuUTF8(),
  method: new MuUTF8(),
  path: new MuUTF8(),
  referer: new MuUTF8(),
  user_agent: new MuUTF8(),
});

export const AnalyticsRPCSchema = {
  name: 'analytics',
  api: {
    addEvent: {
      arg: AnalyticsEventEntrySchema,
      ret: new MuVoid(),
    },
    addTop: {
      arg: AnalyticsTopEntrySchema,
      ret: new MuVoid(),
    },
    addEngine: {
      arg: AnalyticsEngineEntrySchema,
      ret: new MuVoid(),
    },
    addHttp: {
      arg: AnalyticsHttpEntrySchema,
      ret: new MuVoid(),
    },
  },
};

type UndefinedKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

type UndefinedToOptional<T> = {
  [K in Exclude<keyof T, UndefinedKeys<T>>]: T[K];
} & {
  [K in UndefinedKeys<T>]?: T[K];
};

export type AnalyticsEvent = UndefinedToOptional<
  typeof AnalyticsEventEntrySchema.identity
>;
export type AnalyticsTop = typeof AnalyticsTopEntrySchema.identity;
export type AnalyticsEngine = typeof AnalyticsEngineEntrySchema.identity;
export type AnalyticsHttp = typeof AnalyticsHttpEntrySchema.identity;
