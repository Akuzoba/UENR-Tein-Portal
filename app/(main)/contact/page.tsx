import Link from "next/link";
import { ArrowRight, ArrowUpRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getContent } from "@/lib/site";
import { socialLinks, whatsappLink } from "@/components/site/social";
import PageTransition from "@/components/PageTransition";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/Reveal";
import Tilt from "@/components/Tilt";
import { portalHref } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact – TEIN UENR" };

export default async function Contact() {
  const c = await getContent();
  const ways = [
    c.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: c.whatsapp, href: whatsappLink(c.whatsapp), tone: "text-ndc-green" },
    c.phone && { icon: Phone, label: "Call", value: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}`, tone: "text-ink" },
    c.email && { icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}`, tone: "text-ndc-red" },
    c.location && { icon: MapPin, label: "Find us", value: c.location, href: "", tone: "text-ink" },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href: string; tone: string }[];
  const socials = socialLinks(c).filter((s) => s.label !== "WhatsApp");

  return (
    <PageTransition>
      <main className="flex-1">
        <PageHero eyebrow="Contact" title="Get in touch" sub="Questions about membership, your card or our activities? Reach the executives here." />

        <section className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-14 sm:grid-cols-2">
          {ways.map(({ icon: Icon, label, value, href, tone }, i) => {
            const body = (
              <div className="group relative h-full overflow-hidden rounded-xl border border-line bg-white p-7 transition-shadow duration-300 hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,.4)]">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full bg-paper transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 ${tone}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <div className="mt-5 text-sm font-semibold text-muted">{label}</div>
                <div className="mt-0.5 text-xl font-semibold break-words">{value}</div>
                {href && <ArrowUpRight className="absolute top-6 right-6 h-5 w-5 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ndc-red" />}
              </div>
            );
            return (
              <Reveal key={label} variant="flip" delay={i * 110} className="h-full">
                <Tilt max={5} glare className="h-full rounded-xl">
                  {href ? (
                    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block h-full rounded-xl focus-visible:ring-4 focus-visible:ring-ndc-green/30 focus-visible:outline-none">
                      {body}
                    </a>
                  ) : (
                    body
                  )}
                </Tilt>
              </Reveal>
            );
          })}
        </section>

        {socials.length > 0 && (
          <section className="mx-auto w-full max-w-6xl px-5 pb-12">
            <h2 className="text-sm font-semibold text-muted">Follow us</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">{s.label}</a>
              ))}
            </div>
          </section>
        )}

        <section className="border-t border-line bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-10 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold uppercase">Want to join?</h2>
              <p className="mt-1 text-muted">Register online in about two minutes and pay your dues with mobile money or card.</p>
            </div>
            <Link href={portalHref("/portal/register")} target="_blank" rel="noopener" className="btn btn-dark group">
              Register as a member <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
