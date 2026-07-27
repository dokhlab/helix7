"use client";

import { useMemo, useState } from "react";
import { ACTION_COLOR, ACTION_ORDER, formatAffinity } from "@/lib/constants";
import type { Bioactivity } from "@/lib/types";

interface Group {
  action: string;
  count: number;
  items: Bioactivity[];
}

/**
 * Ligand pharmacology: a potency strip plot (pKi/pIC50/pEC50, higher = more
 * potent) coloured by action, over a filterable table. Every row links to the
 * paper the measurement came from.
 */
export function PharmacologyPanel({
  groups,
  total,
}: {
  groups: Group[];
  total: number;
}) {
  const actions = groups.map((g) => g.action);
  const [filter, setFilter] = useState<string | null>(null);

  const all = useMemo(
    () => groups.flatMap((g) => g.items),
    [groups],
  );
  const shown = useMemo(() => {
    const rows = filter ? all.filter((r) => r.action === filter) : all;
    return [...rows].sort((a, b) => (b.pValue ?? -99) - (a.pValue ?? -99));
  }, [all, filter]);

  const quant = all.filter((r) => r.pValue != null);
  const pMin = 3;
  const pMax = 12;

  return (
    <div className="space-y-5">
      {/* Action summary chips */}
      <div className="flex flex-wrap gap-2">
        <Chip active={filter === null} onClick={() => setFilter(null)}>
          All <span className="opacity-60">{total}</span>
        </Chip>
        {ACTION_ORDER.filter((a) => actions.includes(a)).map((a) => {
          const g = groups.find((x) => x.action === a)!;
          return (
            <Chip
              key={a}
              active={filter === a}
              color={ACTION_COLOR[a]}
              onClick={() => setFilter(filter === a ? null : a)}
            >
              {a} <span className="opacity-60">{g.count}</span>
            </Chip>
          );
        })}
      </div>

      {/* Potency strip plot */}
      {quant.length > 0 && (
        <div className="panel p-4">
          <div className="mono-label mb-3 flex items-center justify-between">
            <span>Potency · higher is more potent (−log₁₀ M)</span>
            <span>{quant.length} measured</span>
          </div>
          <div className="relative h-16">
            {/* axis ticks */}
            {[4, 6, 8, 10, 12].map((p) => (
              <div
                key={p}
                className="absolute top-0 flex h-full flex-col justify-between"
                style={{ left: `${((p - pMin) / (pMax - pMin)) * 100}%` }}
              >
                <div className="h-full w-px bg-[var(--color-line)]" />
                <span className="absolute -bottom-4 -translate-x-1/2 text-[10px] text-[var(--color-ink-faint)]">
                  {p}
                </span>
              </div>
            ))}
            {/* points */}
            {quant
              .filter((r) => !filter || r.action === filter)
              .map((r, i) => {
                const x = ((Math.min(pMax, Math.max(pMin, r.pValue!)) - pMin) / (pMax - pMin)) * 100;
                return (
                  <div
                    key={r._id ?? i}
                    className="group absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-1 ring-black/40"
                    style={{
                      left: `${x}%`,
                      top: `${15 + ((i * 37) % 60)}%`,
                      background: ACTION_COLOR[r.action] ?? "var(--color-ink-faint)",
                    }}
                    title={`${r.ligandName} · ${r.assayType} ${formatAffinity(r.valueNm)} · ${r.action}`}
                  />
                );
              })}
          </div>
        </div>
      )}

      {/* Ligand table */}
      <div className="panel overflow-hidden">
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--color-surface)]">
              <tr className="border-b border-[var(--color-line)] text-left">
                <th className="mono-label py-2 pl-4 font-normal">Ligand</th>
                <th className="mono-label py-2 font-normal">Action</th>
                <th className="mono-label py-2 font-normal">Assay</th>
                <th className="mono-label py-2 text-right font-normal">Affinity</th>
                <th className="mono-label py-2 pr-4 text-right font-normal">Ref</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 300).map((r, i) => (
                <tr
                  key={r._id ?? i}
                  className="border-b border-[var(--color-line)]/40 hover:bg-[var(--color-surface-2)]"
                >
                  <td className="py-2 pl-4">
                    <span className="font-medium">{r.ligandName}</span>
                    {r.isApprovedDrug && (
                      <span className="ml-2 rounded bg-[color-mix(in_oklab,var(--color-tclin)_18%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-tclin)]">
                        drug
                      </span>
                    )}
                    {r.isEndogenous && (
                      <span className="ml-1.5 text-[10px] text-[var(--color-ink-faint)]">
                        endogenous
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs"
                      style={{ color: ACTION_COLOR[r.action] ?? "var(--color-ink-muted)" }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: ACTION_COLOR[r.action] ?? "var(--color-ink-faint)" }}
                      />
                      {r.action}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-[var(--color-ink-muted)]">
                    {r.assayType}
                  </td>
                  <td className="numeric py-2 text-right text-[var(--color-ink)]">
                    {r.relation && r.relation !== "=" ? r.relation : ""}
                    {formatAffinity(r.valueNm)}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {r.referencePmid ? (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${r.referencePmid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--color-helix)] hover:underline"
                      >
                        {r.referencePmid}
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--color-ink-faint)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length > 300 && (
          <div className="border-t border-[var(--color-line)] px-4 py-2 text-center text-xs text-[var(--color-ink-faint)]">
            Showing 300 of {shown.length} — refine with an action filter.
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors"
      style={{
        borderColor: active ? color ?? "var(--color-helix)" : "var(--color-line)",
        background: active
          ? `color-mix(in oklab, ${color ?? "var(--color-helix)"} 16%, transparent)`
          : "transparent",
        color: active ? color ?? "var(--color-helix)" : "var(--color-ink-muted)",
      }}
    >
      {children}
    </button>
  );
}
