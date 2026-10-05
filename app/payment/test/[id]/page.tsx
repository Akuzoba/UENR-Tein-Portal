import { notFound, redirect } from "next/navigation";
import { getFeeMinor, getMember } from "@/lib/db";
import { TEST_CARD, TEST_MOMO, paymentMode } from "@/lib/paystack";
import { fmtMoney } from "@/lib/config";
import PageTransition from "@/components/PageTransition";
import TestCheckout from "./TestCheckout";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout – TEIN UENR" };

export default async function TestCheckoutPage({ params, searchParams }: PageProps<"/payment/test/[id]">) {
  if (paymentMode() !== "simulated") notFound();
  const { id } = await params;
  const { ref } = await searchParams;
  const m = await getMember(id);
  if (!m) notFound();
  if (m.payment_status === "paid") redirect(`/portal/receipt/${id}`);

  return (
    <PageTransition>
      <main className="flex w-full flex-1 items-center justify-center bg-[#e9e6df] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-white">TEST</span>
            No real money is charged. Add a Paystack key to go live.
          </div>
          <TestCheckout
            id={m.id}
            reference={String(ref ?? "")}
            name={m.name}
            phone={m.phone}
            amount={fmtMoney(m.due_amount ?? (await getFeeMinor()))}
            momo={TEST_MOMO}
            card={TEST_CARD}
          />
        </div>
      </main>
    </PageTransition>
  );
}
