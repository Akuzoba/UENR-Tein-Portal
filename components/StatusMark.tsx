const TONES = {
  ok: { bg: "bg-ndc-green", path: "M15 27 L23 35 L38 18" },
  warn: { bg: "bg-amber-500", path: "M26 14 V29 M26 37 V38" },
  bad: { bg: "bg-ndc-red", path: "M18 18 L34 34 M34 18 L18 34" },
};

/** Solid circle with a tick / exclamation / cross that draws itself in. */
export default function StatusMark({ tone }: { tone: keyof typeof TONES }) {
  const t = TONES[tone];
  return (
    <div className={`anim-rise mx-auto flex h-20 w-20 items-center justify-center rounded-full ${t.bg}`}>
      <svg viewBox="0 0 52 52" className="h-12 w-12" fill="none" aria-hidden>
        <path
          d={t.path}
          stroke="#fff"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={60}
          style={{ animation: "draw 0.5s ease-out 0.3s both" }}
        />
      </svg>
    </div>
  );
}
