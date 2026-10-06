import { NextResponse } from "next/server";
import { z } from "zod";
import { findMemberByPhone, getPrograms, upsertMember } from "@/lib/db";
import { startPayment } from "@/lib/paystack";
import { isJpeg, savePhoto } from "@/lib/storage";
import { GENDERS, PERIODS, PROGRAM_YEAR_OPTIONS } from "@/lib/config";

const optionalOf = (list: string[], msg: string) =>
  z.string().optional().refine((v) => !v || list.includes(v), msg);

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
    dob: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date of birth")]).optional(),
    gender: optionalOf(GENDERS, "Invalid gender"),
    program: z.string().trim().max(120).optional(), // checked against the admin-managed list below
    period: z.string().refine((v) => PERIODS.includes(v), "Select your study mode"),
    program_years: z.coerce
      .number({ error: "Select your programme type" })
      .int()
      .refine((v) => PROGRAM_YEAR_OPTIONS.includes(v), "Select how many years your programme takes"),
    level: z.coerce.number({ error: "Select your current level" }).int().min(1, "Select your current level"),
    phone: z
      .string()
      .transform((v) => v.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(/^\+?\d{9,15}$/, "Enter a valid phone number")),
  })
  .refine((d) => d.level <= d.program_years, { message: "Your level can't be higher than the length of your programme" });

export async function POST(req: Request) {
  const form = await req.formData();
  const fields = Object.fromEntries([...form].filter(([, v]) => typeof v === "string"));
  const parsed = schema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const d = parsed.data;
  if (d.program && !(await getPrograms()).includes(d.program)) {
    return NextResponse.json({ error: "Select your programme from the list" }, { status: 400 });
  }

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Passport photo is required" }, { status: 400 });
  }
  const bytes = Buffer.from(await photo.arrayBuffer());
  if (!isJpeg(bytes) || bytes.length > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "Photo must be an image under 3MB" }, { status: 400 });
  }

  // Same phone number: block if already paid, otherwise reuse the pending record.
  const existing = await findMemberByPhone(d.phone);
  if (existing?.payment_status === "paid") {
    return NextResponse.json(
      { error: "This phone number is already registered and paid. Contact a TEIN UENR executive if you need your receipt again." },
      { status: 409 },
    );
  }

  const id = existing?.id ?? crypto.randomUUID();
  const photoPath = `${id}.jpg`;
  try {
    await savePhoto(photoPath, bytes);
  } catch {
    return NextResponse.json({ error: "Photo upload failed" }, { status: 500 });
  }

  const row = {
    id,
    name: d.name,
    email: d.email || null,
    dob: d.dob || null,
    gender: d.gender || null,
    program: d.program || null,
    period: d.period,
    program_years: d.program_years,
    level: d.level,
    phone: d.phone,
    photo_path: photoPath,
  };
  try {
    await upsertMember(row);
  } catch {
    return NextResponse.json({ error: "Could not save registration" }, { status: 500 });
  }

  try {
    const url = await startPayment({ id, phone: d.phone, email: row.email });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
