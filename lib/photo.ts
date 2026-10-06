// Browser-only: passport photo preparation for the registration form.
// - decode + downscale the chosen file
// - find the person with Google MediaPipe (selfie multiclass model) and put them on a white background
// - suggest a passport-style crop around the head
// - render the final square JPEG that the card shows inside its circle
import type { ImageSegmenter } from "@mediapipe/tasks-vision";

/** What the photo editor keeps: which point of the image sits in the middle of the frame, and how far it's zoomed. */
export type Crop = { cx: number; cy: number; zoom: number };

export type Prepared = {
  /** The photo as taken (downscaled). */
  original: HTMLCanvasElement;
  /** The same photo on a white background, once segmentation has run. */
  white?: HTMLCanvasElement;
  /** Suggested passport crop around the head, when a head was found. */
  suggested?: Crop;
};

export const OUTPUT_SIZE = 600; // px, square; the card shows it in a 252px circle (≈300px at print resolution)
export const MAX_ZOOM = 4;
const WORK_SIZE = 1400; // longest side we process; plenty for a 600px output

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
export const MODEL_MB = 20; // model (16.4 MB) + runtime (~3.4 MB compressed), downloaded once

/* ------------------------------------------------------------------ loading */

export async function loadImage(file: File): Promise<HTMLCanvasElement> {
  // `from-image` applies the EXIF rotation phones write into portrait photos.
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, WORK_SIZE / Math.max(bmp.width, bmp.height));
  const c = canvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

/** Skip the automatic download on data-saver or very slow connections (the member can still start it). */
export function shouldAutoClean() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !(conn?.saveData || conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g");
}

/* ------------------------------------------------------------------ segmentation */

let segmenter: Promise<ImageSegmenter> | null = null;
let progressListener: ((fraction: number) => void) | undefined;

/** Model bytes, from the Cache API when we've downloaded it before, with download progress otherwise. */
async function fetchModel(): Promise<Uint8Array> {
  const cache = await caches.open("tein-photo-models").catch(() => null);
  const hit = await cache?.match(MODEL_URL);
  if (hit) return new Uint8Array(await hit.arrayBuffer());

  const res = await fetch(MODEL_URL);
  if (!res.ok || !res.body) throw new Error(`Model download failed (${res.status})`);
  const total = Number(res.headers.get("content-length")) || 16_400_000;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    progressListener?.(Math.min(0.99, got / total));
  }
  const bytes = new Uint8Array(got);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
  }
  await cache?.put(MODEL_URL, new Response(bytes, { headers: { "content-type": "application/octet-stream" } })).catch(() => {});
  return bytes;
}

function getSegmenter(onProgress?: (fraction: number) => void) {
  progressListener = onProgress;
  segmenter ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
    const [fileset, model] = await Promise.all([FilesetResolver.forVisionTasks("/mediapipe"), fetchModel()]);
    // CPU: the GPU delegate gives wrong masks on some iPhones, and one 256×256 pass is quick anyway.
    return ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: model, delegate: "CPU" },
      runningMode: "IMAGE",
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });
  })().catch((e) => {
    segmenter = null;
    throw e;
  });
  return segmenter;
}

