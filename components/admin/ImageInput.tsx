"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { compressImage } from "@/lib/image";

/**
 * File input for forms: the chosen photo is resized to a JPEG in the browser and put back into the
 * input, so the form submits a small file however big the original was.
 */
export default function ImageInput({ name, current, maxSide = 900, label = "Photo" }: { name: string; current?: string | null; maxSide?: number; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [busy, setBusy] = useState(false);

  // Clear the preview when the surrounding form is reset (e.g. after adding a record).
  useEffect(() => {
    const form = input.current?.form;
    const onReset = () => setPreview(current ?? null);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [current]);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const blob = await compressImage(file, maxSide, 0.85);
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "photo.jpg", { type: "image/jpeg" }));
      input.current!.files = dt.files;
      setPreview(URL.createObjectURL(blob));
    } catch {
      input.current!.value = "";
      alert("That image couldn't be read. Try another photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="field">{label}</span>
      <div className="mt-1.5 flex items-center gap-4">
        <button type="button" onClick={() => input.current?.click()} className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-paper ring-1 ring-line hover:ring-ink/30" aria-label="Choose photo">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover object-top" />
          ) : (
            <Camera className="h-6 w-6 text-muted/60" />
          )}
        </button>
        <button type="button" onClick={() => input.current?.click()} className="btn btn-ghost" disabled={busy}>
          {busy ? "Preparing…" : preview ? "Change photo" : "Choose photo"}
        </button>
        <input ref={input} name={name} type="file" accept="image/*" onChange={onChange} className="sr-only" />
      </div>
    </div>
  );
}
