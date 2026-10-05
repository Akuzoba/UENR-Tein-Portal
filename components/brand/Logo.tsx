import Image from "next/image";
import { ViewTransition } from "react";

/** The official TEIN UENR emblem (public/tein-uenr-logo.png, 802×918, transparent). */
export const LOGO_SRC = "/tein-uenr-logo.png";
export const LOGO_RATIO = 802 / 918; // width / height

export function LogoMark({ height = 44, className = "", priority = false }: { height?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src={LOGO_SRC}
      alt="TEIN UENR logo"
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      priority={priority}
      className={`shrink-0 ${className}`}
    />
  );
}

/**
 * Emblem + wordmark. Pass `morph` on the ONE logo per page that should glide between pages
 * (site header, login, desktop sidebar); a name may only be mounted once at a time.
 */
export default function Logo({ morph = false }: { morph?: boolean }) {
  const mark = (
    <span className="flex items-center gap-2.5">
      <LogoMark height={40} priority />
      <span className="leading-none">
        <span className="block font-display text-[22px] font-extrabold tracking-tight uppercase text-ink">TEIN UENR</span>
        <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">NDC Student Body</span>
      </span>
    </span>
  );
  return morph ? (
    <ViewTransition name="brand" share="auto" default="none">
      {mark}
    </ViewTransition>
  ) : (
    mark
  );
}
