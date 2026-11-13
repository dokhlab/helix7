import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getBioactivities, getReceptor } from "@/lib/data";
import { CLASS_LABEL } from "@/lib/constants";
import { ClassBadge, TdlBadge, SectionTitle, EmptyNote, OrphanBadge, ProvenanceStrip } from "@/components/ui";
import { ScoreGauge } from "@/components/ScoreGauge";
import { ExpressionPanel } from "@/components/ExpressionPanel";
import { StructureViewer } from "@/components/StructureViewer";
import { PharmacologyPanel } from "@/components/PharmacologyPanel";
import { Tabs, type Tab } from "@/components/Tabs";
import { DiseasePanel } from "@/components/DiseasePanel";
import { ReferenceList } from "@/components/ReferenceList";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getReceptor(id);
  if (!r) return { title: "Receptor not found" };
  return {
    title: `${r.gene} · ${r.name}`,
    description: `${r.name} (${r.gene}) — Class ${r.classification.classCode} GPCR. Structure, pharmacology, expression, and disease associations.`,
  };
}

export default async function ReceptorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receptor = await getReceptor(id);
  if (!receptor) notFound();

  const { groups, total } = await getBioactivities(receptor._id);
  const c = receptor.classification;
  const bestStructure = receptor.structures?.[0];

  const tabs: Tab[] = [
    {
      id: "overview",
      label: "Overview",
      content: <OverviewTab receptor={receptor} />,
    },
    {
      id: "structure",
      label: "Structure",
      count: receptor.structureCount || undefined,
      content: (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <StructureViewer
              pdbId={bestStructure?.pdbId}
              alphafoldUrl={receptor.alphafoldUrl}
              gene={receptor.gene}
              ligands={bestStructure?.ligands}
            />
            <p className="mt-2 text-xs text-[var(--color-ink-faint)]">
              {bestStructure
                ? `Showing best-resolution experimental structure. AlphaFold model available as fallback.`
                : `No experimental structure solved — showing the AlphaFold predicted model.`}
            </p>
          </div>
          <div>
            <SectionTitle
              eyebrow="Experimental structures"
              title={`${receptor.structureCount} in the PDB`}
            />
            {receptor.structures?.length ? (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {receptor.structures.slice(0, 40).map((s) => (
                  <a
                    key={s.pdbId}
                    href={`https://www.rcsb.org/structure/${s.pdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="panel panel-hover flex items-center gap-3 px-3 py-2 text-sm"
                  >
                    <span className="numeric font-semibold text-[var(--color-helix)]">
                      {s.pdbId}
                    </span>
                    <span className="text-xs text-[var(--color-ink-muted)]">
                      {s.method} · {s.resolutionA ? `${s.resolutionA} Å` : "—"}
                    </span>
                    {s.state && (
                      <span className="ml-auto rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-muted)]">
                        {s.state}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <EmptyNote>No experimental structures yet.</EmptyNote>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "expression",
      label: "Expression",
      content: receptor.expression?.length ? (
        <div className="panel p-5">
          <SectionTitle
            eyebrow="Human Protein Atlas"
            title="Body distribution"
          />
          <ExpressionPanel
            expression={receptor.expression}
            singleCell={receptor.singleCell ?? []}
          />
        </div>
      ) : (
        <EmptyNote>No tissue expression data available for {receptor.gene}.</EmptyNote>
      ),
    },
    {
      id: "pharmacology",
      label: "Pharmacology",
      count: total || undefined,
      content: total ? (
        <PharmacologyPanel groups={groups} total={total} />
      ) : (
        <EmptyNote>
          No ligand interaction data — common for sensory and orphan receptors.
        </EmptyNote>
      ),
    },
    {
      id: "disease",
      label: "Disease & variants",
      count: receptor.diseases?.length || undefined,
      content: <DiseasePanel receptor={receptor} />,
    },
    {
      id: "references",
      label: "References",
      count: receptor.keyReferences?.length || undefined,
      content: <ReferenceList pmids={receptor.keyReferences ?? []} gene={receptor.gene} />,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8">
      {/* Breadcrumb + header */}
      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--color-ink-faint)]">
        <Link href="/browse" className="hover:text-[var(--color-ink-muted)]">
          Browse
        </Link>
        <span>/</span>
        <Link
          href={`/browse?class=${c.classCode}`}
          className="hover:text-[var(--color-ink-muted)]"
        >
          Class {c.classCode}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-ink-muted)]">{receptor.gene}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{receptor.gene}</h1>
            <ClassBadge code={c.classCode} />
            <TdlBadge tdl={receptor.devInterest?.tdl} />
            {receptor.isOrphan && <OrphanBadge />}
          </div>
          <p
            className="mt-1 text-lg text-[var(--color-ink-muted)]"
            dangerouslySetInnerHTML={{ __html: receptor.nameHtml || receptor.name }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-ink-faint)]">
            <span>{CLASS_LABEL[c.classCode]}</span>
            {c.family && <span>· {c.family}</span>}
            <span>· {receptor.seqLength} aa</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ExtLink href={`https://www.uniprot.org/uniprotkb/${receptor.uniprot}`}>
            UniProt {receptor.uniprot}
          </ExtLink>
          <ExtLink href={`https://gpcrdb.org/protein/${receptor.entryName}/`}>
            GPCRdb
          </ExtLink>
          {receptor.ensemblId && (
            <ExtLink
              href={`https://platform.opentargets.org/target/${receptor.ensemblId}`}
            >
              Open Targets
            </ExtLink>
          )}
        </div>
      </div>

      <div className="mt-8">
        <Tabs tabs={tabs} />
      </div>

      <ProvenanceStrip provenance={receptor.provenance ?? []} />
    </div>
  );
}

function OverviewTab({
  receptor,
}: {
  receptor: Awaited<ReturnType<typeof getReceptor>>;
}) {
  if (!receptor) return null;
  const coupling = receptor.gProteinCoupling ?? [];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      {receptor.devInterest && <ScoreGauge dev={receptor.devInterest} />}

      <div className="space-y-4">
        <div className="panel p-5">
          <SectionTitle eyebrow="Signalling" title="Signal transduction" />
          {coupling.length ? (
            <>
              <p className="mb-2.5 text-xs text-[var(--color-ink-faint)]">
                Primary G-protein transducer(s):
              </p>
              <div className="flex flex-wrap gap-2">
                {coupling.map((g) => (
                  <span
                    key={g.family}
                    className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm"
                  >
                    {g.family}
                    {g.primary && (
                      <span className="ml-1.5 text-[10px] text-[var(--color-helix)]">
                        primary
                      </span>
                    )}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--color-ink-faint)]">
                Canonical coupling; some receptors also signal through secondary
                transducers and β-arrestin. See{" "}
                <a
                  href={`https://gpcrdb.org/signprot/couplings#${receptor.gene}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-helix)] hover:underline"
                >
                  GPCRdb couplings
                </a>{" "}
                for full data.
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
              Primary G-protein coupling is not curated for {receptor.gene} in
              Helix7. See{" "}
              <a
                href={`https://gpcrdb.org/signprot/couplings#${receptor.gene}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-helix)] hover:underline"
              >
                GPCRdb couplings
              </a>{" "}
              for transducer data on this receptor.
            </p>
          )}
        </div>

        <div className="panel p-5">
          <SectionTitle eyebrow="At a glance" title="Key facts" />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Fact label="Structures" value={receptor.structureCount} />
            <Fact label="Distinct ligands" value={receptor.ligandCount ?? 0} />
            <Fact label="Approved drugs" value={receptor.approvedDrugCount ?? 0} />
            <Fact label="Disease links" value={receptor.diseaseCount ?? 0} />
            <Fact
              label="Organ systems"
              value={receptor.organSystems?.length ?? 0}
            />
            <Fact
              label="Citations"
              value={receptor.devInterest?.raw.citationCount.toLocaleString() ?? "—"}
            />
          </dl>
          {receptor.organSystems?.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {receptor.organSystems.map((s) => (
                <span
                  key={s}
                  className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)]"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="mono-label">{label}</dt>
      <dd className="numeric mt-0.5 text-lg font-semibold text-[var(--color-ink)]">
        {value}
      </dd>
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-line-bright)] hover:text-[var(--color-ink)]"
    >
      {children}
      <ExternalLink size={12} />
    </a>
  );
}
