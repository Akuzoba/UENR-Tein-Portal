// Server-only data layer (Supabase Postgres). Never import this from a "use client" file.
import postgres from "postgres";
import { randomBytes } from "crypto";
import { hashPassword } from "./password";
import { DEFAULT_FEE, DEFAULT_PROGRAMS } from "./config";

export const DEFAULT_ADMIN = { username: "admin", password: process.env.ADMIN_INITIAL_PASSWORD || "Admin@123" };

export type Member = {
  id: string;
  member_no: number | null;
  name: string;
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
  must_change: number;
  failed_logins: number;
  locked_until: string | null;
  created_at: string;
};

/* ------------------------------------------------------------------ connection + schema */

// Bump when SCHEMA changes; the app applies it automatically on the next cold start.
const SCHEMA_VERSION = "3";
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
    await sql`insert into admins (username, password_hash, must_change)
              values (${DEFAULT_ADMIN.username}, ${hashPassword(DEFAULT_ADMIN.password)}, 1)
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

export type NewMember = Pick<
  Member,
  "id" | "name" | "email" | "dob" | "gender" | "program" | "period" | "program_years" | "level" | "phone" | "photo_path"
>;

/** Creates a registration, or refreshes the details of an unpaid one. */
export async function upsertMember(m: NewMember) {
  const sql = await db();
  await sql`
    insert into members ${sql(m)}
    on conflict (id) do update set name = excluded.name, email = excluded.email, dob = excluded.dob,
      gender = excluded.gender, program = excluded.program, period = excluded.period,
      program_years = excluded.program_years, level = excluded.level`;
}

export type MemberDetails = Pick<Member, "name" | "phone" | "email" | "dob" | "gender" | "program" | "period" | "program_years" | "level">;

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

/** Atomic + idempotent: safe to call from the callback page, the webhook and the admin panel at the same time. */
export async function markPaid(id: string, ref: string, amount: number, method: string) {
  const sql = await db();
  await sql`
    update members set payment_status = 'paid', payment_method = ${method}, paystack_ref = ${ref},
      amount_paid = ${amount}, paid_at = now(), member_no = nextval('member_no_seq'),
      -- Card period (same rule as yearsLeft in lib/config.ts), fixed now so later rule changes don't alter issued cards.
      valid_from = extract(year from now())::int,
      valid_to = extract(year from now())::int + greatest(1, coalesce(program_years - level, 1))
    where id = ${id} and payment_status <> 'paid'`;
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
    ? sql`and (name ilike ${like} or phone ilike ${like} or program ilike ${like} or email ilike ${like}
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

export async function listAdmins() {
  const sql = await db();
  return sql<Pick<Admin, "id" | "username" | "must_change" | "created_at">[]>`
    select id, username, must_change, created_at from admins order by id`;
}

/** Returns false if the username is taken. */
export async function createAdmin(username: string, passwordHash: string) {
  const sql = await db();
  const rows = await sql`insert into admins (username, password_hash, must_change) values (${username}, ${passwordHash}, 1)
                         on conflict do nothing returning id`;
  return rows.length > 0;
}

export async function deleteAdmin(id: number) {
  const sql = await db();
  await sql`delete from admins where id = ${id}`;
}

export async function setAdminPassword(id: number, passwordHash: string) {
  const sql = await db();
  await sql`update admins set password_hash = ${passwordHash}, must_change = 0 where id = ${id}`;
}

/** Login throttling: 5 wrong passwords lock the account for 15 minutes. */
export async function recordLogin(id: number, ok: boolean) {
  const sql = await db();
  if (ok) await sql`update admins set failed_logins = 0, locked_until = null where id = ${id}`;
  else
    // An expired lock starts a fresh count.
    await sql`
      with s as (select case when locked_until < now() then 1 else failed_logins + 1 end as fails from admins where id = ${id})
      update admins set failed_logins = s.fails,
        locked_until = case when s.fails >= 5 then now() + interval '15 minutes' else null end
      from s where admins.id = ${id}`;
}
