import { isAdmin } from "@/lib/admin";
import { listMembers } from "@/lib/db";
import { SITE_URL, cardPeriod, fmtPeriod, memberCode, methodLabel } from "@/lib/config";

// Leading = + - @ would be run as formulas by Excel.
const esc = (v: unknown) => {
  const s = String(v ?? "");
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const members = await listMembers({
    q: (url.searchParams.get("q") ?? "").trim(),
    status: url.searchParams.get("status") ?? "",
  });

  const header = ["Membership No.", "Name", "Phone", "Email", "Program", "Programme years", "Level", "Card period", "Study mode", "Gender", "DOB", "Status", "Method", "Amount", "Reference", "Paid at", "Registered", "Receipt link"];
  const rows = members.map((m) =>
    [
      m.member_no ? memberCode(m.member_no, m.paid_at) : "",
      m.name,
      m.phone,
      m.email,
      m.program,
      m.program_years,
      m.level ? m.level * 100 : "",
      m.paid_at ? fmtPeriod(cardPeriod(m)) : "",
      m.period,
      m.gender,
      m.dob,
      m.payment_status,
      methodLabel(m.payment_method),
      m.amount_paid != null ? (m.amount_paid / 100).toFixed(2) : "",
      m.paystack_ref,
      m.paid_at,
      m.created_at,
      m.payment_status === "paid" ? `${SITE_URL}/portal/receipt/${m.id}` : "",
    ]
      .map(esc)
      .join(","),
  );
  const csv = "﻿" + [header.join(","), ...rows].join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="tein-uenr-members.csv"' },
  });
}
