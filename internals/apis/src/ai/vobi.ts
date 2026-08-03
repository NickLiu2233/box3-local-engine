import { HttpClient } from '../http-client';
import { appendSignatureHeaders } from '../signature';
import { ContentType, RequestParams } from '../interface';
import type { ShapEResponse } from './data-contract';

export class VobiApi extends HttpClient {
  public predict(
    data: { prompt: string },
    secretKey: string,
    params: RequestParams = {},
  ) {
    appendSignatureHeaders(params, { data }, secretKey);

    return this.request<ShapEResponse>({
      path: 'ai/vobi/predict',
      method: 'POST',
      type: ContentType.Json,
      body: data,
      ...params,
    });
  }
}
