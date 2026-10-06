"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Move, RotateCcw, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import {
  MAX_ZOOM,
  MODEL_MB,
  clampCrop,
  cleanBackground,
  cropBox,
  defaultCrop,
  loadImage,
  renderCrop,
  shouldAutoClean,
  type Crop,
  type Prepared,
} from "@/lib/photo";

/** Everything the registration form keeps about the photo, so the editor can be closed and reopened. */
export type PhotoState = { file: File; crop: Crop | null; white: boolean; touched: boolean };

type Clean = { status: "idle" | "ask" | "loading" | "done" | "error"; progress: number };

// Work survives the editor unmounting (switching wizard steps): keyed by the chosen file.
const originals = new WeakMap<File, Promise<HTMLCanvasElement>>();
const cleaned = new WeakMap<File, Promise<Pick<Prepared, "white" | "suggested">>>();
const urls = new WeakMap<HTMLCanvasElement, string>();

const urlOf = (c: HTMLCanvasElement) => {
  let u = urls.get(c);
  if (!u) urls.set(c, (u = c.toDataURL("image/jpeg", 0.85)));
  return u;
};

/**
 * Passport photo editor: the photo sits behind a round frame matching the membership card.
 * Drag to move, pinch / scroll / slider to zoom, arrow keys and +/- on the keyboard. The background is
 * replaced with white automatically (MediaPipe, on the device) and the head is framed passport-style.
 */
