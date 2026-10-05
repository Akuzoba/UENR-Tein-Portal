import Link from "next/link";
import QRCode from "qrcode";
import { ArrowRight } from "lucide-react";
import { countPaid, getSignatory } from "@/lib/db";
import { INSTITUTION, SITE_URL, memberCode } from "@/lib/config";
import PageTransition from "@/components/PageTransition";
import Reveal from "@/components/Reveal";
import Tilt from "@/components/Tilt";
import { CardBack, CardFront, type CardData } from "@/components/MemberCard";

export const dynamic = "force-dynamic";

const steps = [
  ["Fill in the form", "Your name, phone number, programme and current level, plus a passport photo taken on your phone. The card preview updates as you type."],
  ["Pay your dues", "Securely through Paystack, with MTN MoMo, Telecel Cash, AirtelTigo Money or a bank card."],
  ["Collect your card", "You get a receipt and your member number as soon as payment clears. The executives print your card for you to collect."],
];

const faqs = [
  ["Who can register?", "Any student on campus who supports the NDC and wants to be an official member of the TEIN UENR student body."],
  ["How long is membership valid?", "You register once, and your card stays valid until you complete your programme. It depends on your level when you register: a first-year on a 4-year degree gets four years, a final-year student gets until the end of the next year. The period is printed on the front of your card."],
  ["When do I get my membership card?", "The executives print membership cards for paid members. Bring your receipt or member ID when you collect yours."],
  ["I paid but closed the page before seeing my receipt.", "Your payment is still recorded. Any TEIN UENR executive can look you up and send you your receipt link."],
  ["What photo should I use?", "A clear, front-facing photo with a plain background, like a passport photo. It is resized automatically."],
  ["Can someone fake a card?", "Every card has a QR code. Scanning it opens our verification page, which shows whether the member is real and paid up."],
];

export default async function Home() {
  const year = new Date().getFullYear();
  const n = await countPaid();
  const sampleCode = memberCode(76);
  const sample: CardData = {
    name: "Ama Serwaa Mensah",
    code: sampleCode,
    institution: INSTITUTION,
    period: `${year}-${year + 3}`,
    photo: "",
    qr: await QRCode.toDataURL(SITE_URL, { margin: 1, width: 300 }),
    signatory: await getSignatory(),
  };

  return (
    <PageTransition>
      <main className="flex-1">
        {/* ---------------- Hero ---------------- */}
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
            <div>
              <p className="eyebrow anim-fade">Membership {year}</p>
              {/* Each line rises out of its own mask, one after another */}
              <h1 className="headline mt-4 text-[clamp(2.6rem,6.4vw,5.3rem)] whitespace-nowrap">
                {[
                  ["Register", "text-ndc-red"],
                  ["Pay your dues", "text-ndc-red"],
                  ["Collect your card", "text-ndc-green"],
                ].map(([line, dot], i) => (
                  <span key={line} className="block overflow-hidden pb-[0.06em]">
                    <span className="anim-line block" style={{ animationDelay: `${120 + i * 110}ms` }}>
                      {line}
                      <span className={dot}>.</span>
                    </span>
                  </span>
                ))}
              </h1>
              <p className="anim-rise mt-6 max-w-lg text-lg leading-relaxed text-muted" style={{ animationDelay: "480ms" }}>
                Official membership of the TEIN UENR NDC student body. Pay your dues online and get your receipt instantly. The executives then print your member card, with a QR code anyone can scan to verify it.
              </p>
              <div className="anim-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "580ms" }}>
                <Link href="/portal/register" className="btn btn-primary group px-6 py-3.5 text-base">
                  Register now <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
                <a href="#how" className="btn btn-outline px-6 py-3.5 text-base">
                  How it works
                </a>
              </div>
              {n >= 10 && (
                <p className="mt-6 text-sm text-muted">
                  <b className="text-ink">{n.toLocaleString()}</b> students have registered so far.
                </p>
              )}
            </div>

            {/* Card composition on a flat green block */}
            <div className="relative">
              <div className="absolute inset-x-6 inset-y-4 rounded-lg bg-ndc-green lg:inset-x-0" />
              <div className="flag-rule absolute inset-x-6 bottom-4 h-2 rounded-b-lg lg:inset-x-0" />
              <div className="relative flex flex-col items-center gap-0 py-12 sm:py-16">
                <div className="card-sm -mb-24 translate-x-10 rotate-[4deg] opacity-95 max-sm:hidden">
                  <CardBack d={sample} />
                </div>
                <div className="anim-settle sm:-translate-x-4">
                  <Tilt>
                    <CardFront d={sample} />
                  </Tilt>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- How it works ---------------- */}
        <section id="how" className="scroll-mt-20 border-b border-line bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">How it works</p>
                <h2 className="headline mt-3 text-5xl">About two minutes, start to finish</h2>
              </div>
              <Link href="/portal/register" className="btn btn-dark">Start registration</Link>
            </Reveal>
            <ol className="mt-12 grid border-t-2 border-ink md:grid-cols-3">
              {steps.map(([title, text], i) => (
                <Reveal as="li" key={title} delay={i * 100} className="border-line py-7 md:border-l md:px-7 md:first:border-l-0 md:first:pl-0 max-md:border-b">
                  <span className="font-display text-sm font-bold text-ndc-red">Step {i + 1}</span>
                  <h3 className="mt-1 font-display text-3xl font-bold uppercase">{title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- The card ---------------- */}
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2">
            <Reveal>
              <p className="eyebrow">Your card</p>
              <h2 className="headline mt-3 text-5xl">A real ID, not a screenshot</h2>
              <ul className="mt-6 space-y-3 text-muted">
                {[
                  "Your photo, name and institution",
                  `A unique membership number, e.g. ${sampleCode}`,
                  "The years it is valid, until you complete your programme",
                  "A QR code that opens our verification page",
                  "Printed by the executives at bank-card size (85.6 × 54 mm)",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 bg-ndc-green" />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120} className="flex justify-center">
              <div className="rotate-2 transition-transform duration-500 hover:rotate-0">
                <CardBack d={sample} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section id="faq" className="scroll-mt-20 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1fr_2fr]">
            <Reveal>
              <p className="eyebrow">Questions</p>
              <h2 className="headline mt-3 text-5xl">Before you register</h2>
            </Reveal>
            <Reveal delay={100} className="border-t-2 border-ink">
              {faqs.map(([q, a]) => (
                <details key={q} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="text-2xl leading-none text-ndc-red transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <p className="anim-fade -mt-1 pb-5 leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ---------------- Closing band ---------------- */}
        <section className="bg-ndc-red text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-12 sm:flex-row sm:items-center">
            <h2 className="headline text-4xl sm:text-5xl">Membership {year} is open</h2>
            <Link href="/portal/register" className="btn group bg-white px-6 py-3.5 text-base text-ink hover:bg-paper">
              Register now <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
