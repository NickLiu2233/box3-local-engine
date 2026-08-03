import { HttpClient } from '../../http-client';
import { ContentType, RequestParams } from '../../interface';

export class MaasUser extends HttpClient {
  public authToCookie(query: { token: string }, params: RequestParams = {}) {
    return this.request({
      path: '/user/auth2Cookie',
      query,
      method: 'GET',
      type: ContentType.Json,
      ...params,
    });
  }
}
