import type { Logger } from 'pino';

import type { GameServer } from '../index';

type RevocationResponse = {
  cursor: string;
  events: Array<{
    id: string;
    subjectId: string;
    reason: string;
  }>;
};

function normalizedSubjectId(value: string) {
  return value.replace(/-/g, '').toLowerCase();
}

export function startPlayerRevocationPoller(game: GameServer, logger: Logger) {
  const serviceURL = (process.env.BOX_PLAYER_SERVICE_INTERNAL_URL || '').trim().replace(/\/$/, '');
  const secret = process.env.PERMISSION_TOKEN_SECRET || '';
  if (!serviceURL || !secret) return;

  const configuredInterval = Number(process.env.BOX_PLAYER_REVOCATION_POLL_MS);
  const intervalMs = Number.isFinite(configuredInterval)
    ? Math.max(250, Math.min(30_000, configuredInterval))
    : 10_000;
  const configuredIdentityTtl = Number(process.env.BOX_RUNTIME_IDENTITY_TTL_MS);
  const identityTtlMs = Number.isFinite(configuredIdentityTtl) && configuredIdentityTtl >= 5_000
    ? configuredIdentityTtl
    : 5 * 60_000;
  // A runtime can start after a player was banned while the browser still
  // holds an assertion issued before the ban. Replay the complete assertion
  // validity window so newly started runtimes cannot miss that revocation.
  const startedAt = new Date(Date.now() - identityTtlMs - intervalMs).toISOString();
  let cursor = '0';
  let polling = false;

  const poll = async () => {
    if (polling) return;
    polling = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(2_000, intervalMs * 2));
    try {
      const query = new URLSearchParams({ cursor, after: cursor, since: startedAt });
      const response = await fetch(`${serviceURL}/api/player-internal/revocations?${query}`, {
        headers: { Authorization: `Bearer ${secret}` },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as RevocationResponse;
      if (!Array.isArray(data.events) || !/^\d+$/.test(String(data.cursor || ''))) {
        throw new Error('invalid revocation response');
      }
      cursor = data.cursor;
      for (const event of data.events) {
        const subjectId = normalizedSubjectId(event.subjectId || '');
        if (!subjectId) continue;
        const connections = game.state.connectionSet.slice();
        for (const connection of connections) {
          if (normalizedSubjectId(connection.sessionData.fingerPrint || '') !== subjectId) continue;
          logger.info(
            `Disconnecting revoked local player subject=${subjectId} session=${connection.sessionId} reason=${event.reason}`,
          );
          game.net.kickSession(connection.sessionId);
        }
      }
    } catch (error) {
      logger.warn(`Player revocation poll failed: ${(error as Error).message}`);
    } finally {
      clearTimeout(timeout);
      polling = false;
    }
  };

  void poll();
  const timer = setInterval(() => void poll(), intervalMs);
  timer.unref();
}
