import { describe, expect, test } from '@jest/globals';
import {
  completeVoxaAiCommand,
  createVoxaAiSession,
  enqueueVoxaAiCommand,
  getVoxaAiSession,
  listVoxaAiCommands,
} from '../../voxa/server/ai-control-session';

describe('VOXA AI control session', () => {
  test('binds queued commands to the owner and returns idempotent requests', () => {
    const session = createVoxaAiSession(`test-${Date.now()}`, 'voxa-owner');
    const command = { type: 'project.inspect' as const, requestId: `request-${Date.now()}` };
    const first = enqueueVoxaAiCommand(session.id, 'voxa-owner', command);
    const second = enqueueVoxaAiCommand(session.id, 'voxa-owner', command);

    expect(first).toBe(second);
    expect(() => getVoxaAiSession(session.id, 'other-owner')).not.toThrow();
    expect(getVoxaAiSession(session.id, 'other-owner')).toBeUndefined();
    expect(listVoxaAiCommands(session.id, 'voxa-owner', 0).items).toHaveLength(1);
  });

  test('stores command results for the CLI poller', () => {
    const session = createVoxaAiSession(`result-${Date.now()}`, 'voxa-owner');
    const requestId = `request-${Date.now()}`;
    enqueueVoxaAiCommand(session.id, 'voxa-owner', { type: 'project.save', requestId });
    completeVoxaAiCommand(session.id, 'voxa-owner', requestId, { ok: true, data: { modelId: 7 } });

    expect(listVoxaAiCommands(session.id, 'voxa-owner', 0).items[0].result).toEqual({
      ok: true,
      data: { modelId: 7 },
    });
  });

  test('capture sessions reject editor mutations', () => {
    const session = createVoxaAiSession(`capture-${Date.now()}`, 'voxa-owner', 'capture');
    expect(() => enqueueVoxaAiCommand(session.id, 'voxa-owner', {
      type: 'project.save',
      requestId: `request-${Date.now()}`,
    })).toThrow('只允许 scene.capture');
    expect(() => enqueueVoxaAiCommand(session.id, 'voxa-owner', {
      type: 'scene.capture',
      requestId: `request-${Date.now()}`,
    })).not.toThrow();
    expect(() => enqueueVoxaAiCommand(session.id, 'voxa-owner', {
      type: 'animation.export', motionId: 'idle',
      requestId: `animation-${Date.now()}`,
    })).not.toThrow();
  });
});
