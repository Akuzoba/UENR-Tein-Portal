import { LogoMark } from "../brand/Logo";
import Words from "./Words";

/** Title band at the top of main-site pages: dark ink, rising headline, a slowly swaying 3D emblem and the flag bars. */
export default function PageHero({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="ink-band">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-10 px-5 py-14 sm:py-20">
        <div className="min-w-0">
          <p className="eyebrow anim-fade text-white/70">{eyebrow}</p>
          <h1 className="headline mt-4 text-[clamp(3rem,8vw,6rem)] text-balance">
            <Words text={title} delay={80} />
            <span className="word-mask"><span className="text-ndc-red" style={{ animationDelay: `${80 + title.split(/\s+/).length * 70}ms` }}>.</span></span>
          </h1>
          {sub && <p className="anim-rise mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-white/70" style={{ animationDelay: "260ms" }}>{sub}</p>}
          {children}
        </div>
        <div aria-hidden className="hidden shrink-0 [perspective:900px] md:block">
          <div className="anim-fade" style={{ animationDelay: "200ms" }}>
            <div className="emblem-3d rounded-[28px] bg-white/95 p-5">
              <LogoMark height={150} />
            </div>
          </div>
        </div>
      </div>
      <div className="flag-bars grid grid-cols-4">
        <span className="h-1.5 bg-black" /><span className="h-1.5 bg-ndc-red" /><span className="h-1.5 bg-white" /><span className="h-1.5 bg-ndc-green" />
      </div>
    </div>
  );
}
