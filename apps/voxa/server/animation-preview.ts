import sharp, { type OverlayOptions } from 'sharp';
import JSZip from 'jszip';
import {
  animationPreviewPlan, MAX_PREVIEW_BYTES, MAX_PREVIEW_ZIP_BYTES,
  type AnimationPreviewCapture,
} from '../shared/animation-preview';

const PIXEL_GLYPHS: Record<string, string[]> = {
  ' ': ['000', '000', '000', '000', '000'],
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '.': ['000', '000', '000', '000', '010'],
  'D': ['110', '101', '101', '101', '110'],
  'E': ['111', '100', '110', '100', '111'],
  'F': ['111', '100', '110', '100', '100'],
  'N': ['101', '111', '111', '101', '101'],
  'S': ['111', '100', '111', '001', '111'],
};

/** Draw a tiny font as vectors so storyboard timestamps do not depend on host fonts. */
function pixelLabel(text: string, width: number, height: number) {
  const scale = 3, advance = 11, top = 7;
  const pixels: string[] = [];
  for (const [charIndex, char] of [...text.toUpperCase()].entries()) {
    const glyph = PIXEL_GLYPHS[char] || PIXEL_GLYPHS[' '];
    glyph.forEach((row, rowIndex) => {
      [...row].forEach((pixel, columnIndex) => {
        if (pixel === '1') pixels.push(
          `<rect x="${8 + charIndex * advance + columnIndex * scale}" y="${top + rowIndex * scale}" width="${scale}" height="${scale}"/>`,
        );
      });
    });
  }
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111827"/><g fill="#dbeafe">${pixels.join('')}</g></svg>`,
  );
}

/** Encode frames captured by the editor. This module never evaluates or redraws a pose. */
export async function packageAnimationPreview(input: AnimationPreviewCapture) {
  if (!input?.plan || !Array.isArray(input.frames)) throw new Error('动画预览数据不完整');
  const plan = animationPreviewPlan(input.plan.duration, input.plan);
  if (input.frames.length !== plan.frames.length) throw new Error('动画帧数与采样计划不一致');
  if (typeof input.motionName !== 'string' || input.motionName.length > 200) throw new Error('动画名称无效');
  const camera = input.camera;
  if (!camera || !['perspective', 'orthographic'].includes(camera.projection) ||
    !Array.isArray(camera.position) || camera.position.length !== 3 ||
    !Array.isArray(camera.target) || camera.target.length !== 3 ||
    [...camera.position, ...camera.target, camera.zoom, camera.aspect].some(v => typeof v !== 'number' || !Number.isFinite(v)) ||
    camera.zoom <= 0 || camera.aspect <= 0 ||
    (camera.fov !== undefined && !Number.isFinite(camera.fov))) throw new Error('固定相机信息无效');
  let bytes = 0;
  const images: Buffer[] = [];
  for (const encoded of input.frames) {
    if (typeof encoded !== 'string' || encoded.length > 2 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new Error('PNG 帧数据无效或过大');
    }
    const png = Buffer.from(encoded, 'base64');
    bytes += png.length;
    if (bytes > MAX_PREVIEW_BYTES) throw new Error('预览帧集超过 24 MiB，请缩短区间或降低尺寸');
    const metadata = await sharp(png, { limitInputPixels: 512 * 512 }).metadata();
    if (metadata.format !== 'png' || metadata.width !== plan.size || metadata.height !== plan.size || (metadata.pages ?? 1) !== 1) {
      throw new Error('需要与采样尺寸一致的单帧 PNG');
    }
    images.push(png);
  }
  const gif = await sharp(images.slice(0, -1), { join: { animated: true } })
    .gif({ loop: 0, delay: plan.frames.slice(0, -1).map(frame => frame.gifDelayMs), keepDuplicateFrames: true })
    .toBuffer();
  const storyboardCount = Math.min(12, images.length);
  const storyboardFrames = Array.from({ length: storyboardCount }, (_, index) =>
    Math.round(index * (images.length - 1) / (storyboardCount - 1)));
  const cell = 256, label = 28, columns = Math.min(4, storyboardCount);
  const composites: OverlayOptions[] = [];
  for (const [slot, index] of storyboardFrames.entries()) {
    const left = (slot % columns) * cell, top = Math.floor(slot / columns) * (cell + label);
    composites.push({ input: await sharp(images[index]).resize(cell, cell).png().toBuffer(), left, top });
    const text = `F${String(index).padStart(3, '0')} ${plan.frames[index].time.toFixed(3)}S${index === images.length - 1 ? ' END' : ''}`;
    composites.push({ left, top: top + cell, input: pixelLabel(text, cell, label) });
  }
  const storyboard = await sharp({ create: {
    width: columns * cell, height: Math.ceil(storyboardCount / columns) * (cell + label),
    channels: 4, background: '#111827',
  } }).composite(composites).png().toBuffer();
  const manifest = {
    version: 1, renderer: 'voxa-editor-webgl', source: 'current-editor-state',
    motionName: input.motionName, ...plan, camera,
    gif: 'animation.gif', storyboard: 'storyboard.png', storyboardFrames,
    gifDurationMs: plan.frames.reduce((sum, frame) => sum + frame.gifDelayMs, 0),
    endpointInGif: false,
  };
  const zip = new JSZip();
  images.forEach((png, index) => zip.file(plan.frames[index].file, png));
  zip.file('animation.gif', gif);
  zip.file('storyboard.png', storyboard);
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('index.html', '<!doctype html><meta charset="utf-8"><title>VOXA animation preview</title><style>body{background:#111827;color:#fff;font:16px sans-serif;margin:24px}img{max-width:100%}</style><h1>Animation preview</h1><img src="animation.gif" alt="Animation"><h2>Timestamped storyboard</h2><img src="storyboard.png" alt="Storyboard"><p><a href="manifest.json">Frame times and camera</a> · <a href="frames/">All PNG frames</a></p>');
  const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  if (archive.length > MAX_PREVIEW_ZIP_BYTES) throw new Error('预览包超过 6 MiB，请降低尺寸或帧率');
  return archive;
}
