import { GameConsole } from '@box-local/schema/api/console';
import * as GameAPI from '@box-local/schema/api/js/api';
import * as GameMath from '@box-local/schema/api/js/math';
import * as GameDB from '@box-local/schema/api/js/db';
import * as GameHttp from '@box-local/schema/api/js/http';
import * as GameURL from '@box-local/schema/api/js/url';
import * as GameRTC from '@box-local/schema/api/js/rtc';
import * as GameGUI from '@box-local/schema/api/js/gui';
import * as GameStorage from '@box-local/schema/api/js/storage';
import * as GameRemoteChannel from '@box-local/schema/api/js/remote-channel';
import type { GameAnalytics } from '@box-local/script-api';

export function createScriptAPI(spec: {
  scheduler: {
    setTimeout: (f: Function, t: number) => number;
    clearTimeout: (id: number) => void;
    setInterval: (f: Function, t: number) => number;
    clearInterval: (id: number) => void;
  };

  console: GameConsole;

  world: GameAPI.GameWorld;
  voxels: GameAPI.GameVoxels;
  resources: GameAPI.GameResourceSystem;
  db: GameDB.GameDatabase;
  storage: GameStorage.GameStorage;
  http: GameHttp.GameHttpAPI;
  rtc: GameRTC.GameRTC;
  gui: GameGUI.GameGUI;
  remoteChannel: GameRemoteChannel.ServerRemoteChannel;
  analytics: GameAnalytics;

  require: (id: string) => any;

  sleep: (timeMS: number) => Promise<void>;

  raiseException: (e: any) => void;
}) {
  (<any>Promise).delay = spec.sleep;
  return {
    raiseException: spec.raiseException,

    setTimeout: spec.scheduler.setTimeout,
    setInterval: spec.scheduler.setInterval,
    clearTimeout: spec.scheduler.clearTimeout,
    clearInterval: spec.scheduler.clearInterval,

    sleep: spec.sleep,

    console: spec.console,

    world: spec.world,
    voxels: spec.voxels,
    resources: spec.resources,
    db: spec.db,
    storage: spec.storage,
    http: spec.http,
    rtc: spec.rtc,
    gui: spec.gui,
    remoteChannel: spec.remoteChannel,
    analytics: spec.analytics,

    require: spec.require,

    ...GameAPI,
    ...GameMath,
    ...GameDB,
    ...GameHttp,
    ...GameURL,
  };
}
