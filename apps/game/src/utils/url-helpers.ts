import { URL, URLSearchParams } from '@box/schema/api/js/url';

export const OFFICIAL_URL = {
  codemaoDev: 'http://development.game-vpc.codemao.cn/',
  codemaoStaging: 'http://staging.game-vpc.codemao.cn/',
  codemaoPreprod: 'https://preprod.game.codemao.cn/',
  codemaoProd: 'https://game.codemao.cn/',
  funDev: 'https://development.game.fun/',
  funStaging: 'https://staging.game.fun/',
  funPreprod: 'https://preprod.game.fun/',
  funProd: 'https://game.fun/',
  overseaDev: 'https://development.box.game/',
  overseaStaging: 'https://staging.box.game/',
  overseaPreprod: 'https://preprod.box.game/',
  overseaProd: 'https://box.game/',
};

export type QueryParams =
  | 'platform'
  | 'hash'
  | 'token'
  | 'triggered_from'
  | 'serverId'
  | 'mtm_source'
  | 'autoPlay'
  | 'mode';

export function getQueryParam(variable: QueryParams) {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return '';
  }
  const url = new URL(window.location.href);
  return url.searchParams.get(variable) || '';
}

export function deleteUrlParam(name: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  return url;
}

export function getHostname(url: string) {
  return new URL(url).hostname;
}

export function buildURLQuery(query: {
  [key: string]: string | number | boolean | undefined;
}) {
  const res = new URLSearchParams(query).toString();
  return res && '?' + res;
}

export function isInternalURL(targetUrl: string) {
  try {
    const targetHost = getHostname(targetUrl);
    const officialUrl = Object.values(OFFICIAL_URL);
    for (let i = 0; i < officialUrl.length; i++) {
      const internalHost = getHostname(officialUrl[i]);
      if (targetHost === internalHost) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

const protocolAndDomainRE = /^(?:\w+:)?\/\/(\S+)$/;

export const isUrl = (url: string) => {
  if (typeof url !== 'string') {
    return false;
  }

  const match = url.match(protocolAndDomainRE);
  if (!match) {
    return false;
  }
  return false;
};

export const localhostRegex = /^https?:\/\/localhost:\d+$/;
