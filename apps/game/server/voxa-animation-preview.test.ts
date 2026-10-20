import sharp from '../../voxa/node_modules/sharp';
import JSZip from '../../voxa/node_modules/jszip';
import { animationPreviewPlan } from '../../voxa/shared/animation-preview';
import { packageAnimationPreview } from '../../voxa/server/animation-preview';
import type { AnimationPreviewCapture } from '../../voxa/shared/animation-preview';

jest.mock('../../voxa/server/model-management-access', () => ({ requireVoxaModelAccess: jest.fn(async () => true) }));
jest.mock('../../voxa/server/local-cors', () => ({ setLocalCors: () => true }));
const handler = require('../../voxa/pages/api/local/animation-preview').default;
const { requireVoxaModelAccess } = require('../../voxa/server/model-management-access');

async function fixture() {
  const plan = animationPreviewPlan(1, { motionId: 'walk', fps: 3, size: 128 });
  const frames = [] as string[];
  for (let index = 0; index < plan.frames.length; index++) {
    const svg = `<svg width="128" height="128"><rect width="128" height="128" fill="black"/><rect x="${8 + index * 24}" y="48" width="16" height="16" fill="red"/></svg>`;
    frames.push((await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64'));
  }
  return { plan, frames, motionName: 'Walk', camera: {
    projection: 'orthographic', position: [1, 1, 1], target: [0, 0, 0], aspect: 1, zoom: 1,
  } } as AnimationPreviewCapture;
}

test('sampling covers the requested range and keeps an endpoint probe outside GIF playback', () => {
  const plan = animationPreviewPlan(2.15, { motionId: 'wave', start: 0.1, fps: 12 });
  expect(plan.frames[0].time).toBe(0.1);
  expect(plan.frames.at(-1)?.time).toBe(2.15);
  expect(plan.frames.at(-1)?.gifDelayMs).toBe(0);
  expect(plan.frames.reduce((sum, frame) => sum + frame.gifDelayMs, 0)).toBe(2050);
  expect(plan.frames.slice(0, -1).every(frame => frame.time < plan.end && frame.gifDelayMs > 0)).toBe(true);
  expect(animationPreviewPlan(60, { motionId: 'long' }).frames).toHaveLength(121);
  expect(animationPreviewPlan(0.084, { motionId: 'short', fps: 30 }).frames.slice(0, -1).every(frame => frame.gifDelayMs >= 20)).toBe(true);
  expect(() => animationPreviewPlan(0.001, { motionId: 'tiny' })).toThrow('0.02');
});

test.each([
  [0, {}], [61, {}], [1, { start: -1 }], [1, { end: 2 }],
  [1, { start: 1 }], [1, { fps: NaN }], [1, { fps: 31 }],
  [1, { size: 1024 }], [1, { size: 128.5 }], [60, { fps: 30 }],
])('rejects invalid or oversized exports (%s, %j)', (duration, options) => {
  expect(() => animationPreviewPlan(duration as number, { motionId: 'x', ...options as object })).toThrow();
});

test('ZIP contains a real looping GIF, timestamped storyboard, endpoint PNG and matching manifest', async () => {
  const input = await fixture();
  const zip = await JSZip.loadAsync(await packageAnimationPreview(input));
  const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
  expect(manifest.renderer).toBe('voxa-editor-webgl');
  expect(manifest.camera).toEqual(input.camera);
  expect(manifest.frames.map((f: {time: number}) => f.time)).toEqual(input.plan.frames.map(f => f.time));
  expect(manifest.gifDurationMs).toBe(1000);
  const gif = await zip.file('animation.gif')!.async('nodebuffer');
  expect(gif.subarray(0, 6).toString()).toMatch(/^GIF8[79]a$/);
  const metadata = await sharp(gif, { animated: true }).metadata();
  expect(metadata.pages).toBe(3);
  expect(metadata.loop).toBe(0);
  expect(metadata.delay).toEqual([330, 340, 330]);
  // Moving pixels must stay at their supplied positions; encoding must never recenter poses.
  const { data } = await sharp(gif, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let frame = 0; frame < 3; frame++) {
    const at = ((frame * 128 + 50) * 128 + 10 + frame * 24) * 4;
    expect(data[at]).toBeGreaterThan(200);
    const atOrigin = ((frame * 128 + 50) * 128 + 10) * 4;
    if (frame > 0) expect(data[atOrigin]).toBeLessThan(20);
  }
  for (const frame of input.plan.frames) {
    expect(await zip.file(frame.file)!.async('base64')).toBe(input.frames[frame.index]);
  }
  expect((await sharp(await zip.file('storyboard.png')!.async('nodebuffer')).metadata()).width).toBe(1024);
  expect(await zip.file('index.html')!.async('string')).toContain('animation.gif');
});

test('rejects truncated captures, non-PNG input and dimensions that differ from the plan', async () => {
  const input = await fixture();
  await expect(packageAnimationPreview({ ...input, frames: input.frames.slice(1) })).rejects.toThrow('帧数');
  const jpeg = (await sharp({ create: { width: 128, height: 128, channels: 3, background: 'red' } }).jpeg().toBuffer()).toString('base64');
  await expect(packageAnimationPreview({ ...input, frames: input.frames.map(() => jpeg) })).rejects.toThrow('PNG');
  const wrongSize = (await sharp({ create: { width: 64, height: 64, channels: 3, background: 'red' } }).png().toBuffer()).toString('base64');
  await expect(packageAnimationPreview({ ...input, frames: input.frames.map(() => wrongSize) })).rejects.toThrow('采样尺寸');
});

test('packaging API checks access before processing frames', async () => {
  requireVoxaModelAccess.mockResolvedValueOnce(false);
  const res = { status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn(), end: jest.fn(), setHeader: jest.fn() };
  await handler({ method: 'POST', body: {} }, res);
  expect(res.send).not.toHaveBeenCalled();
  expect(res.json).not.toHaveBeenCalled();
  await handler({ method: 'POST', body: await fixture() }, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
  expect(Buffer.isBuffer(res.send.mock.calls[0][0])).toBe(true);
});
