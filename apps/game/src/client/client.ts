import { clientConfig } from 'src/config/client';
import { installErrorHandler } from 'src/utils/error-handler';
import { BufferSink, Logger } from '@box-local/utils/logger';

import { Logger as PinoLogger } from 'pino';

import { setGameSettings } from 'src/engine/settings/settings-controller';
import { Settings } from 'src/engine/settings/settings-schema';
import { CloseType } from 'src/engine/game-client-schema';
import { GameAdminClient } from 'src/entry/admin-client';
import { GameClient } from 'src/engine/game-client';
import { canvasToBlob } from 'src/utils/capture';
import { DISPOSED_WEAK_SET } from 'src/utils/performance-test';
import { rootLogger } from 'src/utils/logger';
import { messenger } from 'src/messenger';

import { BackendClientRPC } from './backend-rpc-client';
import { getMuRef } from './client-schema';
import { getToken, setToken } from 'src/utils/token';
import { EventBus } from '@box-local/utils/event';

function localRuntimeURL(mode: 'play' | 'edit') {
  if (typeof window === 'undefined') return '';
  if (!clientConfig.isLocalGameServer) return '';
  return `${window.location.origin}/runtime/${mode}`;
}

/**
 * engine client的公共类
 * 管理游戏主流程
 * @export
 * @class client公共类，定义公共方法和公共属性
 * @private bufferSink BufferSink
 * @public brpc backend rpc 实例（node接口请求实例）
 * @public logger 日志记录
 * @public game 引擎渲染实例（包含了引擎相关的属性状态）
 * @public admin 管理员rpc实例
 */
export class EngineClient {
  protected bufferSink: BufferSink;
  public brpc: BackendClientRPC;
  public logger: Logger;

  private _game = getMuRef<GameClient>();

  public get game() {
    return this._game;
  }
  public setGame(newValue: GameClient) {
    if (this._game) {
      this._game.destroy();
      process.env.NODE_ENV === 'development' &&
        DISPOSED_WEAK_SET.add(this._game);
      process.env.NODE_ENV === 'development' &&
        DISPOSED_WEAK_SET.add(this._game.client);
    }
    this._game = newValue;
    this._game.onReady.sub(() => {
      this.onGameReady.notify(this.game);
    });
    this.onGameChange.notify(newValue);
  }
  public readonly onGameChange = new EventBus<GameClient>();

  /**
   * 当前 PlayClient 使用的 GameClient 达到 Ready 状态
   */
  public readonly onGameReady = new EventBus<GameClient>();

  protected pinoLogger: PinoLogger;
  public admin = getMuRef<GameAdminClient>();

  constructor(mode: 'play' | 'edit') {
    this.bufferSink = new BufferSink();
    this.logger = new Logger(this.bufferSink.sink, [], mode);
    this.pinoLogger = rootLogger.child({ caller: 'engine' });

    // 设置url中的token
    setToken();

    // 捕获window全局的error用logger进行打印
    installErrorHandler(this.logger);
    // 创建node-backend实例
    this.brpc = new BackendClientRPC(
      localRuntimeURL(mode) || clientConfig.BACKEND_SERVER_URL,
      this.logger,
    );
    this.brpc.setHeaders({
      auth: getToken(),
    });

    // 第一次内存检查在10s后
    this.runMemoryMeasurements(10000);
  }

  public preconnect(error?: (error?: CloseType) => void): void {}

  public start(spec: {
    ready: () => void;
    frame: () => void;
    close: (error: CloseType) => void;
  }): void {}

  public close() {
    this.game.client.destroy();
    messenger.messageTool.destroy();
  }

  public setGameSettings = (settings: Partial<Settings>) => {
    setGameSettings(this.game.state, settings);
    // 如果修改分辨率，需要手动实时更新下canvas的尺寸
    if (settings['resolutionScale'] !== undefined) {
      this.game.onResolutionScaleUpdate();
    }
  };

  public progress = () => {
    return this.game.loading.progress();
  };

  public hidePlayers = (hide: boolean) => {
    this.game.state.hidePlayers = hide;
  };

  private screenshot = async () => {
    const canvas = this.game.state.dom.canvas;
    if (!canvas) {
      return;
    }
    return await canvasToBlob(canvas, { type: 'png' });
  };

  public sendScreenshot = async () => {
    const blob = await this.screenshot();
    if (!blob) {
      return;
    }
    messenger.messageTool.emitEvent('screenshot', { blob });
  };

  /**
   * 根据内存占用率，以一定间隔向容器上报内存使用情况
   * 内存占用越高，此间隔越短
   * @param nextInterval
   */
  private runMemoryMeasurements(nextInterval: number) {
    if (!performance['memory']) {
      this.pinoLogger.info('`performance.memory` not supported.');
      return;
    }
    setTimeout(this.measureMemory, nextInterval);
  }

  /**
   * 测量内存使用情况
   */
  private measureMemory = async () => {
    let report = {
      usedJSHeapSize: performance['memory'].usedJSHeapSize,
      jsHeapSizeLimit: performance['memory'].jsHeapSizeLimit,
    };
    let usedRatio = report.usedJSHeapSize / report.jsHeapSizeLimit;

    if (usedRatio > 0.9) {
      this.pinoLogger.warn('memory used more than 90%%: %o', report);
    } else {
      this.pinoLogger.debug('memory stats: %o', report);
    }

    // 根据内存使用情况，定期记录内存信息，占用越高则查询间隔越短,最少为1min
    this.runMemoryMeasurements(-Math.log(usedRatio) * 300000 + 60000);
  };
}
