// Main-site content: editable text, executives and activities. Server-only.
import { db, setSetting, setting } from "./db";
import { mediaUrl } from "./storage";

/* ------------------------------------------------------------------ editable text */

export type SiteContent = {
  tagline: string;
  intro: string;
  about: string;
  mission: string;
  vision: string;
  phone: string;
  whatsapp: string;
  email: string;
  location: string;
  facebook: string;
  instagram: string;
  x: string;
  tiktok: string;
};

// Starting text only; executives replace it in Admin → Website → Site content.
export const DEFAULT_CONTENT: SiteContent = {
  tagline: "Students for unity, stability and development.",
  intro:
    "TEIN UENR is the NDC's student network at the University of Energy and Natural Resources. We organise, educate and give students a voice.",
  about:
    "TEIN UENR is the University of Energy and Natural Resources branch of the Tertiary Education Institutions Network (TEIN), the student wing of the National Democratic Congress (NDC) in Ghana's tertiary institutions.\n\nWe bring together students who share the NDC's ideals of unity, stability and development. Through meetings, political education, outreach and campus activities, we help students understand national issues, take part in them, and grow as leaders.",
  mission:
    "To mobilise and educate students at UENR around the ideals of the NDC, and to build a generation of informed, responsible and active young leaders.",
  vision: "A campus where every student is informed, engaged and confident to contribute to Ghana's development.",
  phone: "",
  whatsapp: "",
  email: "",
  location: "University of Energy and Natural Resources, Sunyani, Bono Region",
  facebook: "",
  instagram: "",
  x: "",
  tiktok: "",
};

export const CONTENT_KEYS = Object.keys(DEFAULT_CONTENT) as (keyof SiteContent)[];

export async function getContent(): Promise<SiteContent> {
  let saved: Partial<SiteContent> = {};
  try {
    saved = JSON.parse((await setting("site_content")) ?? "{}");
  } catch {}
  return { ...DEFAULT_CONTENT, ...saved };
}

export const saveContent = (c: SiteContent) => setSetting("site_content", JSON.stringify(c));

