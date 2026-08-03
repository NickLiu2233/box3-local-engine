import type { AxiosInstance } from 'axios';
import type { Request } from './interface';
export declare class HttpClient<SecurityDataType = unknown> {
    instance: AxiosInstance;
    constructor(axios: AxiosInstance);
    request: Request;
}
//# sourceMappingURL=http-client.d.ts.map