import { Banknote, CreditCard, GraduationCap, KeyRound, PenLine, ShieldCheck, Trash2, Users } from "lucide-react";
import { currentAdmin } from "@/lib/admin";
import { getFeeMinor, getPrograms, getSignatory, listAdmins } from "@/lib/db";
import { CURRENCY, fmtDate, fmtMoney } from "@/lib/config";
import { isTestMode, paymentMode } from "@/lib/paystack";
import PageTransition from "@/components/PageTransition";
import PageHeader from "@/components/admin/PageHeader";
import { removeAdmin } from "../../actions";
import { AddAdminForm, ChangePasswordForm, FeeForm, ProgramsForm, SignatoryForm } from "./Forms";

export const metadata = { title: "Settings – TEIN UENR Admin" };

function Section({ icon: Icon, title, children, className = "" }: { icon: typeof Users; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel p-6 ${className}`}>
      <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
        <Icon className="h-4 w-4 text-muted" />
        {title}
      </h2>
      {children}
    </section>
  );
}

const code = "rounded bg-paper px-1.5 py-0.5 font-mono text-xs text-ink";

export default async function Settings({ searchParams }: PageProps<"/admin/settings">) {
  const { welcome } = await searchParams;
  const me = (await currentAdmin())!;
  const admins = await listAdmins();
  const mode = paymentMode();
  const fee = (await getFeeMinor());
  const signatory = await getSignatory();
  const programs = await getPrograms();

  return (
    <PageTransition>
      <div>
        <PageHeader title="Settings" sub="Membership fee, card signatory, programmes, payments, your account and admins." />
        {welcome && me.must_change === 1 && (
          <p className="mt-5 rounded-md border-l-4 border-ndc-green bg-white px-4 py-3 text-sm">
            <b>Welcome.</b> Please set your own password before you continue.
          </p>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Section icon={Banknote} title="Membership fee">
            <div className="mt-4 flex items-baseline justify-between rounded-md bg-paper px-4 py-3">
              <span className="text-sm text-muted">Current fee</span>
              <span className="font-display text-3xl font-extrabold">{fmtMoney(fee)}</span>
            </div>
            <FeeForm current={(fee / 100).toFixed(2)} currency={CURRENCY} />
          </Section>

          <Section icon={PenLine} title="Card signatory">
            <p className="mt-1 text-sm text-muted">Printed on the back of every membership card.</p>
            <SignatoryForm {...signatory} />
          </Section>

          <Section icon={GraduationCap} title="Programmes" className="lg:col-span-2">
            <p className="mt-1 text-sm text-muted">The options members pick from when they register. Kept in A–Z order, with “Other” last.</p>
            <ProgramsForm programs={programs} />
          </Section>

          <Section icon={KeyRound} title="Change your password">
            <ChangePasswordForm />
          </Section>

          <Section icon={CreditCard} title="Payments">
            <div className="mt-4 flex items-center justify-between rounded-md bg-paper px-4 py-3">
              <span className="text-sm text-muted">Mode</span>
              <span className={`badge ${mode === "paystack" && !isTestMode() ? "badge-paid" : "badge-pending"}`}>
                {mode === "simulated" ? "Built-in test checkout" : isTestMode() ? "Paystack · test key" : "Paystack · LIVE"}
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {mode === "simulated" ? (
                <>
                  No Paystack key is configured, so members pay on a simulated checkout using Paystack&apos;s test numbers. To use
                  real Paystack, add <code className={code}>PAYSTACK_SECRET_KEY</code> to <code className={code}>.env.local</code> and
                  restart the server: an <code className={code}>sk_test_…</code> key for Paystack test mode, or an{" "}
                  <code className={code}>sk_live_…</code> key to collect real money.
                </>
              ) : (
                <>
                  Set the webhook URL in Paystack → Settings → API Keys &amp; Webhooks to{" "}
                  <code className={code}>/api/paystack/webhook</code> on your live domain.
                </>
              )}
            </p>
          </Section>

          <Section icon={Users} title="Admin users" className="lg:col-span-2">
            <ul className="mt-4 divide-y divide-line">
              {admins.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ndc-green text-sm font-bold text-white uppercase">{a.username[0]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {a.username}
                      {a.id === me.id && <span className="ml-2 text-xs font-normal text-muted">(you)</span>}
                    </div>
                    <div className="text-xs text-muted">Added {fmtDate(a.created_at)}</div>
                  </div>
                  {a.must_change ? (
                    <span className="badge badge-pending">temporary password</span>
                  ) : (
                    <span className="badge badge-paid"><ShieldCheck className="h-3 w-3" /> active</span>
                  )}
                  {a.id !== me.id && (
                    <form action={removeAdmin}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="rounded-md p-2 text-muted transition-colors hover:bg-ndc-red/10 hover:text-ndc-red" aria-label={`Remove ${a.username}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-sm font-semibold">Add an admin</h3>
            <AddAdminForm />
          </Section>
        </div>
      </div>
    </PageTransition>
  );
}
