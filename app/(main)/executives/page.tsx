import { Users } from "lucide-react";
import { listExecutives, photoOf, type Executive } from "@/lib/site";
import PageTransition from "@/components/PageTransition";
import PageHero from "@/components/site/PageHero";
import ExecutiveCard from "@/components/site/ExecutiveCard";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Executives – TEIN UENR" };

export default async function Executives() {
  const all = await listExecutives();
  const current = all.filter((e) => e.is_current);
  const terms = new Map<string, Executive[]>();
  for (const e of all.filter((e) => !e.is_current)) {
    const t = e.term || "Earlier";
    terms.set(t, [...(terms.get(t) ?? []), e]);
  }
  const term = current.find((e) => e.term)?.term;

  return (
    <PageTransition>
      <main className="flex-1">
        <PageHero eyebrow="Leadership" title="Our executives" sub={term ? `The ${term} executive committee of TEIN UENR.` : "The executive committee of TEIN UENR."} />

        <section className="mx-auto w-full max-w-6xl px-5 py-12">
          {current.length === 0 ? (
            <div className="panel flex flex-col items-center px-6 py-20 text-center">
              <Users className="h-8 w-8 text-muted/60" />
              <p className="mt-4 font-semibold">The executive team will be listed here soon</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {current.map((e, i) => (
                <Reveal key={e.id} variant="flip" delay={Math.min(i, 7) * 80} className="h-full">
                  <ExecutiveCard name={e.name} position={e.position} bio={e.bio} photo={photoOf(e)} />
                </Reveal>
              ))}
            </div>
          )}
        </section>

        {terms.size > 0 && (
          <section className="border-t border-line bg-white">
            <div className="mx-auto max-w-6xl px-5 py-12">
              <p className="eyebrow">Past executives</p>
              <h2 className="headline mt-3 text-4xl">Those who led before</h2>
              <div className="mt-6 border-t-2 border-ink">
                {[...terms].map(([t, people]) => (
                  <details key={t} className="group border-b border-line">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                      {t} <span className="text-sm font-normal text-muted">{people.length} executive{people.length === 1 ? "" : "s"}</span>
                    </summary>
                    <div className="grid grid-cols-2 gap-4 pb-6 md:grid-cols-4 lg:grid-cols-5">
                      {people.map((e) => (
                        <ExecutiveCard key={e.id} name={e.name} position={e.position} photo={photoOf(e)} compact />
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </PageTransition>
  );
}
