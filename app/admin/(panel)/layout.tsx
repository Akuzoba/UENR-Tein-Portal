import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { isTestMode } from "@/lib/paystack";
import Sidebar from "@/components/admin/Sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col">
      <Sidebar username={admin.username} role={admin.role} />
      <div className="flex flex-1 flex-col lg:pl-60">
        {(admin.must_change === 1 || isTestMode()) && (
          <div className="no-print mx-auto mt-5 flex w-full max-w-7xl flex-col gap-2 px-4 sm:px-8">
            {admin.must_change === 1 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border-l-4 border-ndc-red bg-white px-4 py-2.5 text-sm">
                <b>You&apos;re using the default password.</b>
                <Link href="/admin/settings" className="font-semibold text-ndc-red hover:underline">Change it now</Link>
              </div>
            )}
            {isTestMode() && (
              <div className="rounded-md border-l-4 border-amber-500 bg-white px-4 py-2.5 text-sm">
                <b>Test mode.</b> <span className="text-muted">Members pay with Paystack test numbers; no real money is collected.</span>
              </div>
            )}
          </div>
        )}
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
