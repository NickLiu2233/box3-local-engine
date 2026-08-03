import { HttpClient } from '../../http-client';
import { RequestParams } from '../../interface';
export declare class Resource extends HttpClient {
    getConfig(resourceId: string, params?: RequestParams): Promise<import("../data-contracts").ResourceConfigs[]>;
    getConfigByToken(resourceId: string, params?: RequestParams): Promise<import("../data-contracts").ResourceConfigs[]>;
}
//# sourceMappingURL=index.d.ts.map