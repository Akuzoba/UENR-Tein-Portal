"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentAdmin, endSession, requireAdmin, requirePermission, startSession } from "@/lib/admin";
import { diff, logAudit } from "@/lib/audit";
import { fmtMoney, memberCode } from "@/lib/config";
import {
  changeAdmin,
  createAdmin,
  deleteMemberRow,
  getAdminByUsername,
  getFeeMinor,
  getMember,
  getPrograms,
  getSignatory,
  markPaid,
  recordLogin,
  setAdminPassword,
  setFeeMinor,
  setPrograms,
  setSignatory,
  updateMemberDetails,
  type Admin,
} from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ROLES, homeFor, isRole, roleLabel } from "@/lib/roles";
import { deletePhoto } from "@/lib/storage";

export type FormState = { error?: string; ok?: string };

const who = (a: Pick<Admin, "id" | "username">) => ({ id: a.id, username: a.username });
const memberTarget = (id: string) => ({ type: "member", id });

/* ------------------------------------------------------------------ sign-in */

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const admin = await getAdminByUsername(username);
  if (admin?.locked_until && new Date(admin.locked_until) > new Date()) {
    return { error: "Too many wrong attempts. This account is locked for 15 minutes." };
  }
  const ok = !!admin && verifyPassword(password, admin.password_hash);
  if (!ok) {
    if (admin) {
      const locked = await recordLogin(admin.id, false);
      await logAudit(who(admin), "auth.login_failed", `Wrong password for ${admin.username}`, { target: { type: "admin", id: String(admin.id) } });
      if (locked) await logAudit(who(admin), "auth.locked", `${admin.username} locked for 15 minutes after 5 wrong passwords`, { target: { type: "admin", id: String(admin.id) } });
    } else {
      // Unknown usernames are kept short: people sometimes type a password into the username box.
      await logAudit({ id: null, username: "unknown" }, "auth.login_failed", "Sign-in attempt with an unknown username", {
        details: { username: username.slice(0, 3) + (username.length > 3 ? "…" : "") },
      });
    }
    return { error: "Wrong username or password." };
  }
  if (admin.disabled_at) {
    await logAudit(who(admin), "auth.login_blocked", `${admin.username} tried to sign in but is deactivated`, { target: { type: "admin", id: String(admin.id) } });
    return { error: "This account has been deactivated. Ask a super admin if you still need access." };
  }
  await recordLogin(admin.id, true);
  await logAudit(who(admin), "auth.login", `${admin.username} signed in`, { target: { type: "admin", id: String(admin.id) } });
  await startSession(admin.id);
  redirect(admin.must_change ? "/admin/settings?welcome=1" : homeFor(admin.role));
}

export async function logout() {
  const admin = await currentAdmin();
  if (admin) await logAudit(who(admin), "auth.logout", `${admin.username} signed out`, { target: { type: "admin", id: String(admin.id) } });
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
  await logAudit(who(admin), "auth.password_changed", `${admin.username} changed their password`, { target: { type: "admin", id: String(admin.id) } });
  revalidatePath("/admin", "layout");
  return { ok: "Password updated." };
}

/* ------------------------------------------------------------------ admin accounts */

export async function addAdmin(_: FormState, form: FormData): Promise<FormState> {
  const me = await requirePermission("admins.manage");
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const role = form.get("role");
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) return { error: "Username: 3–32 letters, numbers, dots, dashes or underscores." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!isRole(role)) return { error: "Choose a role for the new admin." };
  const id = await createAdmin(username, hashPassword(password), role);
  if (id === null) return { error: "That username is already taken." };
  await logAudit(who(me), "admin.created", `Added ${username} as ${roleLabel(role)}`, { target: { type: "admin", id: String(id) }, details: { role } });
  revalidatePath("/admin/settings");
  return { ok: `${ROLES[role].label} “${username}” added. They'll be asked to change the password on first login.` };
}

export async function setAdminRole(_: FormState, form: FormData): Promise<FormState> {
  const me = await requirePermission("admins.manage");
  const id = Number(form.get("id"));
  const role = form.get("role");
  if (!isRole(role)) return { error: "Choose a valid role." };
  if (id === me.id) return { error: "You can't change your own role. Ask another super admin." };
  const { result, before } = await changeAdmin(id, { role });
  if (result === "not_found") return { error: "That admin no longer exists." };
  if (result === "last_super") return { error: "There must always be at least one active super admin." };
  if (before.role !== role) {
    await logAudit(who(me), "admin.role_changed", `Changed ${before.username} from ${roleLabel(before.role)} to ${roleLabel(role)}`, {
      target: { type: "admin", id: String(id) },
      details: { role: [before.role, role] },
    });
  }
  revalidatePath("/admin/settings");
  return { ok: `${before.username} is now ${roleLabel(role)}.` };
}

