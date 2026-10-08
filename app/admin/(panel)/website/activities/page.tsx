import Link from "next/link";
import { requirePermission } from "@/lib/admin";
import { ChevronRight, EyeOff, Images } from "lucide-react";
import { fmtDate } from "@/lib/config";
import { listActivities } from "@/lib/site";
import PageTransition from "@/components/PageTransition";
import PageHeader from "@/components/admin/PageHeader";
import { NewActivityForm } from "../forms";

export const metadata = { title: "Activities – TEIN UENR Admin" };

export default async function ActivitiesAdmin() {
  await requirePermission("website.edit");
  const activities = await listActivities({ publishedOnly: false });

  return (
    <PageTransition>
      <div>
        <PageHeader title="Activities" sub="Events and their photo albums on the website.">
          <a href="/activities" target="_blank" className="btn btn-ghost">View page</a>
        </PageHeader>
        <div className="mt-6 grid items-start gap-4 xl:grid-cols-[1fr_420px]">
          <section className="panel overflow-hidden">
            {activities.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-muted">No activities yet. Create one to start adding photos.</p>
            ) : (
              <div className="divide-y divide-line">
                {activities.map((a) => (
                  <Link key={a.id} href={`/admin/website/activities/${a.id}`} className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-paper/60">
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-paper">
                      {a.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.cover} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold group-hover:underline">{a.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                        {a.happened_on && <span>{fmtDate(a.happened_on)}</span>}
                        <span className="inline-flex items-center gap-1"><Images className="h-3.5 w-3.5" /> {a.photo_count}</span>
                      </div>
                    </div>
                    {a.published ? (
                      <span className="badge badge-paid">live</span>
                    ) : (
                      <span className="badge badge-pending"><EyeOff className="h-3 w-3" /> hidden</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section className="panel p-6 xl:sticky xl:top-6">
            <h2 className="font-display text-xl font-bold uppercase">New activity</h2>
            <div className="mt-4"><NewActivityForm /></div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
