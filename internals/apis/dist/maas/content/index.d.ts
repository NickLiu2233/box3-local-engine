import { HttpClient } from '../../http-client';
import { RequestParams } from '../../interface';
export declare class MaasContent extends HttpClient {
    getContentInfo(contentId: string, params?: RequestParams): Promise<import("../data-contracts").ContentInfo>;
    getContentInfoByToken(contentId: string, params?: RequestParams): Promise<import("../data-contracts").ContentInfo>;
    getPartnerConfig(params?: RequestParams): Promise<import("../data-contracts").PartnerConfig>;
    getPartnerPublicConfig(query: {
        containerName: string;
    }, params?: RequestParams): Promise<import("../data-contracts").PartnerConfigResType>;
    getContentId(query: {
        containerName: string;
    }, params?: RequestParams): Promise<string>;
}
//# sourceMappingURL=index.d.ts.map