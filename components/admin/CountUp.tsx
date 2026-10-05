"use client";

import { useEffect, useRef } from "react";

/** Counts from 0 to `to` on mount. Writes straight to the DOM, so React doesn't re-render every frame. */
export default function CountUp({ to, prefix = "", decimals = 0, ms = 900 }: { to: number; prefix?: string; decimals?: number; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) => prefix + n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  useEffect(() => {
    const el = ref.current;
    if (!el || to === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      el.textContent = fmt(to * (1 - Math.pow(1 - t, 3))); // ease-out cubic
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  // Server HTML already shows the final value, so nothing breaks without JS.
  return <span ref={ref} className="tabular-nums">{fmt(to)}</span>;
}
