"use client";

import { forwardRef, useId, useRef, useState } from "react";
import { toJpeg, toPng } from "html-to-image";
import { FileDown, ImageDown, Printer, RotateCcw } from "lucide-react";
import { LOGO_SRC } from "./brand/Logo";
import { memberCodeFile } from "@/lib/config";

export type CardData = {
  name: string;
  code: string; // membership number
  institution: string;
  period: string; // e.g. 2026-2029
  photo: string; // data URL
  qr: string; // data URL
  signatory: { name: string; title: string; signature: string }; // signature: data URL or ""
};

// Official artwork (square images on white, shown inside the round emblems).
const NDC_LOGO = "/card/ndc-logo.jpeg";
const UENR_CREST = "/card/uenr-crest.jpeg";

const RED = "#d2232a";
const INK = "#141414";
const W = 856;
const H = 540;
const font: React.CSSProperties = { fontFamily: "Arial, Helvetica, sans-serif" };

/** Faint umbrella-and-eagle (top of the official logo) used as a security watermark. */
function Watermark({ style }: { style: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", width: 440, height: 240, overflow: "hidden", opacity: 0.06, pointerEvents: "none", ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt="" style={{ width: 440, height: "auto", display: "block" }} />
    </div>
  );
}

function Emblem({ src, style }: { src: string; style: React.CSSProperties }) {
  return (
    <div
      style={{ position: "absolute", width: 124, height: 124, borderRadius: "50%", background: "#fff", overflow: "hidden", boxShadow: "0 2px 6px rgb(0 0 0 / .25)", ...style }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 10 }} />
    </div>
  );
}

const PHOTO_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#e5e7eb"/><circle cx="120" cy="100" r="46" fill="#9ca3af"/><path d="M40 240c8-60 42-86 80-86s72 26 80 86z" fill="#9ca3af"/></svg>`,
  );

function Field({ label, value, size = 25 }: { label: string; value: string; size?: number }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: RED, fontSize: 17, fontWeight: 700, lineHeight: 1.1 }}>{label}</div>
      <div style={{ color: INK, fontSize: size, fontWeight: 900, lineHeight: 1.15, letterSpacing: 0.5, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

export const CardFront = forwardRef<HTMLDivElement, { d: CardData }>(function CardFront({ d }, ref) {
  const name = (d.name || "YOUR NAME").toUpperCase();
  const nameSize = name.length <= 22 ? 25 : name.length <= 28 ? 22 : 19;
  const grad = `head-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div className="card-frame">
      <div
        ref={ref}
        className="card-face relative overflow-hidden"
        style={{ ...font, background: "linear-gradient(165deg, #f6f6f5 0%, #e7e8e9 55%, #d8d9db 100%)" }}
      >
        <Watermark style={{ right: -30, bottom: 70 }} />

        {/* Green header with the white and red waves underneath */}
        <svg width={W} height={250} viewBox={`0 0 ${W} 250`} style={{ position: "absolute", top: 0, left: 0 }} aria-hidden>
          <defs>
            <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0e2a1c" />
              <stop offset="1" stopColor="#1d5a3a" />
            </linearGradient>
          </defs>
          <path d="M0 0H856V198C760 162 560 128 380 140C240 150 110 170 0 162Z" fill={`url(#${grad})`} />
          <path d="M0 171C110 179 240 159 380 149C560 137 760 171 856 209" fill="none" stroke="#fff" strokeWidth={10} />
          <path d="M0 187C110 195 240 173 380 163C560 151 760 187 856 229" fill="none" stroke={RED} strokeWidth={7} />
        </svg>

        <Emblem src={NDC_LOGO} style={{ left: 30, top: 18 }} />
        <Emblem src={UENR_CREST} style={{ right: 30, top: 26 }} />

        <div
          style={{ position: "absolute", top: 40, left: 160, right: 160, textAlign: "center", color: "#fff", fontSize: 25, fontWeight: 800, lineHeight: 1.18, letterSpacing: 0.3, whiteSpace: "nowrap" }}
        >
          TERTIARY EDUCATION INSTITUTION
          <br />
          NETWORK (TEIN)
        </div>

        <div style={{ position: "absolute", top: 184, left: 380, background: RED, color: "#fff", fontSize: 19, fontWeight: 700, letterSpacing: 1, padding: "7px 32px" }}>
          MEMBERSHIP CARD
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={d.photo || PHOTO_PLACEHOLDER}
          alt=""
          style={{ position: "absolute", left: 36, top: 206, width: 252, height: 252, borderRadius: "50%", objectFit: "cover", border: "7px solid #fff", boxShadow: "0 4px 14px rgb(0 0 0 / .18)", background: "#e5e7eb" }}
        />

        <div style={{ position: "absolute", left: 336, right: 30, top: 238 }}>
          <Field label="Name" value={name} size={nameSize} />
          <Field label="Institution" value={d.institution} />
          <Field label="Membership No." value={d.code} />
          <Field label="Period" value={d.period || "—"} />
        </div>

        <div
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 56, background: INK, color: "#fff", fontSize: 21, letterSpacing: 1 }}
          className="flex items-center justify-center"
        >
          UNITY, STABILITY AND DEVELOPMENT
        </div>
      </div>
    </div>
  );
});

