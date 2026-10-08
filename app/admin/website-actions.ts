"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin";
import { diff, logAudit } from "@/lib/audit";
import {
  CONTENT_KEYS,
  addActivityPhoto,
  createActivity,
  createExecutive,
  deleteActivityPhotoRow,
  deleteActivityRow,
  deleteExecutiveRow,
  getActivity,
  getActivityPhoto,
  getContent,
  getExecutive,
  makeSlug,
  saveContent,
  setActivityCover,
  updateActivity,
  updateExecutive,
  type SiteContent,
} from "@/lib/site";
import { deleteMedia, isJpeg, saveMedia } from "@/lib/storage";
import type { FormState } from "./actions";

const str = (form: FormData, k: string, max = 5000) => String(form.get(k) ?? "").trim().slice(0, max);
const refresh = () => revalidatePath("/", "layout");
const editor = async () => {
  const a = await requirePermission("website.edit");
  return { id: a.id, username: a.username };
};

/** Reads an uploaded photo (the admin pages resize to JPEG in the browser first). */
async function photoFrom(form: FormData, key: string): Promise<Buffer | null | "invalid"> {
  const f = form.get(key);
  if (!(f instanceof File) || f.size === 0) return null;
  const bytes = Buffer.from(await f.arrayBuffer());
  return isJpeg(bytes) && bytes.length <= 3 * 1024 * 1024 ? bytes : "invalid";
}

/* ------------------------------------------------------------------ site content */

export async function saveSiteContent(_: FormState, form: FormData): Promise<FormState> {
  const me = await editor();
  const c = Object.fromEntries(CONTENT_KEYS.map((k) => [k, str(form, k)])) as SiteContent;
  if (!c.tagline || !c.intro || !c.about) return { error: "Tagline, introduction and about text are required." };
  if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) return { error: "Enter a valid email address or leave it empty." };
  const changed = Object.keys(diff(await getContent(), c));
  await saveContent(c);
  // Field names only: the texts can be long, and the site itself shows the current version.
  if (changed.length) await logAudit(me, "website.content", `Updated the site content: ${changed.join(", ")}`, { details: { fields: changed } });
  refresh();
  return { ok: "Site content saved." };
}

/* ------------------------------------------------------------------ executives */

function executiveFields(form: FormData) {
  return {
    name: str(form, "name", 80),
    position: str(form, "position", 80),
    term: str(form, "term", 20) || null,
    bio: str(form, "bio", 600) || null,
    is_current: form.get("is_current") === "on",
    sort_order: Math.max(0, Math.min(999, Number(form.get("sort_order")) || 0)),
  };
}

export async function addExecutive(_: FormState, form: FormData): Promise<FormState> {
  const me = await editor();
  const e = executiveFields(form);
  if (e.name.length < 2 || e.position.length < 2) return { error: "Name and position are required." };
  const photo = await photoFrom(form, "photo");
  if (photo === "invalid") return { error: "The photo couldn't be read. Try another image." };
  const id = crypto.randomUUID();
  const photo_path = photo ? `executives/${id}-${Date.now()}.jpg` : null;
  if (photo && photo_path) await saveMedia(photo_path, photo);
  await createExecutive({ ...e, id, photo_path });
  await logAudit(me, "website.executive_added", `Added executive ${e.name} (${e.position})`, { target: { type: "executive", id } });
  refresh();
  return { ok: `${e.name} added.` };
}

export async function editExecutive(_: FormState, form: FormData): Promise<FormState> {
  const me = await editor();
  const id = str(form, "id", 64);
  const current = await getExecutive(id);
  if (!current) return { error: "This executive no longer exists." };
  const e = executiveFields(form);
  if (e.name.length < 2 || e.position.length < 2) return { error: "Name and position are required." };
  const photo = await photoFrom(form, "photo");
  if (photo === "invalid") return { error: "The photo couldn't be read. Try another image." };

  let photo_path: string | null | undefined; // undefined = keep
  if (photo) {
    photo_path = `executives/${id}-${Date.now()}.jpg`; // new name so browsers don't show a cached old photo
    await saveMedia(photo_path, photo);
  } else if (form.get("remove_photo") === "on") photo_path = null;

  await updateExecutive(id, photo_path === undefined ? e : { ...e, photo_path });
  if (photo_path !== undefined && current.photo_path) await deleteMedia([current.photo_path]).catch(() => {});
  const changes = diff(current, e);
  const fields = [...Object.keys(changes), ...(photo_path !== undefined ? ["photo"] : [])];
  if (fields.length) {
    await logAudit(me, "website.executive_updated", `Edited executive ${current.name}: ${fields.join(", ").replace(/_/g, " ")}`, {
      target: { type: "executive", id },
      details: { changes: Object.fromEntries(Object.entries(changes).filter(([k]) => k !== "bio")), bio_changed: "bio" in changes },
    });
  }
  refresh();
  return { ok: "Saved." };
}