/** Splits stored text into paragraphs on blank lines. */
export const paragraphs = (text: string | null | undefined) =>
  (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/* ------------------------------------------------------------------ executives */

export type Executive = {
  id: string;
  name: string;
  position: string;
  bio: string | null;
  photo_path: string | null;
  term: string | null;
  is_current: boolean;
  sort_order: number;
  created_at: string;
};

export type ExecutiveInput = Pick<Executive, "name" | "position" | "bio" | "term" | "is_current" | "sort_order">;

export const photoOf = (e: { photo_path: string | null }) => (e.photo_path ? mediaUrl(e.photo_path) : null);

export async function listExecutives() {
  const sql = await db();
  return sql<Executive[]>`select * from executives order by is_current desc, term desc nulls last, sort_order, name`;
}

export async function getExecutive(id: string) {
  if (!id || id.length > 64) return undefined;
  const sql = await db();
  const [e] = await sql<Executive[]>`select * from executives where id = ${id}`;
  return e;
}

export async function createExecutive(e: ExecutiveInput & { id: string; photo_path: string | null }) {
  const sql = await db();
  await sql`insert into executives ${sql(e)}`;
}

export async function updateExecutive(id: string, e: ExecutiveInput & { photo_path?: string | null }) {
  const sql = await db();
  await sql`update executives set ${sql(e)} where id = ${id}`;
}

export async function deleteExecutiveRow(id: string) {
  const sql = await db();
  await sql`delete from executives where id = ${id}`;
}

/* ------------------------------------------------------------------ activities */

export type Activity = {
  id: string;
  slug: string;
  title: string;
  happened_on: string | null;
  summary: string | null;
  body: string | null;
  cover_path: string | null;
  published: boolean;
  created_at: string;
};

export type ActivityWithCover = Activity & { cover: string | null; photo_count: number };
export type ActivityPhoto = { id: string; activity_id: string; path: string; sort_order: number; created_at: string };

export type ActivityInput = Pick<Activity, "title" | "happened_on" | "summary" | "body" | "published">;

/** URL-friendly slug with a short suffix so two events can share a title. */
export function makeSlug(title: string, id: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "activity"}-${id.slice(0, 6)}`;
}

/** Cover: the chosen photo, else the first one uploaded. */
const withCover = (rows: (Activity & { first_path: string | null; photo_count: number })[]): ActivityWithCover[] =>
  rows.map(({ first_path, ...a }) => {
    const path = a.cover_path ?? first_path;
    return { ...a, cover: path ? mediaUrl(path) : null };
  });

export async function listActivities({ publishedOnly = true, limit = 500 } = {}) {
  const sql = await db();
  const rows = await sql<(Activity & { first_path: string | null; photo_count: number })[]>`
    select a.*,
      (select p.path from activity_photos p where p.activity_id = a.id order by p.sort_order, p.created_at limit 1) as first_path,
      (select count(*)::int from activity_photos p where p.activity_id = a.id) as photo_count
    from activities a
    where ${publishedOnly ? sql`a.published` : sql`true`}
    order by a.happened_on desc nulls last, a.created_at desc
    limit ${limit}`;
  return withCover(rows);
}

export async function getActivity(by: { id?: string; slug?: string }) {
  const sql = await db();
  const [a] = by.id
    ? await sql<Activity[]>`select * from activities where id = ${by.id}`
    : await sql<Activity[]>`select * from activities where slug = ${by.slug ?? ""}`;
  return a;
}

export async function activityPhotos(activityId: string) {
  const sql = await db();
  const rows = await sql<ActivityPhoto[]>`
    select * from activity_photos where activity_id = ${activityId} order by sort_order, created_at`;
  return rows.map((p) => ({ ...p, url: mediaUrl(p.path) }));
}

export async function createActivity(a: ActivityInput & { id: string; slug: string }) {
  const sql = await db();
  await sql`insert into activities ${sql(a)}`;
}

export async function updateActivity(id: string, a: ActivityInput) {
  const sql = await db();
  await sql`update activities set ${sql(a)} where id = ${id}`;
}

/** Returns the storage paths of the deleted activity's photos so they can be removed from storage. */
export async function deleteActivityRow(id: string) {
  const sql = await db();
  const photos = await sql<{ path: string }[]>`select path from activity_photos where activity_id = ${id}`;
  await sql`delete from activities where id = ${id}`; // photos cascade
  return photos.map((p) => p.path);
}

export async function addActivityPhoto(p: { id: string; activity_id: string; path: string }) {
  const sql = await db();
  await sql`insert into activity_photos ${sql({ ...p, sort_order: 0 })}`;
}

export async function getActivityPhoto(id: string) {
  const sql = await db();
  const [p] = await sql<ActivityPhoto[]>`select * from activity_photos where id = ${id}`;
  return p;
}

export async function deleteActivityPhotoRow(id: string) {
  const sql = await db();
  const [p] = await sql<ActivityPhoto[]>`delete from activity_photos where id = ${id} returning *`;
  // A deleted cover falls back to the first remaining photo.
  if (p) await sql`update activities set cover_path = null where id = ${p.activity_id} and cover_path = ${p.path}`;
  return p;
}

export async function setActivityCover(activityId: string, path: string) {
  const sql = await db();
  await sql`update activities set cover_path = ${path} where id = ${activityId}`;
}

export type ShowcasePhoto = { url: string; title: string; slug: string };

/**
 * Paid member count plus recent published photos for the home page's 3D ring, in one round trip.
 * Photos are interleaved across events (each event's first photo, then each one's second...).
 */
export async function homeStats(photoLimit = 10) {
  const sql = await db();
  const [r] = await sql<{ members: number; photos: { path: string; title: string; slug: string }[] }[]>`
    select (select count(*)::int from members where payment_status = 'paid') as members,
           coalesce((
             select json_agg(x) from (
               select p.path, a.title, a.slug,
                 row_number() over (partition by a.id order by coalesce(p.path = a.cover_path, false) desc, p.sort_order, p.created_at) as n,
                 a.happened_on, a.created_at
               from activity_photos p join activities a on a.id = p.activity_id
               where a.published
               order by n, a.happened_on desc nulls last, a.created_at desc
               limit ${photoLimit}
             ) x
           ), '[]'::json) as photos`;
  return {
    members: r.members,
    photos: r.photos.map((p): ShowcasePhoto => ({ url: mediaUrl(p.path), title: p.title, slug: p.slug })),
  };
}
