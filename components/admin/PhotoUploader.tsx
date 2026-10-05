"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { compressImage } from "@/lib/image";
import { finishUpload, uploadActivityPhoto } from "@/app/admin/website-actions";

/** Adds many photos at once: each is resized in the browser, then uploaded one by one with progress. */
export default function PhotoUploader({ activityId }: { activityId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState(0);
  const [drag, setDrag] = useState(false);

  async function upload(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setErrors(0);
    setProgress({ done: 0, total: images.length });
    let failed = 0;
    for (const [i, file] of images.entries()) {
      try {
        const blob = await compressImage(file, 1800, 0.82);
        const fd = new FormData();
        fd.set("activity_id", activityId);
        fd.set("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        const res = await uploadActivityPhoto(fd);
        if (res.error) failed++;
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: images.length });
    }
    setErrors(failed);
    await finishUpload(); // refreshes the page with the new photos
    setProgress(null);
    if (input.current) input.current.value = "";
  }

  return (
    <div
      onDragOver={(e) => (e.preventDefault(), setDrag(true))}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => (e.preventDefault(), setDrag(false), upload([...e.dataTransfer.files]))}
      className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${drag ? "border-ndc-green bg-ndc-green/5" : "border-line"}`}
    >
      {progress ? (
        <div className="mx-auto max-w-sm">
          <p className="flex items-center justify-center gap-2 font-semibold">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading {progress.done} of {progress.total}…
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
            <div className="h-full bg-ndc-green transition-[width] duration-300" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">Keep this page open until it finishes.</p>
        </div>
      ) : (
        <>
          <ImagePlus className="mx-auto h-8 w-8 text-muted/60" />
          <p className="mt-2 font-semibold">Drag photos here, or</p>
          <button type="button" onClick={() => input.current?.click()} className="btn btn-dark mt-3">Choose photos</button>
          <p className="mt-2 text-xs text-muted">Select as many as you like. They&apos;re resized automatically before uploading.</p>
        </>
      )}
      {errors > 0 && <p className="mt-3 text-sm font-medium text-ndc-red">{errors} photo{errors === 1 ? "" : "s"} couldn&apos;t be uploaded. Try those again.</p>}
      <input ref={input} type="file" accept="image/*" multiple onChange={(e) => upload([...(e.target.files ?? [])])} className="sr-only" />
    </div>
  );
}
