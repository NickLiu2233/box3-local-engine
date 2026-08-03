import { HttpClient } from '../../http-client';
import { ContentType, RequestParams } from '../../interface';
import { PermissionsResp, Permissions } from '../data-contracts';

export class MaasAuth extends HttpClient {
  private parseQueries(query: {
    permissions?: Permissions[];
    resourceId?: string;
  }): string {
    const { permissions, resourceId } = query;

    let queries: string[] = [];

    if (Array.isArray(permissions)) {
      queries = queries.concat(
        permissions.map((permission) => `permissions=${permission}`),
      );
    }

    if (typeof resourceId !== 'undefined') {
      queries.push(`resourceId=${resourceId}`);
    }

    return queries.join('&');
  }

  public checkPermission(
    query: {
      permissions?: Permissions[];
      resourceId?: string;
    },
    params: RequestParams = {},
  ) {
    return this.request<PermissionsResp>({
      path: `/check/permission?${this.parseQueries(query)}`,
      method: 'GET',
      type: ContentType.Json,
      ...params,
    });
  }

  public checkPermissionByTicket(
    query: {
      permissions?: Permissions[];
      resourceId?: string;
    },
    params: RequestParams = {},
  ) {
    return this.request<PermissionsResp>({
      path: `/check/permission/ticket?${this.parseQueries(query)}`,
      method: 'GET',
      type: ContentType.Json,
      ...params,
    });
  }
}
