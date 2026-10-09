import Link from "next/link";
import { redirect } from "next/navigation";
import { confirmPayment } from "@/lib/paystack";
import PageTransition from "@/components/PageTransition";
import StatusMark from "@/components/StatusMark";
import { portalHref } from "@/lib/config";

export const metadata = { title: "Payment – TEIN UENR" };

export default async function Callback({ searchParams }: PageProps<"/portal/payment/callback">) {
  const sp = await searchParams;
  const reference = String(sp.reference ?? sp.trxref ?? "");
  const memberId = reference ? await confirmPayment(reference) : null;
  if (memberId) redirect(portalHref(`/portal/receipt/${memberId}`));

  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-md flex-1 px-5 py-20 text-center">
        <StatusMark tone="warn" />
        <h1 className="headline mt-6 text-4xl">Payment not completed</h1>
        <p className="mt-2 text-muted">
          We couldn&apos;t confirm your payment. If you were charged, wait a minute and refresh this page.
        </p>
        <Link href={portalHref("/portal/register")} className="btn btn-dark mt-7">
          Back to registration
        </Link>
      </main>
    </PageTransition>
  );
}
