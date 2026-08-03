import { AnalyticsEvent, AnalyticsTop, AnalyticsEngine, AnalyticsHttp } from './protocol';
export interface AnalyticsClientType {
    addEvent: (event: AnalyticsEvent) => void;
    addTop: (top: AnalyticsTop) => void;
    addEngine: (engine: AnalyticsEngine) => void;
    addHttp: (http: AnalyticsHttp) => void;
}
//# sourceMappingURL=client.d.ts.map