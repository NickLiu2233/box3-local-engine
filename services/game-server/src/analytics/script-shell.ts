import { MuClient } from '@box-local/mudb/client';
import { GameAnalytics, GameSensorAnalytics } from '@box-local/script-api';
import { AnalyticsScriptProtocol } from './script-protocol';

export class AnalyticsScriptShell {
  public api: GameAnalytics;
  constructor(client: MuClient) {
    const protocol = client.protocol(AnalyticsScriptProtocol);
    protocol.configure({
      message: {},
    });
    this.api = new GameAnalytics(
      new GameSensorAnalytics(
        (url: string, timeout = 30000) => {
          protocol.server.message.initSensor({ url, timeout });
        },
        (distinctId: string, eventName: string, properties) => {
          protocol.server.message.trackSensor({
            distinctId,
            eventName,
            properties: JSON.stringify(properties),
          });
        },
      ),
    );
  }
}
