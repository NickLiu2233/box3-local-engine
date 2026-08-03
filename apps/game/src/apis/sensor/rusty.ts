import { clientConfig } from 'src/config/client';
import { getQueryParam } from 'src/utils/url-helpers';
import { SensorEvent, SensorPublicProps } from './defs';
import sensors from './game.js';

const CLIENT_STAMP = 'client_stamp';

export class SensorsTracker {
  private static _instance: SensorsTracker | null = null;
  private _sensors = sensors;
  private readonly enabled =
    !clientConfig.isLocalGameServer && !!clientConfig.SENSORS_TRACKER_URL;

  constructor() {
    if (SensorsTracker._instance) {
      return SensorsTracker._instance;
    }
    SensorsTracker._instance = this;
    if (!this.enabled) {
      return;
    }
    stampHelper.saveStamp();
  }

  public init = () => {
    if (!this.enabled) {
      return;
    }
    // 手册见：https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_web_use/v0205
    this._sensors.setPara({
      server_url: clientConfig.SENSORS_TRACKER_URL,
      show_log: true, // 是否开启日志打印
    });
    const { name, contentId } = clientConfig.mapInfo;
    // 定义并注册公共属性
    const register: SensorPublicProps = {
      platform: getQueryParam('platform') || '无',
      map_name: name,
      map_id: contentId,
    };
    this._sensors.registerApp(register);

    // 开启全埋点 $pageView
    this._sensors.init();
  };

  public login(userId: number) {
    if (!this.enabled) {
      return;
    }
    this._sensors.login(userId.toString());
  }

  public track = (name: SensorEvent, eventBody?: Record<string, unknown>) => {
    if (!this.enabled) {
      return;
    }
    this._sensors.track(name, eventBody);
  };
}

const stampHelper = {
  saveStamp() {
    const now = new Date().getTime();
    window.localStorage.setItem(CLIENT_STAMP, `${now}`);
  },
  getStampDiff() {
    const before = window.localStorage.getItem(CLIENT_STAMP);
    if (!before) {
      return 0;
    }
    const now = new Date().getTime();
    const diff = +now - +before;
    return diff;
  },
  clearStamp() {
    window.localStorage.removeItem(CLIENT_STAMP);
  },
};

export const sensor = new SensorsTracker();
