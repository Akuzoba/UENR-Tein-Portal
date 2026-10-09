import { Banknote, CreditCard, GraduationCap, KeyRound, PenLine, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { getFeeMinor, getPrograms, getSignatory, listAdmins } from "@/lib/db";
import { CURRENCY, fmtDate, fmtDateTime, fmtMoney } from "@/lib/config";
import { isTestMode, paymentMode } from "@/lib/paystack";
import PageTransition from "@/components/PageTransition";
import PageHeader from "@/components/admin/PageHeader";
import { ROLES, ROLE_KEYS, can, roleLabel } from "@/lib/roles";
import { AddAdminForm, AdminRow, ChangePasswordForm, FeeForm, ProgramsForm, SignatoryForm } from "./Forms";

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
  // Every admin can open Settings to change their own password; each section below checks its own permission.
  const me = await requireAdmin();
  const may = (p: Parameters<typeof can>[1]) => can(me.role, p);
  const [admins, fee, signatory, programs] = await Promise.all([
    may("admins.manage") ? listAdmins() : [],
    getFeeMinor(),
    getSignatory(),
    getPrograms(),
  ]);
  const mode = paymentMode();
  const roles = ROLE_KEYS.map((key) => ({ key, label: ROLES[key].label, about: ROLES[key].about }));

  return (
    <PageTransition>
      <div>
        <PageHeader title="Settings" sub={`Signed in as ${me.username} · ${roleLabel(me.role)}`} />
        {welcome && me.must_change === 1 && (
          <p className="mt-5 rounded-md border-l-4 border-ndc-green bg-white px-4 py-3 text-sm">
            <b>Welcome.</b> Please set your own password before you continue.
          </p>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {may("settings.fee") && (
            <Section icon={Banknote} title="Membership fee">
              <div className="mt-4 flex items-baseline justify-between rounded-md bg-paper px-4 py-3">
                <span className="text-sm text-muted">Current fee</span>
                <span className="font-display text-3xl font-extrabold">{fmtMoney(fee)}</span>
              </div>
              <FeeForm current={(fee / 100).toFixed(2)} currency={CURRENCY} />
            </Section>
          )}

          {may("settings.signatory") && (
            <Section icon={PenLine} title="Card signatory">
              <p className="mt-1 text-sm text-muted">Printed on the back of every membership card.</p>
              <SignatoryForm {...signatory} />
            </Section>
          )}

          {may("settings.programs") && (
            <Section icon={GraduationCap} title="Programmes" className="lg:col-span-2">
              <p className="mt-1 text-sm text-muted">The options members pick from when they register. Kept in A–Z order, with “Other” last.</p>
              <ProgramsForm programs={programs} />
            </Section>
          )}

          <Section icon={KeyRound} title="Change your password">
            <ChangePasswordForm />
          </Section>

          {may("settings.fee") && (
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
          )}

          {may("admins.manage") && (
            <Section icon={Users} title="Admin users" className="lg:col-span-2">
              <p className="mt-1 text-sm text-muted">
                Give each executive their own account with only the role they need. At the end of a term, deactivate
                accounts instead of sharing passwords: their history stays in the activity log.
              </p>
              <ul className="mt-4 divide-y divide-line">
                {admins.map((a) => (
                  <AdminRow
                    key={a.id}
                    admin={a}
                    added={fmtDate(a.created_at)}
                    lastLogin={a.last_login_at ? fmtDateTime(a.last_login_at) : "never"}
                    isMe={a.id === me.id}
                    roles={roles}
                  />
                ))}
              </ul>
              <h3 className="mt-5 text-sm font-semibold">Add an admin</h3>
              <AddAdminForm roles={roles} />
              <dl className="mt-5 grid gap-3 rounded-md bg-paper p-4 text-sm sm:grid-cols-2">
                {roles.map((r) => (
                  <div key={r.key}>
                    <dt className="font-semibold">{r.label}</dt>
                    <dd className="text-muted">{r.about}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
