"use client";

import { useRef } from "react";

/**
 * Leans its content toward the pointer. Transform-only (GPU-cheap), throttled to one update per frame.
 * `glare` adds a soft highlight that follows the pointer, laid over the tilted content.
 */
export default function Tilt({ max = 8, glare = false, className = "", children }: { max?: number; glare?: boolean; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const set = (rx: number, ry: number, gx = 50, gy = 50) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      el.style.setProperty("--gx", `${gx}%`);
      el.style.setProperty("--gy", `${gy}%`);
    });
  };

  return (
    <div
      className={`tilt-host [@media(hover:hover)]:cursor-default ${className}`}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        set(-y * max * 2, x * max * 2, (x + 0.5) * 100, (y + 0.5) * 100);
      }}
      onPointerLeave={() => set(0, 0)}
    >
      <div ref={ref} className="relative h-full rounded-[inherit] transition-transform duration-300 ease-out will-change-transform">
        {children}
        {glare && <div className="glare rounded-[inherit]" />}
      </div>
    </div>
  );
}
