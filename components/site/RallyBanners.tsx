const WORDS = ["Unity", "Stability", "Development", "TEIN UENR"];

/** Two crossing banners scrolling in opposite directions, like tape at a rally. Decorative only. */
export default function RallyBanners() {
  const run = (outline: boolean) =>
    // Two copies so the loop is seamless (the track slides by exactly half its width).
    [0, 1].map((copy) => (
      <div key={copy} className="flex shrink-0 items-center">
        {WORDS.map((w) => (
          <span key={w} className="flex items-center">
            <span className={`px-6 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-none font-extrabold whitespace-nowrap uppercase ${outline ? "text-outline [--stroke:#fff]" : ""}`}>{w}</span>
            <span className="h-3 w-3 rotate-45 bg-current opacity-80" />
          </span>
        ))}
      </div>
    ));

  return (
    <div aria-hidden className="relative h-[clamp(9rem,16vw,12rem)] overflow-hidden bg-paper">
      <div className="absolute top-1/2 left-[-5%] w-[110%] -translate-y-[85%] rotate-[2deg] bg-ink py-3 text-white shadow-lg">
        <div className="marquee reverse" style={{ ["--speed" as string]: "48s" }}>{run(true)}</div>
      </div>
      <div className="absolute top-1/2 left-[-5%] w-[110%] -translate-y-[5%] -rotate-[2.5deg] bg-ndc-red py-3 text-white shadow-[0_18px_40px_-16px_rgba(0,0,0,.5)]">
        <div className="marquee" style={{ ["--speed" as string]: "36s" }}>{run(false)}</div>
      </div>
    </div>
  );
}
