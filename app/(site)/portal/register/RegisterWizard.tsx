"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, Lock } from "lucide-react";
import { CardFront, type CardData } from "@/components/MemberCard";
import PhotoEditor, { type PhotoState } from "@/components/PhotoEditor";
import ProgramPicker from "@/components/ProgramPicker";
import { INSTITUTION, PROGRAM_TYPES, PROGRAM_YEAR_OPTIONS, levelLabel, yearsLeft } from "@/lib/config";

const STEPS = ["Your details", "Studies", "Photo", "Review"];

type Form = {
  name: string;
  phone: string;
  email: string;
  program: string;
  period: string;
  gender: string;
  dob: string;
  program_type: string;
  program_years: string;
  level: string;
};
const EMPTY: Form = { name: "", phone: "", email: "", program: "", period: "", gender: "", dob: "", program_type: "", program_years: "", level: "" };

const fmtDob = (v: string) =>
  v ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

type Props = {
  programs: string[];
  periods: string[];
  genders: string[];
  fee: string;
  testMode: boolean;
  year: number;
  signatory: CardData["signatory"];
};

const choice = (on: boolean) =>
  `rounded-md border px-3 py-3 text-sm font-semibold transition-colors ${on ? "border-ndc-green bg-ndc-green text-white" : "border-line bg-white hover:border-ink/40"}`;

