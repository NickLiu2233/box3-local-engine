import { WHITELIST } from 'src/engine/utils/url-whitelist';

export class ClientHttp {
  public async fetch(url: string, options: RequestInit = {}) {
    if (!WHITELIST.test(url)) {
      throw new Error(`Blocked url: ${url}`);
    }
    return fetch(url, options);
  }
}
