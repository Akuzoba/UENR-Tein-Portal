"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { endSession, requireAdmin, startSession } from "@/lib/admin";
import {
  createAdmin,
  deleteAdmin,
  deleteMemberRow,
  getAdminByUsername,
  getFeeMinor,
  getMember,
  markPaid,
  recordLogin,
  setAdminPassword,
  setFeeMinor,
  setSignatory,
  updateMemberDetails,
} from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { deletePhoto } from "@/lib/storage";

export type FormState = { error?: string; ok?: string };

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const admin = await getAdminByUsername(username);
  if (admin?.locked_until && new Date(admin.locked_until) > new Date()) {
    return { error: "Too many wrong attempts. This account is locked for 15 minutes." };
  }
  const ok = !!admin && verifyPassword(password, admin.password_hash);
  if (admin) await recordLogin(admin.id, ok);
  if (!ok) return { error: "Wrong username or password." };
  await startSession(admin.id);
  redirect(admin.must_change ? "/admin/settings?welcome=1" : "/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (!verifyPassword(current, admin.password_hash)) return { error: "Current password is incorrect." };
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== form.get("confirm")) return { error: "New passwords don't match." };
  await setAdminPassword(admin.id, hashPassword(next));
  revalidatePath("/admin", "layout");
  return { ok: "Password updated." };
}

export async function addAdmin(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) return { error: "Username: 3–32 letters, numbers, dots, dashes or underscores." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!(await createAdmin(username, hashPassword(password)))) return { error: "That username is already taken." };
  revalidatePath("/admin/settings");
  return { ok: `Admin “${username}” added. They'll be asked to change the password on first login.` };
}

export async function removeAdmin(form: FormData) {
  const me = await requireAdmin();
  const id = Number(form.get("id"));
  if (id === me.id) return; // can't remove yourself
  await deleteAdmin(id);
  revalidatePath("/admin/settings");
}

export async function markMemberPaid(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  if (!(await getMember(id))) return;
  await markPaid(id, `MANUAL-${admin.username}-${Date.now()}`, await (await getFeeMinor()), "manual");
  revalidatePath("/admin", "layout");
}

export async function updateMember(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(form.get("id"));
  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").replace(/[\s-]/g, "");
  if (name.length < 2) return { error: "Name is required." };
  if (!/^\+?\d{9,15}$/.test(phone)) return { error: "Enter a valid phone number." };
  const opt = (k: string) => String(form.get(k) ?? "").trim() || null;
  const num = (k: string) => (opt(k) ? Number(opt(k)) : null);
  const programYears = num("program_years");
  const level = num("level");
  if (programYears && level && level > programYears) return { error: "Level can't be higher than the programme length." };
  try {
    await updateMemberDetails(id, {
      name,
      phone,
      email: opt("email"),
      dob: opt("dob"),
      gender: opt("gender"),
      program: opt("program"),
      period: String(form.get("period")),
      program_years: programYears,
      level,
    });
  } catch {
    return { error: "Another member already uses that phone number." };
  }
  revalidatePath(`/admin/members/${id}`);
  return { ok: "Member details saved." };
}

export async function deleteMember(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const m = await getMember(id);
  if (m) {
    await deleteMemberRow(id);
    await deletePhoto(m.photo_path).catch(() => {}); // the record is gone either way
  }
  redirect("/admin/members");
}

const SIGNATURE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function updateSignatory(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  if (name.length < 2 || name.length > 60) return { error: "Enter the signatory's name." };
  if (title.length < 2 || title.length > 80) return { error: "Enter the signatory's title." };

  let signature: string | undefined;
  const file = form.get("signature");
  if (form.get("remove") === "on") signature = "";
  else if (file instanceof File && file.size > 0) {
    if (!SIGNATURE_TYPES.includes(file.type)) return { error: "The signature must be a PNG, JPEG or WebP image." };
    if (file.size > 500 * 1024) return { error: "The signature image must be under 500 KB." };
    signature = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  }
  await setSignatory(name, title, signature);
  revalidatePath("/", "layout");
  return { ok: "Signatory saved. New and reprinted cards use these details." };
}

export async function updateFee(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const raw = String(form.get("fee") ?? "").replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return { error: "Enter an amount like 20 or 25.50." };
  const amount = Number(raw);
  if (amount < 1) return { error: "The fee must be at least 1." };
  if (amount > 100000) return { error: "That fee looks too high. Check the amount." };
  await setFeeMinor(Math.round(amount * 100));
  revalidatePath("/", "layout");
  return { ok: "Membership fee updated. New payments use this amount; members who already paid are not affected." };
}
