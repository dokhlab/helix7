import Link from "next/link";
import type { ReceptorListItem } from "@/lib/data";
import { ClassBadge, TdlBadge, OrphanBadge } from "./ui";

/** Dense, scannable receptor table with a development-interest bar per row. */
export function ReceptorTable({ items }: { items: ReceptorListItem[] }) {
  const maxScore = Math.max(1, ...items.map((r) => r.devInterest?.score ?? 0));

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-line)] text-left">
              <Th className="pl-4">Gene</Th>
              <Th>Receptor</Th>
              <Th>Class</Th>
              <Th>Family</Th>
              <Th className="text-right">Structures</Th>
              <Th className="pr-6 text-right">Ligands</Th>
              <Th>TDL</Th>
              <Th className="pr-4">Dev. interest</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr
                key={r._id}
                className="group border-b border-[var(--color-line)]/50 transition-colors hover:bg-[var(--color-surface-2)]"
              >
                <td className="py-2.5 pl-4">
                  <Link
                    href={`/receptor/${r._id}`}
                    className="font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-helix)]"
                  >
                    {r.gene}
                  </Link>
                </td>
                <td className="max-w-[240px] py-2.5 text-[var(--color-ink-muted)]">
                  <span className="flex items-center gap-2">
                    <span className="truncate">{r.name}</span>
                    {r.isOrphan && <OrphanBadge compact />}
                  </span>
                </td>
                <td className="py-2.5">
                  <ClassBadge code={r.classification.classCode} />
                </td>
                <td className="max-w-[180px] truncate py-2.5 text-xs text-[var(--color-ink-faint)]">
                  {r.classification.family ?? "—"}
                </td>
                <td className="numeric py-2.5 text-right text-[var(--color-ink-muted)]">
                  {r.structureCount || "—"}
                </td>
                <td className="numeric py-2.5 pr-6 text-right text-[var(--color-ink-muted)]">
                  {r.ligandCount || "—"}
                </td>
                <td className="py-2.5">
                  <TdlBadge tdl={r.devInterest?.tdl} />
                </td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-helix)]"
                        style={{
                          width: `${((r.devInterest?.score ?? 0) / maxScore) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="numeric w-8 text-xs text-[var(--color-ink)]">
                      {r.devInterest?.score?.toFixed(0) ?? "—"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`mono-label py-2.5 font-normal ${className}`}>{children}</th>
  );
}
