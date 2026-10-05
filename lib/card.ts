import QRCode from "qrcode";
import type { CardData } from "@/components/MemberCard";
import { INSTITUTION, SITE_URL, cardPeriod, fmtPeriod, memberCode } from "./config";
import { getSignatory, type Member, type Signatory } from "./db";
import { photoDataUrl } from "./storage";

/**
 * Builds everything the card needs, with photo + QR inlined so PNG/PDF export never hits CORS.
 * Pass the signatory when rendering many cards so it's only loaded once.
 */
export async function cardData(m: Member, signatory?: Signatory): Promise<CardData | null> {
  if (m.payment_status !== "paid" || !m.member_no || !m.paid_at) return null;
  return {
    name: m.name,
    code: memberCode(m.member_no, m.paid_at),
    institution: INSTITUTION,
    period: fmtPeriod(cardPeriod(m)),
    photo: await photoDataUrl(m.photo_path),
    qr: await QRCode.toDataURL(`${SITE_URL}/verify/${m.id}`, { margin: 1, width: 300 }),
    signatory: signatory ?? (await getSignatory()),
  };
}
