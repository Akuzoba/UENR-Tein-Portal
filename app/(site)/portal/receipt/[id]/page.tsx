import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getFeeMinor, getMember } from "@/lib/db";
import { SITE_URL, cardPeriod, fmtDateTime, fmtMoney, fmtPeriod, levelLabel, memberCode, methodLabel, receiptNo } from "@/lib/config";
import PageTransition from "@/components/PageTransition";
import StatusMark from "@/components/StatusMark";
import { LogoMark } from "@/components/brand/Logo";
import PrintReceipt from "./PrintReceipt";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment receipt – TEIN UENR" };

// Members get a receipt, not their card: the executives print and hand out the physical cards.
export default async function ReceiptPage({ params }: PageProps<"/portal/receipt/[id]">) {
  const { id } = await params;
  const m = await getMember(id);
  if (!m) notFound();
  const first = m.name.split(" ")[0];

  if (m.payment_status !== "paid" || !m.member_no || !m.paid_at) {
    return (
      <PageTransition>
        <main className="flex flex-1 items-center justify-center px-5 py-16">
          <div className="panel anim-rise w-full max-w-md px-6 py-12 text-center">
            <StatusMark tone="warn" />
            <h1 className="headline mt-6 text-4xl">Payment pending</h1>
            <p className="mt-2 text-muted">Hi {first}, your registration is saved. Pay your dues to complete your membership.</p>
            <a href={`/pay/${m.id}`} className="btn btn-primary mt-7 px-7 py-3.5 text-base">
              Complete payment
            </a>
          </div>
        </main>
      </PageTransition>
    );
  }

  const year = new Date(m.paid_at).getFullYear();
  const qr = await QRCode.toDataURL(`${SITE_URL}/verify/${m.id}`, { margin: 1, width: 240 });
  const rows: [string, string][] = [
    ["Received from", m.name],
    ["Phone", m.phone],
    ["Membership No.", memberCode(m.member_no, m.paid_at)],
    ["Programme", [m.program, levelLabel(m.level)].filter((v) => v && v !== "—").join(" · ") || "—"],
    ["Card period", fmtPeriod(cardPeriod(m))],
    ["Description", `TEIN UENR membership dues, ${year}`],
    ["Payment method", methodLabel(m.payment_method)],
    ["Reference", m.paystack_ref ?? "—"],
    ["Date paid", fmtDateTime(m.paid_at)],
  ];

  return (
    <PageTransition>
      {/* Receipts print on normal paper, not at card size */}
      <style>{"@media print { @page { size: auto; margin: 14mm; } }"}</style>
      <main className="flex flex-1 flex-col items-center px-5 py-12">
        <div className="no-print anim-rise mb-8 text-center">
          <StatusMark tone="ok" />
          <h1 className="headline mt-6 text-5xl">Payment successful</h1>
          <p className="mt-2 text-muted">Thank you, {first}. Your TEIN UENR membership is now active.</p>
        </div>

        <article className="panel anim-rise relative w-full max-w-xl overflow-hidden print:max-w-none print:border-0" style={{ animationDelay: "150ms" }}>
          <div className="flag-rule h-1.5" />
          <div className="p-6 sm:p-8">
            <header className="flex items-start justify-between gap-4 border-b border-line pb-5">
              <div className="flex items-center gap-3">
                <LogoMark height={56} />
                <div className="leading-tight">
                  <div className="font-display text-2xl font-extrabold uppercase">TEIN UENR</div>
                  <div className="text-xs text-muted">NDC Student Body</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl font-bold uppercase">Official receipt</div>
                <div className="mt-0.5 font-mono text-sm">{receiptNo(m.member_no, m.paid_at)}</div>
              </div>
            </header>

            <div className="relative">
              {/* Rubber-stamp style mark */}
              <div className="pointer-events-none absolute top-3 right-0 hidden rotate-[-12deg] rounded-md border-[3px] sm:block border-ndc-green px-3 py-1 font-display text-3xl font-extrabold tracking-widest text-ndc-green uppercase opacity-80">
                Paid
              </div>
              <dl className="divide-y divide-line">
                {rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[130px_1fr] gap-3 py-2.5 text-sm sm:grid-cols-[150px_1fr]">
                    <dt className="text-muted">{k}</dt>
                    <dd className={`font-semibold break-words ${k === "Membership No." || k === "Reference" ? "font-mono" : ""}`}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-2 flex items-center justify-between border-t-2 border-ink pt-4">
              <span className="flex items-center gap-3 font-semibold">
                Amount paid
                <span className="rotate-[-6deg] rounded border-2 border-ndc-green px-1.5 font-display text-sm font-extrabold tracking-widest text-ndc-green uppercase sm:hidden">
                  Paid
                </span>
              </span>
              <span className="font-display text-4xl font-extrabold">{fmtMoney(m.amount_paid ?? m.due_amount ?? (await getFeeMinor()))}</span>
            </div>

            <footer className="mt-6 flex items-center gap-4 rounded-md bg-paper p-4 print:bg-white print:p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code to verify this payment" className="h-20 w-20 shrink-0" />
              <p className="text-xs leading-relaxed text-muted">
                Your membership card will be printed by the TEIN UENR executives. Show this receipt or your membership number when
                you collect it. Scan the code to confirm this payment is genuine.
              </p>
            </footer>
          </div>
        </article>

        <div className="no-print anim-rise mt-6 flex flex-wrap justify-center gap-3" style={{ animationDelay: "300ms" }}>
          <PrintReceipt />
          <Link href="/portal" className="btn btn-ghost">Back to home</Link>
        </div>
        <p className="no-print mt-4 max-w-md text-center text-xs text-muted">Bookmark this page to see your receipt again.</p>
      </main>
    </PageTransition>
  );
}
