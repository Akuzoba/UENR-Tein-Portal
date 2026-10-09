import Link from "next/link";
import { LogoMark } from "../brand/Logo";
import { getContent, type SiteContent } from "@/lib/site";
import { socialLinks } from "./social";
import { mainHref, portalHref } from "@/lib/config";

const COLUMNS: [string, [string, string][]][] = [
  ["TEIN UENR", [[mainHref("/about"), "About us"], [mainHref("/activities"), "Activities"], [mainHref("/executives"), "Executives"], [mainHref("/contact"), "Contact"]]],
  ["Membership", [[portalHref("/portal/register"), "Register"], [portalHref("/portal#how"), "How it works"], [portalHref("/portal#faq"), "Questions"]]],
];

/** `dark` is the main site's ink footer with the oversized wordmark; the portal keeps the plain white one. */
export default async function Footer({ dark = false }: { dark?: boolean }) {
  const c = await getContent();
  const socials = socialLinks(c);
  if (dark) return <DarkFooter c={c} socials={socials} />;

  return (
    <footer className="no-print mt-auto border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-start gap-3">
            <LogoMark height={56} />
            <div>
              <div className="font-display text-lg font-extrabold uppercase">TEIN UENR · NDC Student Body</div>
              <p className="mt-1 text-sm text-muted">Unity, stability and development.</p>
            </div>
          </div>
          {(c.location || c.email || c.phone) && (
            <address className="mt-5 space-y-1 text-sm text-muted not-italic">
              {c.location && <div>{c.location}</div>}
              {c.email && <a href={`mailto:${c.email}`} className="block hover:text-ink">{c.email}</a>}
              {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="block hover:text-ink">{c.phone}</a>}
            </address>
          )}
          {socials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-ink/40 hover:text-ink">
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
        {COLUMNS.map(([title, links]) => (
          <nav key={title}>
            <div className="eyebrow text-ink">{title}</div>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-muted">
              {links.map(([href, label]) => (
                <li key={href}><Link href={href} className="hover:text-ink">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-5 py-4 text-xs text-muted">
          <span>© {new Date().getFullYear()} TEIN UENR</span>
          <span className="flex gap-4">
            <span>Payments by Paystack</span>
            <Link href="/admin" className="hover:text-ink">Executive login</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

function DarkFooter({ c, socials }: { c: SiteContent; socials: ReturnType<typeof socialLinks> }) {
  return (
    <footer className="no-print ink-band mt-auto">
      <div className="flag-rule h-1.5" />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-14 pb-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-white p-1.5">
              <LogoMark height={52} />
            </span>
            <div>
              <div className="font-display text-xl font-extrabold uppercase">TEIN UENR · NDC Student Body</div>
              <p className="mt-1 text-sm text-white/60">Unity, stability and development.</p>
            </div>
          </div>
          {(c.location || c.email || c.phone) && (
            <address className="mt-6 space-y-1 text-sm text-white/60 not-italic">
              {c.location && <div>{c.location}</div>}
              {c.email && <a href={`mailto:${c.email}`} className="block hover:text-white">{c.email}</a>}
              {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="block hover:text-white">{c.phone}</a>}
            </address>
          )}
          {socials.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white/75 transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-ink">
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
        {COLUMNS.map(([title, links]) => (
          <nav key={title}>
            <div className="text-xs font-bold tracking-[0.14em] text-ndc-red uppercase">{title}</div>
            <ul className="mt-4 space-y-2.5 text-sm font-semibold text-white/65">
              {links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="group inline-flex items-center gap-2 transition-colors hover:text-white">
                    <span className="h-px w-0 bg-ndc-red transition-all duration-300 group-hover:w-4" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      {/* Oversized outlined wordmark, cropped by the bottom edge */}
      <div aria-hidden className="pointer-events-none mx-auto max-w-6xl overflow-hidden px-5 select-none">
        <div className="text-outline -mb-[0.2em] text-center font-display text-[clamp(4.5rem,19vw,15rem)] leading-none font-extrabold whitespace-nowrap uppercase opacity-20 [--stroke:#fff]">
          TEIN UENR
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-5 py-4 text-xs text-white/50">
          <span>© {new Date().getFullYear()} TEIN UENR</span>
          <span className="flex gap-4">
            <span>Payments by Paystack</span>
            <Link href="/admin" className="hover:text-white">Executive login</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
