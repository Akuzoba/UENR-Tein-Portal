// Activity log: an append-only record of critical admin and payment events (table audit_log, see lib/db.ts).
import { headers } from "next/headers";
import { db } from "./db";

/** Who did it: an admin (id null for an unknown username at sign-in), or the system (payment confirmations). */
export type Actor = { id: number | null; username: string } | "system";

/** Action names are "<category>.<what>"; the category drives the log filter. */
export const CATEGORIES = {
  auth: "Sign-ins",
  admin: "Admin accounts",
  member: "Members",
  card: "Cards",
  payment: "Payments",
  settings: "Settings",
  website: "Website",
} as const;
export type Category = keyof typeof CATEGORIES;

export type AuditEntry = {
  id: string; // bigint comes back as a string
  at: string;
  admin_id: number | null;
  actor: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  ip: string | null;
};

/** Before/after pairs for the fields that changed, e.g. { name: ["Kofi", "Kofi Mensah"] }. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const out: Record<string, [unknown, unknown]> = {};
  for (const k of Object.keys(after)) {
    const a = before[k] ?? null;
    const b = after[k] ?? null;
    if (String(a) !== String(b)) out[k] = [a, b];
  }
  return out;
}

async function clientIp() {
  try {
    const h = await headers();
    return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim().slice(0, 64) || null;
  } catch {
    return null; // outside a request
  }
}

/**
 * Records one event. Logging never blocks the action it describes: a failed write is reported to the server
 * log instead, so a database hiccup can't stop a payment from being confirmed.
 */
export async function logAudit(
  actor: Actor,
  action: `${Category}.${string}`,
  summary: string,
  opts: { target?: { type: string; id: string }; details?: Record<string, unknown> } = {},
) {
  try {
    const sql = await db();
    await sql`
      insert into audit_log (admin_id, actor, action, target_type, target_id, summary, details, ip)
      values (${actor === "system" ? null : actor.id}, ${actor === "system" ? "system" : actor.username}, ${action},
              ${opts.target?.type ?? null}, ${opts.target?.id ?? null}, ${summary.slice(0, 500)},
              ${opts.details ? sql.json(opts.details as Parameters<typeof sql.json>[0]) : null}, ${await clientIp()})`;
  } catch (e) {
    console.error("audit log write failed", action, e);
  }
}

export type AuditFilter = { actor?: string; category?: string; from?: string; to?: string; q?: string; before?: string };

export const PAGE_SIZE = 100;

/** Newest first, PAGE_SIZE at a time; pass the last id as `before` for the next page. */
export async function listAudit({ actor, category, from, to, q, before }: AuditFilter = {}) {
  const sql = await db();
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const like = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const f = date(from);
  const t = date(to);
  return sql<AuditEntry[]>`
    select * from audit_log where true
      ${actor ? sql`and actor = ${actor}` : sql``}
      ${category && category in CATEGORIES ? sql`and split_part(action, '.', 1) = ${category}` : sql``}
      ${f ? sql`and at >= ${f}::date` : sql``}
      ${t ? sql`and at < ${t}::date + 1` : sql``}
      ${like ? sql`and (summary ilike ${like} or target_id ilike ${like} or action ilike ${like})` : sql``}
      ${before && /^\d+$/.test(before) ? sql`and id < ${before}` : sql``}
    order by id desc limit ${PAGE_SIZE}`;
}

/** Everyone who appears in the log, for the filter menu. */
export async function auditActors() {
  const sql = await db();
  const rows = await sql<{ actor: string }[]>`select distinct actor from audit_log order by actor`;
  return rows.map((r) => r.actor);
}

/** One record's history, e.g. a member's: registered, edited, paid, printed. */
export async function auditFor(type: string, id: string, limit = 50) {
  const sql = await db();
  return sql<AuditEntry[]>`
    select * from audit_log where target_type = ${type} and target_id = ${id} order by id desc limit ${limit}`;
}
