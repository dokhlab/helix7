"use client";

import { useMemo, useState } from "react";
import type { SingleCellExpression } from "@/lib/types";

/** Colour per broad cell class, so the ranked list reads at a glance. */
const CLASS_COLOR: Record<string, string> = {
  Neural: "var(--color-plasma-bright)",
  Immune: "var(--color-class-f)",
  "Muscle/vascular": "var(--color-class-c)",
  Epithelial: "var(--color-class-b1)",
  Reproductive: "var(--color-class-d1)",
  Other: "var(--color-helix)",
};

/**
 * HPA single-cell type expression — a complementary layer to tissue RNA,
 * showing which cell types a receptor is enriched in (nCPM), coloured by
 * broad cell class.
 */
export function SingleCellChart({ cells }: { cells: SingleCellExpression[] }) {
  const [showAll, setShowAll] = useState(false);
  const { sorted, max, classes, byClass } = useMemo(() => {
    const sorted = [...cells].sort((a, b) => b.value - a.value);
    const max = Math.max(1, ...cells.map((c) => c.value));
    const classes = [...new Set(sorted.map((c) => c.cellClass ?? "Other"))];
    // Peak per cell class, so low-but-present populations (e.g. neurons) are
    // always visible even when individual cell types rank far down the list.
    const peak = new Map<string, number>();
    for (const c of cells) {
      const k = c.cellClass ?? "Other";
      peak.set(k, Math.max(peak.get(k) ?? 0, c.value));
    }
    const byClass = [...peak.entries()].sort((a, b) => b[1] - a[1]);
    return { sorted, max, classes, byClass };
  }, [cells]);

  const shown = showAll ? sorted : sorted.slice(0, 15);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="mono-label">
          {showAll ? `All cell types · nCPM (${sorted.length})` : "Top cell types · nCPM"}
        </span>
        {sorted.length > 15 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-[var(--color-helix)] hover:underline"
          >
            {showAll ? "Show top 15" : `Show all ${sorted.length}`}
          </button>
        )}
      </div>

      <div className={`space-y-1.5 ${showAll ? "max-h-[460px] overflow-y-auto pr-1" : ""}`}>
        {shown.map((c) => {
          const color = CLASS_COLOR[c.cellClass ?? "Other"] ?? "var(--color-helix)";
          return (
            <div key={c.cellType} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-xs text-[var(--color-ink-muted)] capitalize">
                {c.cellType}
              </span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--color-surface-3)]">
                <div
                  className="h-full rounded"
                  style={{ width: `${Math.max(1, (c.value / max) * 100)}%`, background: color }}
                />
              </div>
              <span className="numeric w-14 text-right text-xs text-[var(--color-ink)]">
                {c.value.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* By cell class — peak per class, so no class is hidden */}
      <div className="mono-label mb-2 mt-6">By cell class · peak nCPM</div>
      <div className="space-y-1.5">
        {byClass.map(([cls, val]) => {
          const color = CLASS_COLOR[cls] ?? "var(--color-helix)";
          return (
            <div key={cls} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-xs text-[var(--color-ink-muted)]">
                {cls}
              </span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--color-surface-3)]">
                <div
                  className="h-full rounded"
                  style={{ width: `${Math.max(1, (val / max) * 100)}%`, background: color }}
                />
              </div>
              <span className="numeric w-14 text-right text-xs text-[var(--color-ink)]">
                {val.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* class legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[var(--color-line)] pt-3">
        {classes.map((cls) => (
          <span key={cls} className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
            <span className="h-2 w-2 rounded-full" style={{ background: CLASS_COLOR[cls] ?? "var(--color-helix)" }} />
            {cls}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[var(--color-ink-faint)]">
        Single-cell type expression (nCPM) from the Human Protein Atlas — a
        cell-resolution complement to the tissue view, showing the specific cell
        types in which the receptor is expressed.
      </p>
    </div>
  );
}
