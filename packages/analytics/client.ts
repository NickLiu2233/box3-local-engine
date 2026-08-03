import { MuRPCClient } from '@box-local/mudb/rpc/client';
import {
  AnalyticsRPCSchema,
  AnalyticsEvent,
  AnalyticsTop,
  AnalyticsEngine,
  AnalyticsHttp,
} from './protocol';
import { Logger } from '@box-local/utils/logger';
import { MuRPCClientTransport } from '@box-local/mudb/rpc/protocol';

export interface AnalyticsClientType {
  addEvent: (event: AnalyticsEvent) => void;
  addTop: (top: AnalyticsTop) => void;
  addEngine: (engine: AnalyticsEngine) => void;
  addHttp: (http: AnalyticsHttp) => void;
}

export class AnalyticsClient implements AnalyticsClientType {
  private rpc: MuRPCClient<typeof AnalyticsRPCSchema>;
  constructor(private logger: Logger, transport: MuRPCClientTransport<any>) {
    this.rpc = new MuRPCClient(AnalyticsRPCSchema, transport);
  }

  public addEvent(event: AnalyticsEvent) {
    this.rpc.api
      .addEvent(event as any)
      .catch((err) => {
        this.logger.warn('upload analytics event failed:');
        this.logger.warn(err);
      })
      .catch(this.logger.error);
  }

  public addTop(top: AnalyticsTop) {
    this.rpc.api
      .addTop(top)
      .catch((err) => {
        this.logger.warn('upload analytics top failed:');
        this.logger.warn(err);
      })
      .catch(this.logger.error);
  }

  public addEngine(engine: AnalyticsEngine) {
    this.rpc.api
      .addEngine(engine)
      .catch((err) => {
        this.logger.warn('upload analytics engine failed:');
        this.logger.warn(err);
      })
      .catch(this.logger.error);
  }

  public addHttp(http: AnalyticsHttp) {
    this.rpc.api
      .addHttp(http)
      .catch((err) => {
        this.logger.warn('upload analytics http failed:');
        this.logger.warn(err);
      })
      .catch(this.logger.error);
  }
}
