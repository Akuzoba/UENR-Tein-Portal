import { NextResponse } from "next/server";
import { getMember } from "@/lib/db";
import { startPayment } from "@/lib/paystack";

// Retry link for members whose payment is still pending.
export async function GET(req: Request, ctx: RouteContext<"/pay/[id]">) {
  const { id } = await ctx.params;
  const m = await getMember(id);
  if (!m) return NextResponse.redirect(new URL("/portal/register", req.url));
  if (m.payment_status === "paid") return NextResponse.redirect(new URL(`/portal/receipt/${id}`, req.url));
  return NextResponse.redirect(new URL(await startPayment(m), req.url));
}
