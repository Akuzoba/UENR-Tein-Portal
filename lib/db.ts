// Server-only data layer (Supabase Postgres). Never import this from a "use client" file.
import postgres from "postgres";
import { randomBytes } from "crypto";
import { hashPassword } from "./password";
import { DEFAULT_FEE, DEFAULT_PROGRAMS } from "./config";
import type { Role } from "./roles";

export const DEFAULT_ADMIN = { username: "admin", password: process.env.ADMIN_INITIAL_PASSWORD || "Admin@123" };

export type Member = {
  id: string;
  member_no: number | null;
  name: string;
  student_id: string | null; // reference or index number, normalised (see normalizeStudentId)
  email: string | null;
  dob: string | null; // YYYY-MM-DD
  gender: string | null;
  program: string | null;
  period: string; // study mode: Regular, Evening, ...
  program_years: number | null; // total length of the programme
  level: number | null; // 1 = Level 100, 2 = Level 200, ...
  valid_from: number | null; // card period, fixed when payment clears
  valid_to: number | null;
  phone: string;
  photo_path: string;
  payment_status: "pending" | "paid";
  payment_method: string | null; // paystack[:channel] | test[:channel] | manual
  paystack_ref: string | null;
  due_amount: number | null; // minor units; the fee quoted when they last started a payment
  amount_paid: number | null; // minor units (pesewas)
  paid_at: string | null; // ISO
  created_at: string; // ISO
};

export type Admin = {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  must_change: number;
  failed_logins: number;
  locked_until: string | null;
  disabled_at: string | null; // deactivated admins can't sign in; their history stays
  last_login_at: string | null;
  created_at: string;
};

/* ------------------------------------------------------------------ connection + schema */

// Bump when SCHEMA changes; the app applies it automatically on the next cold start.
const SCHEMA_VERSION = "5";
const SCHEMA = `
create sequence if not exists member_no_seq;
create table if not exists members (
  id text primary key,
  member_no integer unique,
  name text not null,
  email text,
  dob text,
  gender text,
  program text,
  period text not null,
  phone text not null unique,
  photo_path text not null,
  payment_status text not null default 'pending',
  payment_method text,
  paystack_ref text,
  due_amount integer,
  amount_paid integer,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists members_created_at_idx on members (created_at desc);
create table if not exists admins (
  id serial primary key,
  username text not null,
  password_hash text not null,
  must_change integer not null default 0,
  failed_logins integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists admins_username_idx on admins (lower(username));
create table if not exists settings (key text primary key, value text not null);
-- Only the server (owner role) touches these tables; RLS with no policies blocks Supabase's public API.
alter table members enable row level security;
alter table admins enable row level security;
alter table settings enable row level security;
-- v2: year of study and the card period it produces
alter table members add column if not exists program_years integer;
alter table members add column if not exists level integer;
alter table members add column if not exists valid_from integer;
alter table members add column if not exists valid_to integer;
-- v3: main site content (see lib/site.ts)
create table if not exists executives (
  id text primary key,
  name text not null,
  position text not null,
  bio text,
  photo_path text,
  term text,
  is_current boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists activities (
  id text primary key,
  slug text not null unique,
  title text not null,
  happened_on text, -- YYYY-MM-DD
  summary text,
  body text,
  cover_path text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists activity_photos (
  id text primary key,
  activity_id text not null references activities(id) on delete cascade,
  path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists activity_photos_activity_idx on activity_photos (activity_id, sort_order, created_at);
alter table executives enable row level security;
alter table activities enable row level security;
alter table activity_photos enable row level security;
-- v4: admin roles (see lib/roles.ts) and the activity log.
-- Admins that existed before roles keep full access: they become super admins.
alter table admins add column if not exists role text not null default 'super_admin';
alter table admins alter column role set default 'membership';
alter table admins drop constraint if exists admins_role_check;
alter table admins add constraint admins_role_check check (role in ('super_admin', 'finance', 'membership', 'content'));
alter table admins add column if not exists disabled_at timestamptz;
alter table admins add column if not exists last_login_at timestamptz;
create table if not exists audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  admin_id integer, -- null for the system (payment gateways) and unknown usernames
  actor text not null, -- username at the time, so the entry survives renames and deactivation
  action text not null, -- e.g. member.updated, see lib/audit.ts
  target_type text,
  target_id text,
  summary text not null,
  details jsonb,
  ip text
);
create index if not exists audit_log_at_idx on audit_log (at desc);
create index if not exists audit_log_target_idx on audit_log (target_type, target_id, at desc);
alter table audit_log enable row level security;
-- Append-only: entries can't be edited or removed, not even by the app.
create or replace function audit_log_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;
drop trigger if exists audit_log_no_change on audit_log;
create trigger audit_log_no_change before update or delete on audit_log for each row execute function audit_log_append_only();
drop trigger if exists audit_log_no_truncate on audit_log;
create trigger audit_log_no_truncate before truncate on audit_log for each statement execute function audit_log_append_only();
-- v5: student number (reference or index number, see isStudentId in lib/config.ts). Optional for members who
-- registered before it existed; one member per number.
alter table members add column if not exists student_id text;
create unique index if not exists members_student_id_idx on members (student_id) where student_id is not null;
`;

