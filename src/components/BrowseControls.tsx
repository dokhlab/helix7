"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { CLASSES, ORGAN_SYSTEMS } from "@/lib/constants";
import type { ReceptorQuery } from "@/lib/data";

/** Filter + sort bar. Updates the URL so state is shareable and server-rendered. */
export function BrowseControls({ current }: { current: ReceptorQuery }) {
  const router = useRouter();

  const update = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      const merged = {
        class: current.classCode,
        grafs: current.grafs,
        tdl: current.tdl,
        system: current.organSystem,
        hasStructure: current.hasStructure ? "1" : undefined,
        olfactory: current.includeOlfactory ? "1" : undefined,
        orphan: current.orphanOnly ? "1" : undefined,
        q: current.search,
        sort: current.sort,
        ...patch,
      };
      for (const [k, v] of Object.entries(merged)) {
        if (v) params.set(k, v);
      }
      router.push(`/browse?${params.toString()}`);
    },
    [current, router],
  );

  const tdls = ["Tclin", "Tchem", "Tbio", "Tdark"] as const;

  return (
    <div className="panel flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
      {/* Class */}
      <Group label="Class">
        <Pill active={!current.classCode} onClick={() => update({ class: undefined })}>
          All
        </Pill>
        {CLASSES.filter((c) => !["O1", "O2", "D1", "Other"].includes(c.code)).map((c) => (
          <Pill
            key={c.code}
            active={current.classCode === c.code}
            color={c.color}
            onClick={() =>
              update({ class: current.classCode === c.code ? undefined : c.code })
            }
          >
            {c.code}
          </Pill>
        ))}
      </Group>

      {/* TDL */}
      <Group label="Development">
        {tdls.map((t) => (
          <Pill
            key={t}
            active={current.tdl === t}
            onClick={() => update({ tdl: current.tdl === t ? undefined : t })}
          >
            {t}
          </Pill>
        ))}
      </Group>

      {/* Organ system */}
      <Group label="System">
        <select
          value={current.organSystem ?? ""}
          onChange={(e) => update({ system: e.target.value || undefined })}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-helix-deep)]"
        >
          <option value="">Any</option>
          {ORGAN_SYSTEMS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Group>

      {/* Toggles */}
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
        <input
          type="checkbox"
          checked={!!current.hasStructure}
          onChange={(e) => update({ hasStructure: e.target.checked ? "1" : undefined })}
          className="accent-[var(--color-helix)]"
        />
        Has structure
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
        <input
          type="checkbox"
          checked={!!current.includeOlfactory}
          onChange={(e) => update({ olfactory: e.target.checked ? "1" : undefined })}
          className="accent-[var(--color-helix)]"
        />
        Include olfactory
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
        <input
          type="checkbox"
          checked={!!current.orphanOnly}
          onChange={(e) => update({ orphan: e.target.checked ? "1" : undefined })}
          className="accent-[var(--color-plasma)]"
        />
        Orphans only
      </label>

      {/* Sort */}
      <Group label="Sort">
        <select
          value={current.sort ?? "score"}
          onChange={(e) => update({ sort: e.target.value })}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-helix-deep)]"
        >
          <option value="score">Development interest</option>
          <option value="gene">Gene symbol</option>
          <option value="structures">Structure count</option>
          <option value="ligands">Ligand count</option>
        </select>
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="mono-label">{label}</span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

function Pill({
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
      className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
        active
          ? "text-[var(--color-void)]"
          : "border border-[var(--color-line)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      }`}
      style={active ? { background: color ?? "var(--color-helix)" } : undefined}
    >
      {children}
    </button>
  );
}
