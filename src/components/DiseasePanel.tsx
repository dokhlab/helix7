import type { Receptor } from "@/lib/types";
import { SectionTitle, EmptyNote } from "./ui";

/**
 * Disease associations (Open Targets, scored) with the evidence datatypes
 * behind each score, plus any curated genetic variants.
 */
export function DiseasePanel({ receptor }: { receptor: Receptor }) {
  const diseases = receptor.diseases ?? [];
  const mutations = receptor.mutations ?? [];

  if (!diseases.length && !mutations.length) {
    return (
      <EmptyNote>
        No scored disease associations for {receptor.gene} in the current dataset.
      </EmptyNote>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="panel p-5">
        <SectionTitle
          eyebrow="Open Targets · association score"
          title="Associated diseases"
          right={
            receptor.diseaseCount ? (
              <span className="text-xs text-[var(--color-ink-faint)]">
                {receptor.diseaseCount.toLocaleString()} total
              </span>
            ) : undefined
          }
        />
        {diseases.length ? (
          <div className="space-y-2.5">
            {diseases.slice(0, 20).map((d) => (
              <div key={d.diseaseId ?? d.name} className="group">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <a
                    href={
                      d.diseaseId
                        ? `https://platform.opentargets.org/disease/${d.diseaseId}`
                        : "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm text-[var(--color-ink)] hover:text-[var(--color-helix)]"
                  >
                    {d.name}
                  </a>
                  <span className="numeric shrink-0 text-xs text-[var(--color-ink-muted)]">
                    {((d.score ?? 0) * 100).toFixed(0)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-class-f)]"
                    style={{ width: `${(d.score ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-ink-muted)]">
            No disease associations recorded.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {receptor.therapeuticAreas && (receptor as unknown as { therapeuticAreas?: string[] }).therapeuticAreas?.length ? (
          <div className="panel p-5">
            <SectionTitle eyebrow="Context" title="Therapeutic areas" />
            <div className="flex flex-wrap gap-1.5">
              {(receptor as unknown as { therapeuticAreas: string[] }).therapeuticAreas
                .slice(0, 12)
                .map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)]"
                  >
                    {t}
                  </span>
                ))}
            </div>
          </div>
        ) : null}

        <div className="panel p-5">
          <SectionTitle eyebrow="Variation" title="Genetic variants" />
          {mutations.length ? (
            <div className="space-y-2">
              {mutations.slice(0, 15).map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="numeric">{m.proteinChange ?? m.rsId ?? "variant"}</span>
                  <span className="text-xs text-[var(--color-ink-muted)]">
                    {m.significance}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-faint)]">
              Curated clinical variants are not yet loaded for this receptor.
              Disease-level genetic evidence is reflected in the association
              scores at left.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