type Sql = postgres.Sql;
const g = globalThis as unknown as { __uenrSql?: Sql; __uenrReady?: Promise<void> };

function client(): Sql {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set. Add your Supabase connection string to .env.local.");
  return (g.__uenrSql ??= postgres(process.env.DATABASE_URL, {
    prepare: false, // required by Supabase's transaction pooler (port 6543)
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    // Hand timestamps back as ISO strings, the shape the rest of the app expects.
    transform: { value: { from: (v: unknown) => (v instanceof Date ? v.toISOString() : v) } },
  }));
}

async function migrate(sql: Sql) {
  const [{ exists }] = await sql<{ exists: boolean }[]>`select to_regclass('public.settings') is not null as exists`;
  const current = exists ? (await sql<{ value: string }[]>`select value from settings where key = 'schema_version'`)[0]?.value : undefined;
  if (current !== SCHEMA_VERSION) {
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(724519)`; // one instance migrates at a time
      await tx.unsafe(SCHEMA);
      await tx`insert into settings (key, value) values ('schema_version', ${SCHEMA_VERSION})
               on conflict (key) do update set value = excluded.value`;
    });
  }
  // First run: create the default admin so there is always a way in, and a session-signing secret.
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from admins`;
  if (n === 0) {
    await sql`insert into admins (username, password_hash, must_change, role)
              values (${DEFAULT_ADMIN.username}, ${hashPassword(DEFAULT_ADMIN.password)}, 1, 'super_admin')
              on conflict do nothing`;
  }
  await sql`insert into settings (key, value) values ('session_secret', ${randomBytes(32).toString("hex")})
            on conflict (key) do nothing`;
}

/** Ready-to-use query function; the schema is ensured once per server instance. */
export async function db(): Promise<Sql> {
  const sql = client();
  g.__uenrReady ??= migrate(sql).catch((e) => {
    g.__uenrReady = undefined; // retry on the next request
    throw e;
  });
  await g.__uenrReady;
  return sql;
}

/* ------------------------------------------------------------------ settings */

export async function setting(key: string) {
  const sql = await db();
  const [row] = await sql<{ value: string }[]>`select value from settings where key = ${key}`;
  return row?.value;
}

export async function setSetting(key: string, value: string) {
  const sql = await db();
  await sql`insert into settings (key, value) values (${key}, ${value}) on conflict (key) do update set value = excluded.value`;
}

/** Current membership fee in minor units (pesewas). Admins change it in Settings. */
export async function getFeeMinor() {
  const v = Number(await setting("fee_minor"));
  return Number.isFinite(v) && v > 0 ? v : Math.round(DEFAULT_FEE * 100);
}

export const setFeeMinor = (minor: number) => setSetting("fee_minor", String(minor));

/** Who signs the back of the card. The signature is a small image stored as a data URL. */
export type Signatory = { name: string; title: string; signature: string };
export const DEFAULT_SIGNATORY = { name: "Ahmed Rashid", title: "Bono Regional Youth Organizer" };

export async function getSignatory(): Promise<Signatory> {
  const sql = await db();
  const rows = await sql<{ key: string; value: string }[]>`
    select key, value from settings where key in ('signatory_name', 'signatory_title', 'signatory_signature')`;
  const v = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    name: v.signatory_name || DEFAULT_SIGNATORY.name,
    title: v.signatory_title || DEFAULT_SIGNATORY.title,
    signature: v.signatory_signature || "",
  };
}

export async function setSignatory(name: string, title: string, signature?: string) {
  await setSetting("signatory_name", name);
  await setSetting("signatory_title", title);
  if (signature !== undefined) await setSetting("signatory_signature", signature);
}

/** Programme options for registration, A–Z with "Other" last. Admins manage them in Settings. */
export async function getPrograms(): Promise<string[]> {
  try {
    const list = JSON.parse((await setting("programs")) ?? "null");
    if (Array.isArray(list)) return list.filter((p): p is string => typeof p === "string");
  } catch {}
  return DEFAULT_PROGRAMS;
}

