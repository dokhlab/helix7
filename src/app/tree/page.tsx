import { getStats, getTreeSearchIndex, getTree } from "@/lib/data";
import { PhyloTree } from "@/components/PhyloTree";
import { ClassificationGuide } from "@/components/edu/ClassificationGuide";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Phylogeny",
  description:
    "A radial dendrogram of the entire human GPCRome, organised by classification and coloured by receptor class.",
};

export default async function TreePage() {
  const [tree, stats, searchIndex] = await Promise.all([
    getTree(),
    getStats(),
    getTreeSearchIndex(),
  ]);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8">
      <div className="mono-label mb-1">Phylogeny</div>
      <h1 className="text-2xl font-semibold tracking-tight">The GPCRome tree</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-muted)]">
        Every human GPCR arranged by classification. Leaf size scales with
        development interest, colour marks the class. Search by gene symbol or
        receptor name (e.g. ADRB2, dopamine receptor, mu opioid) to highlight one or more receptors and trace their lineage; hover to
        inspect, click a leaf to open it.
      </p>

      <div className="mt-6">
        {tree ? (
          <PhyloTree tree={tree} searchIndex={searchIndex} />
        ) : (
          <div className="panel px-5 py-16 text-center text-[var(--color-ink-muted)]">
            The classification tree has not been built. Run the ETL pipeline.
          </div>
        )}
      </div>

      <ClassificationGuide stats={stats} />
    </div>
  );
}