const smoothstep = (lo: number, hi: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/**
 * Puts the person on a clean white background and finds their head.
 * The model's mask is low resolution (256×256), so it is upscaled smoothly and lightly feathered; the edge
 * thresholds are tuned to keep hair while trimming the coloured fringe of the old background.
 */
export async function cleanBackground(src: HTMLCanvasElement, onProgress?: (fraction: number) => void): Promise<Pick<Prepared, "white" | "suggested">> {
  const seg = await getSegmenter(onProgress);
  onProgress?.(1);
  const result = seg.segment(src);
  try {
    const masks = result.confidenceMasks;
    if (!masks?.length) throw new Error("No mask");
    const labels = seg.getLabels().map((l) => l.toLowerCase());
    const idx = (name: string, fallback: number) => (labels.indexOf(name) >= 0 ? labels.indexOf(name) : fallback);
    const bg = masks[idx("background", 0)];
    const hair = masks[idx("hair", 1)]?.getAsFloat32Array();
    const face = masks[idx("face-skin", 3)]?.getAsFloat32Array();
    const w = bg.width;
    const h = bg.height;
    const bgData = bg.getAsFloat32Array();

    // Alpha mask at model resolution, and which pixels are head (hair or face).
    const alpha = new ImageData(w, h);
    const isHead = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      alpha.data[i * 4 + 3] = Math.round(smoothstep(0.35, 0.8, 1 - bgData[i]) * 255);
      isHead[i] = (hair?.[i] ?? 0) + (face?.[i] ?? 0) > 0.5 ? 1 : 0;
    }
    const { x0, y0, x1, y1 } = largestBlob(isHead, w, h);

    const small = canvas(w, h);
    small.getContext("2d")!.putImageData(alpha, 0, 0);
    // Upscale the mask to the photo, feathering by about a pixel at output size.
    const mask = canvas(src.width, src.height);
    const mctx = mask.getContext("2d")!;
    mctx.imageSmoothingQuality = "high";
    mctx.filter = `blur(${Math.max(1, src.width / 700).toFixed(1)}px)`;
    mctx.drawImage(small, 0, 0, src.width, src.height);

    // Person only (photo masked by alpha), then laid onto white.
    const cut = canvas(src.width, src.height);
    const cctx = cut.getContext("2d")!;
    cctx.drawImage(src, 0, 0);
    cctx.globalCompositeOperation = "destination-in";
    cctx.drawImage(mask, 0, 0);
    const white = canvas(src.width, src.height);
    const wctx = white.getContext("2d")!;
    wctx.fillStyle = "#fff";
    wctx.fillRect(0, 0, white.width, white.height);
    wctx.drawImage(cut, 0, 0);

    let suggested: Crop | undefined;
    if (x1 > x0 && y1 > y0) {
      const sx = src.width / w;
      const sy = src.height / h;
      const head = { x: ((x0 + x1) / 2) * sx, top: y0 * sy, h: (y1 - y0) * sy };
      // Passport framing: the head fills a little over half the frame, with room above the hair.
      const side = head.h / 0.56;
      suggested = clampCrop(src.width, src.height, {
        cx: head.x,
        cy: head.top - side * 0.17 + side / 2,
        zoom: Math.min(src.width, src.height) / side,
      });
    }
    return { white, suggested };
  } finally {
    result.close();
  }
}

/**
 * Bounding box of the largest connected region in a 0/1 mask: the member's head, ignoring stray bits of
 * anyone else at the edge of the photo. (x1 < x0 when the mask is empty.)
 */
function largestBlob(mask: Uint8Array, w: number, h: number) {
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let best = { size: 0, x0: w, y0: h, x1: -1, y1: -1 };
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || seen[start]) continue;
    let size = 0, top = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
    stack[top++] = start;
    seen[start] = 1;
    while (top) {
      const i = stack[--top];
      const x = i % w, y = (i / w) | 0;
      size++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (n >= 0 && mask[n] && !seen[n]) {
          seen[n] = 1;
          stack[top++] = n;
        }
      }
    }
    if (size > best.size) best = { size, x0, y0, x1, y1 };
  }
  return best;
}

/* ------------------------------------------------------------------ cropping */

/** The visible square (in image pixels) for a crop. */
export function cropBox(w: number, h: number, c: Crop) {
  const side = Math.min(w, h) / c.zoom;
  return { x: c.cx - side / 2, y: c.cy - side / 2, side };
}

/** Keeps the zoom in range and the frame fully covered by the photo. */
export function clampCrop(w: number, h: number, c: Crop): Crop {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, c.zoom));
  const half = Math.min(w, h) / zoom / 2;
  return {
    zoom,
    cx: Math.min(w - half, Math.max(half, c.cx)),
    cy: Math.min(h - half, Math.max(half, c.cy)),
  };
}

/** Default when no head was found: centred, nudged up a little since faces sit in the upper part of portraits. */
export function defaultCrop(w: number, h: number): Crop {
  return clampCrop(w, h, { cx: w / 2, cy: h > w ? h * 0.42 : h / 2, zoom: 1 });
}

export function renderCrop(src: HTMLCanvasElement, c: Crop, size = OUTPUT_SIZE): Promise<Blob> {
  const { x, y, side } = cropBox(src.width, src.height, c);
  const out = canvas(size, size);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, x, y, side, side, 0, 0, size, size);
  return new Promise((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode photo"))), "image/jpeg", 0.9));
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
