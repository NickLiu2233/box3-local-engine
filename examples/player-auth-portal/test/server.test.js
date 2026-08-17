'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, test } = require('node:test');

const {
  configFromEnvironment,
  createAuthPortalServer,
  trustedReturnURL,
} = require('../server');

let upstream;
let portal;
let upstreamURL;
let portalURL;
let lastUpstreamRequest;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

before(async () => {
  upstream = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    lastUpstreamRequest = {
      url: request.url,
      headers: request.headers,
      body: Buffer.concat(chunks).toString('utf8'),
    };
    response.setHeader('Content-Type', 'application/json');
    if (request.url.endsWith('/session')) {
      response.end(JSON.stringify({
        player: null,
        databaseEnabled: true,
        registrationEnabled: true,
      }));
      return;
    }
    response.statusCode = request.url.endsWith('/register') ? 201 : 200;
    response.setHeader('Set-Cookie', 'box_player_session=test-token; Path=/; HttpOnly; SameSite=Lax');
    response.end(JSON.stringify({
      player: { username: 'tester', displayName: '测试玩家' },
    }));
  });
  upstreamURL = await listen(upstream);
  portal = createAuthPortalServer({
    host: '127.0.0.1',
    port: 0,
    playerServiceURL: new URL(upstreamURL),
    publicURL: null,
    creatorURL: new URL('http://creator.example.test'),
    playURL: new URL('http://play.example.test'),
    apiKey: 'server-only-test-key',
    requestTimeoutMs: 2_000,
    trustProxy: false,
  });
  portalURL = await listen(portal);
});

after(async () => {
  await Promise.all([close(portal), close(upstream)]);
});

test('requires a server-side API key', () => {
  assert.throws(
    () => configFromEnvironment({
      AUTH_DEMO_PLAYER_SERVICE_URL: 'http://127.0.0.1:3213',
      AUTH_DEMO_API_KEY: 'short',
    }),
    /at least 16 characters/,
  );
});

test('return URLs stay on the configured Creator or Play origin', () => {
  const config = {
    creatorURL: new URL('https://creator.example.com'),
    playURL: new URL('https://play.example.com'),
  };
  assert.equal(
    trustedReturnURL('play', 'https://play.example.com/p/world', config),
    'https://play.example.com/p/world',
  );
  assert.equal(
    trustedReturnURL('play', 'https://evil.example/steal', config),
    'https://play.example.com/',
  );
  assert.equal(trustedReturnURL('unknown', 'https://evil.example', config), null);
});

test('login is proxied without exposing the API key to the browser', async () => {
  const response = await fetch(`${portalURL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: portalURL,
      Cookie: 'existing=value',
      'X-Forwarded-For': '203.0.113.9',
    },
    body: JSON.stringify({
      username: 'tester',
      password: 'password-123',
      source: 'play',
      returnUrl: 'http://play.example.test/p/my-map',
      ignored: 'must-not-be-forwarded',
    }),
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.returnUrl, 'http://play.example.test/p/my-map');
  assert.match(response.headers.get('set-cookie'), /box_player_session=test-token/);
  assert.equal(lastUpstreamRequest.url, '/api/player-auth/login');
  assert.equal(lastUpstreamRequest.headers['x-box-player-auth-key'], 'server-only-test-key');
  assert.equal(lastUpstreamRequest.headers.cookie, 'existing=value');
  assert.equal(
    lastUpstreamRequest.headers['x-forwarded-for'],
    '127.0.0.1',
    'untrusted forwarding headers must not spoof the registration or login IP',
  );
  assert.deepEqual(JSON.parse(lastUpstreamRequest.body), {
    username: 'tester',
    password: 'password-123',
  });
  assert.equal(JSON.stringify(data).includes('server-only-test-key'), false);
});

test('cross-origin browser posts are rejected before reaching Player Service', async () => {
  const previousRequest = lastUpstreamRequest;
  const response = await fetch(`${portalURL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://evil.example',
    },
    body: '{}',
  });
  assert.equal(response.status, 403);
  assert.equal(lastUpstreamRequest, previousRequest);
});
