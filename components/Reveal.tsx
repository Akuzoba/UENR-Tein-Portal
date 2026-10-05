"use client";

import { useEffect, useRef } from "react";

/** Fades its content up once when it scrolls into view. CSS does the animation; this only toggles a class. */
export default function Reveal({
  as: Tag = "div",
  delay = 0,
  variant = "up",
  className = "",
  children,
}: {
  as?: "div" | "section" | "li";
  delay?: number;
  /** up: fade up · flip: swing up in 3D · zoom: come forward out of the screen */
  variant?: "up" | "flip" | "zoom";
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const Comp = Tag as "div"; // same DOM behaviour for every allowed tag
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Comp ref={ref} className={`reveal ${variant === "up" ? "" : `reveal-${variant}`} ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Comp>
  );
}