export async function removeExecutive(form: FormData) {
  const me = await editor();
  const e = await getExecutive(str(form, "id", 64));
  if (e) {
    await deleteExecutiveRow(e.id);
    await deleteMedia([e.photo_path]).catch(() => {});
    await logAudit(me, "website.executive_removed", `Removed executive ${e.name} (${e.position})`, {
      target: { type: "executive", id: e.id },
      details: { name: e.name, position: e.position, term: e.term },
    });
    refresh();
  }
  redirect("/admin/website/executives");
}

/* ------------------------------------------------------------------ activities */

function activityFields(form: FormData) {
  const date = str(form, "happened_on", 10);
  return {
    title: str(form, "title", 120),
    happened_on: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    summary: str(form, "summary", 400) || null,
    body: str(form, "body", 20000) || null,
    published: form.get("published") === "on",
  };
}

export async function newActivity(_: FormState, form: FormData): Promise<FormState> {
  const me = await editor();
  const a = activityFields(form);
  if (a.title.length < 3) return { error: "Give the activity a title." };
  const id = crypto.randomUUID();
  // Starts hidden so a half-finished event never shows up on the site.
  await createActivity({ ...a, published: false, id, slug: makeSlug(a.title, id) });
  await logAudit(me, "website.activity_created", `Created the activity “${a.title}” (hidden)`, { target: { type: "activity", id } });
  refresh();
  redirect(`/admin/website/activities/${id}?new=1`);
}

export async function editActivity(_: FormState, form: FormData): Promise<FormState> {
  const me = await editor();
  const id = str(form, "id", 64);
  const before = await getActivity({ id });
  if (!before) return { error: "This activity no longer exists." };
  const a = activityFields(form);
  if (a.title.length < 3) return { error: "Give the activity a title." };
  await updateActivity(id, a);
  const fields = Object.keys(diff(before, a));
  if (fields.length) {
    const visibility = before.published !== a.published ? (a.published ? " and published it" : " and hid it") : "";
    await logAudit(me, "website.activity_updated", `Edited the activity “${a.title}”${visibility}`, {
      target: { type: "activity", id },
      details: { fields, published: a.published },
    });
  }
  refresh();
  return { ok: a.published ? "Saved. It's live on the website." : "Saved as hidden. Tick “Show on website” to publish it." };
}

export async function removeActivity(form: FormData) {
  const me = await editor();
  const id = str(form, "id", 64);
  const activity = await getActivity({ id });
  const paths = await deleteActivityRow(id);
  await deleteMedia(paths).catch(() => {});
  if (activity) {
    await logAudit(me, "website.activity_deleted", `Deleted the activity “${activity.title}” and its ${paths.length} photo${paths.length === 1 ? "" : "s"}`, {
      target: { type: "activity", id },
      details: { title: activity.title, happened_on: activity.happened_on, published: activity.published },
    });
  }
  refresh();
  redirect("/admin/website/activities");
}

/** Called once per photo by the uploader, so each request stays small. */
export async function uploadActivityPhoto(form: FormData): Promise<FormState> {
  await editor();
  const activityId = str(form, "activity_id", 64);
  if (!(await getActivity({ id: activityId }))) return { error: "This activity no longer exists." };
  const photo = await photoFrom(form, "photo");
  if (!photo || photo === "invalid") return { error: "A photo couldn't be read and was skipped." };
  const id = crypto.randomUUID();
  const path = `activities/${activityId}/${id}.jpg`;
  await saveMedia(path, photo);
  await addActivityPhoto({ id, activity_id: activityId, path });
  return {};
}

/** Called once after a batch, so the log gets one entry per upload rather than one per photo. */
export async function finishUpload(activityId: string, uploaded: number) {
  const me = await editor();
  const activity = typeof activityId === "string" ? await getActivity({ id: activityId }) : undefined;
  if (activity && Number.isInteger(uploaded) && uploaded > 0) {
    await logAudit(me, "website.photos_uploaded", `Uploaded ${uploaded} photo${uploaded === 1 ? "" : "s"} to “${activity.title}”`, {
      target: { type: "activity", id: activity.id },
      details: { count: uploaded },
    });
  }
  refresh();
}

export async function removeActivityPhoto(form: FormData) {
  const me = await editor();
  const p = await deleteActivityPhotoRow(str(form, "id", 64));
  if (p) {
    await deleteMedia([p.path]).catch(() => {});
    const activity = await getActivity({ id: p.activity_id });
    await logAudit(me, "website.photo_removed", `Removed a photo from “${activity?.title ?? "an activity"}”`, {
      target: { type: "activity", id: p.activity_id },
    });
  }
  refresh();
}

export async function makeCover(form: FormData) {
  await editor();
  const p = await getActivityPhoto(str(form, "id", 64));
  if (p) await setActivityCover(p.activity_id, p.path);
  refresh();
}
