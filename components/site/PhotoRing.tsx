"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { ShowcasePhoto } from "@/lib/site";

/**
 * A carousel of event photos standing in a ring in 3D space. It turns slowly on its own, can be dragged
 * (with inertia) and leans toward the pointer. Photos at the back are shaded so the ring reads as depth.
 * All per-frame work writes styles directly; React renders once. Pauses off-screen and in hidden tabs.
 */
export default function PhotoRing({ photos }: { photos: ShowcasePhoto[] }) {
  // A ring needs a few cards to look like one; repeat short lists.
  const cards = photos.length >= 6 ? photos : Array.from({ length: Math.ceil(6 / photos.length) }, () => photos).flat();
  const n = cards.length;
  const step = 360 / n;

  const stage = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLAnchorElement | null)[]>([]);
  const shades = useRef<(HTMLDivElement | null)[]>([]);
  const moved = useRef(0);

  useEffect(() => {
    const st = stage.current!;
    const rg = ring.current!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let angle = 0, vel = 0, radius = 0, tiltX = 0, tiltY = 0, aimX = 0, aimY = 0;
    let dragging = false, hover = false, lastX = 0, startX = 0, captured = false;
    let raf = 0, last = 0, onScreen = true;

    const measure = () => {
      const w = items.current[0]?.offsetWidth ?? 200;
      radius = Math.round((w / 2 / Math.tan(Math.PI / n)) * 1.18 + 12);
      items.current.forEach((el, i) => el && (el.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`));
    };

    const draw = () => {
      rg.style.transform = `translateZ(${-radius}px) rotateX(${-7 + tiltX}deg) rotateY(${angle + tiltY}deg)`;
      for (let i = 0; i < n; i++) {
        // 1 when the card faces us, 0 at the back.
        const facing = (Math.cos(((angle + tiltY + i * step) * Math.PI) / 180) + 1) / 2;
        const s = shades.current[i];
        if (s) s.style.opacity = String((1 - facing) * 0.72);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(48, now - (last || now)) / 16.67;
      last = now;
      if (!dragging) {
        vel *= Math.pow(0.94, dt);
        angle += vel * dt + (reduce ? 0 : (hover ? -0.03 : -0.11) * dt);
      }
      tiltX += (aimX - tiltX) * 0.08 * dt;
      tiltY += (aimY - tiltY) * 0.08 * dt;
      draw();
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf && onScreen && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const down = (e: PointerEvent) => {
      dragging = true;
      captured = false;
      lastX = startX = e.clientX;
      moved.current = 0;
      vel = 0;
    };
    const move = (e: PointerEvent) => {
      const r = st.getBoundingClientRect();
      if (e.pointerType === "mouse" && !reduce) {
        aimX = -((e.clientY - r.top) / r.height - 0.5) * 10;
        aimY = ((e.clientX - r.left) / r.width - 0.5) * 14;
      }
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved.current = Math.abs(e.clientX - startX);
      // Capture only once it's clearly a drag, so a plain click still reaches the photo link.
      if (!captured && moved.current > 6) {
        st.setPointerCapture(e.pointerId);
        captured = true;
      }
      angle += dx * 0.3;
      vel = dx * 0.3;
    };
    const up = () => {
      dragging = false;
    };
    const enter = () => (hover = true);
    const leave = () => {
      hover = false;
      aimX = aimY = 0;
      dragging = false;
    };

    measure();
    draw();
    const ro = new ResizeObserver(() => {
      measure();
      draw();
    });
    ro.observe(st);
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    io.observe(st);
    const vis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", vis);
    st.addEventListener("pointerdown", down);
    st.addEventListener("pointermove", move);
    st.addEventListener("pointerup", up);
    st.addEventListener("pointercancel", up);
    st.addEventListener("pointerenter", enter);
    st.addEventListener("pointerleave", leave);
    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
      st.removeEventListener("pointerdown", down);
      st.removeEventListener("pointermove", move);
      st.removeEventListener("pointerup", up);
      st.removeEventListener("pointercancel", up);
      st.removeEventListener("pointerenter", enter);
      st.removeEventListener("pointerleave", leave);
    };
  }, [n, step]);

  return (
    <div
      ref={stage}
      role="region"
      aria-label="Photos from our activities (drag to turn)"
      className="relative h-[clamp(300px,44vw,500px)] touch-pan-y select-none [perspective:1100px] active:cursor-grabbing [@media(hover:hover)]:cursor-grab"
      // A drag that ends over a photo must not open it.
      onClickCapture={(e) => {
        if (moved.current > 6) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {/* Floor shadow */}
      <div className="absolute inset-x-[10%] bottom-[6%] h-10 rounded-[50%] bg-black/60 blur-2xl" />
      <div ref={ring} className="absolute inset-0 [transform-style:preserve-3d]">
        {cards.map((p, i) => (
          <Link
            key={i}
            ref={(el) => {
              items.current[i] = el;
            }}
            href={`/activities/${p.slug}`}
            draggable={false}
            tabIndex={i < photos.length ? 0 : -1}
            className="group absolute top-1/2 left-1/2 -mt-[calc(var(--w)*0.665)] -ml-[calc(var(--w)/2)] aspect-[3/4] w-[var(--w)] overflow-hidden rounded-lg bg-ink shadow-2xl ring-1 ring-white/10 [--w:clamp(130px,16.5vw,215px)] focus-visible:ring-4 focus-visible:ring-ndc-red focus-visible:outline-none"
          >
            <Image src={p.url} alt={p.title} fill sizes="200px" draggable={false} className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2.5 pt-10">
              <p className="line-clamp-2 font-display text-sm leading-tight font-bold text-white uppercase">{p.title}</p>
            </div>
            <div
              ref={(el) => {
                shades.current[i] = el;
              }}
              className="pointer-events-none absolute inset-0 bg-ink"
              style={{ opacity: 0 }}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
