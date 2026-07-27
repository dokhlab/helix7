import Link from "next/link";
import { listReceptors, type ReceptorQuery } from "@/lib/data";
import { CLASSES } from "@/lib/constants";
import { BrowseControls } from "@/components/BrowseControls";
import { ReceptorTable } from "@/components/ReceptorTable";

export const dynamic = "force-dynamic";

export const metadata = { title: "Browse receptors" };

type SP = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const query: ReceptorQuery = {
    classCode: one(sp.class),
    grafs: one(sp.grafs),
    tdl: one(sp.tdl),
    organSystem: one(sp.system),
    hasStructure: one(sp.hasStructure) === "1",
    includeOlfactory: one(sp.olfactory) === "1",
    orphanOnly: one(sp.orphan) === "1",
    search: one(sp.q),
    sort: (one(sp.sort) as ReceptorQuery["sort"]) ?? "score",
    page: sp.page ? Number(one(sp.page)) : 1,
    pageSize: 60,
  };

  const result = await listReceptors(query);
  const activeClass = CLASSES.find((c) => c.code === query.classCode);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8">
      <div className="mb-6">
        <div className="mono-label mb-1">Explorer</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {activeClass
            ? `Class ${activeClass.code} · ${activeClass.label}`
            : query.tdl
              ? `${query.tdl} targets`
              : "Browse the GPCRome"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {result.total.toLocaleString()} receptors match — sorted by{" "}
          {query.sort === "gene"
            ? "gene symbol"
            : query.sort === "structures"
              ? "structure count"
              : query.sort === "ligands"
                ? "ligand count"
                : "development interest"}
          .
        </p>
      </div>

      <BrowseControls current={query} />

      {result.items.length === 0 ? (
        <div className="panel mt-6 px-5 py-12 text-center text-[var(--color-ink-muted)]">
          No receptors match these filters.
          <Link href="/browse" className="ml-2 text-[var(--color-helix)] hover:underline">
            Reset
          </Link>
        </div>
      ) : (
        <div className="mt-5">
          <ReceptorTable items={result.items} />
        </div>
      )}

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        sp={sp}
      />
    </div>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  sp,
}: {
  page: number;
  pageSize: number;
  total: number;
  sp: SP;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const mk = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== "page") params.set(k, Array.isArray(v) ? v[0] : v);
    }
    params.set("page", String(p));
    return `/browse?${params.toString()}`;
  };

  return (
    <div className="mt-6 flex items-center justify-center gap-2 text-sm">
      {page > 1 && (
        <Link href={mk(page - 1)} className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 hover:bg-[var(--color-surface-2)]">
          ← Prev
        </Link>
      )}
      <span className="px-2 text-[var(--color-ink-muted)]">
        Page {page} of {pages}
      </span>
      {page < pages && (
        <Link href={mk(page + 1)} className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 hover:bg-[var(--color-surface-2)]">
          Next →
        </Link>
      )}
    </div>
  );
}
