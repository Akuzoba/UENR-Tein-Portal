"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import Logo from "../brand/Logo";

export type NavLink = { href: string; label: string };

export const MAIN_NAV: NavLink[] = [
  { href: "/about", label: "About" },
  { href: "/activities", label: "Activities" },
  { href: "/executives", label: "Executives" },
  { href: "/contact", label: "Contact" },
];

export const PORTAL_NAV: NavLink[] = [
  { href: "/portal#how", label: "How it works" },
  { href: "/portal#faq", label: "Questions" },
  { href: "/", label: "Main site" },
];

/**
 * Sticky header that condenses into a floating bar once you scroll, with the flag stripe
 * turning into a reading-progress line. Scroll work is one passive listener + rAF;
 * React only re-renders when crossing the "scrolled" threshold.
 */
export default function Header({ links, cta }: { links: NavLink[]; cta: NavLink }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : !href.includes("#") && path.startsWith(href));
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      if (bar.current) bar.current.style.transform = `scaleX(${y > 24 && max > 0 ? Math.min(1, y / max) : 1})`;
      setScrolled(y > 24);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header
      // Fixed height so the page never jumps while the bar inside condenses.
      className={`no-print sticky top-0 z-40 h-[72px] border-b transition-colors duration-300 ${scrolled ? "border-transparent bg-transparent" : "border-line bg-paper"}`}
      style={{ viewTransitionName: "site-header" }}
    >
      <div ref={bar} className="flag-rule h-1 origin-left transition-transform duration-150 ease-out" />

      <div className={`mx-auto transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${scrolled ? "max-w-4xl px-3 pt-2" : "max-w-6xl px-0 pt-0"}`}>
        <div
          className={`flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${
            scrolled
              ? "rounded-xl border border-line bg-white/95 px-4 py-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,.25)]"
              : "border border-transparent px-5 py-3"
          }`}
        >
          <Link href="/" aria-label="TEIN UENR home" className={`origin-left transition-transform duration-500 ${scrolled ? "scale-90" : ""}`}>
            <Logo morph />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative py-1 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:bg-ndc-red after:transition-transform after:duration-300 hover:text-ink hover:after:scale-x-100 ${
                  isActive(l.href) ? "text-ink after:scale-x-100" : "text-muted after:scale-x-0"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link href={cta.href} className="btn btn-primary group">
              {cta.label} <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </nav>

          {/* Hamburger that morphs into an X */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <span className={`absolute h-0.5 w-5 bg-ink transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-1.5"}`} />
            <span className={`absolute h-0.5 w-5 bg-ink transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"}`} />
            <span className={`absolute h-0.5 w-5 bg-ink transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-1.5"}`} />
          </button>
        </div>

        {/* Mobile menu: grid-rows trick animates height without measuring */}
        <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out md:hidden ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <nav className="overflow-hidden">
            <div className={`mx-3 mt-2 rounded-xl border border-line bg-white px-4 pt-1 pb-4 shadow-lg ${scrolled ? "" : "mb-3"}`}>
              {links.map((l, i) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block border-b border-line py-3 font-semibold transition-all duration-300 ${open ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"}`}
                  style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href={cta.href}
                onClick={() => setOpen(false)}
                className={`btn btn-primary mt-4 w-full py-3 transition-all duration-300 ${open ? "opacity-100" : "opacity-0"}`}
                style={{ transitionDelay: open ? "230ms" : "0ms" }}
              >
                {cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
