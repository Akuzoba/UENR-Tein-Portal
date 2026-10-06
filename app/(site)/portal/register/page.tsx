import { GENDERS, PERIODS, fmtMoney } from "@/lib/config";
import { getFeeMinor, getPrograms, getSignatory } from "@/lib/db";
import { isTestMode } from "@/lib/paystack";
import PageTransition from "@/components/PageTransition";
import RegisterWizard from "./RegisterWizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Register – TEIN UENR" };

export default async function RegisterPage() {
  return (
    <PageTransition>
      <main className="flex-1 pb-20">
        <div className="border-b border-line bg-white">
          <div className="mx-auto max-w-6xl px-5 py-10">
            <p className="eyebrow">Membership {new Date().getFullYear()}</p>
            <h1 className="headline mt-3 text-5xl sm:text-6xl">Member registration</h1>
            <p className="mt-3 max-w-xl text-muted">
              Four short steps, then payment. Your card preview on the right
              updates as you fill in the form.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5">
          <RegisterWizard
            programs={await getPrograms()}
            periods={PERIODS}
            genders={GENDERS}
            fee={fmtMoney((await getFeeMinor()))}
            testMode={isTestMode()}
            year={new Date().getFullYear()}
            signatory={await getSignatory()}
          />
        </div>
      </main>
    </PageTransition>
  );
}
