import Link from "next/link";
import { ChevronRight, Download, Printer } from "lucide-react";
import { requirePermission } from "@/lib/admin";
import { listMembers, memberTotals } from "@/lib/db";
import { can } from "@/lib/roles";
import { fmtDate, levelLabel, memberCode } from "@/lib/config";
import PageTransition from "@/components/PageTransition";
import PageHeader from "@/components/admin/PageHeader";
import MemberFilters from "@/components/admin/MemberFilters";

export const metadata = { title: "Members – TEIN UENR Admin" };

export default async function AdminMembers({ searchParams }: PageProps<"/admin/members">) {
  const admin = await requirePermission("members.view");
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const status = String(sp.status ?? "");
  const [members, t] = await Promise.all([listMembers({ q, status }), memberTotals()]);
  const c = { all_: t.total, paid: t.paid };
  const qs = new URLSearchParams({ q, status }).toString();
  const rowAnim = (i: number) => ({ animation: `rise .45s cubic-bezier(.2,.8,.2,1) ${Math.min(i, 20) * 25}ms both` });

  return (
    <PageTransition>
      <div>
        <PageHeader title="Members" sub={`${members.length} shown${q ? ` for “${q}”` : ""}`}>
          {can(admin.role, "members.export") && <a href={`/admin/export?${qs}`} className="btn btn-ghost"><Download className="h-4 w-4" /> Export CSV</a>}
          {can(admin.role, "cards.print") && <Link href={`/admin/cards?${new URLSearchParams({ q })}`} className="btn btn-dark"><Printer className="h-4 w-4" /> Print cards</Link>}
        </PageHeader>

        <div className="mt-6">
          <MemberFilters base="/admin/members" q={q} status={status} counts={{ all: c.all_, paid: c.paid, pending: c.all_ - c.paid }} />
        </div>

        {members.length === 0 ? (
          <div className="panel mt-4 px-6 py-16 text-center">
            <p className="font-semibold">{q || status ? "No members match this filter." : "No registrations yet."}</p>
            <p className="mt-1 text-sm text-muted">{q || status ? "Try a different search." : "Share the registration link to get started."}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="panel mt-4 hidden overflow-hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-paper/60 text-xs font-semibold text-muted">
                  <tr>
                    {["Member", "Phone", "Programme", "Level", "Status", "Membership No.", "Registered", ""].map((h, i) => (
                      <th key={i} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {members.map((m, i) => (
                    <tr key={m.id} className="group transition-colors hover:bg-paper/60" style={rowAnim(i)}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/members/${m.id}`} className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/admin/photo/${m.id}`} alt="" loading="lazy" className="h-10 w-10 rounded-full bg-paper object-cover" />
                          <span>
                            <span className="block font-semibold group-hover:underline">{m.name}</span>
                            {(m.student_id || m.email) && (
                              <span className="block text-xs text-muted">
                                {m.student_id && <span className="font-mono">{m.student_id}</span>}
                                {m.student_id && m.email && " · "}
                                {m.email}
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{m.phone}</td>
                      <td className="px-4 py-3">{m.program ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{levelLabel(m.level)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge badge-${m.payment_status}`}>{m.payment_status}</span>
                        {m.payment_method && !m.payment_method.startsWith("paystack") && (
                          <span className="ml-1.5 text-[10px] font-semibold tracking-wide text-muted uppercase">{m.payment_method.split(":")[0]}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{m.member_no ? memberCode(m.member_no, m.paid_at) : "—"}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-muted">{fmtDate(m.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/members/${m.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-muted group-hover:text-ink">
                          {m.payment_status === "paid" ? "Card" : "Open"} <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="panel mt-4 divide-y divide-line md:hidden">
              {members.map((m, i) => (
                <Link key={m.id} href={`/admin/members/${m.id}`} className="flex items-center gap-3 p-3 active:bg-paper" style={rowAnim(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/admin/photo/${m.id}`} alt="" loading="lazy" className="h-11 w-11 rounded-full bg-paper object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{m.name}</div>
                    <div className="truncate text-xs text-muted">{[m.student_id, m.phone, levelLabel(m.level)].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span className={`badge badge-${m.payment_status}`}>{m.payment_status}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
