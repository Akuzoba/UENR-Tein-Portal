import type { SiteContent } from "@/lib/site";

/** Accepts either a full link or a bare handle ("teinuenr", "@teinuenr") for each network. */
function link(value: string, base: string) {
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return base + v.replace(/^@/, "");
}

export function socialLinks(c: Pick<SiteContent, "facebook" | "instagram" | "x" | "tiktok" | "whatsapp">) {
  return [
    { label: "WhatsApp", href: c.whatsapp ? whatsappLink(c.whatsapp) : "" },
    { label: "Facebook", href: link(c.facebook, "https://facebook.com/") },
    { label: "Instagram", href: link(c.instagram, "https://instagram.com/") },
    { label: "X", href: link(c.x, "https://x.com/") },
    { label: "TikTok", href: link(c.tiktok, "https://tiktok.com/@") },
  ].filter((s) => s.href);
}

/** WhatsApp chat link from a Ghana number (0241234567 → 233241234567) or a full wa.me / chat link. */
export function whatsappLink(value: string) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const digits = v.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? "233" + digits.slice(1) : digits}`;
}
