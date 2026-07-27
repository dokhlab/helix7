import { EmptyNote } from "./ui";

/**
 * Key-reference library. PMIDs are the ones the receptor's assay records were
 * measured in — the site links out to PubMed rather than caching abstracts, so
 * the reference list is always the live record.
 */
export function ReferenceList({ pmids, gene }: { pmids: string[]; gene: string }) {
  if (!pmids.length) {
    return (
      <EmptyNote>
        No primary references linked yet for {gene}. Browse the literature on{" "}
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(gene)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-helix)] hover:underline"
        >
          PubMed
        </a>
        .
      </EmptyNote>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--color-ink-muted)]">
          {pmids.length} primary references underpinning the pharmacology on this
          page.
        </p>
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(gene)}%5BTitle%2FAbstract%5D`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--color-helix)] hover:underline"
        >
          All {gene} papers →
        </a>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pmids.map((pmid) => (
          <a
            key={pmid}
            href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="panel panel-hover flex items-center justify-between px-3 py-2.5 text-sm"
          >
            <span className="text-[var(--color-ink-muted)]">PMID</span>
            <span className="numeric text-[var(--color-helix)]">{pmid}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
