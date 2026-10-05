"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";

type Props = { base: string; q: string; status: string; counts?: { all: number; paid: number; pending: number } };

/** Search-as-you-type + status tabs. Updates the URL so results are shareable and server-rendered. */
export default function MemberFilters({ base, q, status, counts }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  const [pending, start] = useTransition();
  const first = useRef(true);

  const go = (nextQ: string, nextStatus: string) => {
    const p = new URLSearchParams();
    if (nextQ) p.set("q", nextQ);
    if (nextStatus) p.set("status", nextStatus);
    start(() => router.replace(`${base}${p.size ? `?${p}` : ""}`, { scroll: false }));
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => go(value.trim(), status), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const tabs = counts
    ? [
        { id: "", label: "All", n: counts.all },
        { id: "paid", label: "Paid", n: counts.paid },
        { id: "pending", label: "Pending", n: counts.pending },
      ]
    : [];

  return (
    <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center">
      {tabs.length > 0 && (
        <div className="flex border-b border-line">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => go(value.trim(), t.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                status === t.id ? "border-ndc-red text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
              <span className="rounded bg-paper px-1.5 text-[11px] tabular-nums">{t.n}</span>
            </button>
          ))}
        </div>
      )}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search name, phone, email, programme or member no." className="input mt-0 pr-10 pl-9" />
        <span className="absolute top-1/2 right-3 -translate-y-1/2">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted" />
          ) : value ? (
            <button onClick={() => setValue("")} className="text-muted hover:text-ink" aria-label="Clear search"><X className="h-4 w-4" /></button>
          ) : null}
        </span>
      </div>
    </div>
  );
}
