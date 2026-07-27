import type { GlobalStats } from "@/lib/types";
import { CLASS_COLOR } from "@/lib/constants";
import { SectionTitle } from "@/components/ui";

/** Per-class explanatory metadata shown beneath the phylogeny. */
const CLASS_INFO: {
  code: string;
  af: string;
  grafs: string;
  senses: string;
}[] = [
  {
    code: "A",
    af: "Class A",
    grafs: "Rhodopsin",
    senses:
      "By far the largest class. Senses light, amines, nucleotides, lipids, peptides, and chemokines. Home to most drug targets.",
  },
  {
    code: "B1",
    af: "Class B1",
    grafs: "Secretin",
    senses:
      "Large peptide hormones (GLP-1, glucagon, PTH) captured by a sizeable extracellular domain.",
  },
  {
    code: "B2",
    af: "Class B2",
    grafs: "Adhesion",
    senses:
      "Huge N-termini with self-cleaving GAIN domains; roles in development, immunity, and cell adhesion.",
  },
  {
    code: "C",
    af: "Class C",
    grafs: "Glutamate",
    senses:
      "Obligate dimers with 'Venus-flytrap' ligand domains — metabotropic glutamate, GABA-B, calcium-sensing, sweet/umami taste.",
  },
  {
    code: "F",
    af: "Class F",
    grafs: "Frizzled",
    senses:
      "Frizzled and Smoothened receptors transducing Wnt and Hedgehog signalling in development and cancer.",
  },
  {
    code: "T2",
    af: "—",
    grafs: "Taste 2",
    senses:
      "Bitter taste receptors — grouped with Frizzled under GRAFS, but a distinct family.",
  },
  {
    code: "O1",
    af: "—",
    grafs: "Olfactory",
    senses: "Fish-like odorant receptors — a small, ancestral group.",
  },
  {
    code: "O2",
    af: "—",
    grafs: "Olfactory",
    senses:
      "Tetrapod odorant receptors — the single largest gene family in the human genome.",
  },
];

/**
 * Explains the two GPCR classification systems and how the radial tree above is
 * organised. Counts come from the live stats document.
 */
export function ClassificationGuide({ stats }: { stats: GlobalStats | null }) {
  const counts = new Map<string, number>(
    stats?.byClass.map((c) => [c.classCode, c.count]),
  );

  return (
    <section className="mt-12">
      <SectionTitle
        eyebrow="Legend"
        title="How GPCRs are classified"
      />

      <p className="mb-5 max-w-3xl text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
        The tree above is not a random arrangement — it follows the standard
        classification of GPCRs. Two complementary systems are in common use, and
        Helix7 stores both.
      </p>

      {/* The two systems */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-5">
          <div className="mono-label mb-1">System 1</div>
          <h3 className="font-semibold">A–F classes (Kolakowski, 1994)</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
            The original scheme, based on shared sequence and structural
            features. Letters A–F label the classes: A (rhodopsin-like), B
            (secretin & adhesion), C (glutamate), D and E (non-vertebrate), and F
            (frizzled). Human receptors fall into classes A, B1, B2, C, and F.
          </p>
        </div>
        <div className="panel p-5">
          <div className="mono-label mb-1">System 2</div>
          <h3 className="font-semibold">GRAFS (Fredriksson, 2003)</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
            A phylogenetic analysis of the human genome that sorted the family
            into five groups — <strong className="text-[var(--color-ink)]">G</strong>lutamate,{" "}
            <strong className="text-[var(--color-ink)]">R</strong>hodopsin,{" "}
            <strong className="text-[var(--color-ink)]">A</strong>dhesion,{" "}
            <strong className="text-[var(--color-ink)]">F</strong>rizzled/Taste2, and{" "}
            <strong className="text-[var(--color-ink)]">S</strong>ecretin. These are
            the coloured groups in the tree.
          </p>
        </div>
      </div>

      {/* Per-class breakdown */}
      <div className="panel mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-line)] text-left">
              <th className="mono-label px-4 py-2.5 font-normal">Class</th>
              <th className="mono-label py-2.5 font-normal">A–F</th>
              <th className="mono-label py-2.5 font-normal">GRAFS group</th>
              <th className="mono-label py-2.5 font-normal">What it senses</th>
              <th className="mono-label px-4 py-2.5 text-right font-normal">Human</th>
            </tr>
          </thead>
          <tbody>
            {CLASS_INFO.filter((c) => counts.get(c.code)).map((c) => (
              <tr key={c.code} className="border-b border-[var(--color-line)]/50 align-top">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{
                        background: CLASS_COLOR[c.code],
                        boxShadow: `0 0 8px ${CLASS_COLOR[c.code]}`,
                      }}
                    />
                    <span className="font-semibold">{c.code}</span>
                  </span>
                </td>
                <td className="py-3 text-[var(--color-ink-muted)]">{c.af}</td>
                <td className="py-3 text-[var(--color-ink-muted)]">{c.grafs}</td>
                <td className="max-w-md py-3 text-[var(--color-ink-muted)]">
                  {c.senses}
                </td>
                <td className="numeric px-4 py-3 text-right text-[var(--color-ink)]">
                  {counts.get(c.code)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* How the tree is built */}
      <div className="panel mt-4 p-5">
        <h3 className="font-semibold">Reading the tree</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
          Within each class, GPCRdb nests receptors in a hierarchy —{" "}
          <span className="text-[var(--color-ink)]">class → ligand type → receptor family → receptor</span>
          . The radial tree follows exactly this nesting: branches spread from the
          central root out through the class, then the family groupings, to the
          individual receptors at the tips. Receptors that sit close together
          share more sequence and, usually, a related endogenous ligand — which
          is why neighbouring leaves tend to be pharmacological relatives (all the
          adrenoceptors together, all the opioid receptors together, and so on).
        </p>
      </div>
    </section>
  );
}
