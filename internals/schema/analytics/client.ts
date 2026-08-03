import {
  AnalyticsEvent,
  AnalyticsTop,
  AnalyticsEngine,
  AnalyticsHttp,
  AnalyticsRPCSchema,
} from './protocol';

export interface AnalyticsClientType {
  addEvent: (event: AnalyticsEvent) => void;
  addTop: (top: AnalyticsTop) => void;
  addEngine: (engine: AnalyticsEngine) => void;
  addHttp: (http: AnalyticsHttp) => void;
}
