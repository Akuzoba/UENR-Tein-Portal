// Starting programme list. Once an admin adds or removes one in Settings, the saved list is used instead.
export const DEFAULT_PROGRAMS = [
  "Diploma in Education",
  "Bachelor of Education",
  "Business Administration",
  "Information Technology",
  "Nursing",
  "Other",
];

// Study mode (stored in the members.period column; not printed on the card).
export const PERIODS = ["Regular", "Evening", "Weekend", "Sandwich"];

// Programme types and their length in years. "Other" lets the student pick the total years themselves.
export const PROGRAM_TYPES = [
  { label: "Degree", years: 4 },
  { label: "Diploma", years: 2 },
  { label: "Other", years: null },
] as const;
export const PROGRAM_YEAR_OPTIONS = [2, 3, 4, 5, 6];

export const GENDERS = ["Male", "Female"];

// Public address of the main site. On Vercel it falls back to the production domain.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/*
 * The membership portal (registration, receipts, payments, card verification, admin) can run on its own domain,
 * e.g. NEXT_PUBLIC_PORTAL_URL=https://portal.uenr-tein.org with NEXT_PUBLIC_SITE_URL=https://uenr-tein.org.
 * There, /portal/register is served as /register and so on (see proxy.ts). Without it, the portal stays under
 * /portal on the main site. Code always names portal pages by their app path ("/portal/register", "/verify/<id>")
 * and lets these helpers turn that into the right address.
 */
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL?.replace(/\/$/, "") || null;
const MAIN_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || null;

/** "/portal/register" → "/register", "/portal" → "/", "/portal#faq" → "/#faq"; other paths are unchanged. */
export function portalPath(path: string) {
  if (!/^\/portal(?=$|[/?#])/.test(path)) return path;
  const rest = path.slice("/portal".length);
  return rest.startsWith("/") ? rest : `/${rest}`;
}

/** Link to a portal page: absolute on the portal domain when it has one, else the plain path. */
export const portalHref = (path: string) => (PORTAL_URL ? PORTAL_URL + portalPath(path) : path);

/** Full address of a portal page, for QR codes, payment callbacks and copied links. */
export const portalUrl = (path: string) => (PORTAL_URL ? PORTAL_URL + portalPath(path) : SITE_URL + path);

/** Link to a main-site page from anywhere, including the portal domain. */
export const mainHref = (path: string) => (PORTAL_URL && MAIN_URL ? MAIN_URL + path : path);
export const CURRENCY = process.env.PAYSTACK_CURRENCY || "GHS";
// Starting membership fee in major units (e.g. GHS). After that, admins set it in Settings.
export const DEFAULT_FEE = Number(process.env.MEMBERSHIP_FEE || 20);

// Printed on the card. The region code is fixed; the rest of the number format can change freely.
export const INSTITUTION = "UENR";
const REGION = "BR";

/** Membership number, e.g. BR/UENR/26/0000001 (two-digit year of payment + running number). */
export function memberCode(no: number, paidAt?: string | null) {
  const year = paidAt ? new Date(paidAt).getFullYear() : new Date().getFullYear();
  return `${REGION}/${INSTITUTION}/${String(year % 100).padStart(2, "0")}/${String(no).padStart(7, "0")}`;
}

/** Same as memberCode, safe to use in file names. */
export const memberCodeFile = (code: string) => code.replace(/\//g, "-");

/**
 * How many years the card runs past the year of payment: the years left in the programme,
 * and at least one so final-year students are covered until they graduate.
 * Level is 1 for Level 100, 2 for Level 200, and so on.
 * Keep in sync with markPaid / updateMemberDetails in lib/db.ts, which apply the same rule in SQL.
 */
export const yearsLeft = (programYears: number, level: number) => Math.max(1, programYears - level);

/** Card period as [from, to] years. Older records without the stored years fall back to one year from payment. */
export function cardPeriod(m: { valid_from: number | null; valid_to: number | null; paid_at: string | null }): [number, number] {
  const from = m.valid_from ?? new Date(m.paid_at ?? Date.now()).getFullYear();
  return [from, m.valid_to ?? from + 1];
}

export const fmtPeriod = ([from, to]: [number, number]) => `${from}-${to}`;

/** Cards stay valid until the end of the last year of the period. */
export const periodExpired = ([, to]: [number, number]) => new Date() > new Date(Date.UTC(to, 11, 31, 23, 59, 59));

export const levelLabel = (level: number | null) => (level ? `Level ${level * 100}` : "—");

export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtMoney = (minor: number) => `${CURRENCY} ${(minor / 100).toFixed(2)}`;

export const fmtDateTime = (d: string | Date) =>
  new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function receiptNo(no: number, paidAt?: string | null) {
  const year = paidAt ? new Date(paidAt).getFullYear() : new Date().getFullYear();
  return `RCPT-${year}-${String(no).padStart(4, "0")}`;
}

/**
 * payment_method is stored as "<source>" or "<source>:<channel>",
 * e.g. "paystack:mobile_money", "test:card", "manual".
 */
export function methodLabel(method: string | null) {
  if (!method) return "—";
  const [source, channel] = method.split(":");
  const how = channel === "mobile_money" || channel === "momo" ? "Mobile Money" : channel === "card" ? "Card" : channel ? channel.replace(/_/g, " ") : "";
  if (source === "manual") return "Cash (recorded by executive)";
  if (source === "test") return `${how || "Paystack"} (test payment)`;
  return how ? `${how} via Paystack` : "Paystack";
}