/** Deactivate instead of delete, so the activity log keeps pointing at a real account after a handover. */
export async function setAdminActive(_: FormState, form: FormData): Promise<FormState> {
  const me = await requirePermission("admins.manage");
  const id = Number(form.get("id"));
  const active = form.get("active") === "1";
  if (id === me.id) return { error: "You can't deactivate your own account." };
  const { result, before } = await changeAdmin(id, { disabled: !active });
  if (result === "not_found") return { error: "That admin no longer exists." };
  if (result === "last_super") return { error: "There must always be at least one active super admin." };
  if ((before.disabled_at === null) !== active) {
    await logAudit(who(me), active ? "admin.reactivated" : "admin.deactivated", `${active ? "Reactivated" : "Deactivated"} ${before.username}`, {
      target: { type: "admin", id: String(id) },
    });
  }
  revalidatePath("/admin/settings");
  return { ok: `${before.username} ${active ? "can sign in again" : "can no longer sign in"}.` };
}

/* ------------------------------------------------------------------ members */

export async function markMemberPaid(form: FormData) {
  const admin = await requirePermission("payments.cash");
  const id = String(form.get("id"));
  const m = await getMember(id);
  if (!m) return;
  const amount = await getFeeMinor();
  const ref = `MANUAL-${admin.username}-${Date.now()}`;
  if (await markPaid(id, ref, amount, "manual")) {
    const paid = await getMember(id);
    await logAudit(who(admin), "member.cash_paid", `Recorded ${fmtMoney(amount)} cash from ${m.name}`, {
      target: memberTarget(id),
      details: { amount, reference: ref, member_no: paid?.member_no ? memberCode(paid.member_no, paid.paid_at) : null },
    });
  }
  revalidatePath("/admin", "layout");
}

export async function updateMember(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requirePermission("members.edit");
  const id = String(form.get("id"));
  const before = await getMember(id);
  if (!before) return { error: "This member no longer exists." };
  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").replace(/[\s-]/g, "");
  if (name.length < 2) return { error: "Name is required." };
  if (!/^\+?\d{9,15}$/.test(phone)) return { error: "Enter a valid phone number." };
  const opt = (k: string) => String(form.get(k) ?? "").trim() || null;
  const num = (k: string) => (opt(k) ? Number(opt(k)) : null);
  const programYears = num("program_years");
  const level = num("level");
  if (programYears && level && level > programYears) return { error: "Level can't be higher than the programme length." };
  const details = {
    name,
    phone,
    email: opt("email"),
    dob: opt("dob"),
    gender: opt("gender"),
    program: opt("program"),
    period: String(form.get("period")),
    program_years: programYears,
    level,
  };
  try {
    await updateMemberDetails(id, details);
  } catch {
    return { error: "Another member already uses that phone number." };
  }
  const changes = diff(before, details);
  if (Object.keys(changes).length) {
    await logAudit(who(admin), "member.updated", `Edited ${before.name}: ${Object.keys(changes).join(", ").replace(/_/g, " ")}`, {
      target: memberTarget(id),
      details: { changes, paid: before.payment_status === "paid" },
    });
  }
  revalidatePath(`/admin/members/${id}`);
  return { ok: "Member details saved." };
}

export async function deleteMember(form: FormData) {
  const admin = await requirePermission("members.delete");
  const id = String(form.get("id"));
  const m = await getMember(id);
  if (m) {
    await deleteMemberRow(id);
    await deletePhoto(m.photo_path).catch(() => {}); // the record is gone either way
    // The log keeps what was deleted, including the payment, since the member row is gone for good.
    await logAudit(who(admin), "member.deleted", `Deleted ${m.name}${m.payment_status === "paid" ? " (paid member)" : ""}`, {
      target: memberTarget(id),
      details: {
        name: m.name,
        phone: m.phone,
        program: m.program,
        payment_status: m.payment_status,
        member_no: m.member_no ? memberCode(m.member_no, m.paid_at) : null,
        amount_paid: m.amount_paid,
        payment_method: m.payment_method,
        reference: m.paystack_ref,
        paid_at: m.paid_at,
        registered: m.created_at,
      },
    });
  }
  redirect("/admin/members");
}

/* ------------------------------------------------------------------ cards */

