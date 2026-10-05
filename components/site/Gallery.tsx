"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Photo grid with a full-screen viewer (arrow keys / swipe-free buttons, Esc to close). */
export default function Gallery({ photos, title }: { photos: { id: string; url: string }[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
        {photos.map((p, i) => (
          <button key={p.id} type="button" onClick={() => setOpen(i)} className="scroll-in group relative block w-full overflow-hidden rounded-lg bg-ink focus-visible:ring-4 focus-visible:ring-ndc-green/30 focus-visible:outline-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`${title}, photo ${i + 1}`} loading="lazy" className="w-full transition-[transform,opacity] duration-700 ease-out group-hover:scale-105 group-hover:opacity-90" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label={`${title} photos`} className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={open} src={photos[open].url} alt={`${title}, photo ${open + 1}`} className="anim-pop max-h-[88vh] max-w-[92vw] rounded-md object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setOpen(null)} className="absolute top-4 right-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          {photos.length > 1 && (
            <>
              <button type="button" onClick={(e) => (e.stopPropagation(), step(-1))} className="absolute left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous photo">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button type="button" onClick={(e) => (e.stopPropagation(), step(1))} className="absolute right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next photo">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <div className="absolute bottom-4 text-sm text-white/70">{open + 1} / {photos.length}</div>
        </div>
      )}
    </>
  );
}
