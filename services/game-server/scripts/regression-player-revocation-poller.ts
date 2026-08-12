import assert from 'node:assert/strict';

import { startPlayerRevocationPoller } from '../src/player/player-revocation-poller';

const subjectId = 'daf88e0865a546b39018906fd6aa0ee1';
const kicked: string[] = [];
const messages: string[] = [];

process.env.BOX_PLAYER_SERVICE_INTERNAL_URL = 'http://player-service:3213';
process.env.PERMISSION_TOKEN_SECRET = 'regression-secret';
process.env.BOX_PLAYER_REVOCATION_POLL_MS = '30000';

global.fetch = async (_input, init) => {
  assert.equal(
    (init?.headers as Record<string, string>).Authorization,
    'Bearer regression-secret',
  );
  return new Response(JSON.stringify({
    cursor: '41',
    events: [{ id: '41', subjectId, reason: 'sessions-revoked' }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const game = {
  state: {
    connectionSet: [
      {
        sessionId: 'matching-session',
        sessionData: { fingerPrint: subjectId },
      },
      {
        sessionId: 'other-session',
        sessionData: { fingerPrint: '11111111111111111111111111111111' },
      },
    ],
  },
  net: {
    kickSession(sessionId: string) {
      kicked.push(sessionId);
    },
  },
};
const logger = {
  info(message: string) { messages.push(message); },
  warn(message: string) { messages.push(message); },
};

async function main() {
  startPlayerRevocationPoller(game as never, logger as never);
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.deepEqual(kicked, ['matching-session']);
  assert.ok(messages.some((message) => message.includes(subjectId)));
  console.log('player revocation poller regression passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
