import { createHmac } from "crypto";
import { confirmPayment, paymentMode } from "@/lib/paystack";

// Backup for when a student closes the tab before returning from Paystack.
// Set this URL in Paystack → Settings → API Keys & Webhooks.
export async function POST(req: Request) {
  if (paymentMode() !== "paystack") return new Response("Paystack not configured", { status: 404 });
  const raw = await req.text();
  const sig = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(raw).digest("hex");
  if (sig !== req.headers.get("x-paystack-signature")) {
    return new Response("Invalid signature", { status: 401 });
  }
  const event = JSON.parse(raw);
  if (event.event === "charge.success") await confirmPayment(event.data.reference);
  return new Response("ok");
}
