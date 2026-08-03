import { HttpClient } from '../../http-client';
import { ContentType, RequestParams } from '../../interface';
import {
  ContentInfoResp,
  PartnerConfigResp,
  Resp,
  PartnerPublicConfigResp,
} from '../data-contracts';

export class MaasContent extends HttpClient {
  public getContentInfo(contentId: string, params: RequestParams = {}) {
    return this.request<ContentInfoResp>({
      path: `/content/info/${contentId}`,
      method: 'GET',
      type: ContentType.Json,
      ...params,
    });
  }

  public getContentInfoByToken(contentId: string, params: RequestParams = {}) {
    return this.request<ContentInfoResp>({
      path: `/content/info/get-by-token/${contentId}`,
      method: 'GET',
      type: ContentType.Json,
      ...params,
    });
  }

  public getPartnerConfig(params: RequestParams = {}) {
    return this.request<PartnerConfigResp>({
      path: '/partner/config',
      method: 'GET',
      type: ContentType.Json,
      ...params,
    });
  }

  public getPartnerPublicConfig(
    query: { containerName: string },
    params: RequestParams = {},
  ) {
    return this.request<PartnerPublicConfigResp>({
      query,
      path: '/partner/config-no-auth',
      method: 'GET',
      type: ContentType.Json,
      ...params,
    });
  }

  public getContentId(
    query: { containerName: string },
    params: RequestParams = {},
  ) {
    return this.request<Resp<string>>({
      query,
      path: '/content/map/get-content-id',
      method: 'GET',
      type: ContentType.Json,
      ...params,
    });
  }
}
