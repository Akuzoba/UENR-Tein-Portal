import Link from "next/link";
import { ArrowRight, Eye, Target } from "lucide-react";
import { getContent, paragraphs } from "@/lib/site";
import PageTransition from "@/components/PageTransition";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/Reveal";
import Tilt from "@/components/Tilt";

export const dynamic = "force-dynamic";
export const metadata = { title: "About – TEIN UENR" };

export default async function About() {
  const c = await getContent();
  const [lead, ...rest] = paragraphs(c.about);

  return (
    <PageTransition>
      <main className="flex-1">
        <PageHero eyebrow="About us" title="Who we are" sub={lead} />

        {rest.length > 0 && (
          <section className="border-b border-line">
            <div className="mx-auto max-w-3xl space-y-5 px-5 py-14 text-lg leading-relaxed text-muted">
              {rest.map((p, i) => (
                <Reveal key={i}><p>{p}</p></Reveal>
              ))}
            </div>
          </section>
        )}

        <section className="border-b border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-5 px-5 py-16 md:grid-cols-2">
            {[
              [Target, "Our mission", c.mission, "bg-ndc-red", "text-ndc-red"],
              [Eye, "Our vision", c.vision, "bg-ndc-green", "text-ndc-green"],
            ].map(([Icon, title, text, bar, tone], i) =>
              text ? (
                <Reveal key={title as string} variant="flip" delay={i * 140} className="h-full">
                  <Tilt max={5} glare className="h-full rounded-xl">
                    <div className="relative h-full overflow-hidden rounded-xl border border-line bg-paper p-8">
                      <div className={`absolute inset-x-0 top-0 h-1.5 ${bar as string}`} />
                      <span className={`flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ${tone as string}`}>
                        <Icon className="h-6 w-6" />
                      </span>
                      <h2 className="mt-5 font-display text-4xl font-bold uppercase">{title as string}</h2>
                      <p className="mt-3 text-lg leading-relaxed text-pretty text-muted">{text as string}</p>
                    </div>
                  </Tilt>
                </Reveal>
              ) : null,
            )}
          </div>
        </section>

        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <Reveal>
              <p className="eyebrow">Our motto</p>
            </Reveal>
            <div role="heading" aria-level={2} className="headline mt-4 text-[clamp(3rem,9vw,7rem)]">
              {[
                ["Unity", "text-ink"],
                ["Stability", "text-ndc-red"],
                ["Development", "text-ndc-green"],
              ].map(([w, tone], i) => (
                <Reveal key={w} variant="flip" delay={i * 150} className="block">
                  {w}<span className={tone}>.</span>
                </Reveal>
              ))}
            </div>
            <Reveal delay={300} className="mt-10 flex flex-wrap gap-3">
              <Link href="/executives" className="btn btn-dark">Meet the executives</Link>
              <Link href="/activities" className="btn btn-ghost">See our activities</Link>
            </Reveal>
          </div>
        </section>

        <section className="relative overflow-hidden bg-ndc-green text-white">
          <div className="stripes absolute inset-0" />
          <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center">
            <h2 className="headline text-[clamp(2.4rem,5vw,3.75rem)]">Ready to join us?</h2>
            <Link href="/portal/register" className="btn group bg-white px-6 py-3.5 text-base text-ink hover:bg-paper">
              Become a member <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
