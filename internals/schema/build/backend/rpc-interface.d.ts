import { AnalyticsClientType } from '@box-local/analytics/client';
import { AuthAPI } from './rpc/auth-protocol';
import { ContentAPI } from './rpc/content-protocol';
import { UserAPI } from './rpc/user-protocol';
export interface BackendRPC {
    user: UserAPI;
    auth: AuthAPI;
    content: ContentAPI;
    analytics: AnalyticsClientType;
}
//# sourceMappingURL=rpc-interface.d.ts.map