export const setPrograms = (list: string[]) =>
  setSetting(
    "programs",
    JSON.stringify(
      [...list].sort((a, b) => Number(a === "Other") - Number(b === "Other") || a.localeCompare(b, "en", { sensitivity: "base" })),
    ),
  );

/* ------------------------------------------------------------------ members */

export async function getMember(id: string) {
  if (!id || id.length > 64) return undefined;
  const sql = await db();
  const [m] = await sql<Member[]>`select * from members where id = ${id}`;
  return m;
}

export async function findMemberByPhone(phone: string) {
  const sql = await db();
  const [m] = await sql<Pick<Member, "id" | "payment_status">[]>`select id, payment_status from members where phone = ${phone}`;
  return m;
}

export async function findMemberByStudentId(studentId: string) {
  const sql = await db();
  const [m] = await sql<Pick<Member, "id" | "payment_status">[]>`select id, payment_status from members where student_id = ${studentId}`;
  return m;
}

/** Frees a student number held by an unpaid registration, so the student can register again from another phone. */
export async function releaseStudentId(memberId: string) {
  const sql = await db();
  await sql`update members set student_id = null where id = ${memberId} and payment_status <> 'paid'`;
}

/** True when a database error is the one-member-per-student-number rule. */
export const isStudentIdTaken = (e: unknown) =>
  (e as { code?: string; constraint_name?: string })?.code === "23505" &&
  (e as { constraint_name?: string }).constraint_name === "members_student_id_idx";

export type NewMember = Pick<
  Member,
  "id" | "name" | "student_id" | "email" | "dob" | "gender" | "program" | "period" | "program_years" | "level" | "phone" | "photo_path"
>;

/** Creates a registration, or refreshes the details of an unpaid one. */
export async function upsertMember(m: NewMember) {
  const sql = await db();
  await sql`
    insert into members ${sql(m)}
    on conflict (id) do update set name = excluded.name, student_id = excluded.student_id, email = excluded.email, dob = excluded.dob,
      gender = excluded.gender, program = excluded.program, period = excluded.period,
      program_years = excluded.program_years, level = excluded.level`;
}

export type MemberDetails = Pick<Member, "name" | "student_id" | "phone" | "email" | "dob" | "gender" | "program" | "period" | "program_years" | "level">;

/** Saves edited details. For a paid member, the card end year follows the corrected programme length / level. */
export async function updateMemberDetails(id: string, d: MemberDetails) {
  const sql = await db();
  await sql`update members set ${sql(d)} where id = ${id}`;
  await sql`update members set valid_to = valid_from + greatest(1, coalesce(program_years - level, 1))
            where id = ${id} and valid_from is not null`;
}

export async function deleteMemberRow(id: string) {
  const sql = await db();
  await sql`delete from members where id = ${id}`;
}

/** Records the amount a member is being asked to pay, so verification checks against what they were quoted. */
export async function setDue(id: string, minor: number) {
  const sql = await db();
  await sql`update members set due_amount = ${minor} where id = ${id} and payment_status = 'pending'`;
}

/**
 * Atomic + idempotent: safe to call from the callback page, the webhook and the admin panel at the same time.
 * Returns true only for the call that actually marked the member paid, so callers log it once.
 */
export async function markPaid(id: string, ref: string, amount: number, method: string) {
  const sql = await db();
  const rows = await sql`
    update members set payment_status = 'paid', payment_method = ${method}, paystack_ref = ${ref},
      amount_paid = ${amount}, paid_at = now(), member_no = nextval('member_no_seq'),
      -- Card period (same rule as yearsLeft in lib/config.ts), fixed now so later rule changes don't alter issued cards.
      valid_from = extract(year from now())::int,
      valid_to = extract(year from now())::int + greatest(1, coalesce(program_years - level, 1))
    where id = ${id} and payment_status <> 'paid'
    returning id`;
  return rows.length > 0;
}

export type MemberFilter = { q?: string; status?: string; limit?: number };

export async function listMembers({ q, status, limit = 5000 }: MemberFilter = {}) {
  const sql = await db();
  const byStatus = status === "paid" || status === "pending" ? sql`and payment_status = ${status}` : sql``;
  const esc = (v: string) => `%${v.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const like = esc(q ?? "");
  // A full membership number (BR/UENR/26/0000076) matches on its running number.
  const numLike = esc((q ?? "").split("/").pop()!);
  const bySearch = q
    ? sql`and (name ilike ${like} or phone ilike ${like} or program ilike ${like} or email ilike ${like} or student_id ilike ${like}
              or lpad(member_no::text, 7, '0') like ${numLike})`
    : sql``;
  return sql<Member[]>`select * from members where true ${byStatus} ${bySearch} order by created_at desc limit ${limit}`;
}

export async function countPaid() {
  const sql = await db();
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from members where payment_status = 'paid'`;
  return n;
}

