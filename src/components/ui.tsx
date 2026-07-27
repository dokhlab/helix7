import { CLASS_COLOR, CLASS_LABEL, TDL_META } from "@/lib/constants";
import { SOURCE_BY_ID, LICENSES } from "@/lib/sources";
import type { Provenance } from "@/lib/types";

/** GPCR class chip — coloured dot + code, colour consistent site-wide. */
export function ClassBadge({ code }: { code: string }) {
  const color = CLASS_COLOR[code] ?? "var(--color-ink-faint)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2 py-0.5 text-xs font-medium"
      title={`Class ${code} · ${CLASS_LABEL[code] ?? ""}`}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {code}
    </span>
  );
}

/** Target Development Level pill. */
export function TdlBadge({ tdl }: { tdl?: string }) {
  const meta = TDL_META[(tdl as keyof typeof TDL_META) ?? "Unknown"] ?? TDL_META.Unknown;
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
      style={{
        color: meta.color,
        background: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
        border: `1px solid color-mix(in oklab, ${meta.color} 35%, transparent)`,
      }}
      title={meta.blurb}
    >
      {meta.label}
    </span>
  );
}

/** Orphan-receptor marker — no known endogenous ligand. */
export function OrphanBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        color: "var(--color-plasma-bright)",
        background: "color-mix(in oklab, var(--color-plasma) 14%, transparent)",
        border: "1px solid color-mix(in oklab, var(--color-plasma) 38%, transparent)",
      }}
      title="Orphan receptor — no known endogenous ligand (GPCRdb orphan family)"
    >
      {compact ? "◇" : "Orphan"}
    </span>
  );
}

/** Section heading with a mono eyebrow label. */
export function SectionTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mono-label mb-1">{eyebrow}</div>}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {right}
    </div>
  );
}

/** Big labelled stat used on the homepage counters. */
export function StatTile({
  value,
  label,
  accent = "var(--color-helix)",
}: {
  value: string | number;
  label: string;
  accent?: string;
}) {
  return (
    <div className="panel px-4 py-3.5">
      <div
        className="numeric text-2xl font-semibold tracking-tight"
        style={{ color: accent }}
      >
        {value}
      </div>
      <div className="mono-label mt-1">{label}</div>
    </div>
  );
}

/** Horizontal micro-bar for a 0..1 or 0..max component value. */
export function MiniBar({
  value,
  max = 1,
  color = "var(--color-helix)",
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

/**
 * Provenance strip — lists the sources whose data appears on the page, each with
 * its licence, so attribution travels with the record (required by the CC BY /
 * CC BY-SA sources).
 */
export function ProvenanceStrip({ provenance }: { provenance: Provenance[] }) {
  // De-duplicate by source, keeping the first-seen entry.
  const seen = new Set<string>();
  const items = provenance.filter((p) => {
    if (seen.has(p.source)) return false;
    seen.add(p.source);
    return true;
  });
  if (!items.length) return null;

  return (
    <div className="mt-8 border-t border-[var(--color-line)] pt-4">
      <div className="mono-label mb-2">Sources &amp; attribution</div>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => {
          const src = SOURCE_BY_ID[p.source];
          const lic = src ? LICENSES[src.license] : undefined;
          return (
            <a
              key={p.source}
              href={src?.url ?? p.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-xs transition-colors hover:border-[var(--color-line-bright)]"
              title={src ? `${src.name} — ${lic?.name}` : p.source}
            >
              <span className="font-medium text-[var(--color-ink)]">
                {src?.name ?? p.source}
              </span>
              {lic && (
                <span
                  className="text-[10px]"
                  style={{
                    color: lic.shareAlike
                      ? "var(--color-class-c)"
                      : "var(--color-ink-faint)",
                  }}
                >
                  {lic.id}
                </span>
              )}
            </a>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[var(--color-ink-faint)]">
        Data redistributed under each source&apos;s licence. See{" "}
        <a href="/docs/licenses" className="text-[var(--color-helix)] hover:underline">
          Citation &amp; licenses
        </a>
        .
      </p>
    </div>
  );
}

/** Empty-state block for sparse (e.g. olfactory) receptors. */
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel flex items-center gap-3 px-4 py-6 text-sm text-[var(--color-ink-faint)]">
      <span className="text-[var(--color-line-bright)]">—</span>
      {children}
    </div>
  );
}
