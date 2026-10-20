export type AnimationPreviewOptions = {
  motionId: string;
  start?: number;
  end?: number;
  fps?: number;
  size?: number;
};

export const MAX_PREVIEW_FRAMES = 120;
export const MAX_PREVIEW_BYTES = 24 * 1024 * 1024;
// Leave room for base64 and the command envelope in the existing 9 MiB socket.
export const MAX_PREVIEW_ZIP_BYTES = 6 * 1024 * 1024;

export function animationPreviewPlan(duration: number, options: AnimationPreviewOptions) {
  const start = options.start ?? 0;
  const end = options.end ?? duration;
  if (!options.motionId || !Number.isFinite(duration) || duration <= 0 || duration > 60) {
    throw new Error('请选择时长大于 0 且不超过 60 秒的动画');
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > duration) {
    throw new Error('导出区间需要满足 0 ≤ start < end ≤ 动画时长');
  }
  if (end - start < 0.02) throw new Error('GIF 导出区间至少需要 0.02 秒');
  const fps = options.fps ?? Math.min(12, Math.floor(MAX_PREVIEW_FRAMES / (end - start)));
  const size = options.size ?? 512;
  if (!Number.isFinite(fps) || fps < 1 || fps > 30) throw new Error('帧率需要在 1–30 之间');
  if (!Number.isInteger(size) || size < 128 || size > 512) throw new Error('尺寸需要为 128–512 的整数');
  const count = Math.ceil((end - start) * fps - 1e-9);
  if (count > MAX_PREVIEW_FRAMES) throw new Error('最多导出 120 帧，请降低帧率或缩短区间');
  // Merge very short tail intervals into the previous frame; browsers do not
  // reliably play GIF delays below 20 ms at the requested speed.
  const times = Array.from({ length: count }, (_, index) => start + index / fps)
    .filter(time => end - time >= 0.02 - 1e-9);
  // Preserve the exact endpoint for seam inspection, without adding a GIF pause.
  times.push(end);
  const frames = times.map((time, index) => ({
    index,
    time,
    file: `frames/frame-${String(index).padStart(3, '0')}-t${time.toFixed(3)}.png`,
    gifDelayMs: index === times.length - 1 ? 0 :
      (Math.round((times[index + 1] - start) * 100) - Math.round((time - start) * 100)) * 10,
  }));
  return { motionId: options.motionId, duration, start, end, fps, size, frames };
}

export type AnimationPreviewCapture = {
  plan: ReturnType<typeof animationPreviewPlan>;
  motionName: string;
  camera: {
    projection: 'perspective' | 'orthographic';
    position: number[];
    target: number[];
    zoom: number;
    fov?: number;
    aspect: number;
  };
  frames: string[];
};
