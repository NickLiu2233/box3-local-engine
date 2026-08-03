import { HttpClient } from '../../http-client';
import { RequestParams, ContentType } from '../../interface';
import type { ResourceConfigsResp } from '../data-contracts';

export class Resource extends HttpClient {
  public getConfig(resourceId: string, params: RequestParams = {}) {
    return this.request<ResourceConfigsResp>({
      path: `/resource/config/ticket?resourceId=${resourceId}`,
      method: 'GET',
      type: ContentType.Json,
      ...params,
    });
  }

  public getConfigByToken(resourceId: string, params: RequestParams = {}) {
    return this.request<ResourceConfigsResp>({
      path: `/resource/config?resourceId=${resourceId}`,
      method: 'GET',
      type: ContentType.Json,
      ...params,
    });
  }
}
