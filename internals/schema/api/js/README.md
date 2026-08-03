# Game JS Scripts

Game is a multiplayer web-based game creation platform. Scripts in Game are JavaScript programs which run on the server, respond to various events and update the game engine state.  Scripts runs in a separate process from the main engine for security purposes and to prevent user code from crashing the game engine. Scripts are very powerful and can control almost any aspect of the game state.  Here is an example:

```javascript
// When a player joins the game ...
world.onPlayerJoin(({ entity }) => {
    // ... and whenever that player touches a voxel ...
    entity.onVoxelContact(({ x, y, z }) => {
        // ... turn that voxel into air
        world.voxels.setVoxel(x, y, z, 0);
    });
});

console.log('event handlers installed');
```

This script will make players break whatever voxels they touch.

## Execution model

As on the web, the scripts execute using an event based API.  Server-side engine state is updated in ticks, which are scheduled at intervals of roughly 64ms apart.  During a tick the engine does the following things:

1. Apply updates from the clients
2. Apply updates from scripts
3. Update the engine physics state
4. Synchronize state with all scripts and schedule a new script tick
5. Send updated state to all clients

If a script is running slow or has crashed, the engine skips scheduling more ticks until it has unstuck.  This prevents a script from getting stuck in a loop where it can't keep up with the engine process.  Any events or updates to the script are synchronized to occur at the tick boundary.

## Events

Events are dispatched into the script process whenever something changes in the engine.  Scipts can subscribe to these events using "EventChannels".  To subscribe to an event channel, you call it with the handler passed in as an argument.  Calling a handler returns a token which can be used to cancel any pending events.  For example:

```javascript
let tickCount = 0;
let tickHandler = world.onTick(({ tick }) => {
    console.log(tickCount++);
    if (tickCount > 10) {
        tickHandler.cancel();
    }
});
```

Examples of events include ticks, physics collisions, players entering/leaving the game, pushing a button and so on.

## World

The `world` object is the entry point for the entire game api.  It has methods for enumerating entities and players as well as searching the world using various methods.

## Voxel

The `world.voxel` object lets you modify the terrain.

## Entities

Objects in Game are called "Entities".  An entity has some physical properties, like position, velocity and so on, as well as other properties like mesh or display information.  Scripts can create entities by calling `world.createEntity()` or copy copy an entity using the same method.  You can destroy an entity by calling `entity.destroy()` on it.

## Players

Players are a special type of entity in game corresponding to a connected player.  You can trap a player login event using the `onPlayerJoin` event handler and detect when they leave using the `onPlayerLeave` method.
