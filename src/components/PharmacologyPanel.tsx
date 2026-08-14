"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { ACTION_COLOR, ACTION_ORDER, formatAffinity } from "@/lib/constants";
import type { Bioactivity } from "@/lib/types";

const PAGE_SIZE = 100;

interface Group {
  action: string;
  count: number;
  items: Bioactivity[];
}

const COLUMNS = [
  { key: "ligand", label: "Ligand", align: "left", width: 260, min: 120 },
  { key: "action", label: "Action", align: "left", width: 150, min: 90 },
  { key: "assay", label: "Assay", align: "left", width: 130, min: 70 },
  { key: "affinity", label: "Affinity", align: "right", width: 130, min: 80 },
  { key: "ref", label: "Ref", align: "right", width: 110, min: 70 },
] as const;

/** Draggable column widths for the ligand table (persisted in component state). */
function useColumnWidths() {
  const [widths, setWidths] = useState<number[]>(() => COLUMNS.map((c) => c.width));
  const drag = useRef<{ index: number; startX: number; startW: number } | null>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const next = Math.max(COLUMNS[d.index].min, d.startW + (e.clientX - d.startX));
    setWidths((w) => {
      const copy = [...w];
      copy[d.index] = next;
      return copy;
    });
  }, []);

  const onPointerUp = useCallback(() => {
    drag.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  const startResize = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      drag.current = { index, startX: e.clientX, startW: widths[index] };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [widths, onPointerMove, onPointerUp],
  );

  return { widths, startResize };
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
  const [query, setQuery] = useState("");
  const [assay, setAssay] = useState<string>("");
  const [minNm, setMinNm] = useState("");
  const [maxNm, setMaxNm] = useState("");
  const [page, setPage] = useState(1);
  const { widths, startResize } = useColumnWidths();
  const tableWidth = widths.reduce((a, b) => a + b, 0);

  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const assayTypes = useMemo(
    () => [...new Set(all.map((r) => r.assayType))].filter(Boolean).sort(),
    [all],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minNm.trim() === "" ? null : Number(minNm);
    const max = maxNm.trim() === "" ? null : Number(maxNm);
    const rows = all.filter((r) => {
      if (filter && r.action !== filter) return false;
      if (assay && r.assayType !== assay) return false;
      if (q && !r.ligandName.toLowerCase().includes(q)) return false;
      if (min != null || max != null) {
        if (r.valueNm == null) return false;
        if (min != null && !Number.isNaN(min) && r.valueNm < min) return false;
        if (max != null && !Number.isNaN(max) && r.valueNm > max) return false;
      }
      return true;
    });
    return rows.sort((a, b) => (b.pValue ?? -99) - (a.pValue ?? -99));
  }, [all, filter, assay, query, minNm, maxNm]);

  // Any filter change returns to the first page.
  useEffect(() => {
    setPage(1);
  }, [filter, assay, query, minNm, maxNm]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const filtersActive =
    filter !== null || query !== "" || assay !== "" || minNm !== "" || maxNm !== "";

  const quant = filtered.filter((r) => r.pValue != null);
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
              .slice(0, 800)
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

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ligands by name…"
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-helix)] focus:outline-none"
          />
        </div>

        <select
          value={assay}
          onChange={(e) => setAssay(e.target.value)}
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-helix)] focus:outline-none"
          aria-label="Filter by assay type"
        >
          <option value="">All assays</option>
          {assayTypes.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-sm">
          <span className="mono-label whitespace-nowrap">Affinity nM</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={minNm}
            onChange={(e) => setMinNm(e.target.value)}
            placeholder="min"
            className="numeric w-16 bg-transparent text-right text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none"
          />
          <span className="text-[var(--color-ink-faint)]">–</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={maxNm}
            onChange={(e) => setMaxNm(e.target.value)}
            placeholder="max"
            className="numeric w-16 bg-transparent text-right text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none"
          />
        </div>

        {filtersActive && (
          <button
            onClick={() => {
              setFilter(null);
              setQuery("");
              setAssay("");
              setMinNm("");
              setMaxNm("");
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] px-2.5 py-2 text-xs text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-line-bright)] hover:text-[var(--color-ink)]"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Ligand table */}
      <div className="panel overflow-hidden">
        <div className="max-h-[640px] overflow-auto">
          <table
            className="text-sm"
            style={{ width: tableWidth, minWidth: "100%", tableLayout: "fixed" }}
          >
            <colgroup>
              {COLUMNS.map((c, i) => (
                <col key={c.key} style={{ width: widths[i] }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[var(--color-surface)]">
              <tr className="border-b border-[var(--color-line)] text-left">
                {COLUMNS.map((c, i) => (
                  <th
                    key={c.key}
                    className={`mono-label relative px-4 py-2 font-normal ${
                      c.align === "right" ? "text-right" : ""
                    }`}
                  >
                    {c.label}
                    {i < COLUMNS.length - 1 && (
                      <span
                        onPointerDown={(e) => startResize(i, e)}
                        onDoubleClick={(e) => e.preventDefault()}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${c.label} column`}
                        title="Drag to resize"
                        className="absolute -right-1 top-0 z-20 flex h-full w-2 cursor-col-resize touch-none items-stretch justify-center"
                      >
                        <span className="my-1 w-px bg-[var(--color-line)] transition-colors hover:bg-[var(--color-helix)]" />
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr
                  key={r._id ?? i}
                  className="border-b border-[var(--color-line)]/40 hover:bg-[var(--color-surface-2)]"
                >
                  <td className="px-4 py-2 align-top">
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
                  <td className="px-4 py-2 align-top">
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
                  <td className="px-4 py-2 align-top text-xs text-[var(--color-ink-muted)]">
                    {r.assayType}
                  </td>
                  <td className="numeric px-4 py-2 text-right align-top text-[var(--color-ink)]">
                    {r.relation && r.relation !== "=" ? r.relation : ""}
                    {formatAffinity(r.valueNm)}
                  </td>
                  <td className="px-4 py-2 text-right align-top">
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
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-4 py-10 text-center text-sm text-[var(--color-ink-faint)]"
                  >
                    No ligands match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] px-4 py-3 text-xs text-[var(--color-ink-muted)]">
          <span>
            {filtered.length === 0
              ? "No results"
              : `Showing ${pageStart + 1}–${Math.min(
                  pageStart + PAGE_SIZE,
                  filtered.length,
                )} of ${filtered.length.toLocaleString()}`}
            {filtersActive && filtered.length !== all.length && (
              <span className="text-[var(--color-ink-faint)]">
                {" "}
                (filtered from {all.length.toLocaleString()})
              </span>
            )}
          </span>

          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <PageButton
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </PageButton>
              <span className="whitespace-nowrap">
                Page {currentPage} of {pageCount}
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                Go to
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={currentPage}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n)) {
                      setPage(Math.min(pageCount, Math.max(1, n)));
                    }
                  }}
                  className="numeric w-14 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-center text-[var(--color-ink)] focus:border-[var(--color-helix)] focus:outline-none"
                  aria-label="Go to page"
                />
              </span>
              <PageButton
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </PageButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-[var(--color-line)] px-2.5 py-1 text-xs transition-colors enabled:hover:border-[var(--color-line-bright)] enabled:hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
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
