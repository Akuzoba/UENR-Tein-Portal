import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Trash2 } from "lucide-react";
import { getMember } from "@/lib/db";
import { cardData } from "@/lib/card";
import { GENDERS, PERIODS, PROGRAMS, SITE_URL, cardPeriod, fmtDate, fmtMoney, fmtPeriod, levelLabel, memberCode, methodLabel } from "@/lib/config";
import MemberCard from "@/components/MemberCard";
import PageTransition from "@/components/PageTransition";
import { deleteMember, markMemberPaid } from "../../../actions";
import EditMember from "./EditMember";
import ConfirmButton from "./ConfirmButton";
import CopyLink from "./CopyLink";

export const metadata = { title: "Member – TEIN UENR Admin" };

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="font-display text-xl font-bold uppercase">{children}</h2>;

export default async function MemberPage({ params }: PageProps<"/admin/members/[id]">) {
  const { id } = await params;
  const m = await getMember(id);
  if (!m) notFound();
  const card = await cardData(m);

  const facts: [string, string][] = [
    ["Method", methodLabel(m.payment_method)],
    ["Amount", m.amount_paid != null ? fmtMoney(m.amount_paid) : "—"],
    ["Paid on", fmtDate(m.paid_at)],
    ["Card period", m.paid_at ? fmtPeriod(cardPeriod(m)) : "—"],
    ["Reference", m.paystack_ref ?? "—"],
    ["Registered", fmtDate(m.created_at)],
  ];

  return (
    <PageTransition>
      <div>
        <Link href="/admin/members" className="no-print group inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> All members
        </Link>

        <div className="no-print mt-4 flex flex-wrap items-center gap-5 border-b border-line pb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/admin/photo/${m.id}`} alt="" className="h-24 w-20 rounded-md bg-paper object-cover ring-1 ring-line" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="headline text-4xl sm:text-5xl">{m.name}</h1>
              <span className={`badge badge-${m.payment_status}`}>{m.payment_status}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{[m.program, m.level && levelLabel(m.level), m.program_years && `${m.program_years}-year programme`, m.period, m.phone].filter(Boolean).join(" · ")}</p>
            {m.member_no && <p className="mt-2 font-mono text-sm font-semibold">{memberCode(m.member_no, m.paid_at)}</p>}
          </div>
          {card && <CopyLink url={`${SITE_URL}/portal/receipt/${m.id}`} />}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="no-print space-y-4">
            <section className="panel p-5">
              <H2>Payment</H2>
              <dl className="mt-3 divide-y divide-line text-sm">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="truncate text-right font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {m.payment_status !== "paid" && (
                <form action={markMemberPaid} className="mt-4">
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmButton className="btn btn-green w-full" message={`Mark ${m.name} as paid (cash/manual)? This issues a member number.`}>
                    <BadgeCheck className="h-4 w-4" /> Mark as paid (cash)
                  </ConfirmButton>
                </form>
              )}
            </section>

            <section className="panel p-5">
              <H2>Edit details</H2>
              <EditMember m={m} programs={PROGRAMS} periods={PERIODS} genders={GENDERS} />
            </section>

            <section className="panel p-5">
              <H2>Delete</H2>
              <p className="mt-1 text-sm text-muted">Permanently removes this member and their photo.</p>
              <form action={deleteMember} className="mt-4">
                <input type="hidden" name="id" value={m.id} />
                <ConfirmButton className="btn btn-danger w-full" message={`Permanently delete ${m.name} and their photo? This cannot be undone.`}>
                  <Trash2 className="h-4 w-4" /> Delete member
                </ConfirmButton>
              </form>
            </section>
          </div>

          <section className="panel flex flex-col items-center p-6 sm:p-10">
            <div className="no-print mb-8 self-start"><H2>Membership card</H2></div>
            {card ? (
              <MemberCard d={card} />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                <p className="font-semibold">No card yet</p>
                <p className="mt-1 max-w-xs text-sm text-muted">The card is created once payment is confirmed, or when you mark it as paid.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
