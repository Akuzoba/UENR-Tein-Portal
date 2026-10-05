"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import Tilt from "../Tilt";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

function Front({ name, position, photo, hint }: { name: string; position: string; photo: string | null; hint?: boolean }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white">
      <div className="relative aspect-[4/5] overflow-hidden bg-paper">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={name} loading="lazy" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full items-center justify-center bg-ndc-green/10 font-display text-6xl font-extrabold text-ndc-green">{initials(name)}</div>
        )}
        {hint && (
          <span className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink shadow">
            <RotateCw className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="flex-1 border-t-4 border-ndc-red p-4">
        <div className="font-display text-xl leading-tight font-bold uppercase">{name}</div>
        <div className="mt-0.5 text-sm font-semibold text-ndc-green">{position}</div>
      </div>
    </div>
  );
}

/** Executive portrait. With a bio it turns over in 3D (hover, or tap/Enter) to show it; otherwise it tilts. */
export default function ExecutiveCard({ name, position, bio, photo, compact = false }: { name: string; position: string; bio?: string | null; photo: string | null; compact?: boolean }) {
  const [flipped, setFlipped] = useState(false);

  if (compact || !bio) {
    return (
      <Tilt glare className="h-full rounded-xl">
        <Front name={name} position={position} photo={photo} />
      </Tilt>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      aria-label={`${name}, ${position}. Show bio`}
      className={`flip-card block h-full w-full rounded-xl text-left focus-visible:ring-4 focus-visible:ring-ndc-green/30 focus-visible:outline-none ${flipped ? "is-flipped" : ""}`}
    >
      <div className="flip-card-inner">
        <div className="flip-card-face h-full">
          <Front name={name} position={position} photo={photo} hint />
        </div>
        <div className="flip-card-face flip-card-back ink-band flex flex-col rounded-xl p-5">
          <div className="flag-rule h-1 w-12" />
          <div className="mt-4 font-display text-2xl leading-tight font-bold uppercase">{name}</div>
          <div className="mt-0.5 text-sm font-semibold text-ndc-red">{position}</div>
          <p className="mt-4 overflow-y-auto text-sm leading-relaxed text-white/75">{bio}</p>
        </div>
      </div>
    </button>
  );
}