export default function PhotoEditor({
  value,
  onChange,
  onOutput,
  onBusy,
  onPick,
}: {
  value: PhotoState;
  onChange: (v: PhotoState) => void;
  onOutput: (photo: Blob) => void;
  onBusy: (busy: boolean) => void;
  onPick: () => void;
}) {
  const { file } = value;
  const [prep, setPrep] = useState<Prepared | null>(null);
  const [crop, setCrop] = useState<Crop | null>(value.crop);
  const [clean, setClean] = useState<Clean>({ status: "idle", progress: 0 });
  const [frame, setFrame] = useState(280);
  const frameRef = useRef<HTMLDivElement>(null);
  const latest = useRef(value);
  latest.current = value;

  // Load the photo, then (unless the connection is slow) clean the background.
  useEffect(() => {
    let live = true;
    if (!originals.has(file)) originals.set(file, loadImage(file));
    originals.get(file)!.then((original) => {
      if (!live) return;
      setPrep({ original });
      setCrop((c) => c ?? defaultCrop(original.width, original.height));
      if (cleaned.has(file) || shouldAutoClean()) start(original);
      else setClean({ status: "ask", progress: 0 });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  function start(original: HTMLCanvasElement) {
    setClean({ status: "loading", progress: 0 });
    onBusy(true);
    if (!cleaned.has(file)) cleaned.set(file, cleanBackground(original, (p) => setClean((c) => ({ ...c, progress: p }))));
    cleaned
      .get(file)!
      .then(({ white, suggested }) => {
        setPrep({ original, white, suggested });
        setClean({ status: "done", progress: 1 });
        // Frame the head for them, unless they've already positioned the photo themselves.
        if (suggested && !latest.current.touched) setCrop(suggested);
      })
      .catch(() => {
        cleaned.delete(file);
        setClean({ status: "error", progress: 0 });
      })
      .finally(() => onBusy(false));
  }

  // Frame size drives the on-screen scale.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFrame(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const useWhite = value.white && !!prep?.white;
  const src = prep ? (useWhite ? prep.white! : prep.original) : null;

  // Shortly after the picture stops moving: save the position in the form and render the square photo for the card.
  // (Not on every drag frame, so the rest of the form doesn't re-render while dragging.)
  useEffect(() => {
    if (!src || !crop) return;
    const t = setTimeout(() => {
      onChange({ ...latest.current, crop });
      renderCrop(src, crop).then(onOutput).catch(() => {});
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, crop]);

  /* ---------------- gestures ---------------- */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);

  const W = prep?.original.width ?? 1;
  const H = prep?.original.height ?? 1;
  const box = crop ? cropBox(W, H, crop) : { x: 0, y: 0, side: 1 };
  const scale = frame / box.side; // screen px per image px

  const update = (fn: (c: Crop) => Crop) => {
    setCrop((c) => (c ? clampCrop(W, H, fn(c)) : c));
    if (!latest.current.touched) onChange({ ...latest.current, touched: true });
  };
  const zoomBy = (f: number) => update((c) => ({ ...c, zoom: c.zoom * f }));

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinch.current = 0;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinch.current) zoomBy(d / pinch.current);
      pinch.current = d;
    } else {
      const s = scale;
      update((c) => ({ ...c, cx: c.cx - (now.x - prev.x) / s, cy: c.cy - (now.y - prev.y) / s }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    pinch.current = 0;
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = 12 / scale;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      update((c) => ({ ...c, cx: c.cx + dx, cy: c.cy + dy }));
    } else if (e.key === "+" || e.key === "=") zoomBy(1.1);
    else if (e.key === "-") zoomBy(1 / 1.1);
  };

  const reset = () => {
    if (!prep) return;
    setCrop(prep.suggested ?? defaultCrop(W, H));
    onChange({ ...latest.current, touched: false });
  };

  return (
    <div className="grid items-start gap-6 sm:grid-cols-[minmax(0,280px)_1fr]">
      <div>
        <div
          ref={frameRef}
          tabIndex={0}
          role="application"
          aria-label="Photo position. Drag to move, pinch or scroll to zoom. Arrow keys move, plus and minus zoom."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKey}
          className="relative mx-auto aspect-square w-full max-w-[280px] cursor-grab touch-none overflow-hidden rounded-xl bg-paper select-none focus-visible:ring-4 focus-visible:ring-ndc-green/30 focus-visible:outline-none active:cursor-grabbing"
        >
          {src && crop ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlOf(src)}
              alt="Your photo"
              draggable={false}
              className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
              style={{ width: W * scale, height: H * scale, transform: `translate(${-box.x * scale}px, ${-box.y * scale}px)` }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-muted" />
            </div>
          )}
          {/* Round window like the card, with a guide for where the head goes */}
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(20,20,20,.55)] ring-2 ring-white" />
          <div className="pointer-events-none absolute top-[17%] left-1/2 h-[56%] w-[44%] -translate-x-1/2 rounded-[50%] border-2 border-dashed border-white/70" />
          {clean.status === "loading" && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/70 px-3 py-2 text-center text-xs font-semibold text-white">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              {clean.progress < 1 ? `Getting the white-background tool… ${Math.round(clean.progress * 100)}%` : "Making the background white…"}
            </div>
          )}
        </div>
        <div className="mx-auto mt-3 flex max-w-[280px] items-center gap-2">
          <button type="button" onClick={() => zoomBy(1 / 1.15)} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink" aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={crop?.zoom ?? 1}
            onChange={(e) => update((c) => ({ ...c, zoom: Number(e.target.value) }))}
            className="w-full accent-ndc-green"
            aria-label="Zoom"
          />
          <button type="button" onClick={() => zoomBy(1.15)} className="rounded-md p-1.5 text-muted hover:bg-paper hover:text-ink" aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <p className="flex items-start gap-2 text-sm text-muted">
          <Move className="mt-0.5 h-4 w-4 shrink-0" />
          Drag the photo and zoom until your head fits the dotted oval. The card preview updates as you go.
        </p>

        <div className="rounded-lg border border-line p-4">
          {clean.status === "done" && (
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold">White background</span>
                <span className="block text-xs text-muted">Switch off to compare with your original.</span>
              </span>
              <input
                type="checkbox"
                checked={value.white}
                onChange={(e) => onChange({ ...latest.current, white: e.target.checked })}
                className="peer sr-only"
              />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-ndc-green peer-focus-visible:ring-4 peer-focus-visible:ring-ndc-green/30 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          )}
          {clean.status === "loading" && (
            <div>
              <p className="text-sm font-semibold">Making your background white…</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-ndc-green transition-[width] duration-300" style={{ width: `${Math.max(4, clean.progress * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">First time only: about {MODEL_MB} MB. It stays on your phone for next time.</p>
            </div>
          )}
          {clean.status === "idle" && <p className="text-sm text-muted">Loading your photo…</p>}
          {clean.status === "ask" && (
            <div>
              <p className="text-sm font-semibold">Give your photo a white background?</p>
              <p className="mt-1 text-xs text-muted">One-time download of about {MODEL_MB} MB. Your photo never leaves your phone for this.</p>
              <button type="button" disabled={!prep} onClick={() => prep && start(prep.original)} className="btn btn-green mt-3">
                <Sparkles className="h-4 w-4" /> Make background white
              </button>
            </div>
          )}
          {clean.status === "error" && (
            <div>
              <p className="text-sm font-semibold">We couldn&apos;t whiten the background on this device</p>
              <p className="mt-1 text-xs text-muted">Your photo will be used as it is, so a plain, light background works best.</p>
              <button type="button" disabled={!prep} onClick={() => prep && start(prep.original)} className="btn btn-ghost mt-3">
                Try again
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="btn btn-ghost">
            <RotateCcw className="h-4 w-4" /> Reset position
          </button>
          <button type="button" onClick={onPick} className="btn btn-ghost">
            <Camera className="h-4 w-4" /> Use a different photo
          </button>
        </div>
      </div>
    </div>
  );
}
