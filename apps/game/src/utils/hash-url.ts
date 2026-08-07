import { clientConfig } from 'src/config/client';

export function resolveHashURL(cdnPath: string, value: string) {
  if (!value) {
    return '';
  }
  // Callers also use this helper for already-resolved runtime/static URLs.
  // Only a bare content hash should be routed through /block/.
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/)/i.test(value)) {
    return value;
  }
  return `${cdnPath.replace(/\/$/, '')}/block/${value}`;
}

export function hashURL(hash: string) {
  return resolveHashURL(clientConfig.CDN_PATH || '', hash);
}

export type ImageFormats =
  | 'png'
  | 'jpg'
  | 'webp'
  | 'avif'
  | 'wp2'
  | 'jxl'
  | 'jpeg';
export type ImageFit = 'cover' | 'fill' | 'contain';
