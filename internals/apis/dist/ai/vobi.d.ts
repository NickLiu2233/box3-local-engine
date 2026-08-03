import { HttpClient } from '../http-client';
import { RequestParams } from '../interface';
export declare class VobiApi extends HttpClient {
    predict(data: {
        prompt: string;
    }, secretKey: string, params?: RequestParams): Promise<import("./data-contract").ShapEModel>;
}
//# sourceMappingURL=vobi.d.ts.map