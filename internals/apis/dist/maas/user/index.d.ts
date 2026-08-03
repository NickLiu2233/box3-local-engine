import { HttpClient } from '../../http-client';
import { RequestParams } from '../../interface';
export declare class MaasUser extends HttpClient {
    authToCookie(query: {
        token: string;
    }, params?: RequestParams): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map