export const CardBack = forwardRef<HTMLDivElement, { d: CardData }>(function CardBack({ d }, ref) {
  return (
    <div className="card-frame">
      <div ref={ref} className="card-face relative overflow-hidden" style={{ ...font, background: "#fbfbfa", color: "#222" }}>
        <Watermark style={{ left: 210, bottom: 120 }} />
        {/* Magnetic-stripe style band */}
        <div style={{ position: "absolute", top: 22, left: 0, right: 0, height: 78, background: INK }} />

        <div style={{ position: "absolute", top: 160, left: 80, right: 80, textAlign: "center", fontSize: 19, lineHeight: 1.45 }}>
          This identification card is a valid document and should be accepted as a proof that the bearer is a member of{" "}
          <b>TEIN OF NDC UENR</b>
        </div>
        <div style={{ position: "absolute", top: 248, left: 0, right: 0, textAlign: "center", fontSize: 18, lineHeight: 1.45 }}>
          If found, please return to any
          <div style={{ fontSize: 20, fontWeight: 800 }}>NDC OFFICE NEAR YOU</div>
        </div>

        <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ height: 72, display: "flex", alignItems: "flex-end" }}>
            {d.signatory.signature && (
              // multiply blends the white paper of a photographed signature into the card
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.signatory.signature} alt="" style={{ maxHeight: 72, maxWidth: 260, objectFit: "contain", mixBlendMode: "multiply" }} />
            )}
          </div>
          <div style={{ width: 270, borderTop: `3px solid ${INK}`, marginTop: 4 }} />
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 8, letterSpacing: 0.5 }}>{d.signatory.name.toUpperCase()}</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{d.signatory.title}</div>
        </div>

        <div style={{ position: "absolute", left: 34, bottom: 34, fontFamily: "'Courier New', monospace", fontSize: 18, fontWeight: 700, color: INK }}>
          {d.code}
        </div>
        <div style={{ position: "absolute", right: 34, bottom: 26, textAlign: "center" }}>
          {d.qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.qr} alt="" style={{ width: 112, height: 112, display: "block" }} />
          ) : (
            <div style={{ width: 112, height: 112, background: "repeating-conic-gradient(#111 0 25%, #fff 0 50%) 0 0/16px 16px" }} />
          )}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#555", marginTop: 4 }}>SCAN TO VERIFY</div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 10, background: INK }} />
      </div>
    </div>
  );
});

const opts = (pixelRatio: number) => ({ pixelRatio, width: W, height: H, style: { transform: "none" } });
const render = (el: HTMLDivElement, pixelRatio: number) => toPng(el, opts(pixelRatio));
// JPEG keeps the print PDF small at ~500 dpi.
const renderJpeg = (el: HTMLDivElement) => toJpeg(el, { ...opts(2), quality: 0.92, backgroundColor: "#ffffff" });

function save(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export default function MemberCard({ d }: { d: CardData }) {
  const front = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const file = memberCodeFile(d.code);

  async function run(kind: string, fn: () => Promise<void>) {
    setBusy(kind);
    try {
      await fn();
    } catch {
      alert("Could not generate the card. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const downloadPng = () =>
    run("png", async () => {
      save(await render(front.current!, 1.5), `${file}-front.png`); // ~325 dpi at CR80 size
      save(await render(back.current!, 1.5), `${file}-back.png`);
    });

  const downloadPdf = () =>
    run("pdf", async () => {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] });
      pdf.addImage(await renderJpeg(front.current!), "JPEG", 0, 0, 85.6, 54);
      pdf.addPage([85.6, 54], "landscape");
      pdf.addImage(await renderJpeg(back.current!), "JPEG", 0, 0, 85.6, 54);
      pdf.save(`${file}.pdf`);
    });

  return (
    <div className="flex flex-col items-center gap-7">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setFlipped((f) => !f))}
          className="flip print-area print-first block cursor-pointer rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ndc-green/30"
          aria-label={flipped ? "Show front of card" : "Show back of card"}
        >
          <div className={`flip-inner ${flipped ? "is-flipped" : ""}`}>
            <div className="flip-face">
              <CardFront ref={front} d={d} />
            </div>
            <div className="flip-face flip-back">
              <CardBack ref={back} d={d} />
            </div>
          </div>
        </div>

      <div className="no-print flex flex-wrap justify-center gap-2.5">
        <button onClick={() => setFlipped((f) => !f)} className="btn btn-ghost">
          <RotateCcw className={`h-4 w-4 transition-transform duration-700 ${flipped ? "rotate-180" : ""}`} />
          {flipped ? "Show front" : "Show back"}
        </button>
        <button onClick={downloadPdf} disabled={!!busy} className="btn btn-green">
          <FileDown className="h-4 w-4" />
          {busy === "pdf" ? "Preparing…" : "Download PDF"}
        </button>
        <button onClick={downloadPng} disabled={!!busy} className="btn btn-ghost">
          <ImageDown className="h-4 w-4" />
          {busy === "png" ? "Preparing…" : "PNG images"}
        </button>
        <button onClick={() => window.print()} className="btn btn-dark">
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>
      <p className="no-print max-w-md text-center text-xs leading-relaxed text-muted">
        Tap the card to flip it. The PDF is exact credit-card size (85.6 × 54 mm), front then back, ready for any card
        printer. When printing from the browser, set margins to “None” and enable background graphics.
      </p>
    </div>
  );
}
