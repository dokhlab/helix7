import Link from "next/link";
import { getStats } from "@/lib/data";
import { SectionTitle } from "@/components/ui";
import { DocsNav } from "@/components/edu/DocsNav";
import { SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Documentation",
  description:
    "What Helix7 is, where its data comes from, how disease, ligand, expression, and development-interest data are assembled, and the limits of the resource.",
};

export default async function DocsPage() {
  const stats = await getStats();
  const nf = new Intl.NumberFormat("en-US");

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <DocsNav current="/docs" />
      <div className="mono-label mb-2">Documentation</div>
      <h1 className="text-3xl font-bold tracking-tight">
        About Helix7
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
        Helix7 is a high-fidelity atlas of the human{" "}
        <strong className="text-[var(--color-ink)]">GPCRome</strong> — the
        complete set of {stats ? nf.format(stats.receptorCount) : "~800"} human
        G protein-coupled receptors. It brings receptor classification, three-
        dimensional structure, ligand pharmacology, tissue expression, disease
        associations, and a transparent development-interest score into a single,
        cross-linked interface. It is a resource of the{" "}
        <a
          href="https://dokhlab.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-helix)] hover:underline"
        >
          Dokholyan Laboratory
        </a>
        .
      </p>

      <Toc />

      <Doc id="purpose" title="Purpose">
        <p>
          GPCRs are the largest family of cell-surface receptors and the target
          of roughly a third of all approved drugs. Yet the data needed to reason
          about a given receptor — its structure, what binds it, where it is
          expressed, and what disease it drives — lives in half a dozen
          specialist databases with different identifiers and formats. Helix7
          reconciles those sources on a common receptor spine so that a single
          page answers, for any receptor: <em>what is it, what acts on it, where
          does it act, and why does it matter therapeutically?</em>
        </p>
      </Doc>

      <Doc id="scope" title="What counts as a GPCR here">
        <p>
          Every human receptor in GPCRdb is included —{" "}
          {stats ? nf.format(stats.receptorCount) : "805"} in total, spanning
          classes A (Rhodopsin), B1 (Secretin), B2 (Adhesion), C (Glutamate), F
          (Frizzled), the Taste 2 family, and the two odorant classes. Both the
          classic <strong className="text-[var(--color-ink)]">A–F</strong>{" "}
          nomenclature and the{" "}
          <strong className="text-[var(--color-ink)]">GRAFS</strong> grouping are
          stored, and colour is used consistently across the site to mean class.
        </p>
        <p>
          Two tiers are treated differently. The{" "}
          {stats ? nf.format(stats.nonOlfactoryCount) : "~400"} non-olfactory
          receptors receive full treatment. The{" "}
          {stats ? nf.format(stats.olfactoryCount) : "~400"} olfactory receptors
          are included for completeness and for the phylogeny, but carry sparse
          pharmacology and are hidden from browse by default.
        </p>
      </Doc>

      <Doc id="orphans" title="Orphan receptors">
        <p>
          {stats?.orphanCount ?? "About ninety"} receptors are flagged{" "}
          <span className="rounded bg-[color-mix(in_oklab,var(--color-plasma)_16%,transparent)] px-1.5 py-0.5 text-xs font-semibold text-[var(--color-plasma-bright)]">
            ORPHAN
          </span>
          . These are the receptors that GPCRdb places in its dedicated orphan
          families — receptors for which no endogenous ligand is yet known. They
          are among the most interesting targets precisely because they are
          under-explored, and the browse page has an “Orphans only” filter to
          surface them.
        </p>
      </Doc>

      <Doc id="structure" title="Structure">
        <p>
          Each receptor lists every experimental structure solved for it in the
          PDB, sorted by resolution, with method and activation state. The 3D
          viewer renders the best-resolution structure as an interactive cartoon;
          when no experimental structure exists, it falls back to the receptor’s
          AlphaFold model, so every receptor shows something. The chain is
          rainbow-coloured N→C so the seven transmembrane helices read clearly.
        </p>
      </Doc>

      <Doc id="ligands" title="Ligands & pharmacology">
        <p>
          Ligand interactions are integrated from three sources: the{" "}
          <strong>Guide to Pharmacology</strong> (expert-curated, with clean
          mechanism-of-action typing), <strong>ChEMBL</strong> (comprehensive
          quantitative medicinal-chemistry data, target-mapped to the human
          receptor), and <strong>PubChem BioAssay</strong> (additional
          target-mapped assays and deposited screens). Where a source classifies
          it, each ligand is typed by pharmacological action —{" "}
          <ActionSwatch color="var(--color-agonist)">agonist</ActionSwatch>,{" "}
          <ActionSwatch color="var(--color-partial)">partial agonist</ActionSwatch>,{" "}
          <ActionSwatch color="var(--color-antagonist)">antagonist</ActionSwatch>,{" "}
          <ActionSwatch color="var(--color-inverse)">inverse agonist</ActionSwatch>,
          and{" "}
          <ActionSwatch color="var(--color-allosteric)">allosteric modulator</ActionSwatch>
          . Affinities (Ki, IC50, EC50, Kd) are normalised to nanomolar, and each
          measurement links to the PubMed paper it was reported in. Because these
          sources overlap, ligands are de-duplicated across them by InChIKey and
          name, and equivalent measurements are merged — so counts reflect
          distinct compounds, not repeated records. The potency strip plot shows
          every quantitative measurement on the −log₁₀(M) scale, where higher
          means more potent. The atlas currently holds{" "}
          {stats ? nf.format(stats.bioactivityCount) : "tens of thousands of"}{" "}
          interaction records across{" "}
          {stats ? nf.format(stats.ligandCount) : "thousands of"} distinct
          ligands.
        </p>
      </Doc>

      <Doc id="expression" title="Expression across the body">
        <p>
          Tissue expression is the Human Protein Atlas consensus RNA dataset
          (normalised nTPM across 50 tissues). On each receptor page the values
          drive two linked views: a stylised anatomical figure whose organ
          systems are shaded by peak expression, and a ranked bar chart of the
          top tissues. Tissues are rolled up into organ systems (nervous,
          cardiovascular, digestive, and so on) so a receptor can be browsed by
          the system it acts in.
        </p>
      </Doc>

      <Doc id="disease" title="Disease & genetic associations">
        <p>
          Disease links come from the Open Targets Platform, which integrates
          genetic, clinical, literature, and animal-model evidence into a single
          association score per target–disease pair. Helix7 shows each
          receptor’s top-scoring diseases with the evidence datatypes behind the
          score, plus the therapeutic areas they fall under. Across the atlas,
          receptors connect to{" "}
          {stats ? nf.format(stats.diseaseCount) : "thousands of"} distinct
          diseases. Curated single-variant data (ClinVar/gnomAD) is a planned
          addition; today the genetic signal is captured in the association
          scores.
        </p>
      </Doc>

      <Doc id="score" title="Development-interest score">
        <p>
          Every receptor carries a 0–100 development-interest score, designed to
          be transparent rather than a black box. It is a weighted composite of
          five signals: literature volume (30%, log-scaled so a few famous
          receptors don’t dominate), distinct ligands (20%), approved drugs
          (20%), solved structures (15%), and strength of disease evidence (15%).
          The receptor page shows the full breakdown.
        </p>
        <p>
          Each receptor is also assigned a{" "}
          <strong className="text-[var(--color-ink)]">
            Target Development Level
          </strong>{" "}
          in the Pharos convention:{" "}
          <strong style={{ color: "var(--color-tclin)" }}>Tclin</strong> (an
          approved drug acts on it),{" "}
          <strong style={{ color: "var(--color-tchem)" }}>Tchem</strong> (a
          potent ligand exists),{" "}
          <strong style={{ color: "var(--color-tbio)" }}>Tbio</strong> (biology
          known, no potent ligand), and{" "}
          <strong style={{ color: "var(--color-tdark)" }}>Tdark</strong>{" "}
          (essentially unstudied).
        </p>
      </Doc>

      <Doc id="sources" title="Data sources & licences">
        <p>
          Helix7 aggregates public data and preserves attribution on every
          record. Each receptor page carries source links, and the underlying
          databases are listed below — see the{" "}
          <Link href="/docs/licenses">Citation &amp; licenses</Link> page for the
          full licences and required citations.
        </p>
        <div className="mt-4 space-y-2 not-prose">
          {SOURCES.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="panel panel-hover block p-3.5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-[var(--color-ink)]">
                  {s.name}
                </span>
                <span className="mono-label shrink-0">{s.license}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{s.role}</p>
              <p className="mt-0.5 text-xs text-[var(--color-ink-faint)]">
                {s.citation}
              </p>
            </a>
          ))}
        </div>
      </Doc>

      <Doc id="pipeline" title="How the data is assembled">
        <p>
          A reproducible Python pipeline builds the atlas in stages: it seeds the
          receptor list and structures from GPCRdb, enriches with expression from
          the Human Protein Atlas, adds ligands and assays from the Guide to
          Pharmacology, layers disease associations from Open Targets, computes
          literature counts from PubMed, derives the development-interest score,
          and loads everything into MongoDB with a text index for search. Every
          network response is cached, so the build is reproducible and re-runs
          are cheap. The data is refreshed periodically as the sources update.
        </p>
      </Doc>

      <Doc id="limits" title="Scope & limitations">
        <p>
          Helix7 is a research and target-triage tool, not clinical guidance and
          not investment advice. Affinity values are aggregated across assays of
          differing design; the potency plot is best read as a distribution, not
          a single canonical number. Absence of data — no listed ligand, no
          structure — reflects the current state of the source databases, not a
          biological certainty. Always consult the primary references, which are
          linked throughout.
        </p>
      </Doc>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--color-line)] pt-6 text-sm">
        <Link
          href="/browse"
          className="rounded-lg bg-[var(--color-helix)] px-4 py-2 font-semibold text-[var(--color-void)]"
        >
          Start browsing →
        </Link>
        <a
          href="https://dokhlab.org"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-[var(--color-line-bright)] px-4 py-2 font-semibold hover:bg-[var(--color-surface-2)]"
        >
          Dokholyan Laboratory
        </a>
      </div>
    </div>
  );
}

const TOC = [
  ["purpose", "Purpose"],
  ["scope", "Scope"],
  ["orphans", "Orphan receptors"],
  ["structure", "Structure"],
  ["ligands", "Ligands & pharmacology"],
  ["expression", "Expression"],
  ["disease", "Disease"],
  ["score", "Development score"],
  ["sources", "Sources & licences"],
  ["pipeline", "Pipeline"],
  ["limits", "Limitations"],
];

function Toc() {
  return (
    <div className="panel mt-8 p-4">
      <div className="mono-label mb-2">On this page</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {TOC.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-helix)]"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function Doc({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <SectionTitle title={title} />
      <div className="space-y-3 text-[15px] leading-relaxed text-[var(--color-ink-muted)] [&_a]:text-[var(--color-helix)] [&_strong]:font-semibold">
        {children}
      </div>
    </section>
  );
}

function ActionSwatch({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-[var(--color-ink)]">{children}</span>
    </span>
  );
}
