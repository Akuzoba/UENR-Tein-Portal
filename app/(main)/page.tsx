import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getContent, homeStats, listActivities, listExecutives, paragraphs, photoOf } from "@/lib/site";
import PageTransition from "@/components/PageTransition";
import Reveal from "@/components/Reveal";
import ActivityCard from "@/components/site/ActivityCard";
import ExecutiveCard from "@/components/site/ExecutiveCard";
import PhotoRing from "@/components/site/PhotoRing";
import Words from "@/components/site/Words";
import RallyBanners from "@/components/site/RallyBanners";
import CountUp from "@/components/admin/CountUp";
import { LogoMark } from "@/components/brand/Logo";
import { portalHref } from "@/lib/config";

export const dynamic = "force-dynamic";

const PILLARS = [
  ["Unity", "One student body across programmes, levels and halls, working together.", "text-ink"],
  ["Stability", "Organised, peaceful and principled student politics on campus.", "text-ndc-red"],
  ["Development", "Education, leadership training and outreach that build members up.", "text-ndc-green"],
];

export default async function Home() {
  // Keep this to a few queries: together with the footer it must fit the connection pool (lib/db.ts, max 5).
  const [c, activities, executives, stats] = await Promise.all([getContent(), listActivities({ limit: 3 }), listExecutives(), homeStats()]);
  const team = executives.filter((e) => e.is_current).slice(0, 4);
  const year = new Date().getFullYear();

  return (
    <PageTransition>
      <main className="flex-1">
        {/* ---------------- Hero ---------------- */}
        <section className="ink-band">
          <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 pt-14 pb-10 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-20 lg:pb-16">
            <div className="relative z-10">
              <p className="eyebrow anim-fade text-white/70">
                <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-ndc-red align-middle" />
                TEIN · University of Energy and Natural Resources
              </p>
              <h1 className="headline mt-5 text-[clamp(2.8rem,6.6vw,5.6rem)] text-balance">
                <Words text={c.tagline} delay={120} accent={(w) => (/unity|stability|development/i.test(w) ? "text-ndc-red" : undefined)} />
              </h1>
              <p className="anim-rise mt-6 max-w-lg text-lg leading-relaxed text-pretty text-white/70" style={{ animationDelay: "520ms" }}>{c.intro}</p>
              <div className="anim-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "640ms" }}>
                <Link href={portalHref("/portal/register")} className="btn btn-primary group px-6 py-3.5 text-base shadow-[0_10px_30px_-8px_rgba(210,35,42,.7)]">
                  Become a member <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
                <Link href="/about" className="btn border border-white/25 px-6 py-3.5 text-base text-white hover:border-white hover:bg-white hover:text-ink">Who we are</Link>
              </div>
              {stats.members >= 10 && (
                <div className="anim-rise mt-10 flex items-baseline gap-3 border-t border-white/15 pt-5" style={{ animationDelay: "760ms" }}>
                  <span className="font-display text-5xl font-extrabold"><CountUp to={stats.members} ms={1600} /></span>
                  <span className="text-sm text-white/60">registered members and counting</span>
                </div>
              )}
            </div>

            <div className="anim-fade relative" style={{ animationDelay: "300ms" }}>
              {stats.photos.length > 0 ? (
                <PhotoRing photos={stats.photos} />
              ) : (
                <div className="flex h-[clamp(300px,44vw,500px)] items-center justify-center [perspective:1000px]">
                  <div className="emblem-3d rounded-3xl bg-white p-8">
                    <LogoMark height={200} priority />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flag-bars grid grid-cols-4">
            <span className="h-2 bg-black" /><span className="h-2 bg-ndc-red" /><span className="h-2 bg-white" /><span className="h-2 bg-ndc-green" />
          </div>
        </section>

        <RallyBanners />

        {/* ---------------- About ---------------- */}
        <section className="border-b border-line bg-paper">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-10 pb-16 lg:grid-cols-[1fr_1.4fr]">
            <Reveal>
              <p className="eyebrow">Who we are</p>
              <h2 className="headline mt-3 text-[clamp(2.6rem,5vw,4rem)]">The NDC on campus</h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-lg leading-relaxed text-pretty text-muted">{paragraphs(c.about)[0]}</p>
              <Link href="/about" className="group mt-5 inline-flex items-center gap-1.5 font-semibold text-ndc-red">
                More about us <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
          <div className="mx-auto max-w-6xl px-5 pb-16">
            <div className="grid gap-4 md:grid-cols-3">
              {PILLARS.map(([title, text, tone], i) => (
                <Reveal key={title} variant="flip" delay={i * 140} className="h-full">
                  <div className="group relative h-full overflow-hidden rounded-xl border border-line bg-white p-7 transition-shadow duration-300 hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,.35)]">
                    <span className="text-outline pointer-events-none absolute -top-3 right-2 font-display text-[5.5rem] leading-none font-extrabold opacity-15 transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105">
                      0{i + 1}
                    </span>
                    <h3 className="relative font-display text-4xl font-bold uppercase">
                      {title}
                      <span className={tone}>.</span>
                    </h3>
                    <p className="relative mt-3 leading-relaxed text-muted">{text}</p>
                    <div className={`absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100 ${i === 0 ? "bg-ink" : i === 1 ? "bg-ndc-red" : "bg-ndc-green"}`} />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Activities ---------------- */}
        {activities.length > 0 && (
          <section className="border-b border-line bg-white">
            <div className="mx-auto max-w-6xl px-5 py-16">
              <Reveal className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Activities</p>
                  <h2 className="headline mt-3 text-[clamp(2.6rem,5vw,4rem)]">What we&apos;ve been up to</h2>
                </div>
                <Link href="/activities" className="btn btn-dark group">
                  All activities <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Reveal>
              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {activities.map((a, i) => (
                  <Reveal key={a.id} variant="zoom" delay={i * 120} className="h-full">
                    <ActivityCard a={a} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------- Executives ---------------- */}
        {team.length > 0 && (
          <section className="border-b border-line">
            <div className="mx-auto max-w-6xl px-5 py-16">
              <Reveal className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Leadership</p>
                  <h2 className="headline mt-3 text-[clamp(2.6rem,5vw,4rem)]">Meet the executives</h2>
                </div>
                <Link href="/executives" className="btn btn-ghost">Full team</Link>
              </Reveal>
              <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {team.map((e, i) => (
                  <Reveal key={e.id} variant="flip" delay={i * 100} className="h-full">
                    <ExecutiveCard name={e.name} position={e.position} photo={photoOf(e)} compact />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------- Join ---------------- */}
        <section className="relative overflow-hidden bg-ndc-red text-white">
          <div className="stripes absolute inset-0" />
          <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-16 sm:flex-row sm:items-center">
            <Reveal>
              <h2 className="headline text-[clamp(2.6rem,6vw,4.5rem)]">{year} MEMBERSHIP REGISTRATION IS OPEN</h2>
              <p className="mt-3 text-lg text-white/85">Register once, pay your dues online and get your official membership card.</p>
            </Reveal>
            <Link href={portalHref("/portal/register")} className="btn group shrink-0 bg-white px-7 py-4 text-base text-ink shadow-[0_14px_30px_-10px_rgba(0,0,0,.45)] transition-transform hover:-translate-y-0.5 hover:bg-paper">
              Register now <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
