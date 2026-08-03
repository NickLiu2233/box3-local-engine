import { Whitelist } from '@box-local/utils/whitelist';
import { clientConfig } from 'src/config/client';

export function isSafeUrl(url: string) {
  return true;
}

export const WHITELIST: Whitelist = new Whitelist(
  clientConfig.SCRIPT_WHITELIST,
);
