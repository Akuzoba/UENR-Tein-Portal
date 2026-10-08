import { createHmac, timingSafeEqual } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminById, setting } from "./db";
import { can, homeFor, type Permission } from "./roles";

export const ADMIN_COOKIE = "ut_admin";
const TTL = 60 * 60 * 12; // seconds

const secret = async () => process.env.ADMIN_SECRET || (await setting("session_secret"))!;
const sign = async (payload: string) => createHmac("sha256", await secret()).update(payload).digest("hex");

/** Cookie value: "<adminId>.<expiresAt>.<hmac>" */
export async function startSession(adminId: number) {
  const payload = `${adminId}.${Math.floor(Date.now() / 1000) + TTL}`;
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TTL,
    path: "/",
  });
}

export async function endSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

// cache(): the layout and the page both ask, but it's one lookup per request.
export const currentAdmin = cache(async () => {
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, sig] = raw.split(".");
  if (!id || !exp || !sig) return null;
  const expected = Buffer.from(await sign(`${id}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const admin = await getAdminById(Number(id));
  // Deactivating an admin ends their session on the next request.
  return admin && !admin.disabled_at ? admin : null;
});

/** For pages and server actions: bounces to the login page when not signed in. */
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** True if the signed-in admin's role allows this. For route handlers, which answer with a status instead. */
export async function hasPermission(permission: Permission) {
  const admin = await currentAdmin();
  return !!admin && can(admin.role, permission);
}

/**
 * For pages and server actions: sign-in check plus a role check. An admin whose role doesn't allow this is sent
 * to their own start page, so hand-typed URLs and stale forms can't reach what the menu hides.
 */
export async function requirePermission(permission: Permission) {
  const admin = await requireAdmin();
  if (!can(admin.role, permission)) redirect(homeFor(admin.role));
  return admin;
}
