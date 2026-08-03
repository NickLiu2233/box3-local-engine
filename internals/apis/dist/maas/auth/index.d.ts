import { HttpClient } from '../../http-client';
import { RequestParams } from '../../interface';
import { Permissions } from '../data-contracts';
export declare class MaasAuth extends HttpClient {
    private parseQueries;
    checkPermission(query: {
        permissions?: Permissions[];
        resourceId?: string;
    }, params?: RequestParams): Promise<Permissions[]>;
    checkPermissionByTicket(query: {
        permissions?: Permissions[];
        resourceId?: string;
    }, params?: RequestParams): Promise<Permissions[]>;
}
//# sourceMappingURL=index.d.ts.map