/** Called by the card buttons on a member's page. Printing with the browser's own menu can't be seen. */
export async function logCardExport(memberId: string, kind: "pdf" | "png" | "print") {
  const admin = await requirePermission("cards.print");
  if (typeof memberId !== "string" || !["pdf", "png", "print"].includes(kind)) return;
  const m = await getMember(memberId);
  if (!m || m.payment_status !== "paid") return;
  const code = m.member_no ? memberCode(m.member_no, m.paid_at) : null;
  const what = kind === "print" ? "Printed" : `Downloaded the ${kind.toUpperCase()} of`;
  await logAudit(who(admin), kind === "print" ? "card.printed" : "card.downloaded", `${what} ${m.name}'s card`, {
    target: memberTarget(memberId),
    details: { format: kind, member_no: code },
  });
}

/** Called by "Print all cards". One entry for the batch, listing every card in it. */
export async function logBulkPrint(search: string, memberIds: string[]) {
  const admin = await requirePermission("cards.print");
  if (!Array.isArray(memberIds)) return;
  const ids = memberIds.filter((id): id is string => typeof id === "string" && id.length <= 64).slice(0, 100);
  search = typeof search === "string" ? search.slice(0, 100) : "";
  await logAudit(who(admin), "card.bulk_printed", `Printed ${ids.length} card${ids.length === 1 ? "" : "s"}${search ? ` matching “${search}”` : ""}`, {
    details: { count: ids.length, search: search || null, member_ids: ids },
  });
}

/* ------------------------------------------------------------------ settings */

const SIGNATURE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function updateSignatory(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requirePermission("settings.signatory");
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
  const before = await getSignatory();
  await setSignatory(name, title, signature);
  const changes = diff({ name: before.name, title: before.title }, { name, title });
  const signatureNote = signature === "" ? "removed" : signature ? "replaced" : null;
  if (Object.keys(changes).length || signatureNote) {
    await logAudit(who(admin), "settings.signatory", `Changed the card signatory${signatureNote ? ` (signature ${signatureNote})` : ""}`, {
      details: { changes, signature: signatureNote },
    });
  }
  revalidatePath("/", "layout");
  return { ok: "Signatory saved. New and reprinted cards use these details." };
}

export async function updateFee(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requirePermission("settings.fee");
  const raw = String(form.get("fee") ?? "").replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return { error: "Enter an amount like 20 or 25.50." };
  const amount = Number(raw);
  if (amount < 1) return { error: "The fee must be at least 1." };
  if (amount > 100000) return { error: "That fee looks too high. Check the amount." };
  const before = await getFeeMinor();
  const after = Math.round(amount * 100);
  await setFeeMinor(after);
  if (before !== after) {
    await logAudit(who(admin), "settings.fee", `Changed the membership fee from ${fmtMoney(before)} to ${fmtMoney(after)}`, {
      details: { fee: [before, after] },
    });
  }
  revalidatePath("/", "layout");
  return { ok: "Membership fee updated. New payments use this amount; members who already paid are not affected." };
}

/** Adds one programme per line; names already on the list (any capitalisation) are skipped. */
export async function addPrograms(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requirePermission("settings.programs");
  const names = String(form.get("names") ?? "")
    .split(/\r?\n/)
    .map((n) => n.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (!names.length) return { error: "Type the name of the programme to add." };
  if (names.some((n) => n.length > 120)) return { error: "Programme names must be under 120 characters." };

  const list = await getPrograms();
  const seen = new Set(list.map((p) => p.toLowerCase()));
  const added = names.filter((n) => !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()));
  if (!added.length) return { error: names.length === 1 ? "That programme is already on the list." : "All of those are already on the list." };
  if (list.length + added.length > 500) return { error: "The list can hold up to 500 programmes." };

  await setPrograms([...list, ...added]);
  await logAudit(who(admin), "settings.programs_added", `Added ${added.length === 1 ? `the programme “${added[0]}”` : `${added.length} programmes`}`, {
    details: { added },
  });
  revalidatePath("/", "layout");
  const skipped = names.length - added.length;
  return { ok: `Added ${added.length === 1 ? `“${added[0]}”` : `${added.length} programmes`}.${skipped ? ` ${skipped} already on the list.` : ""}` };
}

export async function removeProgram(form: FormData) {
  const admin = await requirePermission("settings.programs");
  const name = String(form.get("name"));
  const list = await getPrograms();
  if (!list.includes(name)) return;
  await setPrograms(list.filter((p) => p !== name));
  await logAudit(who(admin), "settings.program_removed", `Removed the programme “${name}”`, { details: { removed: name } });
  revalidatePath("/", "layout");
}

