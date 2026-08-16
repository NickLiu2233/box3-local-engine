const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const client = read('apps/game/src/engine/game-client.ts');
const server = read('services/game-server/src/script/script-host.ts');
const teleportServer = read('services/game-server/src/teleport/teleport-server.ts');

const orderedTokens = (source, tokens, label) => {
  let cursor = -1;
  for (const token of tokens) {
    const next = source.indexOf(token, cursor + 1);
    assert.notEqual(next, -1, `${label} is missing ${token}`);
    assert.ok(next > cursor, `${label} registers ${token} out of order`);
    cursor = next;
  }
};

// MuDB assigns numeric protocol IDs by registration order. Even disabled local
// features need matching transport slots on both sides of the engine socket.
orderedTokens(
  client,
  [
    'this.gui = new GUIClient',
    'this.market = new MarketClient',
    'this.teleport = new TeleportClient',
    'this.remoteChannel = new RemoteChannelClient',
  ],
  'GameClient',
);

orderedTokens(
  server,
  [
    'this.gui = new GUIServer',
    'spec.netServer.protocol(MarketProtocol)',
    'this.teleport = new TeleportServer',
    'this.remoteChannel = new RemoteChannelServer',
  ],
  'ScriptHost network server',
);

assert.ok(
  teleportServer.includes('server.protocol(TeleportProtocol)'),
  'TeleportServer is missing its engine network protocol registration',
);

for (const forbidden of [
  "from '../apis'",
  'containerTeleport',
  'getContainerHashById',
]) {
  assert.equal(
    `${server}\n${teleportServer}`.includes(forbidden),
    false,
    `local teleport unexpectedly uses platform API: ${forbidden}`,
  );
}

console.log('engine wire protocol order checks passed');
