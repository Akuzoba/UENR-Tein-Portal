"use server";

import { redirect } from "next/navigation";
import { getFeeMinor, getMember, markPaid } from "@/lib/db";
import { TEST_CARD, TEST_MOMO, paymentMode } from "@/lib/paystack";

export type TestPayState = { error?: string };

const digits = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\D/g, "");

export async function payTest(_: TestPayState, form: FormData): Promise<TestPayState> {
  if (paymentMode() !== "simulated") return { error: "Test checkout is disabled because Paystack is configured." };
  const id = String(form.get("id"));
  const ref = String(form.get("ref") || `UT-TEST-${Date.now()}`);
  const m = await getMember(id);
  if (!m) return { error: "Registration not found." };

  if (form.get("channel") === "card") {
    if (digits(form.get("card")) !== digits(TEST_CARD.number)) return { error: "Card declined. Use the test card number shown." };
    if (digits(form.get("cvv")) !== TEST_CARD.cvv) return { error: "Incorrect CVV. Use the test CVV shown." };
  } else {
    if (digits(form.get("momo")) !== TEST_MOMO.number) return { error: "Payment declined. Use the test mobile money number shown." };
  }

  await new Promise((r) => setTimeout(r, 1400)); // feel like a real authorisation round-trip
  await markPaid(id, ref, m.due_amount ?? (await getFeeMinor()), form.get("channel") === "card" ? "test:card" : "test:momo");
  redirect(`/portal/receipt/${id}`);
}
