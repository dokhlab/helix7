import Link from "next/link";
import { ArrowRight, Dna, FlaskConical, Microscope, Activity } from "lucide-react";
import { getStats, getTopReceptors } from "@/lib/data";
import { CLASSES, TDL_META } from "@/lib/constants";
import { ClassBadge, TdlBadge, StatTile, SectionTitle } from "@/components/ui";
import { GpcromeMap } from "@/components/GpcromeMap";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stats, top] = await Promise.all([getStats(), getTopReceptors(8)]);

  const nf = new Intl.NumberFormat("en-US");

  return (
    <div className="mx-auto max-w-[1400px] px-5">
      {/* Hero */}
      <section className="relative grid gap-8 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="animate-rise flex flex-col justify-center">
          <div className="mono-label mb-4 flex items-center gap-2">
            <Dna size={13} className="text-[var(--color-helix)]" />
            The human GPCRome · high-fidelity atlas
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Every human
            <br />
            <span className="bg-gradient-to-r from-[var(--color-helix-bright)] via-[var(--color-helix)] to-[var(--color-plasma-bright)] bg-clip-text text-transparent">
              G protein-coupled receptor
            </span>
            <br />
            in one place.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
            {stats ? nf.format(stats.receptorCount) : "800+"} receptors across
            every class — structures, ligand pharmacology with assay-level
            references, tissue expression, disease associations, and a
            transparent development-interest score. Explore the druggable
            frontier of human signalling.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/browse"
              className="group inline-flex items-center gap-2 rounded-lg bg-[var(--color-helix)] px-5 py-2.5 text-sm font-semibold text-[var(--color-void)] transition-transform hover:scale-[1.02]"
            >
              Browse receptors
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/tree"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line-bright)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-2)]"
            >
              Phylogenetic tree
            </Link>
          </div>
        </div>

        {/* Interactive GPCRome overview doubles as navigation. */}
        <div className="animate-rise flex items-center justify-center" style={{ animationDelay: "80ms" }}>
          <GpcromeMap />
        </div>
      </section>

      {/* Global counters */}
      {stats && (
        <section className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile value={nf.format(stats.receptorCount)} label="Receptors" />
          <StatTile
            value={nf.format(stats.structureCount)}
            label="3D structures"
            accent="var(--color-plasma-bright)"
          />
          <StatTile
            value={nf.format(stats.ligandCount)}
            label="Ligands"
            accent="var(--color-class-c)"
          />
          <StatTile
            value={nf.format(stats.bioactivityCount)}
            label="Assay records"
            accent="var(--color-agonist)"
          />
          <StatTile
            value={nf.format(stats.diseaseCount)}
            label="Diseases linked"
            accent="var(--color-class-f)"
          />
          <StatTile
            value={nf.format(stats.approvedDrugCount)}
            label="Approved drugs"
            accent="var(--color-tclin)"
          />
        </section>
      )}

      {/* What's inside */}
      <section className="grid gap-4 py-10 md:grid-cols-4">
        {[
          {
            icon: Microscope,
            title: "Structure",
            body: "Experimental PDB structures and AlphaFold models, with an interactive 3D viewer and 2D snake-plot topology.",
          },
          {
            icon: FlaskConical,
            title: "Pharmacology",
            body: "Ligands typed by action — agonist, antagonist, partial, inverse, allosteric — with Ki/IC50/EC50 and source references.",
          },
          {
            icon: Activity,
            title: "Expression & disease",
            body: "Tissue expression across 50 organs, mapped onto the body, plus scored disease associations from Open Targets.",
          },
          {
            icon: Dna,
            title: "Development interest",
            body: "A transparent 0–100 score from literature, ligands, structures, drugs, and disease evidence — with the breakdown shown.",
          },
        ].map((f) => (
          <div key={f.title} className="panel panel-hover p-5">
            <f.icon size={20} className="text-[var(--color-helix)]" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {f.body}
            </p>
          </div>
        ))}
      </section>

      {/* Class distribution + TDL */}
      {stats && (
        <section className="grid gap-6 py-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="panel p-6">
            <SectionTitle eyebrow="Composition" title="Receptors by class" />
            <div className="space-y-2.5">
              {stats.byClass.map((c) => {
                const meta = CLASSES.find((x) => x.code === c.classCode);
                const pct = (c.count / stats.receptorCount) * 100;
                return (
                  <Link
                    key={c.classCode}
                    href={`/browse?class=${c.classCode}`}
                    className="group flex items-center gap-3"
                  >
                    <span className="w-24 shrink-0 text-sm text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)]">
                      {meta?.label ?? c.classCode}
                    </span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-[var(--color-surface-3)]">
                      <div
                        className="flex h-full items-center justify-end rounded pr-2 text-[10px] font-semibold text-[var(--color-void)] transition-all"
                        style={{
                          width: `${Math.max(pct, 4)}%`,
                          background: meta?.color ?? "var(--color-ink-faint)",
                        }}
                      >
                        {c.count}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="panel p-6">
            <SectionTitle eyebrow="Druggability" title="Development level" />
            <div className="space-y-3">
              {(["Tclin", "Tchem", "Tbio", "Tdark"] as const).map((tdl) => {
                const count = stats.byTdl?.[tdl] ?? 0;
                const pct = (count / stats.receptorCount) * 100;
                return (
                  <Link
                    key={tdl}
                    href={`/browse?tdl=${tdl}`}
                    className="group block"
                  >
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <TdlBadge tdl={tdl} />
                        <span className="text-[var(--color-ink-muted)]">
                          {TDL_META[tdl].blurb}
                        </span>
                      </span>
                      <span className="numeric text-[var(--color-ink)]">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: TDL_META[tdl].color }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Top targets */}
      <section className="py-10">
        <SectionTitle
          eyebrow="Leaderboard"
          title="Highest development interest"
          right={
            <Link
              href="/browse?sort=score"
              className="text-sm text-[var(--color-helix)] hover:underline"
            >
              See all →
            </Link>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {top.map((r) => (
            <Link
              key={r._id}
              href={`/receptor/${r._id}`}
              className="panel panel-hover flex flex-col gap-3 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{r.gene}</div>
                  <div className="line-clamp-1 text-xs text-[var(--color-ink-muted)]">
                    {r.name}
                  </div>
                </div>
                <TdlBadge tdl={r.devInterest?.tdl} />
              </div>
              <div className="mt-auto flex items-center justify-between">
                <ClassBadge code={r.classification.classCode} />
                <div className="numeric text-lg font-semibold text-[var(--color-helix)]">
                  {r.devInterest?.score?.toFixed(0) ?? "—"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="h-8" />
    </div>
  );
}
