"use client";

import { useMemo, useState } from "react";
import type { TissueExpression } from "@/lib/types";

/**
 * Anatomical expression map. A stylised human figure whose organ-system regions
 * are shaded by the receptor's peak expression there, beside a ranked tissue
 * bar chart. Both are driven by the same HPA nTPM values.
 */
export function BodyMap({ expression }: { expression: TissueExpression[] }) {
  const [hover, setHover] = useState<string | null>(null);

  // Peak expression per organ system, and the global max for the colour scale.
  const { bySystem, max, topTissues } = useMemo(() => {
    const bySystem = new Map<string, number>();
    for (const e of expression) {
      const s = e.organSystem ?? "Other";
      bySystem.set(s, Math.max(bySystem.get(s) ?? 0, e.value));
    }
    const max = Math.max(1, ...expression.map((e) => e.value));
    const topTissues = [...expression].sort((a, b) => b.value - a.value).slice(0, 12);
    return { bySystem, max, topTissues };
  }, [expression]);

  const shade = (system: string) => {
    const v = bySystem.get(system) ?? 0;
    const t = Math.min(1, Math.log10(1 + v) / Math.log10(1 + max));
    if (v <= 0) return "var(--color-surface-3)";
    // Teal ramp: faint → luminous.
    return `color-mix(in oklab, var(--color-helix) ${8 + t * 82}%, var(--color-surface-3))`;
  };

  // Region → the label shown on hover.
  const regions: { id: string; system: string; d?: string; cx?: number; cy?: number; r?: number }[] = [
    { id: "brain", system: "Nervous", cx: 100, cy: 34, r: 22 },
    { id: "thyroid", system: "Endocrine", d: "M92 60 h16 v8 h-16 z" },
    { id: "lungs", system: "Respiratory", d: "M74 78 q-10 20 -6 44 q14 6 22 -2 v-42 z M126 78 q10 20 6 44 q-14 6 -22 -2 v-42 z" },
    { id: "heart", system: "Cardiovascular", d: "M92 96 q8 -12 16 0 q8 10 -8 22 q-16 -12 -8 -22 z" },
    { id: "digestive", system: "Digestive", d: "M80 126 h40 v46 q-20 12 -40 0 z" },
    { id: "immune", system: "Immune", cx: 128, cy: 132, r: 9 },
    { id: "kidney", system: "Urinary", d: "M74 150 q-8 6 -6 20 q10 4 12 -6 z M126 150 q8 6 6 20 q-10 4 -12 -6 z" },
    { id: "reproductive", system: "Reproductive", d: "M88 178 h24 v18 q-12 8 -24 0 z" },
    { id: "muscle", system: "Musculoskeletal", d: "M64 92 q-10 40 -6 96 h10 q-2 -60 6 -92 z M136 92 q10 40 6 96 h-10 q2 -60 -6 -92 z" },
    { id: "skin", system: "Integumentary", d: "M100 8 q46 4 46 120 q0 80 -46 96 q-46 -16 -46 -96 q0 -116 46 -120 z" },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(180px,240px)_1fr]">
      {/* Figure */}
      <div className="relative">
        <svg viewBox="0 0 200 230" className="mx-auto w-full max-w-[240px]">
          {/* body silhouette (skin) rendered first, faint */}
          {regions.map((rg) => {
            const active = hover === rg.system;
            const fill = rg.system === "Integumentary" ? "var(--color-surface-2)" : shade(rg.system);
            const common = {
              fill,
              stroke: active ? "var(--color-helix-bright)" : "var(--color-line)",
              strokeWidth: active ? 1.6 : 0.8,
              opacity: rg.system === "Integumentary" ? 0.35 : 1,
              onMouseEnter: () => setHover(rg.system),
              onMouseLeave: () => setHover((h) => (h === rg.system ? null : h)),
              style: { cursor: "pointer", transition: "all 150ms" },
            };
            return rg.d ? (
              <path key={rg.id} d={rg.d} {...common} />
            ) : (
              <circle key={rg.id} cx={rg.cx} cy={rg.cy} r={rg.r} {...common} />
            );
          })}
        </svg>
        <div className="mt-2 text-center text-xs text-[var(--color-ink-muted)]">
          {hover ? (
            <span>
              <span className="font-medium text-[var(--color-ink)]">{hover}</span> —
              peak {(bySystem.get(hover) ?? 0).toFixed(1)} nTPM
            </span>
          ) : (
            <span className="text-[var(--color-ink-faint)]">Hover a region</span>
          )}
        </div>
      </div>

      {/* Ranked tissues */}
      <div>
        <div className="mono-label mb-3">Top tissues · nTPM</div>
        <div className="space-y-1.5">
          {topTissues.map((t) => (
            <div
              key={t.tissue}
              className="flex items-center gap-3"
              onMouseEnter={() => setHover(t.organSystem ?? null)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="w-32 shrink-0 truncate text-xs text-[var(--color-ink-muted)] capitalize">
                {t.tissue}
              </span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--color-surface-3)]">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.max(2, (t.value / max) * 100)}%`,
                    background:
                      hover === t.organSystem
                        ? "var(--color-helix-bright)"
                        : "var(--color-helix)",
                  }}
                />
              </div>
              <span className="numeric w-14 text-right text-xs text-[var(--color-ink)]">
                {t.value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
