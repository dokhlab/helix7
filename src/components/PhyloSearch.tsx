"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { CLASS_COLOR } from "@/lib/constants";
import type { GeneMatch, GeneOption } from "@/lib/receptorMatch";
import { nonGpcrNote } from "@/lib/fuzzySearch";

/** Typing previews up to this many matches on the tree (a family, not the whole tree). */
export const MAX_BULK = 40;

interface Props {
  options: GeneOption[];
  query: string;
  onQuery: (q: string) => void;
  matches: GeneMatch[];
  picked: GeneOption[];
  onPick: (slugs: string[]) => void;
  onUnpick: (slug: string) => void;
  onClear: () => void;
}

/** Gene-symbol combobox with suggestions, multi-select chips and a not-found message. */
export function PhyloSearch({
  options,
  query,
  onQuery,
  matches,
  picked,
  onPick,
  onUnpick,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setActive(0), [query]);

  // Keep the keyboard-selected row visible as the list scrolls.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const shown = matches;
  const pickedSet = useMemo(() => new Set(picked.map((p) => p.slug)), [picked]);
  const term = query.trim();
  const note = useMemo(() => nonGpcrNote(term), [term]);

  const choose = (slugs: string[]) => {
    onPick(slugs);
    onQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && shown.length) {
      e.preventDefault();
      choose([shown[active].option.slug]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && picked.length) {
      onUnpick(picked[picked.length - 1].slug);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 focus-within:border-[var(--color-helix-deep)]">
        <Search size={15} className="shrink-0 text-[var(--color-ink-faint)]" />
        {picked.map((p) => (
          <span
            key={p.slug}
            className="flex items-center gap-1 rounded-md bg-[var(--color-surface-3)] px-1.5 py-0.5 text-xs font-medium"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: CLASS_COLOR[p.classCode ?? ""] ?? "var(--color-ink-faint)" }}
            />
            {p.gene}
            <button
              type="button"
              aria-label={`Remove ${p.gene}`}
              onClick={() => onUnpick(p.slug)}
              className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            onQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={picked.length ? "Add another receptor…" : "Gene or name: ADRB2, dopamine, mu opioid…"}
          aria-label="Highlight receptors in the tree by gene or name"
          role="combobox"
          aria-expanded={open && shown.length > 0}
          aria-autocomplete="list"
          className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-ink-faint)]"
        />
        {picked.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
          >
            Clear
          </button>
        )}
      </div>

      {open && term && (
        <div
          className="panel absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden shadow-2xl"
        >
          {note && (
            <div className="border-b border-[var(--color-line)] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">
              {note}
            </div>
          )}
          {shown.length === 0 ? (
            note ? null : <div className="px-3 py-2.5 text-sm text-[var(--color-ink-muted)]">
              <span className="font-medium text-[var(--color-ink)]">“{term}”</span> is not
              in Helix7. The atlas covers all {options.length} human GPCRs, matching
              gene symbols, previous symbols, receptor names and synonyms, and
              families, so this is most likely not a human GPCR (or it is spelled
              differently).
            </div>
          ) : (
            <>
              <div
                ref={listRef}
                role="listbox"
                className="max-h-[min(55vh,440px)] overflow-y-auto overscroll-contain py-1"
              >
              {shown.map((m, i) => (
                <button
                  key={m.option.slug}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose([m.option.slug])}
                  className={`flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm ${
                    i === active ? "bg-[var(--color-surface-2)]" : ""
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background: CLASS_COLOR[m.option.classCode ?? ""] ?? "var(--color-ink-faint)",
                    }}
                  />
                  <span className="font-medium">{m.option.gene}</span>
                  <span className="truncate text-[var(--color-ink-muted)]">
                    {m.option.name}
                    {m.via && (
                      <span className="text-[var(--color-ink-faint)]"> · alias {m.via}</span>
                    )}
                  </span>
                  {pickedSet.has(m.option.slug) && (
                    <span className="mono-label ml-auto shrink-0">shown</span>
                  )}
                </button>
              ))}
              </div>
              {matches.length > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--color-line)] px-3 py-1.5 text-xs text-[var(--color-ink-faint)]">
                  <span>
                    {matches.length} matches{matches.length > 8 ? " · scroll for more" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => choose(matches.map((m) => m.option.slug))}
                    className="text-[var(--color-helix-bright)] hover:underline"
                  >
                    Highlight all {matches.length}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
