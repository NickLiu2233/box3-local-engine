import { clientConfig } from 'src/config/client';

/**
 * 获取oss文件的地址，目前引擎的文件都存储于engine/m路径下
 * @param hash oss文件hash
 * @returns
 */
export function getOSSResourceUrl(hash: string) {
  return `${clientConfig.OSS_CDN_URL}/engine/m/${hash}`;
}
