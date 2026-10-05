import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { fmtDate } from "@/lib/config";
import { activityPhotos, getActivity, paragraphs } from "@/lib/site";
import { mediaUrl } from "@/lib/storage";
import PageTransition from "@/components/PageTransition";
import Gallery from "@/components/site/Gallery";
import Words from "@/components/site/Words";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const a = await getActivity({ slug });
  return a?.published ? a : null;
}

export async function generateMetadata({ params }: PageProps<"/activities/[slug]">): Promise<Metadata> {
  const a = await load((await params).slug);
  if (!a) return { title: "Activity – TEIN UENR" };
  const photos = a.cover_path ? [] : await activityPhotos(a.id);
  const cover = a.cover_path ? mediaUrl(a.cover_path) : photos[0]?.url;
  // Shown when the link is shared on WhatsApp, Facebook, X...
  return {
    title: `${a.title} – TEIN UENR`,
    description: a.summary ?? undefined,
    openGraph: { title: a.title, description: a.summary ?? undefined, images: cover ? [cover] : undefined },
  };
}

export default async function ActivityPage({ params }: PageProps<"/activities/[slug]">) {
  const a = await load((await params).slug);
  if (!a) notFound();
  const photos = await activityPhotos(a.id);
  const cover = a.cover_path ? mediaUrl(a.cover_path) : photos[0]?.url;

  return (
    <PageTransition>
      <main className="flex-1">
        <div className="ink-band">
          {cover && (
            <div aria-hidden className="absolute inset-0 -z-10">
              <Image src={cover} alt="" fill priority sizes="100vw" className="ken-burns object-cover opacity-45" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
            </div>
          )}
          <div className="mx-auto max-w-4xl px-5 pt-12 pb-14 sm:pt-16 sm:pb-20">
            <Link href="/activities" className="group anim-fade inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-3.5 py-1.5 text-sm font-semibold text-white/80 backdrop-blur hover:border-white hover:text-white">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> All activities
            </Link>
            {a.happened_on && (
              <p className="anim-fade mt-8 flex items-center gap-2 text-sm font-semibold text-ndc-red">
                <CalendarDays className="h-4 w-4" /> {fmtDate(a.happened_on)}
              </p>
            )}
            <h1 className="headline mt-3 text-[clamp(2.8rem,7vw,5rem)] text-balance">
              <Words text={a.title} delay={100} />
            </h1>
            {a.summary && <p className="anim-rise mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-white/75" style={{ animationDelay: "300ms" }}>{a.summary}</p>}
          </div>
          <div className="flag-bars grid grid-cols-4">
            <span className="h-1.5 bg-black" /><span className="h-1.5 bg-ndc-red" /><span className="h-1.5 bg-white" /><span className="h-1.5 bg-ndc-green" />
          </div>
        </div>

        {paragraphs(a.body).length > 0 && (
          <section className="mx-auto max-w-3xl space-y-5 px-5 pt-12 text-lg leading-relaxed text-muted">
            {paragraphs(a.body).map((p, i) => <p key={i}>{p}</p>)}
          </section>
        )}

        {photos.length > 0 && (
          <section className="mx-auto w-full max-w-6xl px-5 py-12">
            <h2 className="mb-5 text-sm font-semibold text-muted">{photos.length} photo{photos.length === 1 ? "" : "s"} · tap to enlarge</h2>
            <Gallery photos={photos.map((p) => ({ id: p.id, url: p.url }))} title={a.title} />
          </section>
        )}
        {photos.length === 0 && <div className="pb-12" />}
      </main>
    </PageTransition>
  );
}
