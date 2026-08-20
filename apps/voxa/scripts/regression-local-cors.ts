import assert from 'node:assert/strict';

import { setLocalCors } from '../server/local-cors';

type Headers = Record<string, string | string[] | undefined>;

function request(origin?: string): { headers: Headers } {
  return { headers: origin ? { origin } : {} };
}

function response() {
  const headers = new Map<string, string>();
  return {
    headers,
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
  };
}

const previousPublicUrl = process.env.BOX_VOXA_PUBLIC_URL;
const previousAllowedOrigins = process.env.BOX_VOXA_ALLOWED_ORIGINS;

try {
  process.env.BOX_VOXA_PUBLIC_URL = 'http://10.240.28.131:3221';
  process.env.BOX_VOXA_ALLOWED_ORIGINS = 'https://voxa.example.test/editor, invalid-origin';

  const lanResponse = response();
  assert.equal(
    setLocalCors(request('http://10.240.28.131:3221') as any, lanResponse as any),
    true,
    'the configured LAN VOXA origin must be able to save models',
  );
  assert.equal(
    lanResponse.headers.get('Access-Control-Allow-Origin'),
    'http://10.240.28.131:3221',
  );

  assert.equal(
    setLocalCors(request('https://voxa.example.test') as any, response() as any),
    true,
    'explicit reverse-proxy origins must be accepted',
  );
  assert.equal(
    setLocalCors(request('http://10.240.28.132:3221') as any, response() as any),
    false,
    'a different LAN host must remain rejected',
  );
  assert.equal(
    setLocalCors(request('http://127.0.0.1:3001') as any, response() as any),
    true,
    'loopback development access must remain accepted',
  );
  assert.equal(setLocalCors(request() as any, response() as any), true);

  console.log('VOXA local CORS regression passed');
} finally {
  if (previousPublicUrl === undefined) delete process.env.BOX_VOXA_PUBLIC_URL;
  else process.env.BOX_VOXA_PUBLIC_URL = previousPublicUrl;
  if (previousAllowedOrigins === undefined) delete process.env.BOX_VOXA_ALLOWED_ORIGINS;
  else process.env.BOX_VOXA_ALLOWED_ORIGINS = previousAllowedOrigins;
}
