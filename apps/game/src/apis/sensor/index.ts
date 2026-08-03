import { clientConfig } from 'src/config/client';
import { getQueryParam } from 'src/utils/url-helpers';
import { SensorEvent, SensorsRegisterOptions } from './defs';

const sensors =
  !clientConfig.isLocalGameServer && clientConfig.SENSORS_TRACKER_URL
    ? require('sa-sdk-javascript')
    : null;
const CLIENT_STAMP = 'client_stamp';

export class SensorsTracker {
  private static _instance: SensorsTracker | null = null;
  private _sensors = sensors;
  private isLogin = false;
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
    this.init();
  }

  public init = () => {
    if (!this.enabled) {
      return;
    }
    // 手册见：https://manual.sensorsdata.cn/sa/docs/tech_sdk_client_web_use/v0205
    this._sensors.init({
      server_url: clientConfig.SENSORS_TRACKER_URL,
      /**
       * 控制是否监听 URL 变动来触发 $pageview 事件，如果 URL 在未跳转页面的情况下会发生变动则需要关闭
       */
      is_track_single_page: true,
      use_client_time: true,
      send_type: 'beacon',
      heatmap: {
        /**
         * 是否开启点击图，default 表示开启，自动采集 $WebClick 事件，可以设置 'not_collect' 表示关闭。
         * 默认只有点击 a input button textarea 四种元素时，才会触发 $WebClick 元素点击事件
         */
        clickmap: 'default',
        /**
         * 是否开启触达图，not_collect 表示关闭，不会自动采集 $WebStay 事件，可以设置 'default' 表示开启。
         */
        scroll_notice_map: 'default',
        /**
         * 开启可视化支持自定义属性和任意层级 div 标签功能，见 https://manual.sensorsdata.cn/sa/docs/web_visual_auto_track/v0205?search=1
         */
        get_vtrack_config: true,
      },
    });
    const { name, contentId } = clientConfig.mapInfo;
    // 定义并注册公共属性
    const register: SensorsRegisterOptions = {
      is_login: () => this.isLogin,
      project_ID: clientConfig.APP_REGION === 'cn' ? 'box3' : 'createra',
      platform: getQueryParam('platform') || '无',
      map_name: name,
      // 海外大写map_ID 国内小写map_id
      ...(clientConfig.APP_REGION === 'oversea' && {
        map_ID: contentId,
      }),
      ...(clientConfig.APP_REGION === 'cn' && {
        map_id: contentId,
      }),
    };
    this._sensors.registerPage(register);

    // 开启全埋点 $pageView
    this._sensors.quick('autoTrack');
  };

  public login(userId: number) {
    if (this.enabled && userId) {
      this._sensors.login(userId.toString());
      this.isLogin = true;
    }
  }

  public track = (name: SensorEvent, eventBody?: Record<string, unknown>) => {
    if (!this.enabled) {
      return;
    }
    this._sensors.track(name, eventBody);
  };

  /**
   * arena进入游戏编辑埋点
   * @returns void
   */
  public arenaEnter = () => {
    if (!this.enabled) {
      return;
    }
    const triggeredFrom = getQueryParam('triggered_from') || '';
    this.track(SensorEvent.ARENA_ENTER, {
      triggered_from: triggeredFrom,
    });
  };

  /**
   * arena进入创作按钮点击埋点
   * @returns void
   */
  public arenaEnterClick = () => {
    if (!this.enabled) {
      return;
    }
    const triggeredFrom = getQueryParam('triggered_from') || '';
    this.track(SensorEvent.ARENA_CREATE_CLICK, {
      triggered_from: triggeredFrom,
    });
  };

  /**
   * edit模式下, 项目保存埋点
   * @fail_reason 失败时尽量传入带有error信息的字符串，禁止传undefined
   * @returns void
   */
  public saveProject = (is_success: boolean, fail_reason: string = '') => {
    if (!this.enabled) {
      return;
    }
    this.track(SensorEvent.MAP_SAVE, {
      is_success,
      fail_reason,
    });
  };

  /**
   * play下进入地图
   * @returns void
   */
  public mapEnter = (isLogin: boolean) => {
    if (!this.enabled) {
      return;
    }
    this.track(SensorEvent.MAP_ENTER, {
      login_method: isLogin ? 'other' : 'guest',
    });
  };

  /**
   * play连接容器埋点
   * @returns void
   */
  public mapConnect = (isLogin: boolean) => {
    if (!this.enabled) {
      return;
    }
    this.track(SensorEvent.MAP_CONNECT, {
      login_method: isLogin ? 'other' : 'guest',
    });
  };

  /**
   * 页面关闭事件
   * @returns void
   */
  public pageEnd = () => {
    if (!this.enabled) {
      return;
    }
    const diff = stampHelper.getStampDiff();
    if (diff < 3000) {
      return;
    }
    const reportBody = {
      title: document.title,
      url: location.href,
      event_duration: `${diff}`,
    };
    this.track(SensorEvent.PAGE_END, reportBody);
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
