import { clientConfig } from 'src/config/client';

export function hashURL(hash: string) {
  if (!hash) {
    return '';
  }
  if (hash.indexOf('http') >= 0) {
    return hash;
  }
  return clientConfig.CDN_PATH + '/block/' + hash;
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
