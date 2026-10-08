import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requirePermission } from "@/lib/admin";
import { listMembers, memberTotals, membersByProgram, registrationsPerDay } from "@/lib/db";
import { can } from "@/lib/roles";
import { CURRENCY, fmtDate } from "@/lib/config";
import PageTransition from "@/components/PageTransition";
import PageHeader from "@/components/admin/PageHeader";
import { DailyBars, RankBars, Ring, type Day } from "@/components/admin/Charts";
import CountUp from "@/components/admin/CountUp";

export const metadata = { title: "Overview – TEIN UENR Admin" };

const DAYS = 14;

export default async function Overview() {
  const admin = await requirePermission("dashboard.view");
  const [t, perDay, programRows, recent] = await Promise.all([
    memberTotals(),
    registrationsPerDay(DAYS),
    membersByProgram(6),
    listMembers({ limit: 6 }),
  ]);
  const byDay = new Map(perDay.map((r) => [r.d, r]));
  const days: Day[] = Array.from({ length: DAYS }, (_, i) => {
    const dt = new Date();
    dt.setUTCDate(dt.getUTCDate() - (DAYS - 1 - i));
    const key = dt.toISOString().slice(0, 10);
    const row = byDay.get(key);
    return {
      date: key,
      label: dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
      total: row?.total ?? 0,
      paid: row?.paid ?? 0,
    };
  });

  const programs = programRows.map((r) => ({ ...r }));

  const pending = t.total - t.paid;
  const rate = t.total ? (t.paid / t.total) * 100 : 0;

  const kpis = [
    { label: "Registered", value: <CountUp to={t.total} />, note: `${t.week} in the last 7 days`, bar: "bg-ink" },
    { label: "Paid members", value: <CountUp to={t.paid} />, note: `${Math.round(rate)}% of registrations`, bar: "bg-ndc-green" },
    { label: "Awaiting payment", value: <CountUp to={pending} />, note: "Registered, not yet paid", bar: "bg-amber-500" },
    { label: "Dues collected", value: <CountUp to={t.revenue / 100} prefix={`${CURRENCY} `} decimals={2} />, note: "All payment methods", bar: "bg-ndc-red" },
  ];

  return (
    <PageTransition>
      <div>
        <PageHeader title="Overview" sub={`${fmtDate(new Date())} · ${t.today} new registration${t.today === 1 ? "" : "s"} today`}>
          <Link href="/admin/members" className="btn btn-ghost">All members</Link>
          {can(admin.role, "cards.print") && <Link href="/admin/cards" className="btn btn-dark">Print cards</Link>}
        </PageHeader>

        <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map((k, i) => (
            <div key={k.label} className="panel anim-rise overflow-hidden" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`h-1 origin-left ${k.bar}`} style={{ animation: `grow-x .7s cubic-bezier(.2,.8,.2,1) ${200 + i * 80}ms both` }} />
              <div className="p-5">
                <div className="text-sm font-semibold text-muted">{k.label}</div>
                <div className="mt-1 font-display text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">{k.value}</div>
                <div className="mt-1 text-xs text-muted">{k.note}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <section className="panel p-6 xl:col-span-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-bold uppercase">Registrations</h2>
              <span className="text-xs text-muted">Last {DAYS} days</span>
            </div>
            <div className="mt-6">
              <DailyBars days={days} />
            </div>
          </section>

          <section className="panel flex flex-col p-6">
            <h2 className="font-display text-2xl font-bold uppercase">Payment rate</h2>
            <div className="flex flex-1 items-center gap-6 py-4">
              <Ring value={rate} label="paid" />
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="flex items-center gap-2 text-muted"><span className="h-2.5 w-2.5 rounded-sm bg-ndc-green" /> Paid</dt>
                  <dd className="font-display text-2xl font-bold">{t.paid}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-muted"><span className="h-2.5 w-2.5 rounded-sm bg-[#efece5] ring-1 ring-line" /> Not paid</dt>
                  <dd className="font-display text-2xl font-bold">{pending}</dd>
                </div>
              </dl>
            </div>
            {pending > 0 && (
              <Link href="/admin/members?status=pending" className="group flex items-center justify-between border-t border-line pt-4 text-sm font-semibold text-ndc-red">
                See the {pending} unpaid registration{pending === 1 ? "" : "s"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <section className="panel p-6">
            <h2 className="font-display text-2xl font-bold uppercase">By programme</h2>
            <div className="mt-5">
              <RankBars rows={programs} />
            </div>
          </section>

          <section className="panel p-6 xl:col-span-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-bold uppercase">Latest registrations</h2>
              <Link href="/admin/members" className="text-sm font-semibold text-muted hover:text-ink">View all</Link>
            </div>
            {recent.length === 0 ? (
              <p className="py-14 text-center text-sm text-muted">No registrations yet. Share the registration link to get started.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {recent.map((m) => (
                  <li key={m.id}>
                    <Link href={`/admin/members/${m.id}`} className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-paper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/admin/photo/${m.id}`} alt="" className="h-10 w-10 rounded-full bg-paper object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{m.name}</div>
                        <div className="truncate text-xs text-muted">{[m.program, m.period].filter(Boolean).join(" · ")}</div>
                      </div>
                      <span className={`badge badge-${m.payment_status}`}>{m.payment_status}</span>
                      <span className="hidden w-24 text-right text-xs text-muted sm:block">{fmtDate(m.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
