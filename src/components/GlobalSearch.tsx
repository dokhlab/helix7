"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { CLASS_COLOR } from "@/lib/constants";

interface Hit {
  _id: string;
  gene: string;
  name: string;
  classCode: string;
  tdl?: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced fetch.
  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setHits(data.hits ?? []);
        setActive(0);
        setOpen(true);
      } catch {
        /* aborted */
      }
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // Cmd/Ctrl-K to focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click-away.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (hit: Hit) => {
    setOpen(false);
    setQ("");
    router.push(`/receptor/${hit._id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 focus-within:border-[var(--color-helix-deep)]">
        <Search size={15} className="text-[var(--color-ink-faint)]" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search receptors…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-ink-faint)]"
          aria-label="Search receptors"
        />
        <kbd className="hidden rounded border border-[var(--color-line)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-faint)] sm:block">
          ⌘K
        </kbd>
      </div>

      {open && hits.length > 0 && (
        <div className="panel absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden py-1 shadow-2xl">
          {hits.map((h, i) => (
            <button
              key={h._id}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(h)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                i === active ? "bg-[var(--color-surface-2)]" : ""
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: CLASS_COLOR[h.classCode] ?? "var(--color-ink-faint)",
                }}
              />
              <span className="font-medium">{h.gene}</span>
              <span className="truncate text-[var(--color-ink-muted)]">
                {h.name}
              </span>
              {h.tdl && (
                <span className="mono-label ml-auto shrink-0">{h.tdl}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
