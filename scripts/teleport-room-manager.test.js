const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createTeleportRoomManager,
} = require('../apps/local-engine/src/teleport-room-manager');

function fixture() {
  const maps = [
    { id: 'main-map', publicId: 'town', mapGroupId: 'group-a' },
    { id: 'sub-map', publicId: 'dungeon', mapGroupId: 'group-a' },
    { id: 'other-map', publicId: 'other', mapGroupId: 'group-b' },
  ];
  const starts = [];
  const stops = [];
  let now = 1_000;
  const manager = createTeleportRoomManager({
    resolveMap: (reference) =>
      maps.find(
        (map) => map.id === reference || map.publicId === reference,
      ) || null,
    ensureRuntime: async (map, roomId) => starts.push([map.id, roomId]),
    stopRuntime: async (roomId) => stops.push(roomId),
    isRoomActive: () => false,
    randomRoomId: () => 'private-room-123456',
    now: () => now,
    roomIdleTimeoutMs: 500,
    maxRooms: 4,
  });
  return {
    manager,
    starts,
    stops,
    advance: (milliseconds) => {
      now += milliseconds;
    },
  };
}

test('teleport allocates an unlisted private room inside the same map group', async () => {
  const { manager, starts } = fixture();
  const result = await manager.allocate({
    sourceMapId: 'town',
    targetMapId: 'dungeon',
    subjectIds: ['player-a'],
  });

  assert.deepEqual(result, {
    playHash: 'sub-map',
    serverId: 'private-room-123456',
  });
  assert.deepEqual(starts, [['sub-map', 'private-room-123456']]);
  assert.equal(
    manager.authorize({
      targetMapId: 'sub-map',
      serverId: result.serverId,
      subjectId: 'player-a',
    }).id,
    result.serverId,
  );
  assert.throws(
    () =>
      manager.authorize({
        targetMapId: 'sub-map',
        serverId: result.serverId,
        subjectId: 'player-b',
      }),
    (error) => error.code === 'ROOM_ACCESS_DENIED' && error.statusCode === 403,
  );
  assert.equal(manager.listPublicRooms, undefined);
});

test('an existing room can admit newly teleported players but not another group', async () => {
  const { manager } = fixture();
  const first = await manager.allocate({
    sourceMapId: 'main-map',
    targetMapId: 'sub-map',
    subjectIds: ['player-a'],
  });
  const reused = await manager.allocate({
    sourceMapId: 'main-map',
    targetMapId: 'sub-map',
    subjectIds: ['player-b'],
    serverId: first.serverId,
  });

  assert.deepEqual(reused, first);
  assert.equal(
    manager.authorize({
      targetMapId: 'sub-map',
      serverId: first.serverId,
      subjectId: 'player-b',
    }).id,
    first.serverId,
  );
  await assert.rejects(
    manager.allocate({
      sourceMapId: 'main-map',
      targetMapId: 'other-map',
      subjectIds: ['player-a'],
    }),
    (error) => error.code === 'MAP_GROUP_MISMATCH',
  );
});

test('edit and public teleports do not allocate a private room', async () => {
  const { manager, starts } = fixture();
  assert.deepEqual(
    await manager.allocate({
      sourceMapId: 'main-map',
      targetMapId: 'sub-map',
      subjectIds: ['player-a'],
      mode: 'edit',
    }),
    { playHash: 'sub-map', serverId: 'sub-map' },
  );
  assert.deepEqual(
    await manager.allocate({
      sourceMapId: 'main-map',
      targetMapId: 'sub-map',
      subjectIds: ['player-a'],
      serverId: 'public',
    }),
    { playHash: 'sub-map', serverId: 'public' },
  );
  assert.deepEqual(starts, []);
});

test('idle private rooms are removed and their runtimes are stopped', async () => {
  const { manager, stops, advance } = fixture();
  const room = await manager.allocate({
    sourceMapId: 'main-map',
    targetMapId: 'sub-map',
    subjectIds: ['player-a'],
  });
  advance(501);

  assert.deepEqual(await manager.collectIdle(), [room.serverId]);
  assert.deepEqual(stops, [room.serverId]);
  assert.throws(
    () =>
      manager.authorize({
        targetMapId: 'sub-map',
        serverId: room.serverId,
        subjectId: 'player-a',
      }),
    (error) => error.code === 'ROOM_NOT_FOUND',
  );
});
