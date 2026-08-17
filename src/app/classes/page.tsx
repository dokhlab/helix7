import Link from "next/link";
import { getStats } from "@/lib/data";
import { CLASSES } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Classes",
  description:
    "The GPCR classes — A (Rhodopsin), B1 (Secretin), B2 (Adhesion), C (Glutamate), F (Frizzled), and the sensory families.",
};

const DESCRIPTIONS: Record<string, string> = {
  A: "The largest class by far — aminergic, peptide, lipid, nucleotide and chemokine receptors, plus the opsins. Most approved GPCR drugs act here.",
  B1: "Secretin-family receptors for large peptide hormones such as GLP-1, glucagon, and PTH. Major metabolic and endocrine targets.",
  B2: "Adhesion GPCRs with large extracellular domains and self-cleaving GAIN domains. Roles in development and immunity; largely under-explored.",
  C: "Dimeric receptors with large Venus-flytrap ligand domains — metabotropic glutamate, GABA-B, calcium-sensing, and taste-1 receptors.",
  F: "Frizzled and Smoothened receptors transducing Wnt and Hedgehog signalling. Central to development and oncology.",
  T2: "Bitter taste receptors, expressed in the tongue and, surprisingly, throughout the body.",
  O1: "Human class I odorant receptors (the OR51/52/56 families) — the ancestral “fish-like” clade humans share with aquatic vertebrates. A small group, but all human genes.",
  O2: "Human class II (“tetrapod”) odorant receptors — the single largest gene family in the human genome.",
};

export default async function ClassesPage() {
  const stats = await getStats();
  const counts = new Map(stats?.byClass.map((c) => [c.classCode, c.count]));

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8">
      <div className="mono-label mb-1">Classification</div>
      <h1 className="text-2xl font-semibold tracking-tight">GPCR classes</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-muted)]">
        The human GPCRome divides into structural classes that share a common
        seven-transmembrane fold but differ in their extracellular architecture
        and ligand-recognition strategy.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CLASSES.filter((c) => counts.get(c.code)).map((c) => (
          <Link
            key={c.code}
            href={`/browse?class=${c.code}${c.code.startsWith("O") || c.code === "T2" ? "&olfactory=1" : ""}`}
            className="panel panel-hover flex flex-col p-5"
          >
            <div className="flex items-center justify-between">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-[var(--color-void)]"
                style={{ background: c.color }}
              >
                {c.code}
              </span>
              <span className="numeric text-2xl font-semibold text-[var(--color-ink)]">
                {counts.get(c.code)}
              </span>
            </div>
            <h2 className="mt-3 font-semibold">Class {c.code} · {c.label}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {DESCRIPTIONS[c.code] ?? ""}
            </p>
            <span className="mt-3 text-sm text-[var(--color-helix)]">
              Browse {c.label} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
