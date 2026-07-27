import Link from "next/link";
import { SectionTitle } from "@/components/ui";
import { DocsNav } from "@/components/edu/DocsNav";
import { GpcrInfographic } from "@/components/edu/GpcrInfographic";
import { ResidueNumbering } from "@/components/edu/ResidueNumbering";
import { DoseResponse } from "@/components/edu/DoseResponse";

export const metadata = {
  title: "GPCR Biology",
  description:
    "A primer on G protein-coupled receptors: what they are, their seven-transmembrane structural anatomy, how they signal, and the mechanisms of pharmacological action.",
};

export default function BiologyPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <DocsNav current="/docs/biology" />

      <div className="mono-label mb-2">Primer</div>
      <h1 className="text-3xl font-bold tracking-tight">
        GPCR biology & structural anatomy
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
        G protein-coupled receptors are the cell&apos;s universal signal
        detectors. A single fold — seven membrane-spanning helices — has been
        tuned by evolution to sense photons, ions, small molecules, peptides, and
        whole proteins, and to relay that signal across the membrane. This page
        is a short primer on how they are built, how they work, and how drugs
        act on them.
      </p>

      {/* What is a GPCR */}
      <section className="mt-10">
        <SectionTitle eyebrow="Overview" title="What is a GPCR?" />
        <div className="space-y-3 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
          <p>
            GPCRs — also called seven-transmembrane (7TM) receptors — are the
            largest family of membrane proteins in the human genome, with roughly
            800 members. About half detect odours and tastes; the other ~400
            respond to hormones, neurotransmitters, and other signalling
            molecules, and it is these that dominate as drug targets. Roughly a
            third of all approved medicines act through a GPCR.
          </p>
          <p>
            Every GPCR shares the same core architecture: an extracellular face
            that recognises the signal, seven α-helices that cross the membrane,
            and an intracellular face that couples to signalling machinery — most
            famously the heterotrimeric G proteins that give the family its name.
          </p>
        </div>
      </section>

      {/* Full structure & function infographic */}
      <section className="mt-10">
        <SectionTitle
          eyebrow="Reference"
          title="Structure & function at a glance"
        />
        <GpcrInfographic />
      </section>

      {/* GPCR residue numbering conventions */}
      <ResidueNumbering />

      {/* Mechanisms of pharmacological action */}
      <section className="mt-10">
        <SectionTitle
          eyebrow="Pharmacology"
          title="Mechanisms of pharmacological action"
        />
        <p className="mb-5 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
          Drugs are classified by <em>what they do</em> to the receptor, not
          merely whether they bind. Two properties define the behaviour:{" "}
          <strong className="text-[var(--color-ink)]">affinity</strong> (how
          tightly a ligand binds) and{" "}
          <strong className="text-[var(--color-ink)]">efficacy</strong> (how much
          it changes activity once bound). Toggle each class below to see how it
          reshapes the dose–response curve.
        </p>
        <DoseResponse />

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <MechCard title="Orthosteric vs allosteric" color="var(--color-allosteric)">
            Orthosteric ligands compete for the endogenous agonist&apos;s pocket.
            Allosteric modulators bind elsewhere and tune the response —
            positive (PAM) or negative (NAM) — often with greater selectivity
            because allosteric sites are less conserved across a receptor family.
          </MechCard>
          <MechCard title="Competitive vs insurmountable" color="var(--color-antagonist)">
            A competitive antagonist shifts the agonist curve rightward and can
            be overcome by more agonist. An insurmountable (irreversible or
            pseudo-irreversible) antagonist also lowers the maximum response.
          </MechCard>
          <MechCard title="Constitutive activity" color="var(--color-inverse)">
            Some receptors signal even without a ligand. Only against this basal
            tone can an inverse agonist show its effect — actively turning
            activity down rather than merely blocking it.
          </MechCard>
          <MechCard title="Biased agonism" color="var(--color-helix)">
            A biased (functionally selective) agonist stabilises a conformation
            that favours one downstream pathway — say β-arrestin over Gᵢ — an
            active area of drug design aimed at cleaner therapeutics.
          </MechCard>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--color-line)] pt-6 text-sm">
        <Link
          href="/browse"
          className="rounded-lg bg-[var(--color-helix)] px-4 py-2 font-semibold text-[var(--color-void)]"
        >
          Explore receptors →
        </Link>
        <Link
          href="/docs"
          className="rounded-lg border border-[var(--color-line-bright)] px-4 py-2 font-semibold hover:bg-[var(--color-surface-2)]"
        >
          About & methods
        </Link>
      </div>
    </div>
  );
}

function MechCard({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-4" style={{ borderLeft: `3px solid ${color}` }}>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        {children}
      </p>
    </div>
  );
}