export async function memberTotals() {
  const sql = await db();
  const [t] = await sql<{ total: number; paid: number; revenue: number; today: number; week: number }[]>`
    select count(*)::int as total,
           count(*) filter (where payment_status = 'paid')::int as paid,
           coalesce(sum(amount_paid) filter (where payment_status = 'paid'), 0)::int as revenue,
           count(*) filter (where created_at >= date_trunc('day', now()))::int as today,
           count(*) filter (where created_at >= now() - interval '7 days')::int as week
    from members`;
  return t;
}

export async function registrationsPerDay(days: number) {
  const sql = await db();
  return sql<{ d: string; total: number; paid: number }[]>`
    select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as d, count(*)::int as total,
           count(*) filter (where payment_status = 'paid')::int as paid
    from members where created_at >= date_trunc('day', now()) - make_interval(days => ${days - 1})
    group by 1`;
}

export async function membersByProgram(limit = 6) {
  const sql = await db();
  return sql<{ label: string; value: number }[]>`
    select coalesce(program, 'Not specified') as label, count(*)::int as value
    from members group by 1 order by 2 desc limit ${limit}`;
}

/* ------------------------------------------------------------------ admins */

export async function getAdminByUsername(username: string) {
  const sql = await db();
  const [a] = await sql<Admin[]>`select * from admins where lower(username) = lower(${username})`;
  return a;
}

export async function getAdminById(id: number) {
  if (!Number.isInteger(id)) return undefined;
  const sql = await db();
  const [a] = await sql<Admin[]>`select * from admins where id = ${id}`;
  return a;
}

export type AdminSummary = Pick<Admin, "id" | "username" | "role" | "must_change" | "disabled_at" | "last_login_at" | "created_at">;

/** Active admins first, then deactivated ones. */
export async function listAdmins() {
  const sql = await db();
  return sql<AdminSummary[]>`
    select id, username, role, must_change, disabled_at, last_login_at, created_at from admins
    order by disabled_at is not null, id`;
}

/** Returns the new admin's id, or null if the username is taken. */
export async function createAdmin(username: string, passwordHash: string, role: Role) {
  const sql = await db();
  const [row] = await sql<{ id: number }[]>`
    insert into admins (username, password_hash, must_change, role) values (${username}, ${passwordHash}, 1, ${role})
    on conflict do nothing returning id`;
  return row?.id ?? null;
}

/**
 * Changes an admin's role and/or deactivates or reactivates them. Refuses ("last_super") when the change would
 * leave no active super admin, so nobody can lock everyone out of admin management.
 */
export async function changeAdmin(id: number, patch: { role?: Role; disabled?: boolean }) {
  const sql = await db();
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(724520)`; // two super admins demoting each other at once
    const [before] = await tx<Admin[]>`select * from admins where id = ${id}`;
    if (!before) return { result: "not_found" as const };
    const role = patch.role ?? before.role;
    const disabled = patch.disabled ?? before.disabled_at !== null;
    const wasActiveSuper = before.role === "super_admin" && before.disabled_at === null;
    if (wasActiveSuper && (role !== "super_admin" || disabled)) {
      const [{ n }] = await tx<{ n: number }[]>`
        select count(*)::int as n from admins where role = 'super_admin' and disabled_at is null and id <> ${id}`;
      if (n === 0) return { result: "last_super" as const, before };
    }
    await tx`update admins set role = ${role},
               disabled_at = case when ${disabled} then coalesce(disabled_at, now()) else null end,
               failed_logins = case when ${disabled} then failed_logins else 0 end,
               locked_until = case when ${disabled} then locked_until else null end
             where id = ${id}`;
    return { result: "ok" as const, before };
  });
}

export async function setAdminPassword(id: number, passwordHash: string) {
  const sql = await db();
  await sql`update admins set password_hash = ${passwordHash}, must_change = 0 where id = ${id}`;
}

/**
 * Login throttling: 5 wrong passwords lock the account for 15 minutes.
 * Returns true when this wrong password is the one that locked the account.
 */
export async function recordLogin(id: number, ok: boolean) {
  const sql = await db();
  if (ok) {
    await sql`update admins set failed_logins = 0, locked_until = null, last_login_at = now() where id = ${id}`;
    return false;
  }
  // An expired lock starts a fresh count.
  const [row] = await sql<{ fails: number }[]>`
    with s as (select case when locked_until < now() then 1 else failed_logins + 1 end as fails from admins where id = ${id})
    update admins set failed_logins = s.fails,
      locked_until = case when s.fails >= 5 then now() + interval '15 minutes' else null end
    from s where admins.id = ${id}
    returning s.fails`;
  return row?.fails === 5;
}
