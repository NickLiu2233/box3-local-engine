import type { AxiosInstance } from 'axios';
import type { Request } from './interface';

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.instance = axios;
  }

  public request: Request = async ({
    path,
    type,
    query,
    body,
    ...requestParams
  }) => {
    return this.instance
      .request({
        params: query,
        data: body,
        url: path,
        ...requestParams,
      })
      .then((res) => {
        const { code, data } = res.data;

        if (code >= 200 && code < 300) {
          return data;
        }

        throw res.data;
      });
  };
}
