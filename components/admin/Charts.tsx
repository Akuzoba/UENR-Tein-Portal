"use client";

import { useState } from "react";

// Single-series marks in one green, validated against the white chart surface. Text stays in ink tokens.
const MARK = "#0b7a3b";

export type Day = { date: string; label: string; total: number; paid: number };

/** Registrations per day. Hover (or focus) a column for the exact numbers. */
export function DailyBars({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(4, ...days.map((d) => d.total));
  const ticks = [max, Math.round(max / 2), 0];
  const sum = days.reduce((s, d) => s + d.total, 0);

  return (
    <figure>
      <div className="flex h-56 gap-3" role="img" aria-label={`Registrations per day for the last ${days.length} days, ${sum} in total.`}>
        <div className="flex flex-col justify-between pb-6 text-right text-[11px] text-muted tabular-nums">
          {ticks.map((t, i) => <span key={i} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{t}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {ticks.map((_, i) => <div key={i} className={`h-px ${i === ticks.length - 1 ? "bg-ink/40" : "bg-line/70"}`} />)}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-[2px]">
            {days.map((d, i) => {
              const h = (d.total / max) * 100;
              return (
                <button
                  key={d.date}
                  type="button"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="relative flex h-full flex-1 items-end justify-center outline-none"
                  aria-label={`${d.label}: ${d.total} registered, ${d.paid} paid`}
                >
                  <span
                    className="block w-full max-w-7 origin-bottom rounded-t-[4px] transition-opacity"
                    style={{
                      height: `${h}%`,
                      minHeight: d.total ? 3 : 0,
                      background: MARK,
                      opacity: hover === null || hover === i ? 1 : 0.35,
                      animation: `grow-y 0.7s cubic-bezier(.2,.8,.2,1) ${150 + i * 25}ms both`,
                    }}
                  />
                  {hover === i && (
                    <span
                      className="anim-fade pointer-events-none absolute z-10 rounded-md border border-line bg-white px-3 py-2 text-left text-xs whitespace-nowrap shadow-lg"
                      style={{ bottom: `calc(${h}% + 8px)` }}
                    >
                      <span className="block font-semibold text-ink">{d.label}</span>
                      <span className="block text-muted"><b className="text-ink">{d.total}</b> registered</span>
                      <span className="block text-muted"><b className="text-ink">{d.paid}</b> paid</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-[2px] text-[10px] text-muted">
            {days.map((d, i) => (
              <span key={d.date} className="flex-1 text-center">{i % 2 === days.length % 2 ? "" : d.label.split(" ")[0]}</span>
            ))}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>Registrations per day</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}><th>{d.label}</th><td>{d.total}</td><td>{d.paid} paid</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Ranked horizontal bars (members per programme). */
export function RankBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="py-10 text-center text-sm text-muted">No data yet.</p>;
  return (
    <ul className="space-y-3.5">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="mb-1.5 flex justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="font-semibold tabular-nums">{r.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper">
            <div
              className="h-full origin-left rounded-full"
              style={{ width: `${(r.value / max) * 100}%`, background: MARK, animation: `grow-x 0.8s cubic-bezier(.2,.8,.2,1) ${100 + i * 60}ms both` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Progress ring for a single headline rate. */
export function Ring({ value, label }: { value: number; label: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#efece5" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={MARK}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-extrabold">{Math.round(value)}%</span>
        <span className="text-[10px] font-semibold tracking-wider text-muted uppercase">{label}</span>
      </div>
    </div>
  );
}
