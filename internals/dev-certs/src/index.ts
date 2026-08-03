import { readFileSync } from 'fs';
import { resolve } from 'path';

export function getCACert() {
  return readFileSync(resolve(__dirname, '../certs/minica.pem'));
}

export function getCert(domain: string) {
  return readFileSync(resolve(__dirname, `../certs/${domain}/cert.pem`));
}

export function getKey(domain: string) {
  return readFileSync(resolve(__dirname, `../certs/${domain}/key.pem`));
}