export default function RegisterWizard({ programs, periods, genders, fee, testMode, year, signatory }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [f, setF] = useState<Form>(EMPTY);
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoState, setPhotoState] = useState<PhotoState | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const fail = (msg: string) => {
    setError(msg);
    setErrorKey((k) => k + 1);
  };

  function validate(s: number) {
    if (s === 0) {
      if (f.name.trim().length < 2) return "Enter your full name";
      if (!/^\+?\d{9,15}$/.test(f.phone.replace(/[\s-]/g, ""))) return "Enter a valid phone number";
      if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return "Enter a valid email or leave it empty";
    }
    if (s === 1) {
      if (!f.program_years) return f.program_type === "Other" ? "Select how many years your programme takes" : "Select your programme type";
      if (!f.level) return "Select your current level";
      if (!f.period) return "Select your study mode";
    }
    if (s === 2 && !photo) return "Add a passport photo to continue";
    if (s === 2 && photoBusy) return "Hold on, we're still finishing your photo";
    return "";
  }

  function go(to: number) {
    if (to > step) {
      for (let s = step; s < to; s++) {
        const err = validate(s);
        if (err) return fail(err);
      }
    }
    setError("");
    setDir(to > step ? 1 : -1);
    setStep(to);
  }

  function takeFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return fail("That file isn't an image");
    setPhoto(null);
    setPreview(null);
    setPhotoState({ file, crop: null, white: true, touched: false });
    setError("");
  }

  // The editor hands back the finished square JPEG whenever the photo or its position changes.
  function takeOutput(blob: Blob) {
    setPhoto(blob);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(blob);
    });
  }

  async function submit() {
    for (let s = 0; s < 3; s++) {
      const err = validate(s);
      if (err) {
        setStep(s);
        return fail(err);
      }
    }
    setBusy(true);
    setError("");
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.set(k, v));
    fd.set("photo", photo!, "photo.jpg");
    try {
      const res = await fetch("/api/register", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      window.location.href = json.url; // Paystack (or test) checkout
    } catch (err) {
      fail((err as Error).message);
      setBusy(false);
    }
  }

  // Picking a programme length clears a level that no longer fits it.
  function setYears(type: string, years: string) {
    setF({ ...f, program_type: type, program_years: years, level: Number(f.level) > Number(years) ? "" : f.level });
  }

  const years = Number(f.program_years);
  const level = Number(f.level);
  const period = years && level ? `${year}-${year + yearsLeft(years, level)}` : "";

  const card: CardData = {
    name: f.name,
    code: `BR/${INSTITUTION}/${String(year % 100).padStart(2, "0")}/·······`,
    institution: INSTITUTION,
    period,
    photo: preview ?? "",
    qr: "",
    signatory,
  };

  return (
    <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_440px]">
      {/* ---------- Form ---------- */}
      <div className="panel overflow-hidden">
        {/* Step tabs */}
        <ol className="grid grid-cols-4 border-b border-line text-sm">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => go(i)}
                className={`relative flex w-full items-center justify-center gap-2 px-2 py-4 font-semibold transition-colors ${
                  i === step ? "text-ink" : i < step ? "text-ndc-green" : "text-muted/70 hover:text-ink"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs transition-colors ${
                    i < step ? "bg-ndc-green text-white" : i === step ? "bg-ink text-white" : "border border-line"
                  }`}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
                <span className={`absolute inset-x-0 -bottom-px h-0.5 transition-colors ${i === step ? "bg-ndc-red" : "bg-transparent"}`} />
              </button>
            </li>
          ))}
        </ol>

        <div className="min-h-[360px] overflow-hidden px-5 py-7 sm:px-8">
          <div key={step} className="anim-slide space-y-5" style={{ "--from": `${dir * 24}px` } as React.CSSProperties}>
            {step === 0 && (
              <>
                <StepTitle title="Your details" sub="Your name appears on your card exactly as you type it here." />
                <label className="field">
                  Full name *
                  <input value={f.name} onChange={set("name")} autoComplete="name" className="input" placeholder="e.g. Kwame Mensah" autoFocus />
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="field">
                    Phone number *
                    <input value={f.phone} onChange={set("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="0241234567" className="input" />
                  </label>
                  <label className="field">
                    Email <span className="font-normal text-muted">(optional)</span>
                    <input value={f.email} onChange={set("email")} type="email" autoComplete="email" placeholder="For your payment receipt" className="input" />
                  </label>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <StepTitle title="Your studies" sub="Your level decides how long your card is valid: until you complete your programme." />
                <div>
                  <span className="field">Programme type *</span>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {PROGRAM_TYPES.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => setYears(t.label, t.years ? String(t.years) : "")}
                        aria-pressed={f.program_type === t.label}
                        className={choice(f.program_type === t.label)}
                      >
                        {t.label}
                        {t.years && <span className="block text-xs font-normal opacity-80">{t.years} years</span>}
                        {!t.years && <span className="block text-xs font-normal opacity-80">Other length</span>}
                      </button>
                    ))}
                  </div>
                </div>
                {f.program_type === "Other" && (
                  <label className="field anim-fade">
                    How many years does your programme take in total? *
                    <select value={f.program_years} onChange={(e) => setYears("Other", e.target.value)} className="input">
                      <option value="">Select</option>
                      {PROGRAM_YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>{y} years</option>
                      ))}
                    </select>
                  </label>
                )}
                {years > 0 && (
                  <div className="anim-fade">
                    <span className="field">Current level *</span>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {Array.from({ length: years }, (_, i) => i + 1).map((l) => (
                        <button key={l} type="button" onClick={() => setF({ ...f, level: String(l) })} aria-pressed={level === l} className={choice(level === l)}>
                          {l * 100}
                        </button>
                      ))}
                    </div>
                    {period && (
                      <p className="mt-2 text-sm text-muted">
                        Your card will be valid for <b className="text-ink">{period}</b>
                        {level === years && " (final year)"}.
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <span className="field">Study mode *</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {periods.map((p) => (
                      <button key={p} type="button" onClick={() => setF({ ...f, period: p })} aria-pressed={f.period === p} className={choice(f.period === p)}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="program" className="field">Programme</label>
                  <ProgramPicker id="program" programs={programs} value={f.program} onChange={(program) => setF({ ...f, program })} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="field">
                    Gender
                    <select value={f.gender} onChange={set("gender")} className="input">
                      <option value="">Select</option>
                      {genders.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    Date of birth
                    <input value={f.dob} onChange={set("dob")} type="date" className="input" />
                  </label>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <StepTitle title="Passport photo" sub="Face the camera in good light. We'll make the background white and help you frame it." />
                {photoState ? (
                  <PhotoEditor value={photoState} onChange={setPhotoState} onOutput={takeOutput} onBusy={setPhotoBusy} onPick={() => fileRef.current?.click()} />
                ) : (
                  <div
                    onDragOver={(e) => (e.preventDefault(), setDrag(true))}
                    onDragLeave={() => setDrag(false)}
                    onDrop={(e) => (e.preventDefault(), setDrag(false), takeFile(e.dataTransfer.files[0]))}
                    className={`flex flex-col items-center gap-5 rounded-lg border-2 border-dashed p-6 transition-colors sm:flex-row ${
                      drag ? "border-ndc-green bg-ndc-green/5" : "border-line"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex h-40 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md bg-paper ring-1 ring-line transition hover:ring-ink/30"
                      aria-label="Choose photo"
                    >
                      <Camera className="h-8 w-8 text-muted/60" />
                    </button>
                    <div className="text-center sm:text-left">
                      <p className="font-semibold">Drag a photo here</p>
                      <p className="mt-1 text-sm text-muted">or choose one from your phone or computer.</p>
                      <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost mt-4">
                        <Camera className="h-4 w-4" /> Choose photo
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    takeFile(e.target.files?.[0]);
                    e.target.value = ""; // picking the same file again still fires
                  }}
                  className="sr-only"
                />
              </>
            )}

            {step === 3 && (
              <>
                <StepTitle title="Review and pay" sub="Check your details. You can go back and change anything." />
                <dl className="divide-y divide-line rounded-md border border-line">
                  {(
                    [
                      ["Name", f.name, 0],
                      ["Phone", f.phone, 0],
                      ["Email", f.email || "—", 0],
                      ["Programme", f.program || "—", 1],
                      ["Programme type", f.program_type ? `${f.program_type} · ${years} years` : "—", 1],
                      ["Level", levelLabel(level || null), 1],
                      ["Card valid for", period || "—", 1],
                      ["Study mode", f.period, 1],
                      ["Gender / date of birth", [f.gender, fmtDob(f.dob)].filter(Boolean).join(" · ") || "—", 1],
                    ] as const
                  ).map(([k, v, s]) => (
                    <div key={k} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <dt className="text-muted">{k}</dt>
                      <dd className="flex items-center gap-3 text-right font-semibold">
                        {v}
                        <button type="button" onClick={() => go(s)} className="text-xs font-semibold text-ndc-red hover:underline">
                          Edit
                        </button>
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="flex items-center justify-between rounded-md bg-paper px-4 py-4">
                  <span className="text-sm font-semibold">Membership dues</span>
                  <span className="font-display text-3xl font-extrabold">{fee}</span>
                </div>
                {testMode && (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                    <b>Test mode:</b> payments are simulated. No real money will be charged.
                  </p>
                )}
              </>
            )}
          </div>

          {error && (
            <p key={errorKey} role="alert" className="anim-shake mt-5 rounded-md border border-ndc-red/30 bg-ndc-red/5 px-4 py-2.5 text-sm font-medium text-ndc-red">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-paper/60 px-5 py-4 sm:px-8">
          <button type="button" onClick={() => go(step - 1)} disabled={step === 0 || busy} className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < 3 ? (
            <button type="button" onClick={() => go(step + 1)} className="btn btn-dark px-6">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={busy} className="btn btn-primary px-6 py-3 text-base">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
              {busy ? "Opening checkout…" : `Pay ${fee}`}
            </button>
          )}
        </div>
      </div>

      {/* ---------- Live card preview ---------- */}
      <aside className="lg:sticky lg:top-24">
        <p className="text-sm font-semibold">Card preview</p>
        <p className="mt-0.5 text-xs text-muted">Your membership number is assigned after payment.</p>
        <div className="mt-4 flex justify-center lg:justify-start">
          <CardFront d={card} />
        </div>
        <p className="mt-5 flex items-center gap-2 text-xs text-muted">
          <Lock className="h-3.5 w-3.5" /> Your details and photo are only used for your TEIN UENR membership.
        </p>
      </aside>
    </div>
  );
}

function StepTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="font-display text-3xl font-bold uppercase">{title}</h2>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </div>
  );
}
