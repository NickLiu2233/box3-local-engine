import URL from 'url';

// TODO:de-codemao 替换白名单
const whitelist = new Set([
  'codemao.cn',
  'box3.fun',
  'box.game',
  'bilibili.com',
  'weixin.qq.com',
  'opensea.io',
  'createra.fun',
  'box3lab.com',
]);

export function isSafeUrl(url: string) {
  const normalizedUrl = url.trim().toLowerCase();
  let decodedNormalizedUrl = normalizedUrl;
  try {
    decodedNormalizedUrl = decodeURIComponent(url).trim().toLowerCase();
  } catch {
    // ignore malformed URI sequence and fallback to raw input check
  }

  if (
    /^(javascript|data|vbscript):/.test(normalizedUrl) ||
    /^(javascript|data|vbscript):/.test(decodedNormalizedUrl)
  ) {
    return false;
  }

  const parsed = URL.parse(url);
  if (!parsed.protocol || !parsed.hostname) {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  let domain = parsed.hostname.toLowerCase();
  while (domain.length > 0) {
    if (whitelist.has(domain) && url.indexOf('/block') < 0) {
      return true;
    }
    const pos = domain.indexOf('.');
    if (pos < 0) {
      break;
    }
    domain = domain.substr(pos + 1);
  }
  return false;
}
