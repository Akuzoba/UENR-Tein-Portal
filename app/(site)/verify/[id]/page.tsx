import { getMember } from "@/lib/db";
import { INSTITUTION, cardPeriod, fmtPeriod, memberCode, periodExpired } from "@/lib/config";
import PageTransition from "@/components/PageTransition";
import StatusMark from "@/components/StatusMark";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify membership – TEIN UENR" };

export default async function Verify({ params }: PageProps<"/verify/[id]">) {
  const { id } = await params;
  const m = await getMember(id);
  const paid = m?.payment_status === "paid" && m.member_no && m.paid_at ? m : null;
  const period = paid ? cardPeriod(paid) : null;
  const expired = period ? periodExpired(period) : false;

  return (
    <PageTransition>
      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="panel w-full max-w-md overflow-hidden text-center">
          <div className={`h-2 ${paid ? (expired ? "bg-amber-500" : "bg-ndc-green") : "bg-ndc-red"}`} />
          <div className="px-6 py-10">
            {paid ? (
              <>
                <StatusMark tone={expired ? "warn" : "ok"} />
                <h1 className={`headline mt-6 text-4xl ${expired ? "text-amber-700" : "text-ndc-green"}`}>
                  {expired ? "Membership expired" : "Valid member"}
                </h1>
                <dl className="mt-6 divide-y divide-line border-y border-line text-left text-sm">
                  {[
                    ["Name", paid.name],
                    ["Institution", INSTITUTION],
                    ["Membership No.", memberCode(paid.member_no!, paid.paid_at)],
                    ["Period", fmtPeriod(period!)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2.5">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <>
                <StatusMark tone="bad" />
                <h1 className="headline mt-6 text-4xl text-ndc-red">Not a valid membership</h1>
                <p className="mt-2 text-sm text-muted">This card could not be verified. It may be fake or unpaid.</p>
              </>
            )}
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
