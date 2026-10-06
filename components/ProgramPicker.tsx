"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

type Props = {
  programs: string[];
  id?: string;
  /** Controlled value. Leave out and use defaultValue + name inside a plain form. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
};

/** Every word typed must appear somewhere in the name, so "comp sci" finds "BSc Computer Science". */
export function searchPrograms(programs: string[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return programs.filter((p) => words.every((w) => p.toLowerCase().includes(w)));
}

function matchPrograms(programs: string[], query: string) {
  const hits = searchPrograms(programs, query);
  // "Other" stays reachable whatever is typed.
  return programs.includes("Other") && !hits.includes("Other") ? [...hits, "Other"] : hits;
}

/** Searchable programme dropdown: type to filter, arrow keys to move, Enter to pick. */
export default function ProgramPicker({ programs, id, value, defaultValue = "", onChange, name, placeholder = "Search your programme" }: Props) {
  const [own, setOwn] = useState(defaultValue);
  const selected = value ?? own;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const list = useRef<HTMLUListElement>(null);
  const hits = matchPrograms(programs, query);

  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function pick(p: string) {
    setOwn(p);
    onChange?.(p);
    setOpen(false);
    setQuery("");
  }

  function show() {
    setOpen(true);
    setQuery("");
    setActive(Math.max(0, programs.indexOf(selected)));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      return show();
    }
    if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, hits.length - 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
    else if (e.key === "Enter" && hits[active]) pick(hits[active]);
    else if (e.key === "Escape") setOpen(false);
    else return;
    e.preventDefault();
  }

  return (
    <div className="relative mt-1.5">
      {name && <input type="hidden" name={name} value={selected} />}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && hits[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={open ? query : selected}
          placeholder={open && selected ? selected : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={show}
          onClick={() => !open && show()}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="input mt-0 truncate pr-16 pl-9"
        />
        <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
          {selected && !open && (
            <button
              type="button"
              onClick={() => pick("")}
              className="rounded p-1 text-muted transition-colors hover:bg-paper hover:text-ink"
              aria-label="Clear programme"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className={`pointer-events-none mx-1 h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </div>
      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          className="absolute inset-x-0 z-30 mt-1 max-h-64 overflow-auto rounded-md border border-line bg-white py-1 shadow-lg"
        >
          {hits.length ? (
            hits.map((p, i) => (
              <li
                key={p}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={p === selected}
                // mousedown keeps focus in the input so the list doesn't close before the click lands
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                onMouseMove={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${i === active ? "bg-paper" : ""} ${
                  p === selected ? "font-semibold text-ndc-green" : "text-ink"
                }`}
              >
                {p}
                {p === selected && <Check className="h-4 w-4 shrink-0" />}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-muted">No programme matches “{query}”</li>
          )}
        </ul>
      )}
    </div>
  );
}
