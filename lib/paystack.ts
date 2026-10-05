import { CURRENCY, SITE_URL } from "./config";
import { getFeeMinor, getMember, markPaid, setDue, type Member } from "./db";

const BASE = "https://api.paystack.co";
const headers = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
});

/**
 * "paystack"  – real Paystack checkout (use an sk_test_ key for test payments, sk_live_ for real money)
 * "simulated" – no key: a built-in test checkout that only accepts Paystack's test numbers.
 *               Always on in development; in production only with ALLOW_TEST_CHECKOUT=true,
 *               because it lets anyone "pay" with a test number.
 * "disabled"  – production without a key or that opt-in: registration can't proceed to payment.
 */
export function paymentMode(): "paystack" | "simulated" | "disabled" {
  if (process.env.PAYSTACK_SECRET_KEY) return "paystack";
  if (process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_CHECKOUT === "true") return "simulated";
  return "disabled";
}

export const isTestMode = () => {
  const mode = paymentMode();
  return mode === "simulated" || (mode === "paystack" && process.env.PAYSTACK_SECRET_KEY!.startsWith("sk_test_"));
};

// Paystack's published test credentials (Ghana). They are accepted by Paystack test mode and by the simulator.
export const TEST_MOMO = { number: "0551234987", provider: "MTN" };
export const TEST_CARD = { number: "4084 0840 8408 4081", cvv: "408", expiry: "12/30", pin: "0000", otp: "123456" };

/** Starts a payment for a member and returns the URL to send them to. */
export async function startPayment(member: Pick<Member, "id" | "phone" | "email">) {
  const reference = `UT-${member.id.slice(0, 8)}-${Date.now()}`;
  // Quote the current fee and remember it, so verification checks against what this member was asked to pay.
  if (paymentMode() === "disabled") throw new Error("Online payment isn't open yet. Please try again later.");
  const amount = await getFeeMinor();
  await setDue(member.id, amount);
  if (paymentMode() === "simulated") {
    return `/payment/test/${member.id}?ref=${reference}`;
  }

  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      // Paystack requires an email; fall back to a placeholder when the member didn't give one.
      email: member.email || `${member.phone.replace(/\D/g, "")}@members.tein-uenr.app`,
      amount,
      currency: CURRENCY,
      reference,
      callback_url: `${SITE_URL}/portal/payment/callback`,
      metadata: { member_id: member.id },
    }),
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message || "Could not start payment");
  return json.data.authorization_url as string;
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: headers(),
    cache: "no-store",
  });
  return res.json();
}

/** Verifies with Paystack, then marks the member paid. Returns the member id on success. */
export async function confirmPayment(reference: string): Promise<string | null> {
  if (paymentMode() !== "paystack") return null;
  const json = await verifyTransaction(reference);
  const tx = json.data;
  if (!json.status || tx?.status !== "success") return null;
  const memberId = tx.metadata?.member_id as string | undefined;
  const member = memberId ? await getMember(memberId) : undefined;
  if (!memberId || !member) return null;
  // Never accept less than the amount we quoted (or the current fee, for records created before quoting).
  if (tx.amount < (member.due_amount ?? (await getFeeMinor())) || tx.currency !== CURRENCY) return null;
  await markPaid(memberId, reference, tx.amount, tx.channel ? `paystack:${tx.channel}` : "paystack");
  return memberId;
}
