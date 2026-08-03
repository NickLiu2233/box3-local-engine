import { Logger } from 'pino';
import SensorAnalytics from 'sa-sdk-node';

import { MuServer, MuServerProtocol } from '@box-local/mudb/server';
import { GameLogLevel } from '@box-local/schema/api/console';
import type { EventBus } from '@box-local/utils/event';
import { AnalyticsScriptProtocol } from './script-protocol';

export class AnalyticsScriptHost {
  public protocol: MuServerProtocol<typeof AnalyticsScriptProtocol>;
  // 神策提供的分析SDK实例
  private sa: any;

  constructor(spec: {
    server: MuServer;
    onDebugConsoleLog: EventBus<{ level: GameLogLevel; message: string }>;
    logger: Logger;
  }) {
    this.protocol = spec.server.protocol(AnalyticsScriptProtocol);
    this.protocol.configure({
      message: {
        // 初始化神策分析
        initSensor: (_, options) => {
          const { url, timeout } = options;
          this.sa = new SensorAnalytics();
          this.sa.initNWConsumer({ url, timeout, cachePath: __dirname });
        },
        // 追踪事件数据
        trackSensor: (_, options) => {
          const { distinctId: userId, eventName, properties } = options;
          try {
            // 发送事件数据到神策平台
            this.sa.track(userId, eventName, JSON.parse(properties));
          } catch (error) {
            // 错误处理和日志记录
            spec.logger.warn(error, 'Sensor track event error.');
            spec.onDebugConsoleLog.notify({
              level: GameLogLevel.ERROR,
              message: `Sensor track event error: ${error.message}`,
            });
          }
        },
      },
    });
  }

  // 重置神策实例
  public reset() {
    delete this.sa;
  }
}
