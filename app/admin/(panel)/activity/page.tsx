import Link from "next/link";
import { ChevronRight, History } from "lucide-react";
import { requirePermission } from "@/lib/admin";
import { CATEGORIES, PAGE_SIZE, auditActors, listAudit, type AuditEntry } from "@/lib/audit";
import { fmtDateTime } from "@/lib/config";
import PageTransition from "@/components/PageTransition";
import PageHeader from "@/components/admin/PageHeader";

export const metadata = { title: "Activity log – TEIN UENR Admin" };

// Where an entry's target opens in the admin panel. Deleted records simply 404.
const TARGET_LINKS: Record<string, (id: string) => string> = {
  member: (id) => `/admin/members/${id}`,
  activity: (id) => `/admin/website/activities/${id}`,
  executive: (id) => `/admin/website/executives/${id}`,
};

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Edits show as "field: before → after"; everything else as plain key/value pairs. */
function Details({ e }: { e: AuditEntry }) {
  const { changes, ...rest } = (e.details ?? {}) as { changes?: Record<string, [unknown, unknown]> } & Record<string, unknown>;
  const rows = Object.entries(rest);
  if (!changes && !rows.length && !e.ip) return null;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer font-semibold text-muted hover:text-ink">Details</summary>
      <dl className="mt-2 space-y-1 rounded-md bg-paper p-3 font-mono break-all">
        {changes &&
          Object.entries(changes).map(([k, [a, b]]) => (
            <div key={k}>
              <dt className="inline font-semibold">{k.replace(/_/g, " ")}: </dt>
              <dd className="inline">
                <span className="text-ndc-red line-through">{show(a)}</span> → <span className="text-ndc-green">{show(b)}</span>
              </dd>
            </div>
          ))}
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="inline font-semibold">{k.replace(/_/g, " ")}: </dt>
            <dd className="inline">{show(v)}</dd>
          </div>
        ))}
        {e.ip && (
          <div>
            <dt className="inline font-semibold">ip: </dt>
            <dd className="inline">{e.ip}</dd>
          </div>
        )}
      </dl>
    </details>
  );
}

export default async function ActivityLog({ searchParams }: PageProps<"/admin/activity">) {
  await requirePermission("audit.view");
  const sp = await searchParams;
  const filter = {
    actor: String(sp.actor ?? ""),
    category: String(sp.category ?? ""),
    from: String(sp.from ?? ""),
    to: String(sp.to ?? ""),
    q: String(sp.q ?? "").trim(),
  };
  const before = String(sp.before ?? "");
  const [entries, actors] = await Promise.all([listAudit({ ...filter, before }), auditActors()]);
  const filtered = Object.values(filter).some(Boolean);
  const older = entries.length === PAGE_SIZE ? `/admin/activity?${new URLSearchParams({ ...filter, before: entries.at(-1)!.id })}` : null;

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Activity log"
          sub="Sign-ins, payments, member changes, card printing and settings. Entries can't be edited or deleted."
        />

        <form className="panel mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_1.4fr_auto]">
          <label className="field">
            Who
            <select name="actor" defaultValue={filter.actor} className="input">
              <option value="">Everyone</option>
              {actors.map((a) => (
                <option key={a} value={a}>{a === "system" ? "Automatic (payments)" : a}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Type
            <select name="category" defaultValue={filter.category} className="input">
              <option value="">All activity</option>
              {Object.entries(CATEGORIES).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            From
            <input type="date" name="from" defaultValue={filter.from} className="input" />
          </label>
          <label className="field">
            To
            <input type="date" name="to" defaultValue={filter.to} className="input" />
          </label>
          <label className="field">
            Search
            <input type="search" name="q" defaultValue={filter.q} placeholder="Name, reference, action…" className="input" />
          </label>
          <div className="flex items-end gap-2">
            <button className="btn btn-dark">Filter</button>
            {filtered && <Link href="/admin/activity" className="btn btn-ghost">Clear</Link>}
          </div>
        </form>

        {entries.length === 0 ? (
          <div className="panel mt-4 flex flex-col items-center px-6 py-16 text-center">
            <History className="h-8 w-8 text-muted/60" />
            <p className="mt-4 font-semibold">{filtered || before ? "No activity matches this filter." : "No activity recorded yet."}</p>
          </div>
        ) : (
          <div className="panel mt-4 divide-y divide-line">
            {entries.map((e) => {
              const link = e.target_type && e.target_id ? TARGET_LINKS[e.target_type]?.(e.target_id) : undefined;
              return (
                <div key={e.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
                  <div className="w-44 shrink-0 text-xs text-muted tabular-nums">{fmtDateTime(e.at)}</div>
                  <div className="w-32 shrink-0 text-sm font-semibold">{e.actor === "system" ? <span className="text-muted">Automatic</span> : e.actor}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      {e.summary}
                      {link && (
                        <Link href={link} className="ml-2 inline-flex items-center text-xs font-semibold text-muted hover:text-ink">
                          Open <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-muted">{e.action}</div>
                    <Details e={e} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(older || before) && (
          <div className="mt-4 flex justify-between">
            {before ? <Link href={`/admin/activity?${new URLSearchParams(filter)}`} className="btn btn-ghost">Newest</Link> : <span />}
            {older && <Link href={older} className="btn btn-ghost">Older entries</Link>}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
