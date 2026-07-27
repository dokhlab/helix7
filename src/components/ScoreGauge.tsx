import type { DevInterest } from "@/lib/types";
import { TDL_META } from "@/lib/constants";

const COMPONENT_LABELS: Record<string, string> = {
  literature: "Literature",
  ligands: "Ligands",
  approvedDrugs: "Approved drugs",
  structures: "Structures",
  disease: "Disease evidence",
};

/**
 * Radial gauge for the 0–100 development-interest score, with the weighted
 * component breakdown beneath it so the number is never a black box.
 */
export function ScoreGauge({ dev }: { dev: DevInterest }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, dev.score));
  const dash = (pct / 100) * C;
  const tdl = TDL_META[dev.tdl] ?? TDL_META.Unknown;

  const comps = Object.entries(dev.components ?? {}).sort((a, b) => b[1] - a[1]);
  const weights = (dev as unknown as { weights?: Record<string, number> }).weights ?? {};

  return (
    <div className="panel p-5">
      <div className="mono-label mb-3">Development interest</div>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="132" height="132" viewBox="0 0 132 132">
            <circle
              cx="66"
              cy="66"
              r={R}
              fill="none"
              stroke="var(--color-surface-3)"
              strokeWidth="9"
            />
            <circle
              cx="66"
              cy="66"
              r={R}
              fill="none"
              stroke="var(--color-helix)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              transform="rotate(-90 66 66)"
              style={{ filter: "drop-shadow(0 0 6px var(--color-helix-deep))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="numeric text-3xl font-bold text-[var(--color-ink)]">
              {dev.score.toFixed(0)}
            </span>
            <span className="mono-label">/ 100</span>
          </div>
        </div>

        <div className="flex-1">
          <span
            className="inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold"
            style={{
              color: tdl.color,
              background: `color-mix(in oklab, ${tdl.color} 14%, transparent)`,
              border: `1px solid color-mix(in oklab, ${tdl.color} 35%, transparent)`,
            }}
          >
            {tdl.label}
          </span>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
            {tdl.blurb}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--color-ink-faint)]">
            <span>{dev.raw.citationCount.toLocaleString()} refs</span>
            <span>·</span>
            <span>{dev.raw.ligandCount} ligands</span>
            <span>·</span>
            <span>{dev.raw.structureCount} structures</span>
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="mt-5 space-y-2">
        {comps.map(([key, value]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-[var(--color-ink-muted)]">
              {COMPONENT_LABELS[key] ?? key}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
              <div
                className="h-full rounded-full bg-[var(--color-helix)]"
                style={{ width: `${value * 100}%`, opacity: 0.55 + value * 0.45 }}
              />
            </div>
            <span className="numeric w-9 text-right text-[10px] text-[var(--color-ink-faint)]">
              ×{((weights[key] ?? 0) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
