import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { listExecutives, photoOf, type Executive } from "@/lib/site";
import PageTransition from "@/components/PageTransition";
import PageHeader from "@/components/admin/PageHeader";
import { ExecutiveForm } from "../forms";

export const metadata = { title: "Executives – TEIN UENR Admin" };

function Row({ e }: { e: Executive }) {
  const photo = photoOf(e);
  return (
    <Link href={`/admin/website/executives/${e.id}`} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper/60">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-11 w-11 rounded-full bg-paper object-cover object-top" />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ndc-green/10 text-sm font-bold text-ndc-green">{e.name[0]}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold group-hover:underline">{e.name}</div>
        <div className="truncate text-xs text-muted">{[e.position, e.term].filter(Boolean).join(" · ")}</div>
      </div>
      <span className="text-xs text-muted tabular-nums">#{e.sort_order}</span>
      <ChevronRight className="h-4 w-4 text-muted" />
    </Link>
  );
}

export default async function ExecutivesAdmin() {
  const all = await listExecutives();
  const current = all.filter((e) => e.is_current);
  const past = all.filter((e) => !e.is_current);

  return (
    <PageTransition>
      <div>
        <PageHeader title="Executives" sub="Shown on the Executives page and the home page.">
          <a href="/executives" target="_blank" className="btn btn-ghost">View page</a>
        </PageHeader>
        <div className="mt-6 grid items-start gap-4 xl:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <section className="panel overflow-hidden">
              <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Current team ({current.length})</h2>
              {current.length ? <div className="divide-y divide-line">{current.map((e) => <Row key={e.id} e={e} />)}</div> : <p className="px-4 py-8 text-center text-sm text-muted">No executives yet. Add the first one.</p>}
            </section>
            {past.length > 0 && (
              <section className="panel overflow-hidden">
                <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Past executives ({past.length})</h2>
                <div className="divide-y divide-line">{past.map((e) => <Row key={e.id} e={e} />)}</div>
              </section>
            )}
          </div>
          <section className="panel p-6 xl:sticky xl:top-6">
            <h2 className="font-display text-xl font-bold uppercase">Add an executive</h2>
            <div className="mt-4"><ExecutiveForm /></div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
