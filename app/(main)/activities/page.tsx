import { Images } from "lucide-react";
import { listActivities } from "@/lib/site";
import PageTransition from "@/components/PageTransition";
import PageHero from "@/components/site/PageHero";
import ActivityCard from "@/components/site/ActivityCard";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activities – TEIN UENR" };

export default async function Activities() {
  const activities = await listActivities();

  return (
    <PageTransition>
      <main className="flex-1">
        <PageHero eyebrow="Activities" title="Our activities" sub="Meetings, outreach, campaigns and campus events, with photos from each one." />
        <section className="mx-auto w-full max-w-6xl px-5 py-12">
          {activities.length === 0 ? (
            <div className="panel flex flex-col items-center px-6 py-20 text-center">
              <Images className="h-8 w-8 text-muted/60" />
              <p className="mt-4 font-semibold">No activities posted yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted">Photos and write-ups from our events will appear here soon.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {activities.map((a, i) => (
                <Reveal key={a.id} variant="zoom" delay={Math.min(i, 5) * 90} className="h-full">
                  <ActivityCard a={a} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
