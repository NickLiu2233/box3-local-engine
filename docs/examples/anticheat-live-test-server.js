// 专用测试地图；只读报告用于现场验证，不调用处罚 API。
(() => {
    world.gravity = 0;
    const liveTracker = world.anticheat.createTracker({ historySize: 64, decayPerTick: 0 });
    const liveStats = {
        movements: 0,
        movementRejected: 0,
        actions: 0,
        actionRejected: 0,
        duplicatePackets: 0,
    };
    const liveActors = new Map();
    const sentinel = world.createEntity({
        id: 'ac-live-sentinel',
        position: { x: 20, y: 4, z: 16 },
        gravity: false,
        collides: false,
        fixed: false,
    });
    function liveLog(kind, detail) {
        console.log('[AC-LIVE-20261006] ' + JSON.stringify({ kind, ...detail }));
    }
    world.onPlayerJoin(({ entity }) => {
        liveTracker.exempt(entity.player, { ticks: 48, reason: 'test spawn synchronization' });
        liveActors.set(entity.player, entity);
        liveLog('joined', { actors: liveActors.size });
    });
    world.onPlayerLeave(({ entity }) => liveActors.delete(entity.player));
    world.anticheat.onMovement((event) => {
        if (!liveActors.has(event.player) || liveTracker.isExempt(event.player)) {
            return;
        }
        const distance = Math.hypot(
            event.to.x - event.from.x,
            event.to.y - event.from.y,
            event.to.z - event.from.z,
        );
        const rejected = distance > 8;
        liveStats.movements++;
        liveTracker.record(event.player, { kind: 'movement', distance, rejected });
        if (rejected) {
            liveStats.movementRejected++;
            liveTracker.addScore(event.player, 1);
            event.context.reject();
            liveLog('movement-rejected', { distance, score: liveTracker.getScore(event.player) });
        }
    });
    world.anticheat.onAction((event) => {
        const presses = event.actions.filter((a) => a.pressed).length;
        const rejected =
            presses > 1 ||
            event.actions.some(
                (a) =>
                    Math.hypot(
                        a.ray.origin.x - event.serverPosition.x,
                        a.ray.origin.y - event.serverPosition.y,
                        a.ray.origin.z - event.serverPosition.z,
                    ) > 20,
            );
        liveStats.actions++;
        liveTracker.record(event.player, { kind: 'action', presses, rejected });
        if (rejected) {
            liveStats.actionRejected++;
            liveTracker.addScore(event.player, 1);
            event.context.reject();
            liveLog('action-rejected', { presses, score: liveTracker.getScore(event.player) });
        }
    });
    world.anticheat.onMessage(({ protocol, message, data }) => {
        if (protocol !== 'game-net' || message !== 'input') {
            return;
        }
        const bodies = data && data.input && data.input.bodies;
        if (!Array.isArray(bodies)) {
            return;
        }
        if (new Set(bodies.map((b) => b.id)).size < bodies.length) {
            liveStats.duplicatePackets++;
            liveLog('duplicate-observed', { count: bodies.length });
        }
    });
    world.__acLiveReport = () => ({
        stats: { ...liveStats },
        actors: [...liveActors.entries()].map(([player, entity]) => ({
            position: { x: entity.position.x, y: entity.position.y, z: entity.position.z },
            score: liveTracker.getScore(player),
            history: liveTracker.getHistory(player),
        })),
        sentinel: { x: sentinel.position.x, y: sentinel.position.y, z: sentinel.position.z },
    });
    liveLog('ready', { recordCapacity: 64, enforcement: 'test-map-only' });

    // Read-only diagnostics for the dedicated test map only.
    const liveEvidence = [];
    const liveApplied = { presses: 0 };
    world.onPress((e) => {
        if (e.button === 'action0') {
            liveApplied.presses++;
        }
    });
    world.anticheat.onAction((e) => {
        liveEvidence.push({
            kind: 'action',
            serverTick: e.context.serverTick,
            presses: e.actions.filter((a) => a.pressed).length,
            score: liveTracker.getScore(e.player),
            last: liveTracker.getHistory(e.player).slice(-1)[0],
        });
        if (liveEvidence.length > 16) {
            liveEvidence.shift();
        }
    });
    world.anticheat.onMovement((e) => {
        if (Math.hypot(e.to.x - e.from.x, e.to.y - e.from.y, e.to.z - e.from.z) > 8) {
            liveEvidence.push({
                kind: 'movement',
                serverTick: e.context.serverTick,
                from: e.from,
                to: e.to,
                score: liveTracker.getScore(e.player),
                exempt: liveTracker.isExempt(e.player),
            });
            if (liveEvidence.length > 16) {
                liveEvidence.shift();
            }
        }
    });
    remoteChannel.onServerEvent(({ entity, args }) => {
        if (
            args &&
            args.kind === 'ac-live-report' &&
            typeof args.nonce === 'string' &&
            args.nonce.length <= 32
        ) {
            const report = world.__acLiveReport();
            remoteChannel.sendClientEvent(entity, {
                kind: 'ac-live-report',
                nonce: args.nonce,
                stats: report.stats,
                position: { x: entity.position.x, y: entity.position.y, z: entity.position.z },
                score: liveTracker.getScore(entity.player),
                history: liveTracker.getHistory(entity.player).slice(-6),
                evidence: liveEvidence.slice(),
                applied: { ...liveApplied },
                sentinel: report.sentinel,
            });
        }
    });

    // Trusted Creator debugger can read this without lexical scope access.
    world.__acLiveDiagnostics = () => ({
        report: world.__acLiveReport(),
        evidence: liveEvidence,
        applied: liveApplied,
    });
})();
