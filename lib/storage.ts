// Passport photos live in a private Supabase Storage bucket. Server-only (uses the service-role key).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PHOTO_BUCKET = "passport-photos";

const g = globalThis as unknown as { __uenrStorage?: SupabaseClient; __uenrBucket?: Promise<void> };

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.");
  return (g.__uenrStorage ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

/** Creates the private bucket on first use. */
function bucket() {
  g.__uenrBucket ??= (async () => {
    const s = supabase().storage;
    const { data } = await s.getBucket(PHOTO_BUCKET);
    if (!data) {
      const { error } = await s.createBucket(PHOTO_BUCKET, { public: false, fileSizeLimit: "3MB", allowedMimeTypes: ["image/jpeg"] });
      if (error && !/already exists/i.test(error.message)) throw error;
    }
  })().catch((e) => {
    g.__uenrBucket = undefined;
    throw e;
  });
  return g.__uenrBucket.then(() => supabase().storage.from(PHOTO_BUCKET));
}

export async function savePhoto(name: string, bytes: Buffer) {
  const { error } = await (await bucket()).upload(name, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
}

export async function readPhoto(name: string) {
  const { data, error } = await (await bucket()).download(name);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function deletePhoto(name: string) {
  await (await bucket()).remove([name]);
}

export async function photoDataUrl(name: string) {
  const buf = await readPhoto(name);
  return buf ? `data:image/jpeg;base64,${buf.toString("base64")}` : "";
}

/* ------------------------------------------------------------------ public site media */

// Activity and executive photos for the main site. This bucket is PUBLIC; passport photos never go here.
export const MEDIA_BUCKET = "site-media";
const gm = globalThis as unknown as { __uenrMedia?: Promise<void> };

function mediaBucket() {
  gm.__uenrMedia ??= (async () => {
    const s = supabase().storage;
    const { data } = await s.getBucket(MEDIA_BUCKET);
    if (!data) {
      const { error } = await s.createBucket(MEDIA_BUCKET, { public: true, fileSizeLimit: "5MB", allowedMimeTypes: ["image/jpeg"] });
      if (error && !/already exists/i.test(error.message)) throw error;
    }
  })().catch((e) => {
    gm.__uenrMedia = undefined;
    throw e;
  });
  return gm.__uenrMedia.then(() => supabase().storage.from(MEDIA_BUCKET));
}

export async function saveMedia(path: string, bytes: Buffer) {
  const { error } = await (await mediaBucket()).upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
}

export async function deleteMedia(paths: (string | null)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (list.length) await (await mediaBucket()).remove(list);
}

/** Public URL of a site photo (no request needed: the bucket is public). */
export const mediaUrl = (path: string) => `${process.env.SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;

/** JPEG files start with FF D8 FF. The register form always re-encodes to JPEG. */
export const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
